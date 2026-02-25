'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from './AuthContext'
import type { Team } from '@playground/shared'

interface TeamContextType {
  teams: Team[]
  currentTeam: Team | null
  setCurrentTeam: (team: Team) => void
  loading: boolean
  reload: () => Promise<void>
  isLeader: boolean
}

const TeamContext = createContext<TeamContextType | null>(null)

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    if (!user) { setLoading(false); return }
    try {
      const data: Team[] = await apiFetch('/team')
      setTeams(data)
      // 저장된 팀 ID가 있으면 복원, 없으면 첫 번째 팀 선택
      const savedId = localStorage.getItem('currentTeamId')
      const saved = data.find(t => t.id === savedId)
      setCurrentTeamState(saved ?? data[0] ?? null)
    } catch {
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  const setCurrentTeam = (team: Team) => {
    setCurrentTeamState(team)
    localStorage.setItem('currentTeamId', team.id)
  }

  const isLeader = !!(currentTeam && user && currentTeam.leaderId === user.userId)

  const userId = user?.userId

  useEffect(() => { reload() }, [userId])

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
