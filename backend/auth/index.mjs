  import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { calculateMatchPoints, calculateGoalPoints, calculateActivityPoints, determinePlayerTier, determineTeamTier } from "./scoring.mjs";
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
const MATCHES_TABLE = "playground-matches";
const ACTIVITIES_TABLE = "playground-activities";
const JOIN_REQUESTS_TABLE = "playground-join-requests";
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
  const { email, password, name, gender, birthdate, regionSido, regionSigungu, activeAreas, sports, hasTeam, teamSport, teamId, teamIds } = body;
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
      teamId: teamId || (teamIds && teamIds.length > 0 ? teamIds[0] : null),
      teamIds: teamIds || (teamId ? [teamId] : []),
      position: body.position || "",
      kakaoId: body.kakaoId || null,
      avatar: "",
      number: 0,
      teamNumbers: {},
      role: "",
      record: { games: 0, goals: 0, assists: 0 },
      recentGoals: [],
      createdAt: new Date().toISOString(),
    },
  }));

  // 팀 선택했으면 클럽 멤버로도 등록
  const joinTeamIds = teamIds || (teamId ? [teamId] : []);
  for (const tid of joinTeamIds) {
    await ddb.send(new PutCommand({
      TableName: MEMBERS_TABLE,
      Item: {
        clubId: tid,
        email,
        name,
        position: body.position || "",
        joinedAt: new Date().toISOString(),
      },
    }));
  }

  return res(200, { message: "회원가입 성공", userSub: result.UserSub, confirmed: true });
}

async function refreshTokens(body) {
  const { refreshToken } = body;
  if (!refreshToken) return res(400, { message: "refreshToken이 필요합니다" });
  const result = await cognito.send(new InitiateAuthCommand({
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  }));
  const auth = result.AuthenticationResult;
  return res(200, {
    accessToken: auth.AccessToken,
    idToken: auth.IdToken,
    expiresIn: auth.ExpiresIn,
  });
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
      const dbResult = await ddb.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { email },
      }));
      if (dbResult.Item) {
        profile = dbResult.Item;
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

  const allowed = ["name", "gender", "birthdate", "regionSido", "regionSigungu", "activeAreas", "sports", "position", "teamId", "teamIds", "teamSport", "hasTeam", "avatar", "number", "teamNumbers", "role"];
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

  // 같은 이름 클럽 중복 체크
  const existing = await ddb.send(new ScanCommand({
    TableName: CLUBS_TABLE,
    FilterExpression: "#n = :name",
    ExpressionAttributeNames: { "#n": "name" },
    ExpressionAttributeValues: { ":name": name },
    Limit: 1,
  }));
  if (existing.Items && existing.Items.length > 0) {
    return res(409, { message: "이미 같은 이름의 클럽이 존재합니다" });
  }

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
  const { clubId, email, name, position, role } = body;
  if (!clubId || !email) return res(400, { message: "clubId와 email은 필수입니다" });
  await ddb.send(new PutCommand({
    TableName: MEMBERS_TABLE,
    Item: {
      clubId,
      email,
      name: name || "",
      position: position || "",
      role: role || "member",
      joinedAt: new Date().toISOString(),
    },
  }));
  return res(200, { message: "멤버 등록 성공" });
}

async function deleteClubMember(body) {
  const { clubId, email } = body;
  if (!clubId || !email) return res(400, { message: "clubId와 email은 필수입니다" });
  await ddb.send(new DeleteCommand({
    TableName: MEMBERS_TABLE,
    Key: { clubId, email },
  }));
  return res(200, { message: "멤버 삭제 성공" });
}

