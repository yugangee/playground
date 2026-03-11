import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = "pg-matches";
const TEAM_ID = "3dcafab5-867a-4028-9049-808ab273c236";

const matches = [
  {
    id: "upcoming-001",
    homeTeamId: TEAM_ID,
    awayTeamId: "fc-blue-001",
    awayTeamName: "FC 블루",
    type: "경기",
    scheduledAt: "2026-03-20T14:00:00",
    venue: "서경대 운동장",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "upcoming-002",
    homeTeamId: TEAM_ID,
    type: "훈련",
    scheduledAt: "2026-03-22T19:00:00",
    venue: "성북구 풋살장",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
];

for (const match of matches) {
  await ddb.send(new PutCommand({ TableName: TABLE, Item: match }));
  console.log("Inserted:", match.id, match.type);
}

console.log("Done!");
