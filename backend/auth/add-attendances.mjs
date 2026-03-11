import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = "playground-matches";

// 서경 어벤져스 멤버들
const members = [
  { email: "박우인@skuniv.ac.kr", name: "박우인" },
  { email: "이승령@skuniv.ac.kr", name: "이승령" },
  { email: "장문항@skuniv.ac.kr", name: "장문항" },
  { email: "채민석@skuniv.ac.kr", name: "채민석" },
  { email: "정문영@skuniv.ac.kr", name: "정문영" },
  { email: "이건율@skuniv.ac.kr", name: "이건율" },
  { email: "박효현@skuniv.ac.kr", name: "박효현" },
  { email: "박진용@skuniv.ac.kr", name: "박진용" },
  { email: "허진@skuniv.ac.kr", name: "허진" },
  { email: "노해철@skuniv.ac.kr", name: "노해철" },
  { email: "이종훈@skuniv.ac.kr", name: "이종훈" },
];

// 경기별 참석자 데이터
const matchAttendances = {
  "match-seokyung-002": [ // 레드 임팩트 3-1 승
    { oderId: members[0].email, name: members[0].name, status: "accepted" },
    { oderId: members[1].email, name: members[1].name, status: "accepted" },
    { oderId: members[4].email, name: members[4].name, status: "accepted" },
    { oderId: members[5].email, name: members[5].name, status: "accepted" },
    { oderId: members[6].email, name: members[6].name, status: "accepted" },
    { oderId: members[7].email, name: members[7].name, status: "accepted" },
    { oderId: members[9].email, name: members[9].name, status: "accepted" },
    { oderId: members[10].email, name: members[10].name, status: "accepted" },
  ],
  "match-seokyung-003": [ // 골든 스트라이커 2-2 무
    { oderId: members[0].email, name: members[0].name, status: "accepted" },
    { oderId: members[2].email, name: members[2].name, status: "accepted" },
    { oderId: members[4].email, name: members[4].name, status: "accepted" },
    { oderId: members[6].email, name: members[6].name, status: "accepted" },
    { oderId: members[7].email, name: members[7].name, status: "accepted" },
    { oderId: members[8].email, name: members[8].name, status: "accepted" },
  ],
  "match-seokyung-004": [ // 블루 스톰 1-2 패
    { oderId: members[1].email, name: members[1].name, status: "accepted" },
    { oderId: members[3].email, name: members[3].name, status: "accepted" },
    { oderId: members[5].email, name: members[5].name, status: "accepted" },
    { oderId: members[6].email, name: members[6].name, status: "accepted" },
    { oderId: members[9].email, name: members[9].name, status: "accepted" },
  ],
};

for (const [matchId, attendances] of Object.entries(matchAttendances)) {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { matchId },
    UpdateExpression: "SET attendances = :att",
    ExpressionAttributeValues: { ":att": attendances },
  }));
  console.log("Updated:", matchId, "with", attendances.length, "attendees");
}

console.log("Done!");
