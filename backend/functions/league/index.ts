import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

function getUserId(event: APIGatewayProxyEvent): string | undefined {
  const sub = event.requestContext.authorizer?.claims?.sub as string | undefined
  if (sub) return sub
  return undefined
}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const LEAGUES = process.env.LEAGUES_TABLE!
const TEAMS = process.env.TEAMS_TABLE!
const LEAGUE_TEAMS = process.env.LEAGUE_TEAMS_TABLE!
const LEAGUE_MATCHES = process.env.LEAGUE_MATCHES_TABLE!
const MATCH_EVENTS = process.env.MATCH_EVENTS_TABLE!
const MATCH_LINEUPS = process.env.MATCH_LINEUPS_TABLE!
const MATCH_MOM = process.env.MATCH_MOM_TABLE!
const LEAGUE_ROSTERS = process.env.LEAGUE_ROSTERS_TABLE!

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

const ROUND_ORDER = ['1라운드', '32강', '16강', '8강', '준결승', '결승']

// 4강 진출 기준이 되는 라운드들 (이 라운드까지의 경고가 초기화 대상)
const SEMIFINAL_ROUNDS = ['준결승', '결승', '3/4위전']

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

function getLoser(match: Record<string, unknown>): string | null {
  const winner = getWinner(match)
  if (!winner) return null
  return winner === (match.homeTeamId as string)
    ? (match.awayTeamId as string)
    : (match.homeTeamId as string)
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

  // 모두 completed/forfeit + winner 확정인지 확인
  const allCompleted = roundMatches.every(m =>
    (m.status === 'completed' || m.status === 'forfeit') && getWinner(m)
  )
  if (!allCompleted) return

  // 이미 다음 라운드 매치가 존재하면 중복 생성 방지
  const nextRoundMatches = allMatches.filter(m => m.round === next)
  if (nextRoundMatches.length > 0) return

  // winners & losers 추출
  const winners = roundMatches.map(m => getWinner(m)!).filter(Boolean)
  if (winners.length < 2) return

  const defaultDate = new Date().toISOString()

  // 다음 라운드 매치 생성
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

  // 준결승 완료 시 3/4위전 자동 생성
  if (currentRound === '준결승') {
    const losers = roundMatches.map(m => getLoser(m)).filter(Boolean) as string[]

    if (losers.length === 2) {
      const thirdPlaceExists = allMatches.some(m => m.round === '3/4위전')
      if (!thirdPlaceExists) {
        await db.send(new PutCommand({
          TableName: LEAGUE_MATCHES,
          Item: {
            id: randomUUID(),
            leagueId,
            homeTeamId: losers[0],
            awayTeamId: losers[1],
            round: '3/4위전',
            scheduledAt: defaultDate,
            venue: '미정',
            status: 'pending',
            createdAt: defaultDate,
          },
        }))
      }
    }
  }

  // 홀수 winner → 부전승 (자동 다음 라운드 진출은 하지 않음, 주최자가 수동 처리)
}

// ── 고정 대진표: 매치별 개별 진출 헬퍼 ──────────────────────────────────────

function getNextMatchInfoBackend(matchNumber: number, bracketSize: number): { nextMatchNumber: number; isHome: boolean } | null {
  const thirdPlaceMatch = bracketSize
  const finalMatch = bracketSize - 1
  if (matchNumber === finalMatch || matchNumber === thirdPlaceMatch) return null

  let roundStart = 1
  let roundSize = bracketSize / 2
  while (roundStart + roundSize <= matchNumber) {
    roundStart += roundSize
    roundSize = Math.floor(roundSize / 2)
  }

  const nextRoundStart = roundStart + roundSize
  const posInRound = matchNumber - roundStart
  const nextMatchNumber = nextRoundStart + Math.floor(posInRound / 2)
  const isHome = posInRound % 2 === 0

  return { nextMatchNumber, isHome }
}

// 매치에서 팀 ID → 팀 이름 매핑 추출
function getTeamName(match: Record<string, unknown>, teamId: string): string {
  if (teamId === match.homeTeamId) return (match.homeTeamName as string) || teamId
  if (teamId === match.awayTeamId) return (match.awayTeamName as string) || teamId
  return teamId
}

