import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const sub = event.requestContext.authorizer?.claims?.sub as string | undefined
  if (sub) return sub
  return undefined
}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const LEAGUES = process.env.LEAGUES_TABLE!
const LEAGUE_TEAMS = process.env.LEAGUE_TEAMS_TABLE!
const LEAGUE_MATCHES = process.env.LEAGUE_MATCHES_TABLE!

const res = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
})

export const handler: APIGatewayProxyHandler = async (event) => {
  const method = event.httpMethod
  const parts = event.path.replace(/^\/league\/?/, '').split('/').filter(Boolean)
  const userId = getUserId(event)

  try {
    // GET /league?organizerTeamId=xxx  or  GET /league (public)
    if (method === 'GET' && parts.length === 0) {
      const teamId = event.queryStringParameters?.organizerTeamId
      const result = await db.send(new QueryCommand(
        teamId
          ? { TableName: LEAGUES, IndexName: 'organizerTeamId-index', KeyConditionExpression: 'organizerTeamId = :tid', ExpressionAttributeValues: { ':tid': teamId } }
          : { TableName: LEAGUES, IndexName: 'isPublic-createdAt-index', KeyConditionExpression: 'isPublic = :t', ExpressionAttributeValues: { ':t': 'true' }, ScanIndexForward: false }
      ))
      return res(200, result.Items ?? [])
    }

    // POST /league
    if (method === 'POST' && parts.length === 0) {
      const body = JSON.parse(event.body ?? '{}')
      const item = { id: randomUUID(), ...body, organizerId: userId, status: 'recruiting', isPublic: String(body.isPublic ?? true), createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: LEAGUES, Item: item }))
      // 주최 팀 자동 참가
      await db.send(new PutCommand({ TableName: LEAGUE_TEAMS, Item: { leagueId: item.id, teamId: body.organizerTeamId, joinedAt: new Date().toISOString() } }))
      return res(201, item)
    }

    const leagueId = parts[0]

    // GET /league/:id
    if (method === 'GET' && parts.length === 1) {
      const result = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!result.Item) return res(404, { message: 'Not found' })
      return res(200, result.Item)
    }

    // PATCH /league/:id  (status 변경 등)
    if (method === 'PATCH' && parts.length === 1) {
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) return res(403, { message: '리그 주최자만 수정할 수 있습니다' })
      const body = JSON.parse(event.body ?? '{}')
      const updates = Object.entries(body)
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({ TableName: LEAGUES, Key: { id: leagueId }, UpdateExpression: expr, ExpressionAttributeNames: names, ExpressionAttributeValues: values }))
      return res(200, { message: 'updated' })
    }

    // GET /league/:id/teams
    if (method === 'GET' && parts[1] === 'teams') {
      const result = await db.send(new QueryCommand({
        TableName: LEAGUE_TEAMS,
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /league/:id/teams  (팀 초대/참가)
    if (method === 'POST' && parts[1] === 'teams') {
      const { teamId } = JSON.parse(event.body ?? '{}')
      await db.send(new PutCommand({ TableName: LEAGUE_TEAMS, Item: { leagueId, teamId, joinedAt: new Date().toISOString() } }))
      return res(201, { leagueId, teamId })
    }

    // GET /league/:id/matches
    if (method === 'GET' && parts[1] === 'matches') {
      const result = await db.send(new QueryCommand({
        TableName: LEAGUE_MATCHES,
        IndexName: 'leagueId-index',
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /league/:id/matches
    if (method === 'POST' && parts[1] === 'matches') {
      const body = JSON.parse(event.body ?? '{}')
      const item = { id: randomUUID(), leagueId, ...body, status: 'pending', createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: LEAGUE_MATCHES, Item: item }))
      return res(201, item)
    }

    // PATCH /league/:id/matches/:matchId  (결과 입력)
    if (method === 'PATCH' && parts[1] === 'matches' && parts[2]) {
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) return res(403, { message: '리그 주최자만 경기 결과를 수정할 수 있습니다' })
      const body = JSON.parse(event.body ?? '{}')
      const updates = Object.entries(body)
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({ TableName: LEAGUE_MATCHES, Key: { id: parts[2] }, UpdateExpression: expr, ExpressionAttributeNames: names, ExpressionAttributeValues: values }))
      return res(200, { message: 'updated' })
    }

    return res(404, { message: 'Not found' })
  } catch (e) {
    console.error(e)
    return res(500, { message: 'Internal server error' })
  }
}
