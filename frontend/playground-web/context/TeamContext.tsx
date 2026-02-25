'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { useAuth } from '@/context/AuthContext'
import type { Team } from '@/types/manage'

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
      const data: Team[] = await manageFetch('/team')
      setTeams(data)
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

  const isLeader = !!(currentTeam && user && currentTeam.leaderId === user.username)

  useEffect(() => { reload() }, [user?.username])

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