async function updateClubMember(body) {
  const { clubId, email, name, position } = body;
  if (!clubId || !email) return res(400, { message: "clubId와 email은 필수입니다" });
  const exprParts = [];
  const exprNames = {};
  const exprValues = {};
  let idx = 0;
  for (const key of ["name", "position", "role"]) {
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
  const exprParts = [];
  const exprNames = {};
  const exprValues = {};
  let idx = 0;
  const allowed = ["captainEmail", "recruiting", "members"];
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

// ─── 주장 권한 검증 ───
async function verifyCaptain(clubId, userEmail) {
  const result = await ddb.send(new GetCommand({ TableName: CLUBS_TABLE, Key: { clubId } }));
  if (!result.Item) return false;
  return result.Item.captainEmail === userEmail;
}

// ─── 포인트/등급 반영 헬퍼 ───
async function applyMatchPoints(clubId, sport, result) {
  // 팀 멤버 조회
  const membersResult = await ddb.send(new QueryCommand({
    TableName: MEMBERS_TABLE,
    KeyConditionExpression: "clubId = :c",
    ExpressionAttributeValues: { ":c": clubId },
  }));
  const members = membersResult.Items || [];

  // 각 멤버 개인 포인트 반영
  for (const member of members) {
    const userResult = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { email: member.email } }));
    const user = userResult.Item;
    if (!user) continue;
    const ratings = user.ratings || {};
    const sportRating = ratings[sport] || { tier: "B", points: 0, games: 0, wins: 0, winStreak: 0 };
    const calc = calculateMatchPoints(result, sportRating.winStreak);
    sportRating.points += calc.points;
    sportRating.games += 1;
    if (result === "win") sportRating.wins += 1;
    sportRating.winStreak = calc.newWinStreak;
    sportRating.tier = determinePlayerTier(sportRating.points);
    ratings[sport] = sportRating;
    await ddb.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email: member.email },
      UpdateExpression: "SET ratings = :r",
      ExpressionAttributeValues: { ":r": ratings },
    }));
  }

  // 팀 TP 반영
  const clubResult = await ddb.send(new GetCommand({ TableName: CLUBS_TABLE, Key: { clubId } }));
  const club = clubResult.Item;
  if (club) {
    const tr = club.teamRating || { tier: "Rookie", tp: 0, games: 0, wins: 0, winStreak: 0 };
    const calc = calculateMatchPoints(result, tr.winStreak);
    tr.tp += calc.points;
    tr.games += 1;
    if (result === "win") tr.wins += 1;
    tr.winStreak = calc.newWinStreak;
    tr.tier = determineTeamTier(tr.tp);
    await ddb.send(new UpdateCommand({
      TableName: CLUBS_TABLE,
      Key: { clubId },
      UpdateExpression: "SET teamRating = :r",
      ExpressionAttributeValues: { ":r": tr },
    }));
  }
}

// ─── 매치 서비스 ───
async function createMatch(body) {
  const { homeClubId, awayClubId, sport } = body;
  if (!homeClubId || !awayClubId || !sport) return res(400, { message: "필수 항목이 누락되었습니다: homeClubId, awayClubId, sport" });
  if (homeClubId === awayClubId) return res(400, { message: "자기 팀에는 경기를 제안할 수 없습니다" });
  const matchId = crypto.randomUUID();
  const item = {
    matchId, homeClubId, awayClubId, sport,
    date: body.date || null, venue: body.venue || null,
    status: "proposed",
    homeScore: null, awayScore: null,
    homeSubmittedBy: null, awaySubmittedBy: null,
    confirmedAt: null, goals: [],
    createdBy: body.createdBy || "",
    createdAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: MATCHES_TABLE, Item: item }));
  return res(200, { message: "경기 제안 성공", matchId });
}

async function getMatches(query) {
  const clubId = query?.clubId;
  if (!clubId) return res(400, { message: "clubId는 필수입니다" });
  // home + away 양쪽 조회 후 합침
  const [homeRes, awayRes] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: MATCHES_TABLE,
      IndexName: "homeClubId-status-index",
      KeyConditionExpression: "homeClubId = :c",
      ExpressionAttributeValues: { ":c": clubId },
    })),
    ddb.send(new QueryCommand({
      TableName: MATCHES_TABLE,
      IndexName: "awayClubId-status-index",
      KeyConditionExpression: "awayClubId = :c",
      ExpressionAttributeValues: { ":c": clubId },
    })),
  ]);
  const all = [...(homeRes.Items || []), ...(awayRes.Items || [])];
  all.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return res(200, { matches: all });
}

async function acceptMatch(matchId) {
  const result = await ddb.send(new GetCommand({ TableName: MATCHES_TABLE, Key: { matchId } }));
  if (!result.Item) return res(404, { message: "매치를 찾을 수 없습니다" });
  if (result.Item.status !== "proposed") return res(400, { message: "현재 상태에서 수행할 수 없는 작업입니다" });
  await ddb.send(new UpdateCommand({
    TableName: MATCHES_TABLE,
    Key: { matchId },
    UpdateExpression: "SET #s = :s",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": "scheduled" },
  }));
  return res(200, { message: "경기 수락 완료" });
}

