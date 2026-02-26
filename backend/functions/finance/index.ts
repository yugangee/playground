import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const sub = event.requestContext.authorizer?.claims?.sub as string | undefined
  if (sub) return sub
  return undefined
}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const FINANCE = process.env.FINANCE_TABLE!
const DUES = process.env.DUES_TABLE!
const FINES = process.env.FINES_TABLE!

const res = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
})

export const handler: APIGatewayProxyHandler = async (event) => {
  const method = event.httpMethod
  const parts = event.path.replace(/^\/finance\/?/, '').split('/').filter(Boolean)
  const userId = getUserId(event)

  try {
    // ── Transactions ─────────────────────────────────────────────────

    // GET /finance/transactions?teamId=xxx
    if (method === 'GET' && parts[0] === 'transactions') {
      const teamId = event.queryStringParameters?.teamId
      if (!teamId) return res(400, { message: 'teamId required' })
      const result = await db.send(new QueryCommand({
        TableName: FINANCE,
        IndexName: 'teamId-date-index',
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
        ScanIndexForward: false,
      }))
      return res(200, result.Items ?? [])
    }

    // POST /finance/transactions
    if (method === 'POST' && parts[0] === 'transactions') {
      const body = JSON.parse(event.body ?? '{}')
      const item = { id: randomUUID(), ...body, createdBy: userId, createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: FINANCE, Item: item }))
      return res(201, item)
    }

    // ── Dues ─────────────────────────────────────────────────────────

    // GET /finance/dues?teamId=xxx
    if (method === 'GET' && parts[0] === 'dues') {
      const teamId = event.queryStringParameters?.teamId
      if (!teamId) return res(400, { message: 'teamId required' })
      const result = await db.send(new QueryCommand({
        TableName: DUES,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /finance/dues
    if (method === 'POST' && parts[0] === 'dues') {
      const body = JSON.parse(event.body ?? '{}')
      const item = { id: randomUUID(), ...body, paid: false, createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: DUES, Item: item }))
      return res(201, item)
    }

    // PATCH /finance/dues/:id/pay
    if (method === 'PATCH' && parts[0] === 'dues' && parts[2] === 'pay') {
      await db.send(new UpdateCommand({
        TableName: DUES,
        Key: { id: parts[1] },
        UpdateExpression: 'SET paid = :t, paidAt = :at',
        ExpressionAttributeValues: { ':t': true, ':at': new Date().toISOString() },
      }))
      return res(200, { message: 'updated' })
    }

    // ── Fines ────────────────────────────────────────────────────────

    // GET /finance/fines?teamId=xxx
    if (method === 'GET' && parts[0] === 'fines') {
      const teamId = event.queryStringParameters?.teamId
      if (!teamId) return res(400, { message: 'teamId required' })
      const result = await db.send(new QueryCommand({
        TableName: FINES,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /finance/fines
    if (method === 'POST' && parts[0] === 'fines') {
      const body = JSON.parse(event.body ?? '{}')
      const item = { id: randomUUID(), ...body, paid: false, createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: FINES, Item: item }))
      return res(201, item)
    }

    // PATCH /finance/fines/:id/pay
    if (method === 'PATCH' && parts[0] === 'fines' && parts[2] === 'pay') {
      await db.send(new UpdateCommand({
        TableName: FINES,
        Key: { id: parts[1] },
        UpdateExpression: 'SET paid = :t, paidAt = :at',
        ExpressionAttributeValues: { ':t': true, ':at': new Date().toISOString() },
      }))
      return res(200, { message: 'updated' })
    }

    return res(404, { message: 'Not found' })
  } catch (e) {
    console.error(e)
    return res(500, { message: 'Internal server error' })
  }
}
