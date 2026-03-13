// ── Team ──────────────────────────────────────────────
export type TeamRole = 'leader' | 'member'
export type AgeGroup = 'elementary' | 'middle' | 'high' | 'university' | 'worker' | 'senior' | 'mixed'
export type SportCategory = 'competitive' | 'club'
export type SportType =
  | 'soccer' | 'futsal'
  | 'basketball' | 'baseball' | 'volleyball' | 'ice_hockey'
  | 'running' | 'snowboard' | 'badminton'

export interface Team {
  id: string
  name: string
  description?: string
  logoUrl?: string
  region: string
  activityDays: string[]
  activityTime?: string
  ageGroup: AgeGroup
  sportType?: SportType
  isPublic: boolean
  leaderId: string
  createdAt: string
}

export interface TeamMember {
  id?: string;
  userId: string;
  name: string;
  email?: string;
  position?: string;
  role?: string;
  roles?: string[];
  joinedAt?: string;
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
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'forfeit'
export type MatchType = 'match' | 'training'
export type AttendanceStatus = 'attending' | 'absent' | 'pending'

export interface GoalRecord {
  scorer: string   // userId
  assist?: string  // userId
  minute?: number
  quarter?: string  // '1Q' | '2Q' | '3Q' | '4Q'
}

export type CardType = 'yellow' | 'red'

export interface CardRecord {
  playerId: string  // userId
  type: CardType
  minute?: number
  quarter?: string  // '1Q' | '2Q' | '3Q' | '4Q'
}

export interface Lineup {
  starters: string[]  // userIds (max 11)
  subs: string[]      // bench userIds
}

export interface MatchTeamStats {
  shots?: number
  shotsOnTarget?: number
  corners?: number
  fouls?: number
  offsides?: number
  possession?: number  // 0-100 %
}

export interface Match {
  id: string
  homeTeamId: string
  awayTeamId: string
  scheduledAt: string
  venue: string
  venueAddress?: string
  matchType?: MatchType   // 'training'이면 훈련 일정
  status: MatchStatus
  homeScore?: number
  awayScore?: number
  goals?: GoalRecord[]
  cards?: CardRecord[]
  lineup?: Lineup           // 전반 라인업
  lineupSecond?: Lineup     // 후반 라인업
  pkOrder?: string[]                      // PK 순서 (userIds, KJA 규칙)
  cardReset?: { at: string; by: string }  // 경고 초기화 이벤트 (KJA 4강 진출 시)
  guests?: string[]                       // 용병(Guest) 임시 등록 이름 목록
  media?: string[]                         // 경기 미디어 (사진/영상 URL 목록)
  homeStats?: MatchTeamStats
  awayStats?: MatchTeamStats
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
export type SubstitutionRule = 'free' | 'limited'

export interface LeagueRules {
  quartersPerMatch?: number       // 기본 4 (구 호환)
  minutesPerQuarter?: number      // 기본 15 (구 호환)
  halvesPerMatch?: number         // 전·후반 수 (기본 2)
  minutesPerHalf?: number         // 하프당 시간 (기본 15)
  halftimeMinutes?: number        // 하프타임 (기본 10)
  substitutionRule?: SubstitutionRule  // 교체 규정
  maxSubstitutions?: number       // limited일 때 최대 교체 수
  yellowCardAccumulation?: number // 경고 누적 기준 (기본 2)
  redCardSuspension?: number      // 퇴장 시 출전정지 경기 수 (기본 2)
  penaltyShootout?: boolean       // 토너먼트 승부차기 여부
  maxGuestsPerMatch?: number      // 경기당 용병 제한 (기본 3)
  maxPlayersPerTeam?: number      // 팀당 최대 선수 수 (기본 30)
  minPlayersPerMatch?: number     // 경기당 최소 출전 인원 (기본 7)
}

export interface LeagueRegistration {
  visibility?: 'public' | 'private'
  entryFee?: number               // 참가비 (원)
  minTeams?: number               // 최소 참가팀 수 (기본 4)
  maxTeams?: number               // 최대 참가팀 수 (기본 16)
  registrationDeadline?: string   // ISO date
}

export interface LeagueVenue {
  name?: string
  address?: string
  parkingInfo?: string
  mapUrl?: string
}

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
  rules?: LeagueRules
  registration?: LeagueRegistration
  venue?: LeagueVenue
  awards?: string[]               // 시상 항목
  bracketSize?: number            // 토너먼트 대진표 규모 (임의 크기)
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
  matchNumber?: number           // 고정 대진표: 매치 순번 (1-based)
  winner?: string                // 토너먼트: 승리팀 ID (PK 등 동점 시 수동 지정)
  pkScore?: { home: number; away: number }  // 승부차기 결과
  block?: 'left' | 'right' | 'final'  // 커스텀 대진표: 좌/우/결승 블록
  nextMatchNumber?: number       // 커스텀 대진표: 승자가 진출할 다음 경기
  nextMatchSlot?: 'home' | 'away'  // 다음 경기에서의 위치
  loserNextMatchNumber?: number  // 패자가 이동할 경기 (3/4위전 등)
  loserNextMatchSlot?: 'home' | 'away'
  forfeitTeamId?: string         // 몰수패 팀 ID
  forfeitReason?: string         // 몰수패 사유
}

export interface LeaguePlayerStats {
  playerId: string
  name: string
  teamId: string
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  gamesPlayed: number
}

// 백엔드에서 계산 — 경고 누적/출전정지 추적용
export interface PlayerDiscipline {
  playerId: string
  teamId: string
  totalYellows: number
  totalReds: number
  matchesBanned: number   // 총 출전정지 경기 수
  remainingBan: number    // 남은 출전정지 경기 수
  warningReset: boolean   // 4강 진출 시 초기화 여부
  isSuspended: boolean    // 현재 출전정지 상태
  suspensionHistory?: Array<{ round: string; reason: string }>
}

// 구 호환: PlayerSuspension (PlayerDiscipline의 별칭)
export type PlayerSuspension = PlayerDiscipline

// 대회별 선수 등록 (로스터)
export interface LeagueRosterPlayer {
  leagueId: string
  sk: string              // `${teamId}#${playerId}`
  teamId: string
  playerId: string
  name: string
  jerseyNumber: number
  department?: string
  verified: boolean
  registeredAt: string
}
