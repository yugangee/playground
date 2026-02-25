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

// functions/notifications/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var db = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var TEAMS = process.env.TEAMS_TABLE;
var LEAGUES = process.env.LEAGUES_TABLE;
var RECRUITMENT = process.env.RECRUITMENT_TABLE;
var FRIENDS = "pg-friends";
var FAVORITES = "pg-favorites";
var res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body)
});
var handler = async (event) => {
  const method = event.httpMethod;
  const parts = event.path.replace(/^\/(social|discover)\/?/, "").split("/").filter(Boolean);
  const domain = event.path.startsWith("/social") ? "social" : "discover";
  const userId = event.requestContext.authorizer?.claims?.sub ?? event.headers["x-user-id"];
  try {
    if (domain === "discover") {
      const { region, ageGroup, type } = event.queryStringParameters ?? {};
      if (parts[0] === "teams" || parts.length === 0) {
        const { recruiting } = event.queryStringParameters ?? {};
        const [teamsResult, recruitResult] = await Promise.all([
          db.send(new import_lib_dynamodb.ScanCommand({ TableName: TEAMS })),
          db.send(new import_lib_dynamodb.ScanCommand({
            TableName: RECRUITMENT,
            FilterExpression: "isOpen = :t",
            ExpressionAttributeValues: { ":t": true }
          }))
        ]);
        const openTeamIds = new Set((recruitResult.Items ?? []).map((r) => r.teamId));
        let items = (teamsResult.Items ?? []).filter((t) => t.isPublic).map((t) => ({ ...t, hasOpenRecruitment: openTeamIds.has(t.id) }));
        if (region) items = items.filter((t) => t.region?.includes(region));
        if (ageGroup) items = items.filter((t) => t.ageGroup === ageGroup);
        if (recruiting === "true") items = items.filter((t) => t.hasOpenRecruitment);
        return res(200, items);
      }
      if (parts[0] === "leagues") {
        const result = await db.send(new import_lib_dynamodb.ScanCommand({ TableName: LEAGUES }));
        let items = (result.Items ?? []).filter((l) => l.isPublic === "true");
        if (region) items = items.filter((l) => l.region?.includes(region));
        if (type) items = items.filter((l) => l.type === type);
        return res(200, items);
      }
    }
    if (domain === "social" && method === "GET" && parts[0] === "friends") {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: FRIENDS,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId }
      }));
      return res(200, result.Items ?? []);
    }
    if (domain === "social" && method === "POST" && parts[0] === "friends") {
      const { friendId } = JSON.parse(event.body ?? "{}");
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await Promise.all([
        db.send(new import_lib_dynamodb.PutCommand({ TableName: FRIENDS, Item: { userId, friendId, createdAt: now } })),
        db.send(new import_lib_dynamodb.PutCommand({ TableName: FRIENDS, Item: { userId: friendId, friendId: userId, createdAt: now } }))
      ]);
      return res(201, { userId, friendId });
    }
    if (domain === "social" && method === "DELETE" && parts[0] === "friends" && parts[1]) {
      const friendId = parts[1];
      await Promise.all([
        db.send(new import_lib_dynamodb.DeleteCommand({ TableName: FRIENDS, Key: { userId, friendId } })),
        db.send(new import_lib_dynamodb.DeleteCommand({ TableName: FRIENDS, Key: { userId: friendId, friendId: userId } }))
      ]);
      return res(200, { message: "removed" });
    }
    if (domain === "social" && method === "GET" && parts[0] === "favorites") {
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: FAVORITES,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId }
      }));
      return res(200, result.Items ?? []);
    }
    if (domain === "social" && method === "POST" && parts[0] === "favorites") {
      const { targetId, targetType } = JSON.parse(event.body ?? "{}");
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: FAVORITES, Item: { userId, targetId, targetType, createdAt: (/* @__PURE__ */ new Date()).toISOString() } }));
      return res(201, { userId, targetId, targetType });
    }
    if (domain === "social" && method === "DELETE" && parts[0] === "favorites" && parts[1]) {
      await db.send(new import_lib_dynamodb.DeleteCommand({ TableName: FAVORITES, Key: { userId, targetId: parts[1] } }));
      return res(200, { message: "removed" });
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
