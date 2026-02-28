// ── Team ──────────────────────────────────────────────
export type TeamRole = 'leader' | 'member'
export type AgeGroup = 'elementary' | 'middle' | 'high' | 'university' | 'worker' | 'senior' | 'mixed'

export interface Team {
  id: string
  name: string
  description?: string
  logoUrl?: string
  region: string
  activityDays: string[]
  activityTime?: string
  ageGroup: AgeGroup
  isPublic: boolean
  leaderId: string
  createdAt: string
}

export interface TeamMember {
  teamId: string
  userId: string
  role: TeamRole
  number?: number
  position?: string
  phone?: string
  joinedAt: string
}

export interface PlayerStats {
  teamId: string
  userId: string
  games?: number
  goals?: number
  assists?: number
  wins?: number
  draws?: number
  losses?: number
}

export interface Uniform {
  teamId: string
  userId: string
  number?: number
  size?: string
  issued?: boolean
}

export interface Equipment {
  id: string
  teamId: string
  name: string
  quantity?: number
  notes?: string
}

export interface Recruitment {
  id: string
  teamId: string
  title: string
  positions?: string
  isOpen: boolean
  createdAt: string
}

// ── Finance ───────────────────────────────────────────
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  teamId: string
  type: TransactionType
  amount: number
  description: string
  date: string
  createdBy: string
  createdAt: string
}

export interface Due {
  id: string
  teamId: string
  userId: string
  amount: number
  description: string
  dueDate?: string
  paid: boolean
  paidAt?: string
}

export interface Fine {
  id: string
  teamId: string
  userId: string
  amount: number
  reason: string
  paid: boolean
  createdAt: string
}

// ── Match / Schedule ──────────────────────────────────
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'completed'
export type AttendanceStatus = 'attending' | 'absent' | 'pending'

export interface GoalRecord {
  scorer: string   // userId
  assist?: string  // userId
  minute?: number
}

export type CardType = 'yellow' | 'red'

export interface CardRecord {
  playerId: string  // userId
  type: CardType
  minute?: number
}

export interface Lineup {
  starters: string[]  // userIds (max 11)
  subs: string[]      // bench userIds
}

export interface Match {
  id: string
  homeTeamId: string
  awayTeamId: string
  scheduledAt: string
  venue: string
  venueAddress?: string
  status: MatchStatus
  homeScore?: number
  awayScore?: number
  goals?: GoalRecord[]
  cards?: CardRecord[]
  lineup?: Lineup
  pkOrder?: string[]                      // PK 순서 (userIds, KJA 규칙)
  cardReset?: { at: string; by: string }  // 경고 초기화 이벤트 (KJA 4강 진출 시)
  note?: string
  createdAt: string
}

export interface Attendance {
  matchId: string
  userId: string
  status: AttendanceStatus
  updatedAt: string
}

export interface Announcement {
  id: string
  teamId: string
  authorId: string
  title: string
  content: string
  createdAt: string
}

export interface Poll {
  id: string
  teamId: string
  authorId: string
  question: string
  options: string[]
  endsAt?: string
  createdAt: string
}

export interface PollVote {
  pollId: string
  userId: string
  optionIndex: number
  votedAt: string
}

// ── League ────────────────────────────────────────────
export type LeagueType = 'league' | 'tournament'
export type LeagueStatus = 'recruiting' | 'ongoing' | 'finished'

export interface League {
  id: string
  name: string
  type: LeagueType
  organizerId: string
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

export interface LeagueMatch extends Match {
  leagueId: string
  round?: string
}
