import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = "playground-clubs";

const clubs = [
  {
    clubId: "fc-blue-001",
    name: "FC 블루",
    sportType: "soccer",
    region: "서울 강남",
    recruiting: false,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    clubId: "red-impact-001",
    name: "레드 임팩트",
    sportType: "soccer",
    region: "서울 서초",
    recruiting: false,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    clubId: "golden-striker-001",
    name: "골든 스트라이커",
    sportType: "soccer",
    region: "서울 강남",
    recruiting: false,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    clubId: "blue-storm-001",
    name: "블루 스톰",
    sportType: "soccer",
    region: "서울 송파",
    recruiting: false,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

async function seed() {
  for (const club of clubs) {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: club }));
    console.log("Inserted:", club.name);
  }
  console.log("Done!");
}

seed().catch(console.error);
