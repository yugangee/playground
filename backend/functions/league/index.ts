import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const sub = event.requestContext.authorizer?.claims?.sub as string | undefined
  if (sub) return sub
  return undefined
}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
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

function parseBody(raw: string | null): Record<string, unknown> | null {
  try {
    return JSON.parse(raw ?? '{}')
  } catch {
    return null
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const method = event.httpMethod
  const parts = event.path.replace(/^\/league\/?/, '').split('/').filter(Boolean)
  const userId = getUserId(event)

  try {
    // GET /league?organizerTeamId=xxx  or  GET /league?participantTeamId=xxx  or  GET /league (public)
    if (method === 'GET' && parts.length === 0) {
      const organizerTeamId = event.queryStringParameters?.organizerTeamId
      const participantTeamId = event.queryStringParameters?.participantTeamId

      if (organizerTeamId) {
        const result = await db.send(new QueryCommand({
          TableName: LEAGUES, IndexName: 'organizerTeamId-index',
          KeyConditionExpression: 'organizerTeamId = :tid',
          ExpressionAttributeValues: { ':tid': organizerTeamId },
        }))
        return res(200, result.Items ?? [])
      }

      if (participantTeamId) {
        const membershipResult = await db.send(new QueryCommand({
          TableName: LEAGUE_TEAMS, IndexName: 'teamId-index',
          KeyConditionExpression: 'teamId = :tid',
          ExpressionAttributeValues: { ':tid': participantTeamId },
        }))
        const leagueIds = (membershipResult.Items ?? []).map(item => item.leagueId as string)
        if (leagueIds.length === 0) return res(200, [])
        const leagues = await Promise.all(
          leagueIds.map(id => db.send(new GetCommand({ TableName: LEAGUES, Key: { id } })).then(r => r.Item).catch(() => undefined))
        )
        return res(200, leagues.filter(Boolean))
      }

      const result = await db.send(new QueryCommand({
        TableName: LEAGUES, IndexName: 'isPublic-createdAt-index',
        KeyConditionExpression: 'isPublic = :t',
        ExpressionAttributeValues: { ':t': 'true' }, ScanIndexForward: false,
      }))
      return res(200, result.Items ?? [])
    }

    // POST /league
    if (method === 'POST' && parts.length === 0) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })
      // F-3: 필수 필드 검증
      if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        return res(400, { message: '리그 이름(name)은 필수입니다' })
      }
      if (!body.organizerTeamId || typeof body.organizerTeamId !== 'string') {
        return res(400, { message: '주최 팀 ID(organizerTeamId)는 필수입니다' })
      }
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
      if (!userId) return res(401, { message: 'Unauthorized' })
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) return res(403, { message: '리그 주최자만 수정할 수 있습니다' })
      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })
      const updates = Object.entries(body)
      if (updates.length === 0) return res(400, { message: '수정할 필드가 없습니다' })
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({ TableName: LEAGUES, Key: { id: leagueId }, UpdateExpression: expr, ExpressionAttributeNames: names, ExpressionAttributeValues: values }))
      return res(200, { message: 'updated' })
    }

    // DELETE /league/:id  (주최자만, 연관 teams/matches cascade 삭제)
    if (method === 'DELETE' && parts.length === 1) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) return res(403, { message: '리그 주최자만 삭제할 수 있습니다' })
      // cascade: LEAGUE_TEAMS 삭제
      const teamsResult = await db.send(new QueryCommand({
        TableName: LEAGUE_TEAMS,
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))
      await Promise.all((teamsResult.Items ?? []).map(t =>
        db.send(new DeleteCommand({ TableName: LEAGUE_TEAMS, Key: { leagueId, teamId: t.teamId } }))
      ))
      // cascade: LEAGUE_MATCHES 삭제
      const matchesResult = await db.send(new QueryCommand({
        TableName: LEAGUE_MATCHES,
        IndexName: 'leagueId-index',
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))
      await Promise.all((matchesResult.Items ?? []).map(m =>
        db.send(new DeleteCommand({ TableName: LEAGUE_MATCHES, Key: { id: m.id } }))
      ))
      await db.send(new DeleteCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      return res(200, { message: 'deleted' })
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
      if (!userId) return res(401, { message: 'Unauthorized' })
      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })
      // F-3: 필수 필드 검증
      const { teamId } = body as { teamId?: string }
      if (!teamId || typeof teamId !== 'string') {
        return res(400, { message: '팀 ID(teamId)는 필수입니다' })
      }
      // F-2: 중복 참가 방지 (ConditionExpression)
      try {
        await db.send(new PutCommand({
          TableName: LEAGUE_TEAMS,
          Item: { leagueId, teamId, joinedAt: new Date().toISOString() },
          ConditionExpression: 'attribute_not_exists(leagueId) AND attribute_not_exists(teamId)',
        }))
      } catch (e) {
        if (e instanceof ConditionalCheckFailedException) {
          return res(409, { message: '이미 참가한 팀입니다' })
        }
        throw e
      }
      return res(201, { leagueId, teamId })
    }

    // DELETE /league/:id/teams/:teamId  (팀 참가 취소 — 주최자만)
    if (method === 'DELETE' && parts[1] === 'teams' && parts[2]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) return res(403, { message: '리그 주최자만 팀을 제거할 수 있습니다' })
      await db.send(new DeleteCommand({ TableName: LEAGUE_TEAMS, Key: { leagueId, teamId: parts[2] } }))
      return res(200, { message: 'deleted' })
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
      if (!userId) return res(401, { message: 'Unauthorized' })
      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })
      // F-3: 필수 필드 검증
      if (!body.homeTeamId || !body.awayTeamId) {
        return res(400, { message: 'homeTeamId, awayTeamId는 필수입니다' })
      }
      const item = { id: randomUUID(), leagueId, ...body, status: 'pending', createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: LEAGUE_MATCHES, Item: item }))
      return res(201, item)
    }

    // DELETE /league/:id/matches/:matchId
    if (method === 'DELETE' && parts[1] === 'matches' && parts[2]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) return res(403, { message: '리그 주최자만 경기를 삭제할 수 있습니다' })
      await db.send(new DeleteCommand({ TableName: LEAGUE_MATCHES, Key: { id: parts[2] } }))
      return res(200, { message: 'deleted' })
    }

    // PATCH /league/:id/matches/:matchId  (결과 입력)
    if (method === 'PATCH' && parts[1] === 'matches' && parts[2]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) return res(403, { message: '리그 주최자만 경기 결과를 수정할 수 있습니다' })
      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })
      const updates = Object.entries(body)
      if (updates.length === 0) return res(400, { message: '수정할 필드가 없습니다' })
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