async function declineMatch(matchId) {
  const result = await ddb.send(new GetCommand({ TableName: MATCHES_TABLE, Key: { matchId } }));
  if (!result.Item) return res(404, { message: "매치를 찾을 수 없습니다" });
  if (result.Item.status !== "proposed") return res(400, { message: "현재 상태에서 수행할 수 없는 작업입니다" });
  await ddb.send(new UpdateCommand({
    TableName: MATCHES_TABLE,
    Key: { matchId },
    UpdateExpression: "SET #s = :s",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": "declined" },
  }));
  return res(200, { message: "경기 거절 완료" });
}

async function submitScore(matchId, body) {
  const { clubId, userEmail, ourScore, theirScore } = body;
  if (ourScore == null || theirScore == null) return res(400, { message: "스코어는 필수입니다" });
  if (ourScore < 0 || theirScore < 0) return res(400, { message: "스코어는 0 이상이어야 합니다" });
  const isCaptain = await verifyCaptain(clubId, userEmail);
  if (!isCaptain) return res(403, { message: "주장만 결과를 입력할 수 있습니다" });

  const matchResult = await ddb.send(new GetCommand({ TableName: MATCHES_TABLE, Key: { matchId } }));
  if (!matchResult.Item) return res(404, { message: "매치를 찾을 수 없습니다" });
  const match = matchResult.Item;
  const validStatuses = ["scheduled", "homeSubmitted", "awaySubmitted", "disputed"];
  if (!validStatuses.includes(match.status)) return res(400, { message: "현재 상태에서 수행할 수 없는 작업입니다" });

  const isHome = match.homeClubId === clubId;
  const isAway = match.awayClubId === clubId;
  if (!isHome && !isAway) return res(400, { message: "해당 매치의 팀이 아닙니다" });

  // 홈팀 기준 스코어로 변환
  const homeScore = isHome ? ourScore : theirScore;
  const awayScore = isHome ? theirScore : ourScore;

  if (isHome) {
    await ddb.send(new UpdateCommand({
      TableName: MATCHES_TABLE,
      Key: { matchId },
      UpdateExpression: "SET homeScore = :hs, homeSubmittedBy = :hb, #s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":hs": homeScore, ":hb": userEmail,
        ":s": match.awayScore != null ? "bothSubmitted" : "homeSubmitted",
      },
    }));
  } else {
    await ddb.send(new UpdateCommand({
      TableName: MATCHES_TABLE,
      Key: { matchId },
      UpdateExpression: "SET awayScore = :as, awaySubmittedBy = :ab, #s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":as": awayScore, ":ab": userEmail,
        ":s": match.homeScore != null ? "bothSubmitted" : "awaySubmitted",
      },
    }));
  }

  // 양쪽 모두 입력 완료 시 비교
  const updatedHomeScore = isHome ? homeScore : match.homeScore;
  const updatedAwayScore = isAway ? awayScore : match.awayScore;
  if (updatedHomeScore != null && updatedAwayScore != null) {
    // 두 번째 주장이 보고한 상대팀 스코어와 첫 번째 주장이 입력한 스코어를 대조
    // isHome=true이면 홈 주장이 나중에 입력 → 홈의 awayScore view vs 기존 match.awayScore
    // isAway=true이면 원정 주장이 나중에 입력 → 원정의 homeScore view vs 기존 match.homeScore
    const matched = isHome
      ? awayScore === match.awayScore
      : homeScore === match.homeScore;

    if (matched) {
      const now = new Date().toISOString();
      await ddb.send(new UpdateCommand({
        TableName: MATCHES_TABLE,
        Key: { matchId },
        UpdateExpression: "SET #s = :s, confirmedAt = :ca",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":s": "confirmed", ":ca": now },
      }));
      // 포인트 반영
      const homeResult = updatedHomeScore > updatedAwayScore ? "win" : updatedHomeScore === updatedAwayScore ? "draw" : "loss";
      const awayResult = homeResult === "win" ? "loss" : homeResult === "loss" ? "win" : "draw";
      await applyMatchPoints(match.homeClubId, match.sport, homeResult);
      await applyMatchPoints(match.awayClubId, match.sport, awayResult);
      return res(200, { message: "경기 확정, 포인트 반영 완료", status: "confirmed" });
    } else {
      // 스코어 불일치 → 분쟁 상태로 전환
      await ddb.send(new UpdateCommand({
        TableName: MATCHES_TABLE,
        Key: { matchId },
        UpdateExpression: "SET #s = :s",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":s": "disputed" },
      }));
      return res(200, { message: "스코어 불일치, 관리자 확인이 필요합니다", status: "disputed" });
    }
  }
  return res(200, { message: "스코어 입력 완료" });
}

