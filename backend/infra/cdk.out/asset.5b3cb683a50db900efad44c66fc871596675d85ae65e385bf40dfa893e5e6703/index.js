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
var db = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var TEAMS = process.env.TEAMS_TABLE;
var MEMBERS = process.env.TEAM_MEMBERS_TABLE;
var res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body)
});
var handler = async (event) => {
  const method = event.httpMethod;
  const parts = event.path.replace(/^\/team\/?/, "").split("/").filter(Boolean);
  const userId = event.requestContext.authorizer?.claims?.sub ?? event.headers["x-user-id"];
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
