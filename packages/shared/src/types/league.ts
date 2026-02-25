export type LeagueType = 'league' | 'tournament'
export type LeagueStatus = 'recruiting' | 'ongoing' | 'finished'

export interface League {
  id: string
  name: string
  type: LeagueType
  organizerId: string          // 주최 팀 대표 userId
  organizerTeamId: string
  status: LeagueStatus
  isPublic: boolean
  region?: string
  startDate?: string
  endDate?: string
  description?: string
  createdAt: string
}

export interface LeagueTeam {
  leagueId: string
  teamId: string
  joinedAt: string
}

import type { Match } from './match'

export interface LeagueMatch extends Match {
  leagueId: string
  round?: string               // '8강', '준결승', '결승' 등
}
