import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || "us-east-1" });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const s3 = new S3Client({ region: "us-east-1" });
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const USER_POOL_ID = process.env.USER_POOL_ID || "us-east-1_dolZhFZDJ";
const USERS_TABLE = "playground-users";
const CLUBS_TABLE = "playground-clubs";
const MEMBERS_TABLE = "playground-club-members";
const S3_BUCKET = "playground-web-sedaily-us";
const CF_DOMAIN = "https://d1t0vkbh1b2z3x.cloudfront.net";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

function res(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function signup(body) {
  const { email, password, name, gender, birthdate, regionSido, regionSigungu, activeAreas, sports, hasTeam, teamSport, teamId } = body;
  const attrs = [{ Name: "name", Value: name }, { Name: "email", Value: email }];
  if (gender) attrs.push({ Name: "gender", Value: gender });
  if (birthdate) attrs.push({ Name: "birthdate", Value: birthdate });

  const result = await cognito.send(new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: attrs,
  }));

  await cognito.send(new AdminConfirmSignUpCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
  }));

  // DynamoDB에 프로필 저장
  await ddb.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: {
      email,
      name,
      gender: gender || "",
      birthdate: birthdate || "",
      regionSido: regionSido || "",
      regionSigungu: regionSigungu || "",
      activeAreas: activeAreas || [],
      sports: sports || [],
      hasTeam: hasTeam || false,
      teamSport: teamSport || "",
      teamId: teamId || null,
      position: body.position || "",
      avatar: "",
      number: 0,
      role: "",
      record: { games: 0, goals: 0, assists: 0 },
      recentGoals: [],
      createdAt: new Date().toISOString(),
    },
  }));

  // 팀 선택했으면 클럽 멤버로도 등록
  if (hasTeam && teamId) {
    await ddb.send(new PutCommand({
      TableName: MEMBERS_TABLE,
      Item: {
        clubId: teamId,
        email,
        name,
        position: body.position || "",
        joinedAt: new Date().toISOString(),
      },
    }));
  }

  return res(200, { message: "회원가입 성공", userSub: result.UserSub, confirmed: true });
}

async function login(body) {
  const { email, password } = body;
  const result = await cognito.send(new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  }));
  const auth = result.AuthenticationResult;
  return res(200, {
    accessToken: auth.AccessToken,
    idToken: auth.IdToken,
    refreshToken: auth.RefreshToken,
    expiresIn: auth.ExpiresIn,
  });
}

async function getMe(accessToken) {
  const result = await cognito.send(new GetUserCommand({ AccessToken: accessToken }));
  const attrs = {};
  result.UserAttributes.forEach(a => { attrs[a.Name] = a.Value; });

  // DynamoDB에서 확장 프로필 가져오기
  const email = attrs.email;
  let profile = {};
  if (email) {
    try {
      const dbResult = await ddb.send(new QueryCommand({
        TableName: USERS_TABLE,
        KeyConditionExpression: "email = :e",
        ExpressionAttributeValues: { ":e": email },
      }));
      if (dbResult.Items && dbResult.Items.length > 0) {
        profile = dbResult.Items[0];
      }
    } catch (e) {
      console.error("DynamoDB profile fetch error:", e);
    }
  }

  return res(200, { username: result.Username, ...attrs, ...profile });
}