// 다음 매치에 teamId + teamName 함께 업데이트
async function updateNextMatchSlot(nextMatchId: string, slot: 'home' | 'away', teamId: string, teamName: string) {
  const idField = slot === 'away' ? 'awayTeamId' : 'homeTeamId'
  const nameField = slot === 'away' ? 'awayTeamName' : 'homeTeamName'
  await db.send(new UpdateCommand({
    TableName: LEAGUE_MATCHES,
    Key: { id: nextMatchId },
    UpdateExpression: 'SET #idF = :idV, #nameF = :nameV',
    ExpressionAttributeNames: { '#idF': idField, '#nameF': nameField },
    ExpressionAttributeValues: { ':idV': teamId, ':nameV': teamName },
  }))
}

async function advanceMatchWinner(leagueId: string, matchId: string) {
  const matchResult = await db.send(new GetCommand({ TableName: LEAGUE_MATCHES, Key: { id: matchId } }))
  const match = matchResult.Item
  if (!match || !match.matchNumber) return

  const leagueResult = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
  const league = leagueResult.Item
  if (!league) return

  const winner = getWinner(match)
  if (!winner) return

  const matchNumber = match.matchNumber as number
  const loser = getLoser(match)
  const winnerName = getTeamName(match, winner)
  const loserName = loser ? getTeamName(match, loser) : ''

  // 전체 매치 조회
  const allResult = await db.send(new QueryCommand({
    TableName: LEAGUE_MATCHES,
    IndexName: 'leagueId-index',
    KeyConditionExpression: 'leagueId = :lid',
    ExpressionAttributeValues: { ':lid': leagueId },
  }))
  const allMatches = allResult.Items ?? []

  // ── 커스텀 대진표: nextMatchNumber 필드가 매치에 있으면 직접 사용 ──
  if (match.nextMatchNumber) {
    const nextMatch = allMatches.find(m => m.matchNumber === (match.nextMatchNumber as number))
    if (nextMatch) {
      const slot = ((match.nextMatchSlot as string) || 'home') as 'home' | 'away'
      await updateNextMatchSlot(nextMatch.id as string, slot, winner, winnerName)
    }
  } else {
    // ── 기존 power-of-2 공식 기반 진출 ──
    const bracketSize = league.bracketSize as number | undefined
    if (!bracketSize) return

    const nextInfo = getNextMatchInfoBackend(matchNumber, bracketSize)
    if (nextInfo) {
      const nextMatch = allMatches.find(m => m.matchNumber === nextInfo.nextMatchNumber)
      if (nextMatch) {
        const slot = nextInfo.isHome ? 'home' as const : 'away' as const
        await updateNextMatchSlot(nextMatch.id as string, slot, winner, winnerName)
      }
    }

    // 준결승 패자 → 3/4위전 배치 (power-of-2 전용)
    const sfMatch1 = bracketSize - 3
    const sfMatch2 = bracketSize - 2
    const thirdPlaceMatchNumber = bracketSize

    if ((matchNumber === sfMatch1 || matchNumber === sfMatch2) && loser && loser !== 'BYE') {
      const thirdMatch = allMatches.find(m => m.matchNumber === thirdPlaceMatchNumber)
      if (thirdMatch) {
        const slot = matchNumber === sfMatch1 ? 'home' as const : 'away' as const
        await updateNextMatchSlot(thirdMatch.id as string, slot, loser, loserName)
      }
    }
  }

  // ── 커스텀 대진표: 패자 진출 (loserNextMatchNumber) ──
  if (match.loserNextMatchNumber && loser && loser !== 'BYE' && loser !== 'TBD') {
    const loserNextMatch = allMatches.find(m => m.matchNumber === (match.loserNextMatchNumber as number))
    if (loserNextMatch) {
      const slot = ((match.loserNextMatchSlot as string) || 'home') as 'home' | 'away'
      await updateNextMatchSlot(loserNextMatch.id as string, slot, loser, loserName)
    }
  }
}

// ── 통계 집계 헬퍼 ──────────────────────────────────────────────────────────

interface GoalRecord { scorer: string; assist?: string; minute?: number; teamId?: string }
interface CardRecord { playerId: string; type: 'yellow' | 'red'; minute?: number; teamId?: string }

