import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);

const res = await ddb.send(new ScanCommand({
  TableName: "pg-matches",
  FilterExpression: "homeTeamId = :tid OR awayTeamId = :tid",
  ExpressionAttributeValues: { ":tid": "3dcafab5-867a-4028-9049-808ab273c236" },
}));

console.log(JSON.stringify(res.Items, null, 2));
