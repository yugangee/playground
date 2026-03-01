// NOTE: 이 Lambda 함수는 /social, /discover, /notifications 세 경로를 담당합니다.
// CDK에서 ['social', fn], ['discover', fn], ['notifications', fn]이 모두 이 핸들러로 라우팅됩니다.
// M1-D: /notifications/push/* 경로로 웹 푸시 구독 관리도 추가됨.
// M1-C: /notifications/kakao/send 경로로 카카오 알림톡 발송 스텁 추가됨.
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const sub = event.requestContext.authorizer?.claims?.sub as string | undefined
  if (sub) return sub
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
const PUSH_SUBS = process.env.PUSH_SUBSCRIPTIONS_TABLE ?? 'pg-push-subscriptions'

const res = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
})

export const handler: APIGatewayProxyHandler = async (event) => {
  const method = event.httpMethod
  const rawDomain = event.path.startsWith('/social') ? 'social'
    : event.path.startsWith('/discover') ? 'discover'
    : 'notifications'
  const parts = event.path.replace(/^\/(social|discover|notifications)\/?/, '').split('/').filter(Boolean)
  const domain = rawDomain
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

    // ── Push Notifications (M1-D) ──────────────────────────────────────

    // POST /notifications/push/subscribe — 웹 푸시 구독 저장
    if (domain === 'notifications' && method === 'POST' && parts[0] === 'push' && parts[1] === 'subscribe') {
      const subscription = JSON.parse(event.body ?? '{}')
      const subId = `${userId}_${Date.now()}`
      await db.send(new PutCommand({
        TableName: PUSH_SUBS,
        Item: { userId, subId, subscription, createdAt: new Date().toISOString() },
      }))
      return res(200, { message: 'subscribed', subId })
    }

    // POST /notifications/push/send — 푸시 전송 (Lambda 내부 / 관리자용)
    // 실제 전송은 VAPID + web-push 패키지 필요. 현재는 구독 목록만 반환.
    if (domain === 'notifications' && method === 'POST' && parts[0] === 'push' && parts[1] === 'send') {
      const { targetUserId, title, body: msgBody, url } = JSON.parse(event.body ?? '{}')
      const subs = await db.send(new QueryCommand({
        TableName: PUSH_SUBS,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': targetUserId ?? userId },
      }))
      // TODO: web-push sendNotification 호출 (VAPID_PRIVATE_KEY 환경변수 필요)
      // const webpush = require('web-push')
      // webpush.setVapidDetails('mailto:admin@playground.ai', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
      // await Promise.all((subs.Items ?? []).map(s => webpush.sendNotification(s.subscription, JSON.stringify({ title, body: msgBody, url }))))
      return res(200, { queued: (subs.Items ?? []).length, message: '(stub) web-push 패키지 설치 후 활성화' })
    }

    // ── Kakao 알림톡 (M1-C) ───────────────────────────────────────────

    // POST /notifications/kakao/send — 카카오 알림톡 발송 스텁
    if (domain === 'notifications' && method === 'POST' && parts[0] === 'kakao' && parts[1] === 'send') {
      const { phones, templateId, variables } = JSON.parse(event.body ?? '{}')
      const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY
      const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET
      const KAKAO_PFID = process.env.KAKAO_PFID  // 카카오 채널 ID

      if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !KAKAO_PFID) {
        return res(503, {
          message: '카카오 알림톡 미설정. SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PFID 환경변수를 설정하세요.',
          stub: true,
        })
      }

      // Solapi REST API를 통한 알림톡 발송
      const messages = (phones as string[]).map(to => ({
        to,
        from: process.env.SOLAPI_SENDER ?? '',
        kakaoOptions: {
          pfId: KAKAO_PFID,
          templateId,
          variables: variables ?? {},
        },
      }))

      const solapiRes = await fetch('https://api.solapi.com/messages/v4/send-many', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `HMAC-SHA256 ApiKey=${SOLAPI_API_KEY}, Date=${new Date().toISOString()}, Salt=${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({ messages }),
      })
      const data = await solapiRes.json()
      return res(solapiRes.ok ? 200 : 500, data)
    }

    return res(404, { message: 'Not found' })
  } catch (e) {
    console.error(e)
    return res(500, { message: 'Internal server error' })
  }
}
