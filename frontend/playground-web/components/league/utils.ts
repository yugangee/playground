import type { GoalRecord, CardRecord } from '@/types/manage'

// ── Local interfaces (used across league components) ─────────────────────────

export interface LeagueMatch {
  id: string
  leagueId: string
  homeTeamId: string
  awayTeamId: string
  scheduledAt: string
  venue: string
  status: string
  homeScore?: number
  awayScore?: number
  round?: string
  matchNumber?: number
  goals?: GoalRecord[]
  cards?: CardRecord[]
  guests?: string[]
  winner?: string
  pkScore?: { home: number; away: number }
  block?: 'left' | 'right' | 'final'
  nextMatchNumber?: number
  nextMatchSlot?: 'home' | 'away'
  loserNextMatchNumber?: number
  loserNextMatchSlot?: 'home' | 'away'
  forfeitTeamId?: string
  forfeitReason?: string
}

export interface LeagueTeam {
  leagueId: string
  teamId: string
  joinedAt: string
}

// ── Round ordering ───────────────────────────────────────────────────────────

export const ROUND_ORDER = ['1라운드', '32강', '16강', '8강', '준결승', '결승']

// ── Fixed bracket system ────────────────────────────────────────────────────

export const BRACKET_ROUNDS: Record<number, string[]> = {
  4:  ['준결승', '결승'],
  8:  ['8강', '준결승', '결승'],
  16: ['16강', '8강', '준결승', '결승'],
  32: ['32강', '16강', '8강', '준결승', '결승'],
}

export interface BracketMatch {
  matchNumber: number
  round: string
  homeTeamId: string  // teamId, 'TBD', or 'BYE'
  awayTeamId: string
}

/** 임의 크기에서 가장 가까운 큰 power-of-2 계산 */
export function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

/** bracket 라운드 이름 자동 생성 (임의 크기 지원) */
export function getBracketRounds(bracketSize: number): string[] {
  // power-of-2 프리셋이 있으면 그것을 사용
  if (BRACKET_ROUNDS[bracketSize]) return BRACKET_ROUNDS[bracketSize]
  // 그 외: nextPowerOf2 기반으로 라운드 생성
  const p2 = nextPowerOf2(bracketSize)
  return BRACKET_ROUNDS[p2] ?? generateRoundNames(p2)
}

function generateRoundNames(p2: number): string[] {
  const names: string[] = []
  if (p2 >= 64) names.push('1라운드')
  if (p2 >= 32) names.push('32강')
  if (p2 >= 16) names.push('16강')
  if (p2 >= 8) names.push('8강')
  names.push('준결승', '결승')
  return names
}

/** 고정 대진표 전체 생성 (첫 라운드~결승+3/4위전, 임의 크기 지원) */
export function generateFullBracket(
  bracketSize: number,
  seedings: Map<number, string>,
): BracketMatch[] {
  const p2 = nextPowerOf2(bracketSize)
  const rounds = getBracketRounds(bracketSize)
  if (!rounds || rounds.length === 0) throw new Error(`Invalid bracketSize: ${bracketSize}`)

  const matches: BracketMatch[] = []
  let matchNumber = 1
  const firstRoundCount = p2 / 2

  // 첫 라운드: seedings 기반 팀 배치
  for (let i = 0; i < firstRoundCount; i++) {
    matches.push({
      matchNumber: matchNumber++,
      round: rounds[0],
      homeTeamId: seedings.get(i * 2) ?? 'BYE',
      awayTeamId: seedings.get(i * 2 + 1) ?? 'BYE',
    })
  }

  // 이후 라운드 (TBD vs TBD)
  for (let r = 1; r < rounds.length; r++) {
    const count = firstRoundCount / Math.pow(2, r)
    for (let i = 0; i < count; i++) {
      matches.push({
        matchNumber: matchNumber++,
        round: rounds[r],
        homeTeamId: 'TBD',
        awayTeamId: 'TBD',
      })
    }
  }

  // 3/4위전
  matches.push({
    matchNumber: matchNumber++,
    round: '3/4위전',
    homeTeamId: 'TBD',
    awayTeamId: 'TBD',
  })

  return matches
}

