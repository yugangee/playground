import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));
const CONNECTIONS_TABLE = "playground-ws-connections";
const MESSAGES_TABLE = "playground-chat-messages";

export const handler = async (event) => {
  const route = event.requestContext.routeKey;
  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  try {
    if (route === "$connect") {
      const roomId = event.queryStringParameters?.roomId || "global";
      const userName = decodeURIComponent(event.queryStringParameters?.userName || "익명");
      const email = decodeURIComponent(event.queryStringParameters?.email || "");
      await ddb.send(new PutCommand({
        TableName: CONNECTIONS_TABLE,
        Item: { connectionId, roomId, userName, email, connectedAt: new Date().toISOString() },
      }));
      return { statusCode: 200, body: "Connected" };
    }

    if (route === "$disconnect") {
      await ddb.send(new DeleteCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
      }));
      return { statusCode: 200, body: "Disconnected" };
    }

    if (route === "sendMessage") {
      const body = JSON.parse(event.body);
      const { roomId, text, userName, email } = body;
      const timestamp = new Date().toISOString();
      const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // 메시지 저장
      await ddb.send(new PutCommand({
        TableName: MESSAGES_TABLE,
        Item: { roomId, messageId, text, userName, email, timestamp },
      }));

      // 같은 방의 모든 연결에 브로드캐스트
      const connections = await ddb.send(new QueryCommand({
        TableName: CONNECTIONS_TABLE,
        IndexName: "roomId-index",
        KeyConditionExpression: "roomId = :r",
        ExpressionAttributeValues: { ":r": roomId },
      }));

      const api = new ApiGatewayManagementApiClient({
        endpoint: `https://${domain}/${stage}`,
      });

      const payload = JSON.stringify({ action: "message", roomId, messageId, text, userName, email, timestamp });

      const sends = (connections.Items || []).map(async (conn) => {
        try {
          await api.send(new PostToConnectionCommand({
            ConnectionId: conn.connectionId,
            Data: new TextEncoder().encode(payload),
          }));
        } catch (e) {
          if (e.statusCode === 410) {
            await ddb.send(new DeleteCommand({ TableName: CONNECTIONS_TABLE, Key: { connectionId: conn.connectionId } }));
          }
        }
      });
      await Promise.all(sends);

      return { statusCode: 200, body: "Sent" };
    }

    if (route === "getHistory") {
      const body = JSON.parse(event.body);
      const { roomId, limit } = body;
      const result = await ddb.send(new QueryCommand({
        TableName: MESSAGES_TABLE,
        KeyConditionExpression: "roomId = :r",
        ExpressionAttributeValues: { ":r": roomId },
        ScanIndexForward: false,
        Limit: limit || 50,
      }));

      const api = new ApiGatewayManagementApiClient({ endpoint: `https://${domain}/${stage}` });
      const payload = JSON.stringify({ action: "history", roomId, messages: (result.Items || []).reverse() });
      await api.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: new TextEncoder().encode(payload),
      }));

      return { statusCode: 200, body: "OK" };
    }

    return { statusCode: 400, body: "Unknown route" };
  } catch (err) {
    console.error("WebSocket error:", err);
    return { statusCode: 500, body: "Error: " + err.message };
  }
};
