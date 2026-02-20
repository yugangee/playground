import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

const logos = [
  "/logos/Gemini_Generated_Image_8jui758jui758jui.png",
  "/logos/Gemini_Generated_Image_y89jxyy89jxyy89j.png",
  "/logos/Gemini_Generated_Image_51u3bi51u3bi51u3.png",
  "/logos/Gemini_Generated_Image_d0038qd0038qd003.png",
];

const regions = [
  { sido: "서울", sigungu: "강남구" }, { sido: "서울", sigungu: "마포구" },
  { sido: "경기", sigungu: "성남시" }, { sido: "경기", sigungu: "수원시" },
  { sido: "서울", sigungu: "송파구" }, { sido: "인천", sigungu: "연수구" },
  { sido: "서울", sigungu: "영등포구" }, { sido: "경기", sigungu: "고양시" },
];

const avatars = Array.from({ length: 20 }, (_, i) => {
  const ext = [13, 15, 16].includes(i + 1) ? "png" : "jpg";
  return `/user_${i + 1}.${ext}`;
});

function randEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randBirth() {
  const y = randInt(1990, 2005);
  const m = String(randInt(1, 12)).padStart(2, "0");
  const d = String(randInt(1, 28)).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const teams = [
  { clubId: "c201", name: "파우더 라이더즈", sport: "스노보드", logo: logos[0] },
  { clubId: "c202", name: "프리스타일 크루", sport: "스노보드", logo: logos[1] },
  { clubId: "c203", name: "새벽 러너스", sport: "러닝크루", logo: logos[2] },
  { clubId: "c204", name: "한강 페이스메이커", sport: "러닝크루", logo: logos[3] },
];

const namePool = [
  "김하늘","이수빈","박서연","최예린","정민서","강유진","윤채원","임소율","한지민","오다은",
  "신하영","백서윤","류지아","조은서","장나윤","권시은","남하린","문채은","서유나","안소희",
  "홍지우","배수아","송예은","고민지","양서현","구하은","노지현","전소연","황채린","도유빈",
  "유하늘","진서영","탁민아","피수진","하윤서","감나래","봉지수","석하나","우채영","라미소",
];

const clubs = [];
const users = [];
const members = [];
let nameIdx = 0;

for (const team of teams) {
  const area = randEl(regions);
  clubs.push({
    clubId: team.clubId,
    name: team.name,
    sport: team.sport,
    areas: [area],
    members: 10,
    styles: [],
    image: team.logo,
    creatorEmail: "",
    record: "",
    winRate: 0,
    isMock: true,
    createdAt: new Date().toISOString(),
  });

  for (let i = 0; i < 10; i++) {
    const email = `mock_${team.clubId}_${i + 1}@playground.gg`;
    const name = namePool[nameIdx % namePool.length];
    nameIdx++;
    const region = randEl(regions);

    users.push({
      email,
      name,
      gender: randEl(["male", "female"]),
      birthdate: randBirth(),
      regionSido: region.sido,
      regionSigungu: region.sigungu,
      activeAreas: [region],
      sports: [team.sport],
      hasTeam: true,
      teamSport: team.sport,
      teamId: team.clubId,
      position: "",
      number: 0,
      avatar: avatars[(nameIdx + i) % avatars.length],
      role: "",
      record: { games: 0, goals: 0, assists: 0 },
      recentGoals: [],
      isMock: true,
      createdAt: new Date().toISOString(),
    });

    members.push({
      clubId: team.clubId,
      email,
      name,
      position: "",
      joinedAt: new Date().toISOString(),
      isMock: true,
    });
  }
}

async function seed() {
  // 클럽 4개
  await ddb.send(new BatchWriteCommand({
    RequestItems: {
      "playground-clubs": clubs.map(item => ({ PutRequest: { Item: item } })),
    },
  }));
  console.log(`${clubs.length} clubs created`);

  // 유저 40명
  for (let i = 0; i < users.length; i += 25) {
    const batch = users.slice(i, i + 25);
    await ddb.send(new BatchWriteCommand({
      RequestItems: { "playground-users": batch.map(item => ({ PutRequest: { Item: item } })) },
    }));
    console.log(`Users batch done (${batch.length})`);
  }

  // 멤버 40명
  for (let i = 0; i < members.length; i += 25) {
    const batch = members.slice(i, i + 25);
    await ddb.send(new BatchWriteCommand({
      RequestItems: { "playground-club-members": batch.map(item => ({ PutRequest: { Item: item } })) },
    }));
    console.log(`Members batch done (${batch.length})`);
  }

  console.log(`Done! 4 teams, ${users.length} users, ${members.length} members`);
}

seed().catch(console.error);
