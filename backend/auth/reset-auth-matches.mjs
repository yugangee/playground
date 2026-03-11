import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = "playground-matches";
const CLUB_ID = "3dcafab5-867a-4028-9049-808ab273c236";

// 1. 기존 데이터 삭제
const existing = await ddb.send(new ScanCommand({
  TableName: TABLE,
  FilterExpression: "homeClubId = :cid OR awayClubId = :cid",
  ExpressionAttributeValues: { ":cid": CLUB_ID },
}));

for (const item of existing.Items || []) {
  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { matchId: item.matchId },
  }));
  console.log("Deleted:", item.matchId);
}

// 서경 어벤져스 멤버들 (FW 위주로 골 기록)
const members = [
  { email: "박우인@skuniv.ac.kr", name: "박우인", position: "FW" },
  { email: "이승령@skuniv.ac.kr", name: "이승령", position: "FW" },
  { email: "장문항@skuniv.ac.kr", name: "장문항", position: "FW" },
  { email: "채민석@skuniv.ac.kr", name: "채민석", position: "FW" },
  { email: "정문영@skuniv.ac.kr", name: "정문영", position: "MF" },
  { email: "이건율@skuniv.ac.kr", name: "이건율", position: "MF" },
  { email: "박효현@skuniv.ac.kr", name: "박효현", position: "GK" },
  { email: "박진용@skuniv.ac.kr", name: "박진용", position: "DF" },
  { email: "허진@skuniv.ac.kr", name: "허진", position: "DF" },
  { email: "노해철@skuniv.ac.kr", name: "노해철", position: "MF" },
  { email: "이종훈@skuniv.ac.kr", name: "이종훈", position: "MF" },
];

// 2. 새 데이터 삽입
const matches = [
  // 다음 일정: FC 블루 경기 (3/15) - scheduled 상태
  {
    matchId: "match-seokyung-001",
    homeClubId: CLUB_ID,
    awayClubId: "fc-blue-001",
    sport: "축구",
    date: "2026-03-15",
    venue: "강남 풋살장",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    goals: [],
    attendances: [
      { oderId: members[0].email, name: members[0].name, status: "accepted" },
      { oderId: members[1].email, name: members[1].name, status: "accepted" },
      { oderId: members[2].email, name: members[2].name, status: "accepted" },
      { oderId: members[4].email, name: members[4].name, status: "accepted" },
      { oderId: members[5].email, name: members[5].name, status: "accepted" },
      { oderId: members[6].email, name: members[6].name, status: "accepted" },
      { oderId: members[7].email, name: members[7].name, status: "accepted" },
      { oderId: members[3].email, name: members[3].name, status: "declined" },
      { oderId: members[8].email, name: members[8].name, status: "declined" },
    ],
    createdAt: "2026-03-10T10:00:00.000Z",
  },
  // 완료된 경기 1: 레드 임팩트 (3-1 승)
  {
    matchId: "match-seokyung-002",
    homeClubId: CLUB_ID,
    awayClubId: "red-impact-001",
    sport: "축구",
    date: "2026-03-08",
    venue: "서초 운동장",
    status: "confirmed",
    homeScore: 3,
    awayScore: 1,
    confirmedAt: "2026-03-08T18:00:00.000Z",
    goals: [
      { scorer: members[0].email, scorerName: members[0].name, club: CLUB_ID, count: 2 },
      { scorer: members[1].email, scorerName: members[1].name, club: CLUB_ID, count: 1 },
    ],
    attendances: [
      { oderId: members[0].email, name: members[0].name, status: "accepted" },
      { oderId: members[1].email, name: members[1].name, status: "accepted" },
      { oderId: members[4].email, name: members[4].name, status: "accepted" },
      { oderId: members[5].email, name: members[5].name, status: "accepted" },
      { oderId: members[6].email, name: members[6].name, status: "accepted" },
      { oderId: members[7].email, name: members[7].name, status: "accepted" },
      { oderId: members[9].email, name: members[9].name, status: "accepted" },
      { oderId: members[10].email, name: members[10].name, status: "accepted" },
    ],
    createdAt: "2026-03-01T10:00:00.000Z",
  },
  // 완료된 경기 2: 골든 스트라이커 (2-2 무)
  {
    matchId: "match-seokyung-003",
    homeClubId: CLUB_ID,
    awayClubId: "golden-striker-001",
    sport: "축구",
    date: "2026-03-01",
    venue: "강남 체육관",
    status: "confirmed",
    homeScore: 2,
    awayScore: 2,
    confirmedAt: "2026-03-01T17:00:00.000Z",
    goals: [
      { scorer: members[2].email, scorerName: members[2].name, club: CLUB_ID, count: 1 },
      { scorer: members[4].email, scorerName: members[4].name, club: CLUB_ID, count: 1 },
    ],
    attendances: [
      { oderId: members[0].email, name: members[0].name, status: "accepted" },
      { oderId: members[2].email, name: members[2].name, status: "accepted" },
      { oderId: members[4].email, name: members[4].name, status: "accepted" },
      { oderId: members[6].email, name: members[6].name, status: "accepted" },
      { oderId: members[7].email, name: members[7].name, status: "accepted" },
      { oderId: members[8].email, name: members[8].name, status: "accepted" },
    ],
    createdAt: "2026-02-20T10:00:00.000Z",
  },
  // 완료된 경기 3: 블루 스톰 (1-2 패, 원정)
  {
    matchId: "match-seokyung-004",
    homeClubId: "blue-storm-001",
    awayClubId: CLUB_ID,
    sport: "축구",
    date: "2026-02-22",
    venue: "송파 구장",
    status: "confirmed",
    homeScore: 2,
    awayScore: 1,
    confirmedAt: "2026-02-22T16:00:00.000Z",
    goals: [
      { scorer: members[3].email, scorerName: members[3].name, club: CLUB_ID, count: 1 },
    ],
    attendances: [
      { oderId: members[1].email, name: members[1].name, status: "accepted" },
      { oderId: members[3].email, name: members[3].name, status: "accepted" },
      { oderId: members[5].email, name: members[5].name, status: "accepted" },
      { oderId: members[6].email, name: members[6].name, status: "accepted" },
      { oderId: members[9].email, name: members[9].name, status: "accepted" },
    ],
    createdAt: "2026-02-15T10:00:00.000Z",
  },
];

for (const match of matches) {
  await ddb.send(new PutCommand({ TableName: TABLE, Item: match }));
  console.log("Inserted:", match.matchId);
}

console.log("Done!");
