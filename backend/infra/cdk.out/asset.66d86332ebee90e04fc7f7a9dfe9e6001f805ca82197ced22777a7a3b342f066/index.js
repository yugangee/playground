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

// functions/finance/index.ts
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
var FINANCE = process.env.FINANCE_TABLE;
var DUES = "pg-dues";
var FINES = "pg-fines";
var res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body)
});
var handler = async (event) => {
  const method = event.httpMethod;
  const parts = event.path.replace(/^\/finance\/?/, "").split("/").filter(Boolean);
  const userId = getUserId(event);
  try {
    if (method === "GET" && parts[0] === "transactions") {
      const teamId = event.queryStringParameters?.teamId;
      if (!teamId) return res(400, { message: "teamId required" });
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: FINANCE,
        IndexName: "teamId-date-index",
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId },
        ScanIndexForward: false
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[0] === "transactions") {
      const body = JSON.parse(event.body ?? "{}");
      const item = { id: (0, import_crypto.randomUUID)(), ...body, createdBy: userId, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: FINANCE, Item: item }));
      return res(201, item);
    }
    if (method === "GET" && parts[0] === "dues") {
      const teamId = event.queryStringParameters?.teamId;
      if (!teamId) return res(400, { message: "teamId required" });
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: DUES,
        IndexName: "teamId-index",
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[0] === "dues") {
      const body = JSON.parse(event.body ?? "{}");
      const item = { id: (0, import_crypto.randomUUID)(), ...body, paid: false, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: DUES, Item: item }));
      return res(201, item);
    }
    if (method === "PATCH" && parts[0] === "dues" && parts[2] === "pay") {
      await db.send(new import_lib_dynamodb.UpdateCommand({
        TableName: DUES,
        Key: { id: parts[1] },
        UpdateExpression: "SET paid = :t, paidAt = :at",
        ExpressionAttributeValues: { ":t": true, ":at": (/* @__PURE__ */ new Date()).toISOString() }
      }));
      return res(200, { message: "updated" });
    }
    if (method === "GET" && parts[0] === "fines") {
      const teamId = event.queryStringParameters?.teamId;
      if (!teamId) return res(400, { message: "teamId required" });
      const result = await db.send(new import_lib_dynamodb.QueryCommand({
        TableName: FINES,
        IndexName: "teamId-index",
        KeyConditionExpression: "teamId = :tid",
        ExpressionAttributeValues: { ":tid": teamId }
      }));
      return res(200, result.Items ?? []);
    }
    if (method === "POST" && parts[0] === "fines") {
      const body = JSON.parse(event.body ?? "{}");
      const item = { id: (0, import_crypto.randomUUID)(), ...body, paid: false, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.send(new import_lib_dynamodb.PutCommand({ TableName: FINES, Item: item }));
      return res(201, item);
    }
    if (method === "PATCH" && parts[0] === "fines" && parts[2] === "pay") {
      await db.send(new import_lib_dynamodb.UpdateCommand({
        TableName: FINES,
        Key: { id: parts[1] },
        UpdateExpression: "SET paid = :t",
        ExpressionAttributeValues: { ":t": true }
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