async function updateProfile(accessToken, body) {
  const result = await cognito.send(new GetUserCommand({ AccessToken: accessToken }));
  const attrs = {};
  result.UserAttributes.forEach(a => { attrs[a.Name] = a.Value; });
  const email = attrs.email;
  if (!email) return res(400, { message: "이메일을 찾을 수 없습니다" });

  const allowed = ["name", "gender", "birthdate", "regionSido", "regionSigungu", "activeAreas", "sports", "position", "teamId", "teamSport", "hasTeam", "avatar"];
  const updates = {};
  const exprParts = [];
  const exprNames = {};
  const exprValues = {};
  let idx = 0;
  for (const key of allowed) {
    if (body[key] !== undefined) {
      const nameKey = `#f${idx}`;
      const valKey = `:v${idx}`;
      exprParts.push(`${nameKey} = ${valKey}`);
      exprNames[nameKey] = key;
      exprValues[valKey] = body[key];
      idx++;
    }
  }
  if (exprParts.length === 0) return res(400, { message: "수정할 항목이 없습니다" });

  const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
  await ddb.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { email },
    UpdateExpression: "SET " + exprParts.join(", "),
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
  }));

  // 이름 변경 시 club-members 테이블도 동기화
  if (body.name !== undefined) {
    try {
      const userResult = await ddb.send(new QueryCommand({
        TableName: USERS_TABLE,
        KeyConditionExpression: "email = :e",
        ExpressionAttributeValues: { ":e": email },
      }));
      const profile = userResult.Items?.[0];
      if (profile?.teamId) {
        await ddb.send(new UpdateCommand({
          TableName: MEMBERS_TABLE,
          Key: { clubId: profile.teamId, email },
          UpdateExpression: "SET #n = :n",
          ExpressionAttributeNames: { "#n": "name" },
          ExpressionAttributeValues: { ":n": body.name },
        }));
      }
    } catch (e) {
      console.error("club-members name sync error:", e);
    }
  }

  return res(200, { message: "프로필 수정 성공" });
}

async function createClub(body) {
  const { name, sport, areas, members, styles, image, creatorEmail } = body;
  if (!name) return res(400, { message: "클럽명은 필수입니다" });
  const clubId = crypto.randomUUID();
  await ddb.send(new PutCommand({
    TableName: CLUBS_TABLE,
    Item: {
      clubId,
      name,
      sport: sport || "",
      areas: areas || [],
      members: members || 0,
      styles: styles || [],
      image: image || "",
      creatorEmail: creatorEmail || "",
      record: "0승 0무 0패",
      winRate: 0,
      createdAt: new Date().toISOString(),
    },
  }));
  return res(200, { message: "클럽 생성 성공", clubId });
}

async function getUploadUrl(body) {
  const { folder, fileName, contentType } = body;
  const ext = fileName.split(".").pop() || "jpg";
  const key = `uploads/${folder}/${crypto.randomUUID()}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType || "image/jpeg",
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `${CF_DOMAIN}/${key}`;
  return res(200, { uploadUrl, publicUrl, key });
}

async function listClubs(query) {
  const sport = query?.sport;
  if (sport) {
    // 종목 필터는 scan + filter (GSI 없이)
    const result = await ddb.send(new ScanCommand({
      TableName: CLUBS_TABLE,
      FilterExpression: "sport = :s",
      ExpressionAttributeValues: { ":s": sport },
    }));
    return res(200, { clubs: result.Items || [] });
  }
  const result = await ddb.send(new ScanCommand({ TableName: CLUBS_TABLE }));
  return res(200, { clubs: result.Items || [] });
}

async function addClubMember(body) {
  const { clubId, email, name, position } = body;
  if (!clubId || !email) return res(400, { message: "clubId와 email은 필수입니다" });
  await ddb.send(new PutCommand({
    TableName: MEMBERS_TABLE,
    Item: {
      clubId,
      email,
      name: name || "",
      position: position || "",
      joinedAt: new Date().toISOString(),
    },
  }));
  return res(200, { message: "멤버 등록 성공" });
}

async function deleteClubMember(body) {
  const { clubId, email } = body;
  if (!clubId || !email) return res(400, { message: "clubId와 email은 필수입니다" });
  const { DeleteCommand } = await import("@aws-sdk/lib-dynamodb");
  await ddb.send(new DeleteCommand({
    TableName: MEMBERS_TABLE,
    Key: { clubId, email },
  }));
  return res(200, { message: "멤버 삭제 성공" });
}

async function updateClubMember(body) {
  const { clubId, email, name, position } = body;
  if (!clubId || !email) return res(400, { message: "clubId와 email은 필수입니다" });
  const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
  const exprParts = [];
  const exprNames = {};
  const exprValues = {};
  let idx = 0;
  for (const key of ["name", "position"]) {
    if (body[key] !== undefined) {
      exprParts.push(`#f${idx} = :v${idx}`);
      exprNames[`#f${idx}`] = key;
      exprValues[`:v${idx}`] = body[key];
      idx++;
    }
  }
  if (exprParts.length === 0) return res(400, { message: "수정할 항목이 없습니다" });
  await ddb.send(new UpdateCommand({
    TableName: MEMBERS_TABLE,
    Key: { clubId, email },
    UpdateExpression: "SET " + exprParts.join(", "),
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
  }));
  return res(200, { message: "멤버 수정 성공" });
}