async function addGoals(matchId, body) {
  const { clubId, userEmail, goals } = body;
  if (!goals || !Array.isArray(goals)) return res(400, { message: "goals 배열이 필요합니다" });
  const isCaptain = await verifyCaptain(clubId, userEmail);
  if (!isCaptain) return res(403, { message: "주장만 결과를 입력할 수 있습니다" });

  const matchResult = await ddb.send(new GetCommand({ TableName: MATCHES_TABLE, Key: { matchId } }));
  if (!matchResult.Item) return res(404, { message: "매치를 찾을 수 없습니다" });
  if (matchResult.Item.status !== "confirmed") return res(400, { message: "확정된 경기만 골 기록을 추가할 수 있습니다" });

  const existingGoals = matchResult.Item.goals || [];
  const newGoals = [...existingGoals, ...goals];
  await ddb.send(new UpdateCommand({
    TableName: MATCHES_TABLE,
    Key: { matchId },
    UpdateExpression: "SET goals = :g",
    ExpressionAttributeValues: { ":g": newGoals },
  }));

  // 골 선수 개인 포인트 반영 (팀 TP 미반영)
  for (const goal of goals) {
    const userResult = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { email: goal.scorer } }));
    const user = userResult.Item;
    if (!user) continue;
    const ratings = user.ratings || {};
    const sport = matchResult.Item.sport;
    const sportRating = ratings[sport] || { tier: "B", points: 0, games: 0, wins: 0, winStreak: 0 };
    sportRating.points += calculateGoalPoints(goal.count || 1);
    sportRating.tier = determinePlayerTier(sportRating.points);
    ratings[sport] = sportRating;
    await ddb.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email: goal.scorer },
      UpdateExpression: "SET ratings = :r",
      ExpressionAttributeValues: { ":r": ratings },
    }));
  }
  return res(200, { message: "골 기록 추가 완료" });
}

// ─── 활동 서비스 ───
async function createActivity(body) {
  const { clubId, sport, date, venue, createdBy } = body;
  if (!clubId || !sport || !createdBy) return res(400, { message: "필수 항목이 누락되었습니다: clubId, sport, createdBy" });
  const activityId = crypto.randomUUID();
  await ddb.send(new PutCommand({
    TableName: ACTIVITIES_TABLE,
    Item: {
      activityId, clubId, sport,
      date: date || null, venue: venue || null,
      createdBy, participants: [createdBy],
      status: "open",
      completedAt: null,
      createdAt: new Date().toISOString(),
    },
  }));
  return res(200, { message: "활동 일정 생성 성공", activityId });
}

async function getActivities(query) {
  const clubId = query?.clubId;
  if (!clubId) return res(400, { message: "clubId는 필수입니다" });
  const result = await ddb.send(new QueryCommand({
    TableName: ACTIVITIES_TABLE,
    IndexName: "clubId-status-index",
    KeyConditionExpression: "clubId = :c",
    ExpressionAttributeValues: { ":c": clubId },
  }));
  return res(200, { activities: result.Items || [] });
}

async function joinActivity(activityId, body) {
  const { email } = body;
  if (!email) return res(400, { message: "email은 필수입니다" });
  const result = await ddb.send(new GetCommand({ TableName: ACTIVITIES_TABLE, Key: { activityId } }));
  if (!result.Item) return res(404, { message: "활동을 찾을 수 없습니다" });
  if (result.Item.status !== "open") return res(400, { message: "현재 상태에서 수행할 수 없는 작업입니다" });
  if ((result.Item.participants || []).includes(email)) return res(400, { message: "이미 참가한 활동입니다" });
  await ddb.send(new UpdateCommand({
    TableName: ACTIVITIES_TABLE,
    Key: { activityId },
    UpdateExpression: "SET participants = list_append(if_not_exists(participants, :empty), :p)",
    ExpressionAttributeValues: { ":p": [email], ":empty": [] },
  }));
  return res(200, { message: "활동 참가 완료" });
}

