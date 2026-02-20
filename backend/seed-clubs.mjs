import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

const logos = [
  "/logos/Gemini_Generated_Image_3p9jt3p9jt3p9jt3.png",
  "/logos/Gemini_Generated_Image_51u3bi51u3bi51u3.png",
  "/logos/Gemini_Generated_Image_5jnh575jnh575jnh.png",
  "/logos/Gemini_Generated_Image_8jui758jui758jui.png",
  "/logos/Gemini_Generated_Image_bph5v3bph5v3bph5.png",
  "/logos/Gemini_Generated_Image_cou7ldcou7ldcou7.png",
  "/logos/Gemini_Generated_Image_d0038qd0038qd003.png",
  "/logos/Gemini_Generated_Image_jk8v4wjk8v4wjk8v.png",
  "/logos/Gemini_Generated_Image_khiunukhiunukhiu.png",
  "/logos/Gemini_Generated_Image_l1axhql1axhql1ax.png",
  "/logos/Gemini_Generated_Image_m14pp3m14pp3m14p.png",
  "/logos/Gemini_Generated_Image_vnv8fzvnv8fzvnv8.png",
  "/logos/Gemini_Generated_Image_y89jxyy89jxyy89j.png",
  "/logos/Gemini_Generated_Image_ye1n8pye1n8pye1n.png",
];

// 종목별 로고 인덱스 추적 (같은 종목 내 겹침 방지)
const sportLogoIdx = {};

function getLogoForSport(sport) {
  if (!sportLogoIdx[sport]) sportLogoIdx[sport] = 0;
  const idx = sportLogoIdx[sport] % logos.length;
  sportLogoIdx[sport]++;
  return logos[idx];
}

const regions = [
  { sido: "서울", sigungu: ["강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"] },
  { sido: "경기", sigungu: ["고양시","과천시","광명시","광주시","구리시","군포시","김포시","남양주시","부천시","성남시","수원시","시흥시","안산시","안양시","용인시","의정부시","파주시","평택시","하남시","화성시"] },
  { sido: "인천", sigungu: ["계양구","남동구","부평구","서구","연수구","중구"] },
];

function randEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function randAreas() {
  const count = randInt(1, 3);
  const set = new Set();
  const areas = [];
  while (areas.length < count) {
    const r = randEl(regions);
    const sg = randEl(r.sigungu);
    const key = r.sido + sg;
    if (!set.has(key)) { set.add(key); areas.push({ sido: r.sido, sigungu: sg }); }
  }
  return areas;
}

const styleOptions = ["공격형","수비형","역습형","점유형","압박형","측면공격","세트피스","균형형"];
function randStyles() {
  const count = randInt(1, 3);
  const picked = [];
  const copy = [...styleOptions];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}

function randRecord() {
  const w = randInt(0, 20), d = randInt(0, 10), l = randInt(0, 15);
  const total = w + d + l;
  const wr = total > 0 ? Math.round((w / total) * 100) : 0;
  return { record: `${w}승 ${d}무 ${l}패`, winRate: wr };
}

// 종목별 클럽 이름 (인기 종목 위주)
const clubNames = {
  축구: ["FC 드래곤","썬더 유나이티드","블루윙즈","레드스타","골든이글","실버호크","그린포레스트","화이트타이거","블랙팬서","스카이워커","스톰브레이커","피닉스","아이언울프","선라이즈","문라이트","스파르타","아틀라스","제니스","노바","빅토리아"],
  풋살: ["풋살킹즈","스피드스타","플래시","라이트닝","퀵실버","터보","블리츠","스프린터","대시","러너즈","볼트","제트","로켓","스위프트","에이스"],
  농구: ["슬램덩크","스카이하이","던커즈","후프스타","코트킹즈","바운스","스위시","앨리웁","트리플쓰리","파이널샷","블록버스터","리바운드","패스트브레이크","풀코트","하프코트"],
  야구: ["홈런히어로즈","다이아몬드","스트라이커즈","배트맨","피칭스타","그랜드슬램","세이프","스틸러","캐처즈","불펜파이어","이닝킹","파울라인","더그아웃","마운드","베이스캠프"],
  배구: ["스파이커즈","네트워커","서브에이스","블로커즈","세터즈","리시버","어택커즈","점프스타","하이터치","파워히트","스매시","디그","토스업","크로스코트","라인샷"],
  테니스: ["에이스클럽","서브앤발리","그랜드코트","매치포인트","듀스","브레이크포인트","넷러시","베이스라이너","탑스핀","슬라이스","드롭샷","로브","랠리","코트사이드","게임셋"],
  배드민턴: ["셔틀콕","스매시히어로","클리어샷","드라이브","네트플레이","하이클리어","드롭킹","러시","페더","버디","코트마스터","윙스","플라이트","스윙","래킷스타"],
};

const clubs = [];
let id = 1;

// 종목별 배분: 축구20, 풋살15, 농구15, 야구15, 배구10, 테니스10, 배드민턴15 = 100
const distribution = [
  { sport: "축구", count: 20 },
  { sport: "풋살", count: 15 },
  { sport: "농구", count: 15 },
  { sport: "야구", count: 15 },
  { sport: "배구", count: 10 },
  { sport: "테니스", count: 10 },
  { sport: "배드민턴", count: 15 },
];

for (const { sport, count } of distribution) {
  const names = clubNames[sport];
  for (let i = 0; i < count; i++) {
    const { record, winRate } = randRecord();
    const areas = randAreas();
    const name = i < names.length ? names[i] : `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`;
    clubs.push({
      clubId: `c${String(id).padStart(3, "0")}`,
      name,
      sport,
      areas,
      members: randInt(5, 25),
      styles: randStyles(),
      image: getLogoForSport(sport),
      creatorEmail: "",
      record,
      winRate,
      createdAt: new Date().toISOString(),
    });
    id++;
  }
}

// batch write (25개씩)
async function seed() {
  for (let i = 0; i < clubs.length; i += 25) {
    const batch = clubs.slice(i, i + 25);
    const params = {
      RequestItems: {
        "playground-clubs": batch.map((item) => ({ PutRequest: { Item: item } })),
      },
    };
    await ddb.send(new BatchWriteCommand(params));
    console.log(`Batch ${Math.floor(i / 25) + 1} done (${batch.length} items)`);
  }
  console.log(`Total ${clubs.length} clubs seeded.`);
}

seed().catch(console.error);