async function getClubMembers(clubId) {
  const result = await ddb.send(new QueryCommand({
    TableName: MEMBERS_TABLE,
    KeyConditionExpression: "clubId = :c",
    ExpressionAttributeValues: { ":c": clubId },
  }));
  return res(200, { members: result.Items || [] });
}

async function updateClub(body) {
  const { clubId, captainEmail } = body;
  if (!clubId) return res(400, { message: "clubId는 필수입니다" });
  const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
  const exprParts = [];
  const exprNames = {};
  const exprValues = {};
  let idx = 0;
  const allowed = ["captainEmail", "recruiting"];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      exprParts.push(`#f${idx} = :v${idx}`);
      exprNames[`#f${idx}`] = key;
      exprValues[`:v${idx}`] = body[key];
      idx++;
    }
  }
  if (exprParts.length === 0) return res(400, { message: "수정할 항목이 없습니다" });
  await ddb.send(new UpdateCommand({
    TableName: CLUBS_TABLE,
    Key: { clubId },
    UpdateExpression: "SET " + exprParts.join(", "),
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
  }));
  return res(200, { message: "클럽 수정 성공" });
}

async function listUsers() {
  const result = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }));
  return res(200, { users: result.Items || [] });
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return res(200, {});

  const path = event.path;
  const method = event.httpMethod;

  try {
    if (method === "POST" && path === "/auth/signup") {
      return await signup(JSON.parse(event.body));
    }
    if (method === "POST" && path === "/auth/login") {
      return await login(JSON.parse(event.body));
    }
    if (method === "GET" && path === "/auth/me") {
      const token = (event.headers.Authorization || event.headers.authorization || "").replace("Bearer ", "");
      if (!token) return res(401, { message: "토큰이 필요합니다" });
      return await getMe(token);
    }
    if (method === "PUT" && path === "/auth/profile") {
      const token = (event.headers.Authorization || event.headers.authorization || "").replace("Bearer ", "");
      if (!token) return res(401, { message: "토큰이 필요합니다" });
      return await updateProfile(token, JSON.parse(event.body));
    }
    if (method === "POST" && path === "/clubs") {
      return await createClub(JSON.parse(event.body));
    }
    if (method === "PUT" && path === "/clubs") {
      return await updateClub(JSON.parse(event.body));
    }
    if (method === "GET" && path === "/clubs") {
      return await listClubs(event.queryStringParameters);
    }
    if (method === "POST" && path === "/club-members") {
      return await addClubMember(JSON.parse(event.body));
    }
    if (method === "PUT" && path === "/club-members") {
      return await updateClubMember(JSON.parse(event.body));
    }
    if (method === "DELETE" && path === "/club-members") {
      return await deleteClubMember(JSON.parse(event.body));
    }
    if (method === "GET" && path.startsWith("/club-members/")) {
      const clubId = path.split("/club-members/")[1];
      return await getClubMembers(clubId);
    }
    if (method === "POST" && path === "/upload-url") {
      return await getUploadUrl(JSON.parse(event.body));
    }
    if (method === "GET" && path === "/users") {
      return await listUsers();
    }
    return res(404, { message: "Not found" });
  } catch (err) {
    console.error(err);
    const code = err.name === "NotAuthorizedException" ? 401
      : err.name === "UsernameExistsException" ? 409
      : err.name === "UserNotConfirmedException" ? 403
      : 500;
    return res(code, { message: err.message });
  }
};
