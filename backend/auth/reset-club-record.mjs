import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);

await ddb.send(new UpdateCommand({
  TableName: "playground-clubs",
  Key: { clubId: "3dcafab5-867a-4028-9049-808ab273c236" },
  UpdateExpression: "SET #rec = :rec, winRate = :wr",
  ExpressionAttributeNames: { "#rec": "record" },
  ExpressionAttributeValues: { ":rec": "0승 0무 0패", ":wr": 0 },
}));

console.log("Done! Reset record for 서경 어벤져스");