async function completeActivity(activityId, body) {
  const { email } = body;
  const result = await ddb.send(new GetCommand({ TableName: ACTIVITIES_TABLE, Key: { activityId } }));
  if (!result.Item) return res(404, { message: "활동을 찾을 수 없습니다" });
  if (result.Item.status !== "open") return res(400, { message: "현재 상태에서 수행할 수 없는 작업입니다" });
  if (result.Item.createdBy !== email) return res(403, { message: "제안자만 완료할 수 있습니다" });

  const now = new Date().toISOString();
  await ddb.send(new UpdateCommand({
    TableName: ACTIVITIES_TABLE,
    Key: { activityId },
    UpdateExpression: "SET #s = :s, completedAt = :ca",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": "completed", ":ca": now },
  }));

  const participants = result.Item.participants || [];
  const sport = result.Item.sport;
  const clubId = result.Item.clubId;
  const pts = calculateActivityPoints();

  // 참가자 개인 포인트 반영
  for (const email of participants) {
    const userResult = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
    const user = userResult.Item;
    if (!user) continue;
    const ratings = user.ratings || {};
    const sportRating = ratings[sport] || { tier: "B", points: 0, games: 0, wins: 0, winStreak: 0 };
    sportRating.points += pts;
    sportRating.games += 1;
    sportRating.tier = determinePlayerTier(sportRating.points);
    ratings[sport] = sportRating;
    await ddb.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email },
      UpdateExpression: "SET ratings = :r",
      ExpressionAttributeValues: { ":r": ratings },
    }));
  }

  // 팀 TP 반영
  const clubResult = await ddb.send(new GetCommand({ TableName: CLUBS_TABLE, Key: { clubId } }));
  if (clubResult.Item) {
    const tr = clubResult.Item.teamRating || { tier: "Rookie", tp: 0, games: 0, wins: 0, winStreak: 0 };
    tr.tp += pts;
    tr.games += 1;
    tr.tier = determineTeamTier(tr.tp);
    await ddb.send(new UpdateCommand({
      TableName: CLUBS_TABLE,
      Key: { clubId },
      UpdateExpression: "SET teamRating = :r",
      ExpressionAttributeValues: { ":r": tr },
    }));
  }

  return res(200, { message: "활동 완료, 포인트 반영 완료" });
}

async function aiChat(body) {
  const { messages } = body;
  if (!messages || !messages.length) return res(400, { message: "messages 필요" });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return res(500, { message: "AI 서비스 설정 오류" });

  const openaiMessages = [
    {
      role: "system",
      content: "너는 축구 전문 AI 어시스턴트야. 축구 전술, 훈련, 규칙, 선수 관리, 팀 운영 등 축구 관련 질문에 친절하고 전문적으로 답변해. 한국어로 답변하고, 답변은 간결하게 해. 축구와 관련 없는 질문에도 친절하게 답변하되, 축구 관련 조언을 곁들여줘."
    },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: openaiMessages, max_tokens: 500, temperature: 0.7 }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.text();
    console.error("[AI-CHAT] OpenAI error:", err);
    return res(500, { message: "AI 응답 실패" });
  }

  const data = await openaiRes.json();
  return res(200, { reply: data.choices[0].message.content });
}

// ─── 가입 신청 서비스 ───
async function createJoinRequest(body) {
  const { clubId, email, name, position } = body;
  if (!clubId || !email) return res(400, { message: "clubId와 email은 필수입니다" });

  // 이미 멤버인지 확인
  const memberCheck = await ddb.send(new GetCommand({
    TableName: MEMBERS_TABLE,
    Key: { clubId, email },
  }));
  if (memberCheck.Item) return res(400, { message: "이미 가입된 클럽입니다" });

  // 이미 신청했는지 확인
  const existingRequest = await ddb.send(new ScanCommand({
    TableName: JOIN_REQUESTS_TABLE,
    FilterExpression: "clubId = :c AND email = :e AND #s = :s",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":c": clubId, ":e": email, ":s": "pending" },
  }));
  if (existingRequest.Items?.length > 0) return res(400, { message: "이미 가입 신청 중입니다" });

  const requestId = crypto.randomUUID();
  await ddb.send(new PutCommand({
    TableName: JOIN_REQUESTS_TABLE,
    Item: {
      requestId,
      clubId,
      email,
      name: name || "",
      position: position || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  }));
  return res(200, { message: "가입 신청 완료", requestId });
}

