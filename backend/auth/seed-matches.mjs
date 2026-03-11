import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = "playground-matches";
const CLUB_ID = "3dcafab5-867a-4028-9049-808ab273c236";

const matches = [
  // 다음 일정 1: FC 블루 경기 (3/15)
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
      { scorer: "player1@test.com", club: CLUB_ID, count: 2 },
      { scorer: "player2@test.com", club: CLUB_ID, count: 1 },
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
      { scorer: "player1@test.com", club: CLUB_ID, count: 1 },
      { scorer: "player3@test.com", club: CLUB_ID, count: 1 },
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
      { scorer: "player2@test.com", club: CLUB_ID, count: 1 },
    ],
    createdAt: "2026-02-15T10:00:00.000Z",
  },
];

async function seed() {
  for (const match of matches) {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: match }));
    console.log("Inserted:", match.matchId);
  }
  console.log("Done!");
}

seed().catch(console.error);
