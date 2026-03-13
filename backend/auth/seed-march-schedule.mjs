import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);

const MATCHES_TABLE = "playground-matches";
const ACTIVITIES_TABLE = "playground-activities";

// 서경 어벤져스 clubId
const SEOKYUNG_CLUB_ID = "3dcafab5-867a-4028-9049-808ab273c236";

// 매치(경기) 데이터
const matches = [
  {
    matchId: crypto.randomUUID(),
    homeClubId: SEOKYUNG_CLUB_ID,
    awayClubId: "asiaeconomy-fc",
    awayClubName: "아시아경제",
    sport: "축구",
    date: "2026-03-10",
    time: "18:00~20:00",
    venue: "고척",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    goals: [],
    createdAt: new Date().toISOString(),
  },
  {
    matchId: crypto.randomUUID(),
    homeClubId: SEOKYUNG_CLUB_ID,
    awayClubId: "edaily-fc",
    awayClubName: "이데일리",
    sport: "축구",
    date: "2026-03-13",
    time: "19:00~21:00",
    venue: "서울디지털운동장",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    goals: [],
    createdAt: new Date().toISOString(),
  },
  {
    matchId: crypto.randomUUID(),
    homeClubId: SEOKYUNG_CLUB_ID,
    awayClubId: "thebell-fc",
    awayClubName: "더벨",
    sport: "축구",
    date: "2026-03-25",
    time: "18:00~20:00",
    venue: "노량진",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    goals: [],
    createdAt: new Date().toISOString(),
  },
];

// 활동(훈련) 데이터
const activities = [
  {
    activityId: crypto.randomUUID(),
    clubId: SEOKYUNG_CLUB_ID,
    sport: "축구",
    type: "training",
    title: "아침운동",
    date: "2026-03-20",
    time: "08:00",
    venue: "노량진",
    createdBy: "system",
    participants: [],
    status: "open",
    completedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    activityId: crypto.randomUUID(),
    clubId: SEOKYUNG_CLUB_ID,
    sport: "축구",
    type: "training",
    title: "아침 운동",
    date: "2026-03-31",
    time: "08:00",
    venue: "노량진",
    createdBy: "system",
    participants: [],
    status: "open",
    completedAt: null,
    createdAt: new Date().toISOString(),
  },
];

console.log("🏟️ 서경 어벤져스 3월 일정 추가 시작...\n");

// 매치 추가
console.log("📋 경기 일정 추가:");
for (const match of matches) {
  await ddb.send(new PutCommand({
    TableName: MATCHES_TABLE,
    Item: match,
  }));
  console.log(`  ✅ ${match.date} ${match.awayClubName} 매치 (${match.venue})`);
}

// 활동 추가
console.log("\n🏃 훈련 일정 추가:");
for (const activity of activities) {
  await ddb.send(new PutCommand({
    TableName: ACTIVITIES_TABLE,
    Item: activity,
  }));
  console.log(`  ✅ ${activity.date} ${activity.title} (${activity.venue})`);
}

console.log("\n✨ 완료! 총 " + matches.length + "개 경기, " + activities.length + "개 훈련 추가됨");
