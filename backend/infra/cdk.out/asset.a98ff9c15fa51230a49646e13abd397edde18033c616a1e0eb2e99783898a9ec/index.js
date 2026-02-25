"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// functions/team/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_crypto = require("crypto");
function getUserId(event) {
  const sub = event.requestContext.authorizer?.claims?.sub;
  if (sub) return sub;
  const xUser = event.headers["x-user-id"];
  if (xUser) return xUser;
  const auth = event.headers["Authorization"] ?? event.headers["authorization"];
  if (auth?.startsWith("Bearer ")) {
    try {
      const payload = JSON.parse(Buffer.from(auth.slice(7).split(".")[1], "base64").toString("utf8"));
      return payload.sub;
    } catch {
    }
  }
  return void 0;
}
var db = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var TEAMS = process.env.TEAMS_TABLE;
var MEMBERS = process.env.TEAM_MEMBERS_TABLE;
var STATS = process.env.STATS_TABLE;
var UNIFORMS = process.env.UNIFORMS_TABLE;
var EQUIPMENT = process.env.EQUIPMENT_TABLE;
var RECRUITMENT = process.env.RECRUITMENT_TABLE;
var INVITES = process.env.INVITES_TABLE;
var res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body)
});
var handler = async (event) => {
  const method = event.httpMethod;
  const parts = event.path.replace(/^\/team\/?/, "").split("/").filter(Boolean);
  const userId = getUserId(event);
  try {
    if (method === "GET" && parts.length === 0) {
      const result = await db.send(new import_lib_dynamodb.ScanCommand({
        TableName: MEMBERS,
        FilterExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId }
      }));
      const teamIds = (result.Items ?? []).map((m) => m.teamId);
      const teams = await Promise.all(
        teamIds.map((id) => db.send(new import_lib_dynamodb.GetCommand({ TableName: TEAMS, Key: { id } })).then((r) => r.Item))
      );
      return res(200, teams.filter(Boolean));
    }
    if (method === "POST" && parts.length === 0) {
      const body = JSON.parse(event.body ?? "{}");
      const team = {
        id: (0, import_crypto.randomUUID)(),
        ...body,
        leaderId: userId,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: TEAMS, Item: team }));
      await db.send(new import_lib_dynamodb.PutCommand({
        TableName: MEMBERS,
        Item: { teamId: team.id, userId, role: "leader", joinedAt: (/* @__PURE__ */ new Date()).toISOString() }
      }));
      return res(201, team);
    }
    if (method === "GET" && parts[0] === "invite" && parts[1]) {
      const token = parts[1];
      const inv = await db.send(new import_lib_dynamodb.GetCommand({ TableName: INVITES, Key: { token } }));
      if (!inv.Item) return res(404, { message: "Invite not found" });
      const team = await db.send(new import_lib_dynamodb.GetCommand({ TableName: TEAMS, Key: { id: inv.Item.teamId } }));
      return res(200, { invite: inv.Item, team: team.Item ?? null });
    }
    if (method === "POST" && parts[0] === "invite" && parts[2] === "join") {
      const token = parts[1];
      const inv = await db.send(new import_lib_dynamodb.GetCommand({ TableName: INVITES, Key: { token } }));
      if (!inv.Item) return res(404, { message: "Invite not found" });
      if (inv.Item.expiresAt && new Date(inv.Item.expiresAt) < /* @__PURE__ */ new Date()) {
        return res(410, { message: "Invite expired" });
      }
      const tid = inv.Item.teamId;
      await db.send(new import_lib_dynamodb.PutCommand({
        TableName: MEMBERS,
        Item: { teamId: tid, userId, role: "member", joinedAt: (/* @__PURE__ */ new Date()).toISOString() }
      }));
      return res(200, { message: "Joined", teamId: tid });
    }
    const teamId = parts[0];
    if (method === "GET" && parts.length === 1) {
      const result = await db.send(new import_lib_dynamodb.GetCommand({ TableName: TEAMS, Key: { id: teamId } }));
      if (!result.Item) return res(404, { message: "Team not found" });
      return res(200, result.Item);
    }
    if (method === "GET" && parts[1] === "members") {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: MEMBERS,
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[1] === "members") {
      const body = JSON.parse(event.body ?? "{}");
      const member = {
        teamId,
        userId: body.userId,
        role: body.role ?? "member",
        number: body.number,
        position: body.position,
        joinedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: MEMBERS, Item: member }));
      return res(201, member);
    }
    if (method === "PATCH" && parts[1] === "members" && parts[2]) {
      const body = JSON.parse(event.body ?? "{}");
      const updates = Object.entries(body).filter(([k]) => k !== "teamId" && k !== "userId");
      if (updates.length === 0) return res(400, { message: "No fields to update" });
      const expr = "SET " + updates.map(([k], i) => `#f${i} = :v${i}`).join(", ");
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]));
      await db.send(new import_lib_dynamodb.UpdateCommand({
        TableName: MEMBERS,
        Key: { teamId, userId: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
      }));
      return res(200, { message: "updated" });
    }
    if (method === "POST" && parts[1] === "invite") {
      const token = (0, import_crypto.randomUUID)();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
      await db.send(new import_lib_dynamodb.PutCommand({
        TableName: INVITES,
        Item: { token, teamId, createdBy: userId, expiresAt }
      }));
      const base = process.env.FRONTEND_URL ?? "https://pg.sedaily.ai";
      return res(201, { token, inviteUrl: `${base}/join?token=${token}`, expiresAt });
    }
    if (method === "GET" && parts[1] === "stats" && !parts[2]) {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: STATS,
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "PATCH" && parts[1] === "stats" && parts[2]) {
      const body = JSON.parse(event.body ?? "{}");
      const updates = Object.entries(body).filter(([k]) => k !== "teamId" && k !== "userId");
      if (updates.length === 0) return res(400, { message: "No fields to update" });
      const expr = "SET " + updates.map(([k], i) => `#f${i} = :v${i}`).join(", ");
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]));
      await db.send(new import_lib_dynamodb.UpdateCommand({
        TableName: STATS,
        Key: { teamId, userId: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
      }));
      return res(200, { message: "updated" });
    }
    if (method === "GET" && parts[1] === "uniforms" && !parts[2]) {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: UNIFORMS,
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[1] === "uniforms") {
      const body = JSON.parse(event.body ?? "{}");
      const item = { teamId, ...body, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: UNIFORMS, Item: item }));
      return res(201, item);
    }
    if (method === "PATCH" && parts[1] === "uniforms" && parts[2]) {
      const body = JSON.parse(event.body ?? "{}");
      const updates = Object.entries(body).filter(([k]) => k !== "teamId" && k !== "userId");
      if (updates.length === 0) return res(400, { message: "No fields to update" });
      const expr = "SET " + updates.map(([k], i) => `#f${i} = :v${i}`).join(", ");
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]));
      await db.send(new import_lib_dynamodb.UpdateCommand({
        TableName: UNIFORMS,
        Key: { teamId, userId: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
      }));
      return res(200, { message: "updated" });
    }
    if (method === "GET" && parts[1] === "equipment" && !parts[2]) {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: EQUIPMENT,
        IndexName: "teamId-index",
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[1] === "equipment") {
      const body = JSON.parse(event.body ?? "{}");
      const item = { id: (0, import_crypto.randomUUID)(), teamId, ...body, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: EQUIPMENT, Item: item }));
      return res(201, item);
    }
    if (method === "PATCH" && parts[1] === "equipment" && parts[2]) {
      const body = JSON.parse(event.body ?? "{}");
      const updates = Object.entries(body).filter(([k]) => k !== "id");
      if (updates.length === 0) return res(400, { message: "No fields to update" });
      const expr = "SET " + updates.map(([k], i) => `#f${i} = :v${i}`).join(", ");
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]));
      await db.send(new import_lib_dynamodb.UpdateCommand({
        TableName: EQUIPMENT,
        Key: { id: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
      }));
      return res(200, { message: "updated" });
    }
    if (method === "DELETE" && parts[1] === "equipment" && parts[2]) {
      await db.send(new import_lib_dynamodb.DeleteCommand({ TableName: EQUIPMENT, Key: { id: parts[2] } }));
      return res(200, { message: "deleted" });
    }
    if (method === "GET" && parts[1] === "recruitment" && !parts[2]) {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: RECRUITMENT,
        IndexName: "teamId-index",
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[1] === "recruitment") {
      const body = JSON.parse(event.body ?? "{}");
      const item = { id: (0, import_crypto.randomUUID)(), teamId, ...body, isOpen: true, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: RECRUITMENT, Item: item }));
      return res(201, item);
    }
    if (method === "PATCH" && parts[1] === "recruitment" && parts[2]) {
      const body = JSON.parse(event.body ?? "{}");
      const updates = Object.entries(body).filter(([k]) => k !== "id");
      if (updates.length === 0) return res(400, { message: "No fields to update" });
      const expr = "SET " + updates.map(([k], i) => `#f${i} = :v${i}`).join(", ");
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]));
      await db.send(new import_lib_dynamodb.UpdateCommand({
        TableName: RECRUITMENT,
        Key: { id: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
      }));
      return res(200, { message: "updated" });
    }
    if (method === "DELETE" && parts[1] === "recruitment" && parts[2]) {
      await db.send(new import_lib_dynamodb.DeleteCommand({ TableName: RECRUITMENT, Key: { id: parts[2] } }));
      return res(200, { message: "deleted" });
    }
    return res(404, { message: "Not found" });
  } catch (e) {
    console.error(e);
    return res(500, { message: "Internal server error" });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
