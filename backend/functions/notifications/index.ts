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

// ── 알림톡 템플릿 설계 (Kakao 채널 등록 후 아래 내용으로 심사 신청) ─────────────
// 변수: #{venue} = 구장명, #{date} = 일시(한국어 포맷), #{dday} = D-2/D-1/당일/신분증
export const KAKAO_TEMPLATE_DESIGNS = {
  'pg-reminder-d2': {
    name: '경기 D-2 알림',
    content: '[Playground] #{dday} 경기 알림\n📍 장소: #{venue}\n📅 일시: #{date}\n\n참석 여부를 앱에서 확인해 주세요.',
    buttons: [{ type: 'WL', name: '참석 응답하기', urlMobile: 'https://fun.sedaily.ai/schedule' }],
  },
  'pg-reminder-d1': {
    name: '경기 D-1 알림',
    content: '[Playground] 내일 경기 알림\n📍 장소: #{venue}\n📅 일시: #{date}\n\n⚠️ 신분증을 꼭 챙기세요!',
    buttons: [{ type: 'WL', name: '라인업 확인', urlMobile: 'https://fun.sedaily.ai/schedule' }],
  },
  'pg-reminder-day': {
    name: '경기 당일 알림',
    content: '[Playground] 오늘 경기 알림\n📍 장소: #{venue}\n📅 일시: #{date}\n\n⚠️ 신분증 필수 — 경기 전 본부석 신분 검인이 있습니다.',
    buttons: [{ type: 'WL', name: '체크인 하기', urlMobile: 'https://fun.sedaily.ai/schedule' }],
  },
  'pg-reminder-id': {
    name: '신분증 지참 리마인드 (KJA)',
    content: '[Playground] 신분증 지참 알림\n📍 장소: #{venue}\n📅 일시: #{date}\n\n⛔ 본부석 신분 검인 필수 (미지참 시 출전 불가)',
    buttons: [{ type: 'WL', name: '경기 정보 보기', urlMobile: 'https://fun.sedaily.ai/schedule' }],
  },
  'pg-dues-reminder': {
    name: '회비 미납 알림',
    content: '[Playground] 회비 미납 알림\n안녕하세요, #{name}님.\n#{amount}원의 회비가 미납되어 있습니다.\n납부 기한: #{deadline}\n\n앱에서 납부 현황을 확인해 주세요.',
    buttons: [{ type: 'WL', name: '회비 납부 확인', urlMobile: 'https://fun.sedaily.ai/manage/finance' }],
  },
}

