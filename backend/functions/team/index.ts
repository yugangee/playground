import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const sub = event.requestContext.authorizer?.claims?.sub as string | undefined
  if (sub) return sub
  return undefined
}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TEAMS = process.env.TEAMS_TABLE!
const MEMBERS = process.env.TEAM_MEMBERS_TABLE!
const STATS = process.env.STATS_TABLE!
const UNIFORMS = process.env.UNIFORMS_TABLE!
const EQUIPMENT = process.env.EQUIPMENT_TABLE!
const RECRUITMENT = process.env.RECRUITMENT_TABLE!
const INVITES = process.env.INVITES_TABLE!

const res = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
})

export const handler: APIGatewayProxyHandler = async (event) => {
  const method = event.httpMethod
  const parts = event.path.replace(/^\/team\/?/, '').split('/').filter(Boolean)
  // parts: [] | [teamId] | [teamId, 'members'] | [teamId, 'members', userId]

  const userId = getUserId(event)

  try {
    // GET /team
    if (method === 'GET' && parts.length === 0) {
      const result = await db.send(new QueryCommand({
        TableName: MEMBERS,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }))
      const teamIds = (result.Items ?? []).map(m => m.teamId)
      const teams = await Promise.all(
        teamIds.map(id => db.send(new GetCommand({ TableName: TEAMS, Key: { id } })).then(r => r.Item))
      )
      return res(200, teams.filter(Boolean))
    }

    // POST /team
    if (method === 'POST' && parts.length === 0) {
      const body = JSON.parse(event.body ?? '{}')
      const team = {
        id: randomUUID(),
        ...body,
        leaderId: userId,
        createdAt: new Date().toISOString(),
      }
      await db.send(new PutCommand({ TableName: TEAMS, Item: team }))
      // 팀장을 leader로 자동 등록
      await db.send(new PutCommand({
        TableName: MEMBERS,
        Item: { teamId: team.id, userId, role: 'leader', joinedAt: new Date().toISOString() },
      }))
      return res(201, team)
    }

    // ── Invite routes (parts[0] === 'invite', no teamId context) ─────

    // GET /team/invite/:token
    if (method === 'GET' && parts[0] === 'invite' && parts[1]) {
      const token = parts[1]
      const inv = await db.send(new GetCommand({ TableName: INVITES, Key: { token } }))
      if (!inv.Item) return res(404, { message: 'Invite not found' })
      const team = await db.send(new GetCommand({ TableName: TEAMS, Key: { id: inv.Item.teamId } }))
      return res(200, { invite: inv.Item, team: team.Item ?? null })
    }

    // POST /team/invite/:token/join
    if (method === 'POST' && parts[0] === 'invite' && parts[2] === 'join') {
      const token = parts[1]
      const inv = await db.send(new GetCommand({ TableName: INVITES, Key: { token } }))
      if (!inv.Item) return res(404, { message: 'Invite not found' })
      if (inv.Item.expiresAt && new Date(inv.Item.expiresAt) < new Date()) {
        return res(410, { message: 'Invite expired' })
      }
      const tid = inv.Item.teamId
      await db.send(new PutCommand({
        TableName: MEMBERS,
        Item: { teamId: tid, userId, role: 'member', joinedAt: new Date().toISOString() },
      }))
      return res(200, { message: 'Joined', teamId: tid })
    }

    const teamId = parts[0]

    // GET /team/:id
    if (method === 'GET' && parts.length === 1) {
      const result = await db.send(new GetCommand({ TableName: TEAMS, Key: { id: teamId } }))
      if (!result.Item) return res(404, { message: 'Team not found' })
      return res(200, result.Item)
    }

    // GET /team/:id/members
    if (method === 'GET' && parts[1] === 'members') {
      const result = await db.send(new QueryCommand({
        TableName: MEMBERS,
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /team/:id/members
    if (method === 'POST' && parts[1] === 'members') {
      const body = JSON.parse(event.body ?? '{}')
      const member = {
        teamId,
        userId: body.userId,
        role: body.role ?? 'member',
        number: body.number,
        position: body.position,
        joinedAt: new Date().toISOString(),
      }
      await db.send(new PutCommand({ TableName: MEMBERS, Item: member }))
      return res(201, member)
    }

    // PATCH /team/:id/members/:userId
    if (method === 'PATCH' && parts[1] === 'members' && parts[2]) {
      const body = JSON.parse(event.body ?? '{}')
      const updates = Object.entries(body).filter(([k]) => k !== 'teamId' && k !== 'userId')
      if (updates.length === 0) return res(400, { message: 'No fields to update' })

      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))

      await db.send(new UpdateCommand({
        TableName: MEMBERS,
        Key: { teamId, userId: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }))
      return res(200, { message: 'updated' })
    }

    // POST /team/:id/invite
    if (method === 'POST' && parts[1] === 'invite') {
      const token = randomUUID()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await db.send(new PutCommand({
        TableName: INVITES,
        Item: { token, teamId, createdBy: userId, expiresAt },
      }))
      const base = process.env.FRONTEND_URL ?? 'https://pg.sedaily.ai'
      return res(201, { token, inviteUrl: `${base}/join?token=${token}`, expiresAt })
    }

    // ── Stats ──────────────────────────────────────────────────────────

    // GET /team/:id/stats
    if (method === 'GET' && parts[1] === 'stats' && !parts[2]) {
      const result = await db.send(new QueryCommand({
        TableName: STATS,
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
      }))
      return res(200, result.Items ?? [])
    }

    // PATCH /team/:id/stats/:userId
    if (method === 'PATCH' && parts[1] === 'stats' && parts[2]) {
      const body = JSON.parse(event.body ?? '{}')
      const updates = Object.entries(body).filter(([k]) => k !== 'teamId' && k !== 'userId')
      if (updates.length === 0) return res(400, { message: 'No fields to update' })
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({
        TableName: STATS,
        Key: { teamId, userId: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }))
      return res(200, { message: 'updated' })
    }

    // ── Uniforms ───────────────────────────────────────────────────────

    // GET /team/:id/uniforms
    if (method === 'GET' && parts[1] === 'uniforms' && !parts[2]) {
      const result = await db.send(new QueryCommand({
        TableName: UNIFORMS,
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /team/:id/uniforms
    if (method === 'POST' && parts[1] === 'uniforms') {
      const body = JSON.parse(event.body ?? '{}')
      const item = { teamId, ...body, updatedAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: UNIFORMS, Item: item }))
      return res(201, item)
    }

    // PATCH /team/:id/uniforms/:userId
    if (method === 'PATCH' && parts[1] === 'uniforms' && parts[2]) {
      const body = JSON.parse(event.body ?? '{}')
      const updates = Object.entries(body).filter(([k]) => k !== 'teamId' && k !== 'userId')
      if (updates.length === 0) return res(400, { message: 'No fields to update' })
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({
        TableName: UNIFORMS,
        Key: { teamId, userId: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }))
      return res(200, { message: 'updated' })
    }

    // ── Equipment ──────────────────────────────────────────────────────

    // GET /team/:id/equipment
    if (method === 'GET' && parts[1] === 'equipment' && !parts[2]) {
      const result = await db.send(new QueryCommand({
        TableName: EQUIPMENT,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /team/:id/equipment
    if (method === 'POST' && parts[1] === 'equipment') {
      const body = JSON.parse(event.body ?? '{}')
      const item = { id: randomUUID(), teamId, ...body, createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: EQUIPMENT, Item: item }))
      return res(201, item)
    }

    // PATCH /team/:id/equipment/:equipId
    if (method === 'PATCH' && parts[1] === 'equipment' && parts[2]) {
      const body = JSON.parse(event.body ?? '{}')
      const updates = Object.entries(body).filter(([k]) => k !== 'id')
      if (updates.length === 0) return res(400, { message: 'No fields to update' })
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({
        TableName: EQUIPMENT,
        Key: { id: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }))
      return res(200, { message: 'updated' })
    }

    // DELETE /team/:id/equipment/:equipId
    if (method === 'DELETE' && parts[1] === 'equipment' && parts[2]) {
      await db.send(new DeleteCommand({ TableName: EQUIPMENT, Key: { id: parts[2] } }))
      return res(200, { message: 'deleted' })
    }

    // ── Recruitment ────────────────────────────────────────────────────

    // GET /team/:id/recruitment
    if (method === 'GET' && parts[1] === 'recruitment' && !parts[2]) {
      const result = await db.send(new QueryCommand({
        TableName: RECRUITMENT,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :tid',
        ExpressionAttributeValues: { ':tid': teamId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /team/:id/recruitment
    if (method === 'POST' && parts[1] === 'recruitment') {
      const body = JSON.parse(event.body ?? '{}')
      const item = { id: randomUUID(), teamId, ...body, isOpen: true, createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: RECRUITMENT, Item: item }))
      return res(201, item)
    }

    // PATCH /team/:id/recruitment/:recruitId
    if (method === 'PATCH' && parts[1] === 'recruitment' && parts[2]) {
      const body = JSON.parse(event.body ?? '{}')
      const updates = Object.entries(body).filter(([k]) => k !== 'id')
      if (updates.length === 0) return res(400, { message: 'No fields to update' })
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({
        TableName: RECRUITMENT,
        Key: { id: parts[2] },
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }))
      return res(200, { message: 'updated' })
    }

    // DELETE /team/:id/recruitment/:recruitId
    if (method === 'DELETE' && parts[1] === 'recruitment' && parts[2]) {
      await db.send(new DeleteCommand({ TableName: RECRUITMENT, Key: { id: parts[2] } }))
      return res(200, { message: 'deleted' })
    }

    return res(404, { message: 'Not found' })
  } catch (e) {
    console.error(e)
    return res(500, { message: 'Internal server error' })
  }
}
