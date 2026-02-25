export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'completed'
export type AttendanceStatus = 'attending' | 'absent' | 'pending'

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