/** 알림톡 실패 시 SMS fallback 텍스트 생성 */
function buildSmsText(templateId: string, vars: Record<string, string>): string {
  const venue = vars['#{venue}'] ?? vars['venue'] ?? '구장 미정'
  const date  = vars['#{date}']  ?? vars['date']  ?? ''
  const dday  = vars['#{dday}']  ?? vars['dday']  ?? ''
  const name   = vars['#{name}']   ?? ''
  const amount = vars['#{amount}'] ?? ''
  const deadline = vars['#{deadline}'] ?? ''

  const map: Record<string, string> = {
    'pg-reminder-d2':   `[Playground] ${dday} 경기 알림 | 장소: ${venue} | 일시: ${date} | 앱에서 참석 여부를 확인해 주세요.`,
    'pg-reminder-d1':   `[Playground] 내일 경기 알림 | 장소: ${venue} | 일시: ${date} | 신분증을 챙기세요!`,
    'pg-reminder-day':  `[Playground] 오늘 경기 알림 | 장소: ${venue} | 일시: ${date} | ⚠ 신분증 필수, 본부석 검인 있음`,
    'pg-reminder-id':   `[Playground] 신분증 지참 알림 | 장소: ${venue} | 일시: ${date} | 본부석 신분 검인 필수 (미지참 시 출전 불가)`,
    'pg-dues-reminder': `[Playground] 회비 미납 알림 | ${name}님, ${amount}원 미납 | 납부 기한: ${deadline} | fun.sedaily.ai`,
  }
  return map[templateId] ?? `[Playground] 경기 알림 | ${venue} | ${date}`
}

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
        const limit = Math.min(parseInt(event.queryStringParameters?.limit ?? '100', 10), 200)
        const [teamsResult, recruitResult] = await Promise.all([
          db.send(new ScanCommand({ TableName: TEAMS, Limit: limit })),
          db.send(new ScanCommand({
            TableName: RECRUITMENT,
            FilterExpression: 'isOpen = :t',
            ExpressionAttributeValues: { ':t': true },
          })),
        ])
        const openTeamIds = new Set((recruitResult.Items ?? []).map(r => r.teamId))
        let items: Record<string, unknown>[] = (teamsResult.Items ?? [])
          .filter(t => t.isPublic)
          .map(t => ({ ...t, hasOpenRecruitment: openTeamIds.has(t.id as string) }))
        if (region) items = items.filter(t => (t.region as string | undefined)?.includes(region))
        if (ageGroup) items = items.filter(t => t.ageGroup === ageGroup)
        if (recruiting === 'true') items = items.filter(t => t.hasOpenRecruitment)
        return res(200, items)
      }

      if (parts[0] === 'leagues') {
        const limit = Math.min(parseInt(event.queryStringParameters?.limit ?? '100', 10), 200)
        const result = await db.send(new ScanCommand({ TableName: LEAGUES, Limit: limit }))
        let items = (result.Items ?? []).filter(l => l.isPublic === 'true')
        if (region) items = items.filter(l => l.region?.includes(region))
        if (type) items = items.filter(l => l.type === type)
        return res(200, items)
      }
    }

    // ── Friends ───────────────────────────────────────────────────────

    // GET /social/friends
    if (domain === 'social' && method === 'GET' && parts[0] === 'friends') {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const result = await db.send(new QueryCommand({
        TableName: FRIENDS,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /social/friends  { friendId }
    if (domain === 'social' && method === 'POST' && parts[0] === 'friends') {
      if (!userId) return res(401, { message: 'Unauthorized' })
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
      if (!userId) return res(401, { message: 'Unauthorized' })
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
      if (!userId) return res(401, { message: 'Unauthorized' })
      const result = await db.send(new QueryCommand({
        TableName: FAVORITES,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /social/favorites  { targetId, targetType }
    if (domain === 'social' && method === 'POST' && parts[0] === 'favorites') {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const { targetId, targetType } = JSON.parse(event.body ?? '{}')
      await db.send(new PutCommand({ TableName: FAVORITES, Item: { userId, targetId, targetType, createdAt: new Date().toISOString() } }))
      return res(201, { userId, targetId, targetType })
    }

    // DELETE /social/favorites/:targetId
    if (domain === 'social' && method === 'DELETE' && parts[0] === 'favorites' && parts[1]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      await db.send(new DeleteCommand({ TableName: FAVORITES, Key: { userId, targetId: parts[1] } }))
      return res(200, { message: 'removed' })
    }

    // ── Push Notifications (M1-D) ──────────────────────────────────────

    // POST /notifications/push/subscribe — 웹 푸시 구독 저장
    if (domain === 'notifications' && method === 'POST' && parts[0] === 'push' && parts[1] === 'subscribe') {
      if (!userId) return res(401, { message: 'Unauthorized' })
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

    // POST /notifications/kakao/send — 카카오 알림톡 발송 (SMS fallback 포함)
    if (domain === 'notifications' && method === 'POST' && parts[0] === 'kakao' && parts[1] === 'send') {
      const { phones, templateId, variables } = JSON.parse(event.body ?? '{}')
      const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY
      const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET
      const KAKAO_PFID = process.env.KAKAO_PFID
      const SOLAPI_SENDER = process.env.SOLAPI_SENDER ?? ''

      if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !KAKAO_PFID) {
        return res(503, {
          message: '카카오 알림톡 미설정. SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PFID 환경변수를 설정하세요.',
          stub: true,
          // 템플릿 설계 참고 (Kakao 채널 등록 후 아래 templateId로 심사 신청)
          templateDesigns: KAKAO_TEMPLATE_DESIGNS,
        })
      }

      // Solapi REST API — 알림톡 발송 + SMS fallback
      const vars: Record<string, string> = variables ?? {}
      const messages = (phones as string[]).map(to => ({
        to,
        from: SOLAPI_SENDER,
        kakaoOptions: {
          pfId: KAKAO_PFID,
          templateId,
          variables: vars,
        },
        // 알림톡 실패 시 SMS 자동 전환 (SMS fallback)
        failover: {
          to,
          from: SOLAPI_SENDER,
          type: 'SMS' as const,
          text: buildSmsText(templateId, vars),
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
