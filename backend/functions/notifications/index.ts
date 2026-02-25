// NOTE: 이 Lambda 함수는 파일명과 달리 push notifications를 처리하지 않습니다.
// 실제로는 /social (친구, 즐겨찾기)과 /discover (팀/리그 탐색) 라우트를 담당합니다.
// CDK에서 ['social', fn], ['discover', fn], ['notifications', fn] 세 경로가 모두 이 핸들러로 라우팅됩니다.
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const sub = event.requestContext.authorizer?.claims?.sub as string | undefined
  if (sub) return sub
  const xUser = event.headers['x-user-id']
  if (xUser) return xUser
  const auth = event.headers['Authorization'] ?? event.headers['authorization']
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64').toString('utf8'))
      return payload.sub as string
    } catch { /* ignore */ }
  }
  return undefined
}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TEAMS = process.env.TEAMS_TABLE!
const LEAGUES = process.env.LEAGUES_TABLE!
const RECRUITMENT = process.env.RECRUITMENT_TABLE!
const FRIENDS = process.env.FRIENDS_TABLE!
const FAVORITES = process.env.FAVORITES_TABLE!

const res = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
})

export const handler: APIGatewayProxyHandler = async (event) => {
  const method = event.httpMethod
  const parts = event.path.replace(/^\/(social|discover)\/?/, '').split('/').filter(Boolean)
  const domain = event.path.startsWith('/social') ? 'social' : 'discover'
  const userId = getUserId(event)

  try {
    // ── Discover ──────────────────────────────────────────────────────

    if (domain === 'discover') {
      const { region, ageGroup, type } = event.queryStringParameters ?? {}

      if (parts[0] === 'teams' || parts.length === 0) {
        const { recruiting } = event.queryStringParameters ?? {}
        const [teamsResult, recruitResult] = await Promise.all([
          db.send(new ScanCommand({ TableName: TEAMS })),
          db.send(new ScanCommand({
            TableName: RECRUITMENT,
            FilterExpression: 'isOpen = :t',
            ExpressionAttributeValues: { ':t': true },
          })),
        ])
        const openTeamIds = new Set((recruitResult.Items ?? []).map(r => r.teamId))
        let items = (teamsResult.Items ?? [])
          .filter(t => t.isPublic)
          .map(t => ({ ...t, hasOpenRecruitment: openTeamIds.has(t.id) }))
        if (region) items = items.filter(t => t.region?.includes(region))
        if (ageGroup) items = items.filter(t => t.ageGroup === ageGroup)
        if (recruiting === 'true') items = items.filter(t => t.hasOpenRecruitment)
        return res(200, items)
      }

      if (parts[0] === 'leagues') {
        const result = await db.send(new ScanCommand({ TableName: LEAGUES }))
        let items = (result.Items ?? []).filter(l => l.isPublic === 'true')
        if (region) items = items.filter(l => l.region?.includes(region))
        if (type) items = items.filter(l => l.type === type)
        return res(200, items)
      }
    }

    // ── Friends ───────────────────────────────────────────────────────

    // GET /social/friends
    if (domain === 'social' && method === 'GET' && parts[0] === 'friends') {
      const result = await db.send(new QueryCommand({
        TableName: FRIENDS,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /social/friends  { friendId }
    if (domain === 'social' && method === 'POST' && parts[0] === 'friends') {
      const { friendId } = JSON.parse(event.body ?? '{}')
      const now = new Date().toISOString()
      await Promise.all([
        db.send(new PutCommand({ TableName: FRIENDS, Item: { userId, friendId, createdAt: now } })),
        db.send(new PutCommand({ TableName: FRIENDS, Item: { userId: friendId, friendId: userId, createdAt: now } })),
      ])
      return res(201, { userId, friendId })
    }

    // DELETE /social/friends/:friendId
    if (domain === 'social' && method === 'DELETE' && parts[0] === 'friends' && parts[1]) {
      const friendId = parts[1]
      await Promise.all([
        db.send(new DeleteCommand({ TableName: FRIENDS, Key: { userId, friendId } })),
        db.send(new DeleteCommand({ TableName: FRIENDS, Key: { userId: friendId, friendId: userId } })),
      ])
      return res(200, { message: 'removed' })
    }

    // ── Favorites ─────────────────────────────────────────────────────

    // GET /social/favorites
    if (domain === 'social' && method === 'GET' && parts[0] === 'favorites') {
      const result = await db.send(new QueryCommand({
        TableName: FAVORITES,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /social/favorites  { targetId, targetType }
    if (domain === 'social' && method === 'POST' && parts[0] === 'favorites') {
      const { targetId, targetType } = JSON.parse(event.body ?? '{}')
      await db.send(new PutCommand({ TableName: FAVORITES, Item: { userId, targetId, targetType, createdAt: new Date().toISOString() } }))
      return res(201, { userId, targetId, targetType })
    }

    // DELETE /social/favorites/:targetId
    if (domain === 'social' && method === 'DELETE' && parts[0] === 'favorites' && parts[1]) {
      await db.send(new DeleteCommand({ TableName: FAVORITES, Key: { userId, targetId: parts[1] } }))
      return res(200, { message: 'removed' })
    }

    return res(404, { message: 'Not found' })
  } catch (e) {
    console.error(e)
    return res(500, { message: 'Internal server error' })
  }
}
