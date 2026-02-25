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

// functions/schedule/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_crypto = require("crypto");
var db = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var MATCHES = process.env.MATCHES_TABLE;
var TEAMS = process.env.TEAMS_TABLE;
var res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body)
});
var ANNOUNCEMENTS = "pg-announcements";
var POLLS = "pg-polls";
var POLL_VOTES = "pg-poll-votes";
var ATTENDANCE = "pg-attendance";
var handler = async (event) => {
  const method = event.httpMethod;
  const parts = event.path.replace(/^\/schedule\/?/, "").split("/").filter(Boolean);
  const userId = event.requestContext.authorizer?.claims?.sub ?? event.headers["x-user-id"];
  try {
    if (method === "GET" && parts[0] === "matches" && parts.length === 1) {
      const teamId = event.queryStringParameters?.teamId;
      if (!teamId) return res(400, { message: "teamId required" });
      const result = await db.send(new import_lib_dynamodb.ScanCommand({
        TableName: MATCHES,
        FilterExpression: "homeTeamId = :tid OR awayTeamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[0] === "matches") {
      const body = JSON.parse(event.body ?? "{}");
      const match = { id: (0, import_crypto.randomUUID)(), ...body, status: "pending", createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: MATCHES, Item: match }));
      return res(201, match);
    }
    if (method === "PATCH" && parts[0] === "matches" && parts[1]) {
      const body = JSON.parse(event.body ?? "{}");
      const updates = Object.entries(body);
      const expr = "SET " + updates.map(([k], i) => `#f${i} = :v${i}`).join(", ");
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]));
      await db.send(new import_lib_dynamodb.UpdateCommand({
        TableName: MATCHES,
        Key: { id: parts[1] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
      }));
      return res(200, { message: "updated" });
    }
    if (method === "GET" && parts[0] === "matches" && parts[2] === "attendance") {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: ATTENDANCE,
        KeyConditionExpression: "matchId = :mid",
        ExpressionAttributeValues: { ":mid": parts[1] }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "PUT" && parts[0] === "matches" && parts[2] === "attendance") {
      const { status } = JSON.parse(event.body ?? "{}");
      const item = { matchId: parts[1], userId, status, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: ATTENDANCE, Item: item }));
      return res(200, item);
    }
    if (method === "GET" && parts[0] === "announcements") {
      const teamId = event.queryStringParameters?.teamId;
      if (!teamId) return res(400, { message: "teamId required" });
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: ANNOUNCEMENTS,
        IndexName: "teamId-createdAt-index",
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId },
        ScanIndexForward: false
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[0] === "announcements") {
      const body = JSON.parse(event.body ?? "{}");
      const item = { id: (0, import_crypto.randomUUID)(), ...body, authorId: userId, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: ANNOUNCEMENTS, Item: item }));
      return res(201, item);
    }
    if (method === "GET" && parts[0] === "polls") {
      const teamId = event.queryStringParameters?.teamId;
      if (!teamId) return res(400, { message: "teamId required" });
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: POLLS,
        IndexName: "teamId-createdAt-index",
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId },
        ScanIndexForward: false
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[0] === "polls") {
      const body = JSON.parse(event.body ?? "{}");
      const item = { id: (0, import_crypto.randomUUID)(), ...body, authorId: userId, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: POLLS, Item: item }));
      return res(201, item);
    }
    if (method === "POST" && parts[0] === "polls" && parts[2] === "vote") {
      const { optionIndex } = JSON.parse(event.body ?? "{}");
      const item = { pollId: parts[1], userId, optionIndex, votedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: POLL_VOTES, Item: item }));
      return res(200, item);
    }
    if (method === "GET" && parts[0] === "polls" && parts[2] === "votes") {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: POLL_VOTES,
        KeyConditionExpression: "pollId = :pid",
        ExpressionAttributeValues: { ":pid": parts[1] }
      }));
      return res(200, result.Items ?? []);
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
