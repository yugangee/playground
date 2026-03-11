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

// ── 토너먼트 라운드 진행 헬퍼 ────────────────────────────────────────────────

const ROUND_ORDER = ['1라운드', '16강', '8강', '준결승', '결승']

function nextRound(currentRound: string): string | null {
  const idx = ROUND_ORDER.indexOf(currentRound)
  if (idx === -1 || idx >= ROUND_ORDER.length - 1) return null
  return ROUND_ORDER[idx + 1]
}

function getWinner(match: Record<string, unknown>): string | null {
  // 명시적 winner 필드가 있으면 우선 (PK 결과 등)
  if (match.winner && typeof match.winner === 'string') return match.winner
  const home = match.homeScore as number | undefined
  const away = match.awayScore as number | undefined
  if (home == null || away == null) return null
  if (home > away) return match.homeTeamId as string
  if (away > home) return match.awayTeamId as string
  return null // 동점 — PK 결과 입력 후 winner 필드로 지정 필요
}

async function tryAdvanceTournament(leagueId: string, currentRound: string) {
  const next = nextRound(currentRound)
  if (!next) return // 결승이면 더 이상 진행 없음

  // 같은 리그의 모든 매치 조회
  const allResult = await db.send(new QueryCommand({
    TableName: LEAGUE_MATCHES,
    IndexName: 'leagueId-index',
    KeyConditionExpression: 'leagueId = :lid',
    ExpressionAttributeValues: { ':lid': leagueId },
  }))
  const allMatches = allResult.Items ?? []

  // 같은 라운드 매치들
  const roundMatches = allMatches.filter(m => m.round === currentRound)
  if (roundMatches.length === 0) return

  // 모두 completed + winner 확정인지 확인
  const allCompleted = roundMatches.every(m => m.status === 'completed' && getWinner(m))
  if (!allCompleted) return

  // 이미 다음 라운드 매치가 존재하면 중복 생성 방지
  const nextRoundMatches = allMatches.filter(m => m.round === next)
  if (nextRoundMatches.length > 0) return

  // winners 추출 후 다음 라운드 매치 생성
  const winners = roundMatches.map(m => getWinner(m)!).filter(Boolean)
  if (winners.length < 2) return

  const defaultDate = new Date().toISOString()
  for (let i = 0; i + 1 < winners.length; i += 2) {
    await db.send(new PutCommand({
      TableName: LEAGUE_MATCHES,
      Item: {
        id: randomUUID(),
        leagueId,
        homeTeamId: winners[i],
        awayTeamId: winners[i + 1],
        round: next,
        scheduledAt: defaultDate,
        venue: '미정',
        status: 'pending',
        createdAt: defaultDate,
      },
    }))
  }

  // 홀수 winner → 부전승 (자동 다음 라운드 진출은 하지 않음, 주최자가 수동 처리)
}

// ── 통계 집계 헬퍼 ──────────────────────────────────────────────────────────

interface GoalRecord { scorer: string; assist?: string; minute?: number; teamId?: string }
interface CardRecord { playerId: string; type: 'yellow' | 'red'; minute?: number; teamId?: string }

function aggregateStats(matches: Record<string, unknown>[], leagueTeamIds: string[]) {
  const completedMatches = matches.filter(m => m.status === 'completed')

  // 선수별 득점/도움 집계
  const playerMap = new Map<string, { goals: number; assists: number; yellowCards: number; redCards: number; teamId: string }>()

  const ensurePlayer = (id: string, teamId: string) => {
    if (!playerMap.has(id)) playerMap.set(id, { goals: 0, assists: 0, yellowCards: 0, redCards: 0, teamId })
    return playerMap.get(id)!
  }

  for (const m of completedMatches) {
    const goals = (m.goals ?? []) as GoalRecord[]
    for (const g of goals) {
      if (g.scorer) {
        const p = ensurePlayer(g.scorer, g.teamId ?? '')
        p.goals++
        if (g.teamId) p.teamId = g.teamId
      }
      if (g.assist) {
        const p = ensurePlayer(g.assist, g.teamId ?? '')
        p.assists++
        if (g.teamId) p.teamId = g.teamId
      }
    }
    const cards = (m.cards ?? []) as CardRecord[]
    for (const c of cards) {
      if (c.playerId) {
        const p = ensurePlayer(c.playerId, c.teamId ?? '')
        if (c.type === 'yellow') p.yellowCards++
        else if (c.type === 'red') p.redCards++
        if (c.teamId) p.teamId = c.teamId
      }
    }
  }

  const scorers = Array.from(playerMap.entries())
    .filter(([, v]) => v.goals > 0 || v.assists > 0)
    .map(([playerId, v]) => ({ playerId, ...v }))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)

  const cardsList = Array.from(playerMap.entries())
    .filter(([, v]) => v.yellowCards > 0 || v.redCards > 0)
    .map(([playerId, v]) => ({ playerId, yellowCards: v.yellowCards, redCards: v.redCards, teamId: v.teamId }))
    .sort((a, b) => (b.yellowCards + b.redCards * 2) - (a.yellowCards + a.redCards * 2))

  // 팀별 승점 집계
  const teamStats = leagueTeamIds.map(teamId => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0
    for (const m of completedMatches) {
      const isHome = m.homeTeamId === teamId
      const isAway = m.awayTeamId === teamId
      if (!isHome && !isAway) continue
      const myScore = isHome ? (m.homeScore as number ?? 0) : (m.awayScore as number ?? 0)
      const opScore = isHome ? (m.awayScore as number ?? 0) : (m.homeScore as number ?? 0)
      gf += myScore; ga += opScore
      if (myScore > opScore) w++
      else if (myScore === opScore) d++
      else l++
    }
    return { teamId, w, d, l, gf, ga, gd: gf - ga, pts: w * 3 + d }
  }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

  return { scorers, cards: cardsList, teamStats }
}

// ── Handler ──────────────────────────────────────────────────────────────────

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

    // GET /league/:id/stats  — 리그 통계 집계
    if (method === 'GET' && parts[1] === 'stats') {
      const matchesResult = await db.send(new QueryCommand({
        TableName: LEAGUE_MATCHES,
        IndexName: 'leagueId-index',
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))
      const teamsResult = await db.send(new QueryCommand({
        TableName: LEAGUE_TEAMS,
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))
      const teamIds = (teamsResult.Items ?? []).map(t => t.teamId as string)
      const stats = aggregateStats(matchesResult.Items ?? [], teamIds)
      return res(200, stats)
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

    // PATCH /league/:id/matches/:matchId  (결과 입력 + 토너먼트 자동 진출)
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

      // 토너먼트 자동 진출: status가 completed로 변경된 경우
      if (body.status === 'completed' && league.Item.type === 'tournament') {
        // 현재 매치의 round 조회
        const matchResult = await db.send(new GetCommand({ TableName: LEAGUE_MATCHES, Key: { id: parts[2] } }))
        const currentRound = matchResult.Item?.round as string | undefined
        if (currentRound) {
          await tryAdvanceTournament(leagueId, currentRound)
        }
      }

      return res(200, { message: 'updated' })
    }

    return res(404, { message: 'Not found' })
  } catch (e) {
    console.error(e)
    return res(500, { message: 'Internal server error' })
  }
}
