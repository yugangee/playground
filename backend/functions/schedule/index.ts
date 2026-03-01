import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const sub = event.requestContext.authorizer?.claims?.sub as string | undefined
  if (sub) return sub
  return undefined
}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
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
const STATS = process.env.STATS_TABLE!
const PERF = process.env.PLAYER_PERFORMANCE_TABLE ?? 'pg-player-performance'

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

      // M3-E: 매치 accepted 시 주장 채팅방 ID 자동 추가
      if (body.status === 'accepted') {
        const matchResult = await db.send(new GetCommand({ TableName: MATCHES, Key: { id: parts[1] } }))
        const match = matchResult.Item
        if (match && !match.captainRoomId) {
          body.captainRoomId = `captain_match_${parts[1]}`
        }
      }

      const updates = Object.entries(body)
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({
        TableName: MATCHES, Key: { id: parts[1] },
        UpdateExpression: expr, ExpressionAttributeNames: names, ExpressionAttributeValues: values,
      }))
      return res(200, { message: 'updated', captainRoomId: body.captainRoomId })
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

    // POST /schedule/polls/:id/finalize — M2-D POTM 뱃지 자동 부여
    if (method === 'POST' && parts[0] === 'polls' && parts[2] === 'finalize') {
      const pollResult = await db.send(new GetCommand({ TableName: POLLS, Key: { id: parts[1] } }))
      const poll = pollResult.Item
      if (!poll) return res(404, { message: 'poll not found' })

      const votesResult = await db.send(new QueryCommand({
        TableName: POLL_VOTES,
        KeyConditionExpression: 'pollId = :pid',
        ExpressionAttributeValues: { ':pid': parts[1] },
      }))
      const votes = votesResult.Items ?? []
      if (votes.length === 0) return res(400, { message: '투표 없음' })

      // 최다 득표 옵션 인덱스 찾기
      const tally: Record<number, number> = {}
      votes.forEach(v => { tally[v.optionIndex] = (tally[v.optionIndex] ?? 0) + 1 })
      const winIdx = Number(Object.entries(tally).sort(([,a],[,b]) => b - a)[0][0])
      const winnerName = poll.options?.[winIdx] ?? ''

      // POTM 뱃지: pg-stats에서 teamId+userId로 potmVotesReceived 증가
      const { teamId } = JSON.parse(event.body ?? '{}')
      if (teamId && winnerName) {
        // userId를 winnerName(displayName)으로부터 찾기 — poll.options는 userId 목록
        const winnerId = winnerName
        try {
          await db.send(new UpdateCommand({
            TableName: STATS,
            Key: { teamId, userId: winnerId },
            UpdateExpression: 'ADD potmVotesReceived :one',
            ExpressionAttributeValues: { ':one': 1 },
          }))
        } catch { /* stats 없으면 무시 */ }
      }

      return res(200, { winnerIdx: winIdx, winnerName, votes: tally })
    }

    // ── Player Performance (M4 DynamoDB) ─────────────────────────────

    // POST /schedule/performance — GPS 세션 저장
    if (method === 'POST' && parts[0] === 'performance') {
      const body = JSON.parse(event.body ?? '{}')
      const sessionId = randomUUID()
      const item = {
        userId,
        sessionId,
        teamId: body.teamId,
        matchId: body.matchId,
        recordedAt: new Date().toISOString(),
        distanceM: body.distanceM ?? 0,
        maxSpeedKmh: body.maxSpeedKmh ?? 0,
        avgSpeedKmh: body.avgSpeedKmh ?? 0,
        elapsedSec: body.elapsedSec ?? 0,
        zonePct: body.zonePct ?? {},
        points: body.points ?? [],
      }
      await db.send(new PutCommand({ TableName: PERF, Item: item }))
      return res(201, { sessionId })
    }

    // GET /schedule/performance?userId=xxx&teamId=xxx
    if (method === 'GET' && parts[0] === 'performance') {
      const qUserId = event.queryStringParameters?.userId ?? userId
      const result = await db.send(new QueryCommand({
        TableName: PERF,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': qUserId },
        ScanIndexForward: false,
        Limit: 20,
      }))
      return res(200, result.Items ?? [])
    }

    return res(404, { message: 'Not found' })
  } catch (e) {
    console.error(e)
    return res(500, { message: 'Internal server error' })
  }
}