/** 매치 번호로 다음 라운드 매치 정보 계산 */
export function getNextMatchInfo(
  matchNumber: number,
  bracketSize: number,
): { nextMatchNumber: number; isHome: boolean } | null {
  const p2 = nextPowerOf2(bracketSize)
  const rounds = getBracketRounds(bracketSize)
  if (!rounds) return null

  const firstRoundCount = p2 / 2
  const totalRegular = p2 - 1 // 3/4위전 제외
  const thirdPlaceNumber = totalRegular + 1

  // 결승 또는 3/4위전이면 다음 없음
  if (matchNumber >= totalRegular || matchNumber === thirdPlaceNumber) return null

  // 매치가 속한 라운드 찾기
  let start = 1
  for (let r = 0; r < rounds.length - 1; r++) {
    const count = firstRoundCount / Math.pow(2, r)
    if (matchNumber >= start && matchNumber < start + count) {
      const posInRound = matchNumber - start
      const nextStart = start + count
      return {
        nextMatchNumber: nextStart + Math.floor(posInRound / 2),
        isHome: posInRound % 2 === 0,
      }
    }
    start += count
  }

  return null
}

/** 준결승 매치 번호 2개 반환 (3/4위전 패자 배치용) */
export function getSemifinalMatchNumbers(bracketSize: number): [number, number] {
  const p2 = nextPowerOf2(bracketSize)
  const rounds = getBracketRounds(bracketSize)
  if (!rounds) throw new Error(`Invalid bracketSize: ${bracketSize}`)

  const firstRoundCount = p2 / 2
  let start = 1
  for (let r = 0; r < rounds.length; r++) {
    const count = firstRoundCount / Math.pow(2, r)
    if (rounds[r] === '준결승') return [start, start + 1]
    start += count
  }
  throw new Error('No semifinal round found')
}

/** bracketSize만으로 대진표 구조 생성 (매치 데이터 없이 렌더링용) */
export interface BracketRound {
  name: string
  matchNumbers: number[]
}

export function generateBracketTemplate(bracketSize: number): BracketRound[] {
  const p2 = nextPowerOf2(bracketSize)
  const rounds = getBracketRounds(bracketSize)
  if (!rounds || rounds.length === 0) return []

  const result: BracketRound[] = []
  let matchNumber = 1
  const firstRoundCount = p2 / 2

  for (let r = 0; r < rounds.length; r++) {
    const count = firstRoundCount / Math.pow(2, r)
    const matchNumbers: number[] = []
    for (let i = 0; i < count; i++) {
      matchNumbers.push(matchNumber++)
    }
    result.push({ name: rounds[r], matchNumbers })
  }

  return result
}

// ── Bracket / Schedule generation ────────────────────────────────────────────

export function firstRoundName(n: number): string {
  if (n <= 2) return '결승'
  if (n <= 4) return '준결승'
  if (n <= 8) return '8강'
  if (n <= 16) return '16강'
  return '1라운드'
}

export function generateTournamentPairs(teamIds: string[]) {
  const shuffled = [...teamIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const rName = firstRoundName(shuffled.length)
  const pairs: Array<{ homeTeamId: string; awayTeamId: string; round: string }> = []
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairs.push({ homeTeamId: shuffled[i], awayTeamId: shuffled[i + 1], round: rName })
  }
  return pairs
}

export function generateRoundRobin(teamIds: string[]) {
  const teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push('BYE')
  const N = teams.length
  const pairs: Array<{ homeTeamId: string; awayTeamId: string; round: string }> = []

  for (let round = 0; round < N - 1; round++) {
    for (let i = 0; i < N / 2; i++) {
      const home = teams[i]
      const away = teams[N - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        pairs.push({ homeTeamId: home, awayTeamId: away, round: `${round + 1}라운드` })
      }
    }
    const last = teams.splice(N - 1, 1)[0]
    teams.splice(1, 0, last)
  }
  return pairs
}
