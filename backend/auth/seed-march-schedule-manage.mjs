import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);

const MATCHES_TABLE = "pg-matches";

// 서경 어벤져스 (Manage API) homeTeamId
const SEOKYUNG_TEAM_ID = "3dcafab5-867a-4028-9049-808ab273c236";

// 매치 데이터 (경기 + 훈련)
const matches = [
  {
    id: crypto.randomUUID(),
    homeTeamId: SEOKYUNG_TEAM_ID,
    awayTeamId: "asiaeconomy-fc",
    awayTeamName: "아시아경제",
    type: "경기",
    scheduledAt: "2026-03-10T18:00:00",
    endAt: "2026-03-10T20:00:00",
    venue: "고척",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    homeTeamId: SEOKYUNG_TEAM_ID,
    awayTeamId: "edaily-fc",
    awayTeamName: "이데일리",
    type: "경기",
    scheduledAt: "2026-03-13T19:00:00",
    endAt: "2026-03-13T21:00:00",
    venue: "서울디지털운동장",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    homeTeamId: SEOKYUNG_TEAM_ID,
    type: "훈련",
    scheduledAt: "2026-03-20T08:00:00",
    venue: "노량진",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    homeTeamId: SEOKYUNG_TEAM_ID,
    awayTeamId: "thebell-fc",
    awayTeamName: "더벨",
    type: "경기",
    scheduledAt: "2026-03-25T18:00:00",
    endAt: "2026-03-25T20:00:00",
    venue: "노량진",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    homeTeamId: SEOKYUNG_TEAM_ID,
    type: "훈련",
    scheduledAt: "2026-03-31T08:00:00",
    venue: "노량진",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
];

console.log("🏟️ 서경 어벤져스 3월 일정 추가 (pg-matches 테이블)...\n");

for (const match of matches) {
  await ddb.send(new PutCommand({
    TableName: MATCHES_TABLE,
    Item: match,
  }));
  const dt = new Date(match.scheduledAt);
  const dateStr = `${dt.getMonth() + 1}/${dt.getDate()}`;
  const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  const desc = match.type === "경기" ? `vs ${match.awayTeamName}` : match.type;
  console.log(`  ✅ ${dateStr} ${timeStr} ${desc} (${match.venue})`);
}

console.log("\n✨ 완료! 총 " + matches.length + "개 일정 추가됨");
