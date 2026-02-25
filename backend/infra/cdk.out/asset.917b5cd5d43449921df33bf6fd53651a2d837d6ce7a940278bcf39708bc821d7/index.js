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

// functions/league/index.ts
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
var LEAGUES = process.env.LEAGUES_TABLE;
var MATCHES = process.env.MATCHES_TABLE;
var LEAGUE_TEAMS = "pg-league-teams";
var LEAGUE_MATCHES = "pg-league-matches";
var res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body)
});
var handler = async (event) => {
  const method = event.httpMethod;
  const parts = event.path.replace(/^\/league\/?/, "").split("/").filter(Boolean);
  const userId = getUserId(event);
  try {
    if (method === "GET" && parts.length === 0) {
      const teamId = event.queryStringParameters?.organizerTeamId;
      const result = await db.send(new import_lib_dynamodb.QueryCommand(
        teamId ? { TableName: LEAGUES, IndexName: "organizerTeamId-index", KeyConditionExpression: "organizerTeamId = :tid", ExpressionAttributeValues: { ":tid": teamId } } : { TableName: LEAGUES, IndexName: "isPublic-createdAt-index", KeyConditionExpression: "isPublic = :t", ExpressionAttributeValues: { ":t": "true" }, ScanIndexForward: false }
      ));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts.length === 0) {
      const body = JSON.parse(event.body ?? "{}");
      const item = { id: (0, import_crypto.randomUUID)(), ...body, organizerId: userId, status: "recruiting", isPublic: String(body.isPublic ?? true), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: LEAGUES, Item: item }));
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: LEAGUE_TEAMS, Item: { leagueId: item.id, teamId: body.organizerTeamId, joinedAt: (/* @__PURE__ */ new Date()).toISOString() } }));
      return res(201, item);
    }
    const leagueId = parts[0];
    if (method === "GET" && parts.length === 1) {
      const result = await db.send(new import_lib_dynamodb.GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }));
      if (!result.Item) return res(404, { message: "Not found" });
      return res(200, result.Item);
    }
    if (method === "PATCH" && parts.length === 1) {
      const body = JSON.parse(event.body ?? "{}");
      const updates = Object.entries(body);
      const expr = "SET " + updates.map(([k], i) => `#f${i} = :v${i}`).join(", ");
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]));
      await db.send(new import_lib_dynamodb.UpdateCommand({ TableName: LEAGUES, Key: { id: leagueId }, UpdateExpression: expr, ExpressionAttributeNames: names, ExpressionAttributeValues: values }));
      return res(200, { message: "updated" });
    }
    if (method === "GET" && parts[1] === "teams") {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: LEAGUE_TEAMS,
        KeyConditionExpression: "leagueId = :lid",
        ExpressionAttributeValues: { ":lid": leagueId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[1] === "teams") {
      const { teamId } = JSON.parse(event.body ?? "{}");
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: LEAGUE_TEAMS, Item: { leagueId, teamId, joinedAt: (/* @__PURE__ */ new Date()).toISOString() } }));
      return res(201, { leagueId, teamId });
    }
    if (method === "GET" && parts[1] === "matches") {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: LEAGUE_MATCHES,
        KeyConditionExpression: "leagueId = :lid",
        ExpressionAttributeValues: { ":lid": leagueId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[1] === "matches") {
      const body = JSON.parse(event.body ?? "{}");
      const item = { id: (0, import_crypto.randomUUID)(), leagueId, ...body, status: "pending", createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: LEAGUE_MATCHES, Item: item }));
      return res(201, item);
    }
    if (method === "PATCH" && parts[1] === "matches" && parts[2]) {
      const body = JSON.parse(event.body ?? "{}");
      const updates = Object.entries(body);
      const expr = "SET " + updates.map(([k], i) => `#f${i} = :v${i}`).join(", ");
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]));
      await db.send(new import_lib_dynamodb.UpdateCommand({ TableName: LEAGUE_MATCHES, Key: { id: parts[2] }, UpdateExpression: expr, ExpressionAttributeNames: names, ExpressionAttributeValues: values }));
      return res(200, { message: "updated" });
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