function aggregateStats(matches: Record<string, unknown>[], leagueTeamIds: string[]) {
  const completedMatches = matches.filter(m => m.status === 'completed' || m.status === 'forfeit')

  // 선수별 득점/도움 집계
  const playerMap = new Map<string, { goals: number; assists: number; yellowCards: number; redCards: number; teamId: string }>()

  const ensurePlayer = (id: string, teamId: string) => {
    if (!playerMap.has(id)) playerMap.set(id, { goals: 0, assists: 0, yellowCards: 0, redCards: 0, teamId })
    return playerMap.get(id)!
  }

  for (const m of completedMatches) {
    // 몰수패 경기는 카드만 집계하고 득점은 제외
    if (m.status !== 'forfeit') {
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
      // 몰수패 처리: 몰수패 당한 팀은 0-3 패배
      if (m.status === 'forfeit') {
        const forfeitTeam = m.forfeitTeamId as string | undefined
        if (forfeitTeam === teamId) { l++; ga += 3; continue }
        if (forfeitTeam) { w++; gf += 3; continue }
      }
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

// ── 징계 계산 헬퍼 ──────────────────────────────────────────────────────────

interface DisciplineResult {
  playerId: string
  teamId: string
  totalYellows: number
  totalReds: number
  matchesBanned: number
  remainingBan: number
  warningReset: boolean
  isSuspended: boolean
  suspensionHistory: Array<{ round: string; reason: string }>
}

function calculateDiscipline(
  matches: Record<string, unknown>[],
  leagueRules: Record<string, unknown> | undefined
): DisciplineResult[] {
  const yellowLimit = (leagueRules?.yellowCardAccumulation as number) ?? 2
  const redBan = (leagueRules?.redCardSuspension as number) ?? 2

  // 라운드 순서 (경기 시간순으로 정렬)
  const roundOrder = ['1라운드', '2라운드', '32강', '16강', '8강', '준결승', '결승', '3/4위전']

  const completedMatches = matches
    .filter(m => m.status === 'completed' || m.status === 'forfeit')
    .sort((a, b) => {
      // 라운드 순서로 정렬
      const ra = roundOrder.indexOf(a.round as string)
      const rb = roundOrder.indexOf(b.round as string)
      if (ra !== rb) return ra - rb
      // 같은 라운드면 시간순
      return ((a.scheduledAt as string) ?? '').localeCompare((b.scheduledAt as string) ?? '')
    })

  // 선수별 경고/퇴장을 경기 순서대로 추적
  const playerData = new Map<string, {
    teamId: string
    yellowsBeforeSemis: number  // 4강 이전 경고 수
    yellowsAfterReset: number   // 4강 이후(또는 초기화 후) 경고 수
    totalReds: number
    banFromYellows: number      // 경고 누적으로 인한 출전정지 수
    banFromReds: number         // 레드카드로 인한 출전정지 수
    matchesServed: number       // 이미 빠진 경기 수
    warningReset: boolean
    reachedSemis: boolean
    suspensionHistory: Array<{ round: string; reason: string }>
  }>()

  const ensurePlayer = (id: string, teamId: string) => {
    if (!playerData.has(id)) {
      playerData.set(id, {
        teamId,
        yellowsBeforeSemis: 0,
        yellowsAfterReset: 0,
        totalReds: 0,
        banFromYellows: 0,
        banFromReds: 0,
        matchesServed: 0,
        warningReset: false,
        reachedSemis: false,
        suspensionHistory: [],
      })
    }
    return playerData.get(id)!
  }

  for (const m of completedMatches) {
    const round = (m.round as string) ?? ''
    const isSemifinalOrLater = SEMIFINAL_ROUNDS.includes(round) || round === '4강' || round === 'SF'

    const cards = (m.cards ?? []) as CardRecord[]
    for (const c of cards) {
      if (!c.playerId) continue
      const p = ensurePlayer(c.playerId, c.teamId ?? '')
      if (c.teamId) p.teamId = c.teamId

      if (isSemifinalOrLater) p.reachedSemis = true

      if (c.type === 'red') {
        p.totalReds++
        p.banFromReds += redBan
        p.suspensionHistory.push({ round, reason: `퇴장 → ${redBan}경기 출전정지` })
      } else if (c.type === 'yellow') {
        if (isSemifinalOrLater) {
          p.yellowsAfterReset++
        } else {
          p.yellowsBeforeSemis++
        }
      }
    }
  }

  // 4강 경고 초기화 적용 및 출전정지 계산
  const results: DisciplineResult[] = []

  for (const [playerId, p] of playerData.entries()) {
    // KJA 규칙: 8강까지 경고 1장만 받고 레드 0장인 선수가 4강 진출 시 초기화
    let effectiveYellows = p.yellowsBeforeSemis + p.yellowsAfterReset
    if (p.reachedSemis && p.yellowsBeforeSemis === 1 && p.totalReds === 0) {
      p.warningReset = true
      effectiveYellows = p.yellowsAfterReset // 4강 이전 1장 초기화
    }

    // 경고 누적 출전정지 계산
    p.banFromYellows = Math.floor(effectiveYellows / yellowLimit)
    if (p.banFromYellows > 0) {
      p.suspensionHistory.push({ round: '경고 누적', reason: `경고 ${effectiveYellows}장 → ${p.banFromYellows}경기 출전정지` })
    }

    const totalBan = p.banFromYellows + p.banFromReds
    const remainingBan = Math.max(0, totalBan - p.matchesServed)

    results.push({
      playerId,
      teamId: p.teamId,
      totalYellows: effectiveYellows,
      totalReds: p.totalReds,
      matchesBanned: totalBan,
      remainingBan,
      warningReset: p.warningReset,
      isSuspended: remainingBan > 0,
      suspensionHistory: p.suspensionHistory,
    })
  }

  return results.filter(r => r.totalYellows > 0 || r.totalReds > 0)
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

    // DELETE /league/:id  (주최자 또는 주최팀 리더, 연관 teams/matches/rosters cascade 삭제)
    if (method === 'DELETE' && parts.length === 1) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) {
        // 주최자가 아니면 → 주최팀의 리더인지 확인
        if (!league.Item.organizerTeamId) return res(403, { message: '리그 주최자만 삭제할 수 있습니다' })
        const orgTeam = await db.send(new GetCommand({ TableName: TEAMS, Key: { id: league.Item.organizerTeamId } }))
        if (!orgTeam.Item || orgTeam.Item.leaderId !== userId) {
          return res(403, { message: '리그 주최자만 삭제할 수 있습니다' })
        }
      }
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
      // cascade: LEAGUE_ROSTERS 삭제
      const rostersResult = await db.send(new QueryCommand({
        TableName: LEAGUE_ROSTERS,
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))
      await Promise.all((rostersResult.Items ?? []).map(r =>
        db.send(new DeleteCommand({ TableName: LEAGUE_ROSTERS, Key: { leagueId, sk: r.sk } }))
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
    if (method === 'POST' && parts[1] === 'teams' && !parts[2]) {
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

    // DELETE /league/:id/teams/:teamId  (팀 참가 취소 — 주최자 또는 해당 팀 리더)
    if (method === 'DELETE' && parts[1] === 'teams' && parts[2]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      const removeTeamId = parts[2]
      if (league.Item.organizerId !== userId) {
        // 주최자가 아니면 → 해당 팀의 리더인지 확인
        const team = await db.send(new GetCommand({ TableName: TEAMS, Key: { id: removeTeamId } }))
        if (!team.Item || team.Item.leaderId !== userId) {
          return res(403, { message: '주최자 또는 해당 팀 리더만 탈퇴할 수 있습니다' })
        }
      }
      await db.send(new DeleteCommand({ TableName: LEAGUE_TEAMS, Key: { leagueId, teamId: removeTeamId } }))
      return res(200, { message: 'deleted' })
    }

    // ── 로스터 관리 ──────────────────────────────────────────────────────────

    // GET /league/:id/rosters
    if (method === 'GET' && parts[1] === 'rosters' && !parts[2]) {
      const result = await db.send(new QueryCommand({
        TableName: LEAGUE_ROSTERS,
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))
      return res(200, result.Items ?? [])
    }

    // GET /league/:id/rosters/:teamId
    if (method === 'GET' && parts[1] === 'rosters' && parts[2] && !parts[3]) {
      const teamId = parts[2]
      const result = await db.send(new QueryCommand({
        TableName: LEAGUE_ROSTERS,
        KeyConditionExpression: 'leagueId = :lid AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':lid': leagueId, ':prefix': `${teamId}#` },
      }))
      return res(200, result.Items ?? [])
    }

    // PUT /league/:id/rosters/:teamId  (로스터 일괄 등록/수정)
    if (method === 'PUT' && parts[1] === 'rosters' && parts[2] && !parts[3]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const teamId = parts[2]

      // 권한 확인: 주최자 또는 해당 팀 리더
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) {
        const team = await db.send(new GetCommand({ TableName: TEAMS, Key: { id: teamId } }))
        if (!team.Item || team.Item.leaderId !== userId) {
          return res(403, { message: '주최자 또는 해당 팀 리더만 로스터를 수정할 수 있습니다' })
        }
      }

      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })
      const players = body.players as Array<{
        playerId: string; name: string; jerseyNumber: number;
        department?: string; verified?: boolean
      }> | undefined
      if (!players || !Array.isArray(players)) {
        return res(400, { message: 'players 배열은 필수입니다' })
      }

      // 검증: 최대 30명
      if (players.length > 30) {
        return res(400, { message: '팀당 최대 30명까지 등록 가능합니다' })
      }

      // 검증: 등번호 1-99, 중복 불가
      const jerseyNumbers = new Set<number>()
      for (const p of players) {
        if (p.jerseyNumber != null) {
          if (p.jerseyNumber < 1 || p.jerseyNumber > 99) {
            return res(400, { message: `등번호는 1-99 사이여야 합니다 (선수: ${p.name})` })
          }
          if (jerseyNumbers.has(p.jerseyNumber)) {
            return res(400, { message: `등번호 ${p.jerseyNumber}이(가) 중복됩니다` })
          }
          jerseyNumbers.add(p.jerseyNumber)
        }
      }

      // 기존 로스터 삭제
      const existing = await db.send(new QueryCommand({
        TableName: LEAGUE_ROSTERS,
        KeyConditionExpression: 'leagueId = :lid AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':lid': leagueId, ':prefix': `${teamId}#` },
      }))
      if (existing.Items && existing.Items.length > 0) {
        // 대회 진행 중이면 삭제 불가, 추가만 가능
        if (league.Item.status === 'ongoing') {
          // 기존 선수 ID 목록
          const existingIds = new Set(existing.Items.map(i => (i.sk as string).split('#')[1]))
          const newIds = new Set(players.map(p => p.playerId))
          const removed = [...existingIds].filter(id => !newIds.has(id))
          if (removed.length > 0) {
            return res(400, { message: '대회 진행 중에는 등록된 선수를 삭제할 수 없습니다. 추가만 가능합니다.' })
          }
        }
        await Promise.all(existing.Items.map(i =>
          db.send(new DeleteCommand({ TableName: LEAGUE_ROSTERS, Key: { leagueId, sk: i.sk } }))
        ))
      }

      // 새 로스터 저장
      const now = new Date().toISOString()
      await Promise.all(players.map(p =>
        db.send(new PutCommand({
          TableName: LEAGUE_ROSTERS,
          Item: {
            leagueId,
            sk: `${teamId}#${p.playerId}`,
            teamId,
            playerId: p.playerId,
            name: p.name,
            jerseyNumber: p.jerseyNumber,
            department: p.department ?? '',
            verified: p.verified ?? false,
            registeredAt: now,
          },
        }))
      ))

      return res(200, { message: `${players.length}명 등록 완료` })
    }

    // DELETE /league/:id/rosters/:teamId/:playerId
    if (method === 'DELETE' && parts[1] === 'rosters' && parts[2] && parts[3]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const teamId = parts[2]
      const playerId = parts[3]

      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.status === 'ongoing') {
        return res(400, { message: '대회 진행 중에는 선수를 삭제할 수 없습니다' })
      }
      if (league.Item.organizerId !== userId) {
        const team = await db.send(new GetCommand({ TableName: TEAMS, Key: { id: teamId } }))
        if (!team.Item || team.Item.leaderId !== userId) {
          return res(403, { message: '주최자 또는 해당 팀 리더만 선수를 삭제할 수 있습니다' })
        }
      }

      await db.send(new DeleteCommand({ TableName: LEAGUE_ROSTERS, Key: { leagueId, sk: `${teamId}#${playerId}` } }))
      return res(200, { message: 'deleted' })
    }

    // ── 징계 시스템 ──────────────────────────────────────────────────────────

    // GET /league/:id/discipline
    if (method === 'GET' && parts[1] === 'discipline') {
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })

      const matchesResult = await db.send(new QueryCommand({
        TableName: LEAGUE_MATCHES,
        IndexName: 'leagueId-index',
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))

      const discipline = calculateDiscipline(
        matchesResult.Items ?? [],
        league.Item.rules as Record<string, unknown> | undefined
      )

      return res(200, { players: discipline })
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
    if (method === 'GET' && parts[1] === 'matches' && !parts[2]) {
      const result = await db.send(new QueryCommand({
        TableName: LEAGUE_MATCHES,
        IndexName: 'leagueId-index',
        KeyConditionExpression: 'leagueId = :lid',
        ExpressionAttributeValues: { ':lid': leagueId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /league/:id/matches
    if (method === 'POST' && parts[1] === 'matches' && !parts[2]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })

      // 배치 생성 지원: body.matches 배열이 있으면 여러 경기 한번에 생성
      if (Array.isArray(body.matches)) {
        const items = (body.matches as Record<string, unknown>[]).map(m => ({
          id: randomUUID(),
          leagueId,
          ...m,
          status: m.status ?? 'pending',
          createdAt: new Date().toISOString(),
        }))
        await Promise.all(items.map(item =>
          db.send(new PutCommand({ TableName: LEAGUE_MATCHES, Item: item }))
        ))
        return res(201, items)
      }

      // F-3: 필수 필드 검증
      if (!body.homeTeamId || !body.awayTeamId) {
        return res(400, { message: 'homeTeamId, awayTeamId는 필수입니다' })
      }
      const item = { id: randomUUID(), leagueId, ...body, status: 'pending', createdAt: new Date().toISOString() }
      await db.send(new PutCommand({ TableName: LEAGUE_MATCHES, Item: item }))
      return res(201, item)
    }

    // DELETE /league/:id/matches/:matchId
    if (method === 'DELETE' && parts[1] === 'matches' && parts[2] && !parts[3]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) return res(403, { message: '리그 주최자만 경기를 삭제할 수 있습니다' })
      await db.send(new DeleteCommand({ TableName: LEAGUE_MATCHES, Key: { id: parts[2] } }))
      return res(200, { message: 'deleted' })
    }

    // PATCH /league/:id/matches/:matchId  (결과 입력 + 토너먼트 자동 진출 + 몰수패)
    if (method === 'PATCH' && parts[1] === 'matches' && parts[2] && !parts[3]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const league = await db.send(new GetCommand({ TableName: LEAGUES, Key: { id: leagueId } }))
      if (!league.Item) return res(404, { message: 'League not found' })
      if (league.Item.organizerId !== userId) return res(403, { message: '리그 주최자만 경기 결과를 수정할 수 있습니다' })
      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })

      // 몰수패 처리: status가 'forfeit'이면 winner 자동 설정
      if (body.status === 'forfeit' && body.forfeitTeamId) {
        const currentMatch = await db.send(new GetCommand({ TableName: LEAGUE_MATCHES, Key: { id: parts[2] } }))
        const cm = currentMatch.Item
        if (cm) {
          const forfeitTeam = body.forfeitTeamId as string
          const winnerTeam = forfeitTeam === (cm.homeTeamId as string)
            ? (cm.awayTeamId as string)
            : (cm.homeTeamId as string)
          body.winner = winnerTeam
        }
      }

      // 라인업 최소 인원 경고 (차단하지는 않음)
      const warnings: string[] = []
      if (body.status === 'completed') {
        const currentMatch = await db.send(new GetCommand({ TableName: LEAGUE_MATCHES, Key: { id: parts[2] } }))
        const cm = currentMatch.Item
        if (cm) {
          const lineup = (body.lineup ?? cm.lineup) as { starters?: string[] } | undefined
          if (lineup?.starters && lineup.starters.length < 7) {
            warnings.push(`홈팀 라인업이 ${lineup.starters.length}명으로 최소 7명 미달입니다`)
          }
        }
      }

      const updates = Object.entries(body)
      if (updates.length === 0) return res(400, { message: '수정할 필드가 없습니다' })
      const expr = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ')
      const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]))
      const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]))
      await db.send(new UpdateCommand({ TableName: LEAGUE_MATCHES, Key: { id: parts[2] }, UpdateExpression: expr, ExpressionAttributeNames: names, ExpressionAttributeValues: values }))

      // 토너먼트 자동 진출: status가 completed 또는 forfeit로 변경된 경우
      if ((body.status === 'completed' || body.status === 'forfeit') && league.Item.type === 'tournament') {
        const matchResult = await db.send(new GetCommand({ TableName: LEAGUE_MATCHES, Key: { id: parts[2] } }))
        const match = matchResult.Item
        if (match?.matchNumber) {
          // 고정 대진표: 매치별 개별 진출
          await advanceMatchWinner(leagueId, parts[2])
        } else {
          // 레거시: 라운드별 진출
          const currentRound = match?.round as string | undefined
          if (currentRound) {
            await tryAdvanceTournament(leagueId, currentRound)
          }
        }
      }

      return res(200, { message: 'updated', warnings: warnings.length > 0 ? warnings : undefined })
    }

    // ── Match Events (타임라인) ────────────────────────────────────────────

    const matchId = parts[2]

    // GET /league/:id/matches/:matchId/events
    if (method === 'GET' && parts[1] === 'matches' && parts[3] === 'events' && !parts[4]) {
      const result = await db.send(new QueryCommand({
        TableName: MATCH_EVENTS,
        KeyConditionExpression: 'matchId = :mid',
        ExpressionAttributeValues: { ':mid': matchId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /league/:id/matches/:matchId/events
    if (method === 'POST' && parts[1] === 'matches' && parts[3] === 'events') {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })
      const item = {
        matchId,
        eventId: randomUUID(),
        leagueId,
        ...body,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      }
      await db.send(new PutCommand({ TableName: MATCH_EVENTS, Item: item }))
      return res(201, item)
    }

    // DELETE /league/:id/matches/:matchId/events/:eventId
    if (method === 'DELETE' && parts[1] === 'matches' && parts[3] === 'events' && parts[4]) {
      if (!userId) return res(401, { message: 'Unauthorized' })
      await db.send(new DeleteCommand({ TableName: MATCH_EVENTS, Key: { matchId, eventId: parts[4] } }))
      return res(200, { message: 'deleted' })
    }

    // ── Match Lineups ───────────────────────────────────────────────────

    // GET /league/:id/matches/:matchId/lineups
    if (method === 'GET' && parts[1] === 'matches' && parts[3] === 'lineups') {
      const result = await db.send(new QueryCommand({
        TableName: MATCH_LINEUPS,
        KeyConditionExpression: 'matchId = :mid',
        ExpressionAttributeValues: { ':mid': matchId },
      }))
      return res(200, result.Items ?? [])
    }

    // POST /league/:id/matches/:matchId/lineups
    if (method === 'POST' && parts[1] === 'matches' && parts[3] === 'lineups') {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const body = parseBody(event.body)
      if (!body) return res(400, { message: '요청 본문이 올바른 JSON 형식이 아닙니다' })
      const quarter = (body.quarter as string) ?? 'Q1'
      const item = {
        matchId,
        quarter,
        ...body,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      }
      await db.send(new PutCommand({ TableName: MATCH_LINEUPS, Item: item }))
      return res(201, item)
    }

    // ── MOM 투표 ────────────────────────────────────────────────────────

    // GET /league/:id/matches/:matchId/mom
    if (method === 'GET' && parts[1] === 'matches' && parts[3] === 'mom') {
      const result = await db.send(new QueryCommand({
        TableName: MATCH_MOM,
        KeyConditionExpression: 'matchId = :mid',
        ExpressionAttributeValues: { ':mid': matchId },
      }))
      // 투표 집계
      const votes = result.Items ?? []
      const tally = new Map<string, number>()
      votes.forEach(v => {
        const pid = v.playerId as string
        tally.set(pid, (tally.get(pid) ?? 0) + 1)
      })
      const ranked = Array.from(tally.entries())
        .map(([playerId, count]) => ({ playerId, votes: count }))
        .sort((a, b) => b.votes - a.votes)
      return res(200, { votes, ranked, totalVotes: votes.length })
    }

    // POST /league/:id/matches/:matchId/mom
    if (method === 'POST' && parts[1] === 'matches' && parts[3] === 'mom') {
      if (!userId) return res(401, { message: 'Unauthorized' })
      const body = parseBody(event.body)
      if (!body || !body.playerId) return res(400, { message: 'playerId는 필수입니다' })
      try {
        await db.send(new PutCommand({
          TableName: MATCH_MOM,
          Item: {
            matchId,
            voterId: userId,
            playerId: body.playerId,
            votedAt: new Date().toISOString(),
          },
          ConditionExpression: 'attribute_not_exists(matchId) AND attribute_not_exists(voterId)',
        }))
      } catch (e) {
        if (e instanceof ConditionalCheckFailedException) {
          return res(409, { message: '이미 투표하셨습니다' })
        }
        throw e
      }
      return res(201, { message: 'voted' })
    }

    return res(404, { message: 'Not found' })
  } catch (e) {
    console.error(e)
    return res(500, { message: 'Internal server error' })
  }
}
