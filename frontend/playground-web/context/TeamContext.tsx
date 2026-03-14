'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

const AUTH_API = process.env.NEXT_PUBLIC_API_URL

// Auth API의 Club 타입 (마이페이지와 동일)
interface Club {
  clubId: string
  name: string
  sport: string
  members: number
  winRate: number
  areas?: { sido: string; sigungu: string }[]
  image?: string
}

// Team 타입으로 변환 (기존 코드와 호환)
interface Team {
  id: string
  name: string
  region?: string
  sportType?: string
  leaderId?: string
  description?: string
  logoUrl?: string
  // Auth API Club 원본 데이터
  _club?: Club
}

interface TeamContextType {
  teams: Team[]
  currentTeam: Team | null
  setCurrentTeam: (team: Team) => void
  loading: boolean
  reload: () => Promise<void>
  isLeader: boolean
}

const TeamContext = createContext<TeamContextType | null>(null)

// Club → Team 변환 함수
function clubToTeam(club: Club): Team {
  return {
    id: club.clubId,
    name: club.name,
    sportType: club.sport,
    region: club.areas?.[0] ? [club.areas[0].sido, club.areas[0].sigungu].filter(Boolean).join(' ') : '',
    logoUrl: club.image,
    _club: club,
  }
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    if (!user) { setLoading(false); setTeams([]); setCurrentTeamState(null); return }
    
    // user.teamIds 또는 user.teamId에서 소속 팀 ID 목록 가져오기 (마이페이지 방식)
    const teamIds = user.teamIds || (user.teamId ? [user.teamId] : [])
    if (teamIds.length === 0) {
      setTeams([])
      setCurrentTeamState(null)
      setLoading(false)
      return
    }

    try {
      // Auth API /clubs에서 전체 클럽 조회
      const res = await fetch(`${AUTH_API}/clubs`)
      if (!res.ok) throw new Error('Failed to fetch clubs')
      const data = await res.json()
      const allClubs: Club[] = data.clubs || []
      
      // user.teamIds에 해당하는 클럽만 필터
      const myClubs = allClubs.filter((c: Club) => teamIds.includes(c.clubId))
      const myTeams = myClubs.map(clubToTeam)
      
      setTeams(myTeams)
      
      // 저장된 팀 ID 또는 user.teamId(대표팀)로 현재 팀 설정
      const savedId = localStorage.getItem('currentTeamId')
      const primaryId = user.teamId
      const saved = myTeams.find(t => t.id === savedId)
      const primary = myTeams.find(t => t.id === primaryId)
      setCurrentTeamState(saved ?? primary ?? myTeams[0] ?? null)
    } catch {
      setTeams([])
      setCurrentTeamState(null)
    } finally {
      setLoading(false)
    }
  }

  const setCurrentTeam = (team: Team) => {
    setCurrentTeamState(team)
    localStorage.setItem('currentTeamId', team.id)
  }

  // 리더 또는 매니저 여부 판단 (Auth API에서는 leaderId가 없으므로 user.role 체크)
  const isLeader = !!(currentTeam && user && (user.role === 'leader' || user.role === 'manager'))

  useEffect(() => { reload() }, [user?.username, user?.teamIds?.length, user?.teamId])

  return (
    <TeamContext.Provider value={{ teams, currentTeam, setCurrentTeam, loading, reload, isLeader }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeam must be used within TeamProvider')
  return ctx
}