async function getJoinRequests(clubId) {
  if (!clubId) return res(400, { message: "clubId는 필수입니다" });
  const result = await ddb.send(new ScanCommand({
    TableName: JOIN_REQUESTS_TABLE,
    FilterExpression: "clubId = :c",
    ExpressionAttributeValues: { ":c": clubId },
  }));
  return res(200, { requests: result.Items || [] });
}

async function getUserJoinRequest(query) {
  const { clubId, email } = query || {};
  if (!clubId || !email) return res(400, { message: "clubId와 email은 필수입니다" });
  const result = await ddb.send(new ScanCommand({
    TableName: JOIN_REQUESTS_TABLE,
    FilterExpression: "clubId = :c AND email = :e",
    ExpressionAttributeValues: { ":c": clubId, ":e": email },
  }));
  const requests = result.Items || [];
  const pending = requests.find(r => r.status === "pending");
  const accepted = requests.find(r => r.status === "accepted");
  return res(200, { request: pending || accepted || null, status: pending ? "pending" : accepted ? "accepted" : null });
}

// 관리자 권한 검증 (주장 또는 관리자)
async function verifyManager(clubId, userEmail) {
  // 주장인지 확인
  const clubResult = await ddb.send(new GetCommand({ TableName: CLUBS_TABLE, Key: { clubId } }));
  if (clubResult.Item?.captainEmail === userEmail) return true;

  // 멤버 테이블에서 관리자인지 확인
  const memberResult = await ddb.send(new GetCommand({ TableName: MEMBERS_TABLE, Key: { clubId, email: userEmail } }));
  if (memberResult.Item?.role === "manager" || memberResult.Item?.role === "leader") return true;

  return false;
}

async function acceptJoinRequest(requestId, body) {
  const { managerEmail } = body;
  if (!managerEmail) return res(400, { message: "managerEmail은 필수입니다" });

  // 신청 정보 조회
  const requestResult = await ddb.send(new GetCommand({ TableName: JOIN_REQUESTS_TABLE, Key: { requestId } }));
  if (!requestResult.Item) return res(404, { message: "신청을 찾을 수 없습니다" });
  const request = requestResult.Item;

  if (request.status !== "pending") return res(400, { message: "이미 처리된 신청입니다" });

  // 관리자 권한 확인
  const isManager = await verifyManager(request.clubId, managerEmail);
  if (!isManager) return res(403, { message: "관리자만 수락할 수 있습니다" });

  // 신청 상태 업데이트
  await ddb.send(new UpdateCommand({
    TableName: JOIN_REQUESTS_TABLE,
    Key: { requestId },
    UpdateExpression: "SET #s = :s, processedAt = :p, processedBy = :b",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": "accepted", ":p": new Date().toISOString(), ":b": managerEmail },
  }));

  // 멤버로 등록
  await ddb.send(new PutCommand({
    TableName: MEMBERS_TABLE,
    Item: {
      clubId: request.clubId,
      email: request.email,
      name: request.name || "",
      position: request.position || "",
      role: "member",
      joinedAt: new Date().toISOString(),
    },
  }));

  // 클럽 멤버 수 증가
  const clubResult = await ddb.send(new GetCommand({ TableName: CLUBS_TABLE, Key: { clubId: request.clubId } }));
  if (clubResult.Item) {
    await ddb.send(new UpdateCommand({
      TableName: CLUBS_TABLE,
      Key: { clubId: request.clubId },
      UpdateExpression: "SET members = :m",
      ExpressionAttributeValues: { ":m": (clubResult.Item.members || 0) + 1 },
    }));
  }

  // 사용자 프로필 업데이트 (teamIds에 추가)
  const userResult = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { email: request.email } }));
  if (userResult.Item) {
    const currentTeamIds = userResult.Item.teamIds || (userResult.Item.teamId ? [userResult.Item.teamId] : []);
    const newTeamIds = [...new Set([...currentTeamIds, request.clubId])];
    await ddb.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email: request.email },
      UpdateExpression: "SET teamIds = :t, hasTeam = :h",
      ExpressionAttributeValues: { ":t": newTeamIds, ":h": true },
    }));
  }

  return res(200, { message: "가입 승인 완료" });
}

