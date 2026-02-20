import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

const TEAM_ID = "c015";
const TEAM_SPORT = "축구";

const avatars = Array.from({ length: 20 }, (_, i) => {
  const ext = [13, 15, 16].includes(i + 1) ? "png" : "jpg";
  return `/user_${i + 1}.${ext}`;
});

const names = [
  "김민준","이서준","박지호","최현우","정도윤","강시우","윤준서",
  "임지훈","한승민","오태양","신재원","백승호","류성민","조하늘",
  "장우진","권태현","남기범","문정호","서동혁","안재영","홍성빈",
  "배진우","송민석",
];

const positions = ["GK","DF","DF","DF","DF","MF","MF","MF","MF","FW","FW","FW","GK","DF","MF","FW","DF","MF","FW","DF","MF","MF","FW"];
const numbers = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];

const regions = [
  { sido: "서울", sigungu: "강남구" }, { sido: "서울", sigungu: "마포구" },
  { sido: "서울", sigungu: "송파구" }, { sido: "경기", sigungu: "성남시" },
  { sido: "경기", sigungu: "수원시" }, { sido: "서울", sigungu: "강서구" },
  { sido: "인천", sigungu: "부평구" }, { sido: "경기", sigungu: "고양시" },
  { sido: "서울", sigungu: "영등포구" }, { sido: "서울", sigungu: "노원구" },
];

function randEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randBirth() {
  const y = randInt(1990, 2005);
  const m = String(randInt(1, 12)).padStart(2, "0");
  const d = String(randInt(1, 28)).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const players = [];
const members = [];

for (let i = 0; i < 23; i++) {
  const email = `mock_player_${i + 1}@playground.gg`;
  const name = names[i];
  const position = positions[i];
  const number = numbers[i];
  const region = randEl(regions);
  const games = randInt(5, 40);
  const goals = position === "GK" ? randInt(0, 2) : position === "DF" ? randInt(0, 8) : position === "MF" ? randInt(2, 15) : randInt(5, 25);
  const assists = randInt(0, 12);

  players.push({
    email,
    name,
    gender: "male",
    birthdate: randBirth(),
    regionSido: region.sido,
    regionSigungu: region.sigungu,
    activeAreas: [region],
    sports: ["축구"],
    hasTeam: true,
    teamSport: TEAM_SPORT,
    teamId: TEAM_ID,
    position,
    number,
    avatar: avatars[i % avatars.length],
    role: i === 0 ? "주장" : "",
    record: { games, goals, assists },
    recentGoals: [],
    isMock: true,
    createdAt: new Date().toISOString(),
  });

  members.push({
    clubId: TEAM_ID,
    email,
    name,
    position,
    joinedAt: new Date().toISOString(),
    isMock: true,
  });
}

async function seed() {
  // playground-users 테이블에 23명 넣기
  for (let i = 0; i < players.length; i += 25) {
    const batch = players.slice(i, i + 25);
    await ddb.send(new BatchWriteCommand({
      RequestItems: {
        "playground-users": batch.map(item => ({ PutRequest: { Item: item } })),
      },
    }));
    console.log(`Users batch ${Math.floor(i / 25) + 1} done (${batch.length})`);
  }

  // playground-club-members 테이블에도 넣기
  for (let i = 0; i < members.length; i += 25) {
    const batch = members.slice(i, i + 25);
    await ddb.send(new BatchWriteCommand({
      RequestItems: {
        "playground-club-members": batch.map(item => ({ PutRequest: { Item: item } })),
      },
    }));
    console.log(`Members batch ${Math.floor(i / 25) + 1} done (${batch.length})`);
  }

  console.log(`Done! ${players.length} players + ${members.length} members seeded for team ${TEAM_ID}`);
}

seed().catch(console.error);
