import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const sub = event.requestContext.authorizer?.claims?.sub as string | undefined
  if (sub) return sub
  return undefined
}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const MATCHES = process.env.MATCHES_TABLE!

const res = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
})

// 테이블명 상수 (CDK env에서 주입되지 않는 보조 테이블은 직접 명시)
const ANNOUNCEMENTS = process.env.ANNOUNCEMENTS_TABLE!
const POLLS = process.env.POLLS_TABLE!
const POLL_VOTES = process.env.POLL_VOTES_TABLE!
const ATTENDANCE = process.env.ATTENDANCE_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  const method = event.httpMethod
  const parts = event.path.replace(/^\/schedule\/?/, '').split('/').filter(Boolean)
  const userId = getUserId(event)

  try {
    // ── Matches ──────────────────────────────────────────────────────

    // GET /schedule/matches?teamId=xxx
    if (method === 'GET' && parts[0] === 'matches' && parts.length === 1) {
      const teamId = event.queryStringParameters?.teamId
      if (!teamId) return res(400, { message: 'teamId required' })
      const [home, away] = await Promise.all([
        db.send(new QueryCommand({
          TableName: MATCHES,
          IndexName: 'homeTeamId-index',
          KeyConditionExpression: 'homeTeamId = :tid',
          ExpressionAttributeValues: { ':tid': teamId },
        })),
        db.send(new QueryCommand({
          TableName: MATCHES,
          IndexName: 'awayTeamId-index',
          KeyConditionExpression: 'awayTeamId = :tid',
          ExpressionAttributeValues: { ':tid': teamId },
        })),
      ])
      const seen = new Set<string>()
      const items = [...(home.Items ?? []), ...(away.Items ?? [])].filter(m => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      return res(200, items)
    }

    // POST /schedule/matches
    if (method === 'POST' && parts[0] === 'matches') {
      const body = JSON.parse(event.body ?? '{}')
      const match = { id: randomUUID(), ...body, status: 'pending', createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: MATCHES, Item: match }))
      return res(201, match)
    }

    // PATCH /schedule/matches/:id
    if (method === 'PATCH' && parts[0] === 'matches' && parts[1]) {
      const body = JSON.parse(event.body ?? '{}')
      const updates = Object.entries(body)
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({
        TableName: MATCHES, Key: { id: parts[1] },
        UpdateExpression: expr, ExpressionAttributeNames: names, ExpressionAttributeValues: values,
      }))
      return res(200, { message: 'updated' })
    }

    // ── Attendance ───────────────────────────────────────────────────

    // GET /schedule/matches/:id/attendance
    if (method === 'GET' && parts[0] === 'matches' && parts[2] === 'attendance') {
      const result = await db.send(new QueryCommand({
        TableName: ATTENDANCE,
        KeyConditionExpression: 'matchId = :mid',
        ExpressionAttributeValues: { ':mid': parts[1] },
      }))
      return res(200, result.Items ?? [])
    }

    // PUT /schedule/matches/:id/attendance
    if (method === 'PUT' && parts[0] === 'matches' && parts[2] === 'attendance') {
      const { status } = JSON.parse(event.body ?? '{}')
      const item = { matchId: parts[1], userId, status, updatedAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: ATTENDANCE, Item: item }))
      return res(200, item)
    }

    // ── Announcements ────────────────────────────────────────────────

    // GET /schedule/announcements?teamId=xxx
    if (method === 'GET' && parts[0] === 'announcements') {
      const teamId = event.queryStringParameters?.teamId
      if (!teamId) return res(400, { message: 'teamId required' })
      const result = await db.send(new QueryCommand({
        TableName: ANNOUNCEMENTS,
        IndexName: 'teamId-createdAt-index',
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
        ScanIndexForward: false,
      }))
      return res(200, result.Items ?? [])
    }

    // POST /schedule/announcements
    if (method === 'POST' && parts[0] === 'announcements') {
      const body = JSON.parse(event.body ?? '{}')
      const item = { id: randomUUID(), ...body, authorId: userId, createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: ANNOUNCEMENTS, Item: item }))
      return res(201, item)
    }

    // ── Polls ────────────────────────────────────────────────────────

    // GET /schedule/polls?teamId=xxx
    if (method === 'GET' && parts[0] === 'polls') {
      const teamId = event.queryStringParameters?.teamId
      if (!teamId) return res(400, { message: 'teamId required' })
      const result = await db.send(new QueryCommand({
        TableName: POLLS,
        IndexName: 'teamId-createdAt-index',
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
        ScanIndexForward: false,
      }))
      return res(200, result.Items ?? [])
    }

    // POST /schedule/polls
    if (method === 'POST' && parts[0] === 'polls') {
      const body = JSON.parse(event.body ?? '{}')
      const item = { id: randomUUID(), ...body, authorId: userId, createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: POLLS, Item: item }))
      return res(201, item)
    }

    // POST /schedule/polls/:id/vote
    if (method === 'POST' && parts[0] === 'polls' && parts[2] === 'vote') {
      const { optionIndex } = JSON.parse(event.body ?? '{}')
      const item = { pollId: parts[1], userId, optionIndex, votedAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: POLL_VOTES, Item: item }))
      return res(200, item)
    }

    // GET /schedule/polls/:id/votes
    if (method === 'GET' && parts[0] === 'polls' && parts[2] === 'votes') {
      const result = await db.send(new QueryCommand({
        TableName: POLL_VOTES,
        KeyConditionExpression: 'pollId = :pid',
        ExpressionAttributeValues: { ':pid': parts[1] },
      }))
      return res(200, result.Items ?? [])
    }

    return res(404, { message: 'Not found' })
  } catch (e) {
    console.error(e)
    return res(500, { message: 'Internal server error' })
  }
}
