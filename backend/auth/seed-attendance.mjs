import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = "pg-attendance";

// 서경 어벤져스 멤버들
const members = [
  { oderId: "박우인@skuniv.ac.kr", name: "박우인" },
  { oderId: "이승령@skuniv.ac.kr", name: "이승령" },
  { oderId: "장문항@skuniv.ac.kr", name: "장문항" },
  { oderId: "채민석@skuniv.ac.kr", name: "채민석" },
  { oderId: "정문영@skuniv.ac.kr", name: "정문영" },
  { oderId: "이건율@skuniv.ac.kr", name: "이건율" },
  { oderId: "박효현@skuniv.ac.kr", name: "박효현" },
  { oderId: "박진용@skuniv.ac.kr", name: "박진용" },
  { oderId: "허진@skuniv.ac.kr", name: "허진" },
  { oderId: "노해철@skuniv.ac.kr", name: "노해철" },
];

const attendanceData = [
  // 강남 FC 경기 (f417eea9-2700-4865-9ed4-c5e5abf6d1f7)
  { matchId: "f417eea9-2700-4865-9ed4-c5e5abf6d1f7", oderId: members[0].oderId, userName: members[0].name, status: "accepted" },
  { matchId: "f417eea9-2700-4865-9ed4-c5e5abf6d1f7", oderId: members[1].oderId, userName: members[1].name, status: "accepted" },
  { matchId: "f417eea9-2700-4865-9ed4-c5e5abf6d1f7", oderId: members[2].oderId, userName: members[2].name, status: "accepted" },
  { matchId: "f417eea9-2700-4865-9ed4-c5e5abf6d1f7", oderId: members[3].oderId, userName: members[3].name, status: "declined" },
  { matchId: "f417eea9-2700-4865-9ed4-c5e5abf6d1f7", oderId: members[4].oderId, userName: members[4].name, status: "accepted" },
  { matchId: "f417eea9-2700-4865-9ed4-c5e5abf6d1f7", oderId: members[5].oderId, userName: members[5].name, status: "declined" },
  
  // FC 블루 경기 (upcoming-001)
  { matchId: "upcoming-001", oderId: members[0].oderId, userName: members[0].name, status: "accepted" },
  { matchId: "upcoming-001", oderId: members[1].oderId, userName: members[1].name, status: "accepted" },
  { matchId: "upcoming-001", oderId: members[2].oderId, userName: members[2].name, status: "accepted" },
  { matchId: "upcoming-001", oderId: members[3].oderId, userName: members[3].name, status: "accepted" },
  { matchId: "upcoming-001", oderId: members[4].oderId, userName: members[4].name, status: "accepted" },
  { matchId: "upcoming-001", oderId: members[6].oderId, userName: members[6].name, status: "accepted" },
  { matchId: "upcoming-001", oderId: members[7].oderId, userName: members[7].name, status: "accepted" },
  { matchId: "upcoming-001", oderId: members[5].oderId, userName: members[5].name, status: "declined" },
  { matchId: "upcoming-001", oderId: members[8].oderId, userName: members[8].name, status: "declined" },
  
  // 훈련 (upcoming-002)
  { matchId: "upcoming-002", oderId: members[0].oderId, userName: members[0].name, status: "accepted" },
  { matchId: "upcoming-002", oderId: members[1].oderId, userName: members[1].name, status: "accepted" },
  { matchId: "upcoming-002", oderId: members[4].oderId, userName: members[4].name, status: "accepted" },
  { matchId: "upcoming-002", oderId: members[6].oderId, userName: members[6].name, status: "accepted" },
  { matchId: "upcoming-002", oderId: members[2].oderId, userName: members[2].name, status: "declined" },
  { matchId: "upcoming-002", oderId: members[3].oderId, userName: members[3].name, status: "declined" },
  { matchId: "upcoming-002", oderId: members[9].oderId, userName: members[9].name, status: "declined" },
];

for (const att of attendanceData) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      matchId: att.matchId,
      userId: att.oderId,
      userName: att.userName,
      status: att.status,
      updatedAt: new Date().toISOString(),
    },
  }));
  console.log("Inserted:", att.matchId.slice(0, 12), att.userName, att.status);
}

console.log("Done!");