async function rejectJoinRequest(requestId, body) {
  const { managerEmail } = body;
  if (!managerEmail) return res(400, { message: "managerEmail은 필수입니다" });

  // 신청 정보 조회
  const requestResult = await ddb.send(new GetCommand({ TableName: JOIN_REQUESTS_TABLE, Key: { requestId } }));
  if (!requestResult.Item) return res(404, { message: "신청을 찾을 수 없습니다" });
  const request = requestResult.Item;

  if (request.status !== "pending") return res(400, { message: "이미 처리된 신청입니다" });

  // 관리자 권한 확인
  const isManager = await verifyManager(request.clubId, managerEmail);
  if (!isManager) return res(403, { message: "관리자만 거절할 수 있습니다" });

  // 신청 상태 업데이트
  await ddb.send(new UpdateCommand({
    TableName: JOIN_REQUESTS_TABLE,
    Key: { requestId },
    UpdateExpression: "SET #s = :s, processedAt = :p, processedBy = :b",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":s": "rejected", ":p": new Date().toISOString(), ":b": managerEmail },
  }));

  return res(200, { message: "가입 거절 완료" });
}

async function updateMemberRole(body) {
  const { clubId, email, role, managerEmail } = body;
  if (!clubId || !email || !role || !managerEmail) return res(400, { message: "clubId, email, role, managerEmail은 필수입니다" });

  // 변경 가능한 역할 확인
  const validRoles = ["member", "manager", "treasurer"];
  if (!validRoles.includes(role)) return res(400, { message: "유효하지 않은 역할입니다" });

  // 주장(leader)만 역할 변경 가능
  const clubResult = await ddb.send(new GetCommand({ TableName: CLUBS_TABLE, Key: { clubId } }));
  if (!clubResult.Item) return res(404, { message: "클럽을 찾을 수 없습니다" });
  if (clubResult.Item.captainEmail !== managerEmail) {
    // 기존 관리자인지 확인
    const managerMember = await ddb.send(new GetCommand({ TableName: MEMBERS_TABLE, Key: { clubId, email: managerEmail } }));
    if (managerMember.Item?.role !== "manager" && managerMember.Item?.role !== "leader") {
      return res(403, { message: "관리자만 역할을 변경할 수 있습니다" });
    }
  }

  // 관리자/총무 최대 인원 체크
  if (role === "manager" || role === "treasurer") {
    const allMembers = await ddb.send(new QueryCommand({
      TableName: MEMBERS_TABLE,
      KeyConditionExpression: "clubId = :c",
      ExpressionAttributeValues: { ":c": clubId },
    }));
    const roleCount = (allMembers.Items || []).filter(m => m.role === role && m.email !== email).length;
    if (roleCount >= 2) return res(400, { message: `${role === "manager" ? "관리자" : "총무"}는 최대 2명까지만 지정할 수 있습니다` });
  }

  // 역할 업데이트
  await ddb.send(new UpdateCommand({
    TableName: MEMBERS_TABLE,
    Key: { clubId, email },
    UpdateExpression: "SET #r = :r",
    ExpressionAttributeNames: { "#r": "role" },
    ExpressionAttributeValues: { ":r": role },
  }));

  return res(200, { message: "역할 변경 완료" });
}

