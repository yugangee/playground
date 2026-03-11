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
  goals?: GoalRecord[]
  cards?: CardRecord[]
  guests?: string[]
  winner?: string
  pkScore?: { home: number; away: number }
}

export interface LeagueTeam {
  leagueId: string
  teamId: string
  joinedAt: string
}

// ── Round ordering ───────────────────────────────────────────────────────────

export const ROUND_ORDER = ['1라운드', '16강', '8강', '준결승', '결승']

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
