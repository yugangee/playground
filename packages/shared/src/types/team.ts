export type TeamRole = 'leader' | 'member'
export type AgeGroup = 'elementary' | 'middle' | 'high' | 'university' | 'worker' | 'senior' | 'mixed'

export interface Team {
  id: string
  name: string
  description?: string
  logoUrl?: string
  region: string
  activityDays: string[]       // ['mon', 'wed', 'fri']
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
  number?: number              // 등번호
  position?: string
  phone?: string               // 연락처
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
  name: string                 // '축구공', '조끼' 등
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