async function kakaoAuth(body) {
  const { code, redirectUri } = body;
  if (!code) return res(400, { message: "code가 필요합니다" });

  // 1. 카카오 토큰 교환
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_CLIENT_ID || "4e2be53c83f944188cd4008ea2adcc1c",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return res(400, { message: "카카오 토큰 발급 실패" });

  // 2. 카카오 사용자 정보 조회
  const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const kakaoUser = await userRes.json();
  const kakaoId = String(kakaoUser.id);
  const kakaoEmail = kakaoUser.kakao_account?.email || `kakao_${kakaoId}@playground.app`;
  const kakaoName = kakaoUser.kakao_account?.profile?.nickname || "카카오유저";

  // 3. DynamoDB에서 기존 회원 확인 (kakaoId로)
  const existing = await ddb.send(new ScanCommand({
    TableName: USERS_TABLE,
    FilterExpression: "kakaoId = :k",
    ExpressionAttributeValues: { ":k": kakaoId },
    Limit: 1,
  }));

  if (existing.Items && existing.Items.length > 0) {
    // 기존 회원 → Cognito 로그인
    const user = existing.Items[0];
    const email = user.email;
    try {
      const authResult = await cognito.send(new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: `Kakao#${kakaoId}` },
      }));
      const auth = authResult.AuthenticationResult;
      return res(200, {
        accessToken: auth.AccessToken,
        idToken: auth.IdToken,
        refreshToken: auth.RefreshToken,
        isNewUser: false,
      });
    } catch (e) {
      return res(500, { message: "로그인 처리 실패: " + e.message });
    }
  }

  // 4. 신규 회원 → 임시 정보 반환 (프론트에서 회원가입 페이지로 이동)
  return res(200, {
    isNewUser: true,
    kakaoId,
    email: kakaoEmail,
    name: kakaoName,
  });
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return res(200, {});

  const path = event.path;
  const method = event.httpMethod;

  try {
    if (method === "POST" && path === "/auth/kakao") {
      return await kakaoAuth(JSON.parse(event.body));
    }
    if (method === "POST" && path === "/auth/signup") {
      return await signup(JSON.parse(event.body));
    }
    if (method === "POST" && path === "/auth/login") {
      return await login(JSON.parse(event.body));
    }
    if (method === "POST" && path === "/auth/refresh") {
      return await refreshTokens(JSON.parse(event.body));
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
      const body = JSON.parse(event.body);
      // action: "update" → 수정, 그 외 → 등록
      if (body.action === "update") return await updateClubMember(body);
      return await addClubMember(body);
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

    // ─── 매치 서비스 라우트 ───
    if (method === "POST" && path === "/matches") {
      return await createMatch(JSON.parse(event.body));
    }
    if (method === "GET" && path === "/matches") {
      return await getMatches(event.queryStringParameters);
    }
    if (method === "PUT" && path.match(/^\/matches\/[^/]+\/accept$/)) {
      const matchId = path.split("/")[2];
      return await acceptMatch(matchId);
    }
    if (method === "PUT" && path.match(/^\/matches\/[^/]+\/decline$/)) {
      const matchId = path.split("/")[2];
      return await declineMatch(matchId);
    }
    if (method === "PUT" && path.match(/^\/matches\/[^/]+\/score$/)) {
      const matchId = path.split("/")[2];
      return await submitScore(matchId, JSON.parse(event.body));
    }
    if (method === "PUT" && path.match(/^\/matches\/[^/]+\/goals$/)) {
      const matchId = path.split("/")[2];
      return await addGoals(matchId, JSON.parse(event.body));
    }

    // ─── 활동 서비스 라우트 ───
    if (method === "POST" && path === "/activities") {
      return await createActivity(JSON.parse(event.body));
    }
    if (method === "GET" && path === "/activities") {
      return await getActivities(event.queryStringParameters);
    }
    if (method === "PUT" && path.match(/^\/activities\/[^/]+\/join$/)) {
      const activityId = path.split("/")[2];
      return await joinActivity(activityId, JSON.parse(event.body));
    }
    if (method === "PUT" && path.match(/^\/activities\/[^/]+\/complete$/)) {
      const activityId = path.split("/")[2];
      return await completeActivity(activityId, JSON.parse(event.body));
    }

    // ─── AI 챗봇 ───
    if (method === "POST" && path === "/ai-chat") {
      return await aiChat(JSON.parse(event.body));
    }

    // ─── 가입 신청 서비스 라우트 ───
    if (method === "POST" && path === "/join-requests") {
      return await createJoinRequest(JSON.parse(event.body));
    }
    if (method === "GET" && path === "/join-requests") {
      return await getJoinRequests(event.queryStringParameters?.clubId);
    }
    if (method === "GET" && path === "/join-requests/user") {
      return await getUserJoinRequest(event.queryStringParameters);
    }
    if (method === "PUT" && path.match(/^\/join-requests\/[^/]+\/accept$/)) {
      const requestId = path.split("/")[2];
      return await acceptJoinRequest(requestId, JSON.parse(event.body));
    }
    if (method === "PUT" && path.match(/^\/join-requests\/[^/]+\/reject$/)) {
      const requestId = path.split("/")[2];
      return await rejectJoinRequest(requestId, JSON.parse(event.body));
    }
    if (method === "PUT" && path === "/club-members/role") {
      return await updateMemberRole(JSON.parse(event.body));
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
