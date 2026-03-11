'use client'

import React, { useState, useEffect } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import type { League } from '@/types/manage'
import { TypeBadge, StatusBadge, BackBtn, Empty, TeamSearchInvite } from './shared'
import { generateTournamentPairs, generateRoundRobin, type LeagueMatch, type LeagueTeam } from './utils'
import MatchDetailModal from './MatchDetailModal'
import MatchesSection from './MatchesSection'
import StandingsTable from './StandingsTable'
import BracketView, { TournamentResults } from './BracketView'
import StatsTab from './StatsTab'
import InfoTab from './InfoTab'
import LeagueInfoCard from './LeagueInfoCard'

type DetailTab = 'info' | 'teams' | 'matches' | 'standings' | 'bracket' | 'stats'

export default function LeagueDetail({ league: initialLeague, onBack, isOrganizer, currentTeamId }: {
  league: League; onBack: () => void; isOrganizer: boolean; currentTeamId: string
}) {
  const [league, setLeague] = useState(initialLeague)
  const [tab, setTab] = useState<DetailTab>('info')
  const [teams, setTeams] = useState<LeagueTeam[]>([])
  const [matches, setMatches] = useState<LeagueMatch[]>([])
  const [teamNames, setTeamNames] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [detailMatch, setDetailMatch] = useState<LeagueMatch | null>(null)

  const fetchAllTeamNames = async () => {
    try {
      const data = await manageFetch('/team/all')
      const allTeams: Array<{ id: string; name: string }> = data?.teams ?? data ?? []
      const names: Record<string, string> = {}
      allTeams.forEach((t: { id: string; name: string }) => {
        if (t.id && t.name) names[t.id] = t.name
      })
      setTeamNames(prev => ({ ...prev, ...names }))
    } catch {
      // fallback: 개별 조회
    }
  }

  const fetchTeamNames = async (teamIds: string[]) => {
    const uniqueIds = Array.from(new Set(teamIds)).filter(id => !teamNames[id])
    if (uniqueIds.length === 0) return
    // /team/all 에서 못 가져온 팀은 pg-teams에 없는 경우(Auth API club 등)이므로
    // 개별 fetch 없이 ID를 이름 대용으로 사용하여 불필요한 404 요청 방지
    const names: Record<string, string> = {}
    uniqueIds.forEach(tid => { names[tid] = tid })
    setTeamNames(prev => ({ ...prev, ...names }))
  }

  const loadTeams = async () => {
    try {
      const data: LeagueTeam[] = await manageFetch(`/league/${league.id}/teams`)
      setTeams(data)
      return data
    } catch { return [] }
  }
  const loadMatches = async () => {
    try {
      const data: LeagueMatch[] = await manageFetch(`/league/${league.id}/matches`)
      setMatches(data)
      return data
    } catch { return [] }
  }

  useEffect(() => {
    fetchAllTeamNames().then(() => {
      Promise.all([loadTeams(), loadMatches()]).then(([teamsData, matchesData]) => {
        const allIds = new Set<string>()
        teamsData.forEach(t => allIds.add(t.teamId))
        matchesData.forEach(m => { allIds.add(m.homeTeamId); allIds.add(m.awayTeamId) })
        if (allIds.size > 0) fetchTeamNames(Array.from(allIds))
      })
    })
  }, [league.id])

  const tn = (id: string) => teamNames[id] ?? id

  const deleteLeague = async () => {
    if (!confirm(`"${league.name}" 대회를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
    try { await manageFetch(`/league/${league.id}`, { method: 'DELETE' }); onBack() }
    catch (e) { alert(e instanceof Error ? e.message : '삭제 실패') }
  }

  const removeTeam = async (rmTeamId: string) => {
    if (!confirm('이 팀을 대회에서 제거하시겠습니까?')) return
    try { await manageFetch(`/league/${league.id}/teams/${rmTeamId}`, { method: 'DELETE' }); loadTeams() }
    catch (e) { alert(e instanceof Error ? e.message : '제거 실패') }
  }

  const startLeague = async () => {
    const tLabel = league.type === 'tournament' ? '토너먼트 대진표' : '라운드 로빈 일정'
    if (!confirm(`${tLabel}을 자동 생성하고 대회를 시작하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    setGenerating(true)
    try {
      const leagueTeams: LeagueTeam[] = await manageFetch(`/league/${league.id}/teams`)
      const teamIds = leagueTeams.map(t => t.teamId)
      if (teamIds.length < 2) { alert('최소 2팀 이상 참가해야 대회를 시작할 수 있습니다'); return }

      const pairs = league.type === 'tournament'
        ? generateTournamentPairs(teamIds)
        : generateRoundRobin(teamIds)

      const defaultDate = league.startDate
        ? new Date(league.startDate).toISOString()
        : new Date().toISOString()
      const venue = league.region ?? '미정'

      await Promise.all(
        pairs.map(p =>
          manageFetch(`/league/${league.id}/matches`, {
            method: 'POST',
            body: JSON.stringify({ ...p, scheduledAt: defaultDate, venue }),
          })
        )
      )

      await manageFetch(`/league/${league.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ongoing' }),
      })

      setLeague(l => ({ ...l, status: 'ongoing' }))
      setTab('matches')
      const newMatches = await loadMatches()
      const newIds = new Set<string>()
      newMatches.forEach(m => { newIds.add(m.homeTeamId); newIds.add(m.awayTeamId) })
      const missingIds = Array.from(newIds).filter(id => !teamNames[id])
      if (missingIds.length > 0) fetchTeamNames(missingIds)
    } catch (e) {
      alert(e instanceof Error ? e.message : '대회 시작 실패')
    } finally { setGenerating(false) }
  }

  const endLeague = async () => {
    if (!confirm('대회를 종료하시겠습니까?')) return
    try {
      await manageFetch(`/league/${league.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'finished' }) })
      setLeague(l => ({ ...l, status: 'finished' }))
    } catch (e) { alert(e instanceof Error ? e.message : '종료 실패') }
  }

  // 순위 계산
  const standings = teams.map(t => {
    const teamMatches = matches.filter(m => (m.homeTeamId === t.teamId || m.awayTeamId === t.teamId) && m.status === 'completed')
    let w = 0, d = 0, l = 0, gf = 0, ga = 0
    const recentForm: string[] = []
    const sorted = [...teamMatches].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    sorted.forEach(m => {
      const isHome = m.homeTeamId === t.teamId
      const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0)
      const opScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0)
      gf += myScore; ga += opScore
      if (myScore > opScore) { w++; recentForm.push('W') }
      else if (myScore === opScore) { d++; recentForm.push('D') }
      else { l++; recentForm.push('L') }
    })
    return { teamId: t.teamId, w, d, l, gf, ga, gd: gf - ga, pts: w * 3 + d, form: recentForm.slice(0, 5) }
  }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

  const isTournament = league.type === 'tournament'
  const detailTabs: { key: DetailTab; label: string; show: boolean }[] = [
    { key: 'info', label: '정보', show: true },
    { key: 'teams', label: `참가팀 (${teams.length})`, show: true },
    { key: 'matches', label: `경기 (${matches.length})`, show: true },
    { key: 'standings', label: '순위', show: !isTournament },
    { key: 'bracket', label: '대진표', show: isTournament && matches.length > 0 },
    { key: 'stats', label: '통계', show: matches.some(m => m.status === 'completed') },
  ]

  return (
    <div>
      {detailMatch && (
        <MatchDetailModal
          match={detailMatch}
          leagueId={league.id}
          isOrganizer={isOrganizer}
          leagueStatus={league.status}
          leagueType={league.type}
          teamNames={teamNames}
          onClose={() => setDetailMatch(null)}
          onSave={async () => {
            const newMatches = await loadMatches()
            const missingIds = Array.from(new Set(
              newMatches.flatMap(m => [m.homeTeamId, m.awayTeamId])
            )).filter(id => !teamNames[id])
            if (missingIds.length > 0) fetchTeamNames(missingIds)
            setDetailMatch(null)
          }}
        />
      )}

      <div className="mb-8 flex items-start gap-3">
        <BackBtn onClick={onBack} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{league.name}</h1>
            <TypeBadge type={league.type} />
            <StatusBadge status={league.status} />
          </div>
          {league.region && <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>{league.region}</p>}
          {league.description && <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{league.description}</p>}
        </div>

        {isOrganizer && (
          <div className="flex flex-shrink-0 gap-2">
            {league.status === 'recruiting' && (
              <>
                <button onClick={startLeague} disabled={generating}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50">
                  {generating ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />생성 중...</>
                    : <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>대회 시작</>}
                </button>
                <button onClick={deleteLeague} className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-85"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>삭제</button>
              </>
            )}
            {league.status === 'ongoing' && (
              <button onClick={endLeague} className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-85"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>대회 종료</button>
            )}
          </div>
        )}
      </div>

      {isOrganizer && league.status === 'recruiting' && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#d97706' }}>
          <span className="font-semibold">모집중</span> — 팀을 초대한 후 <span className="font-semibold">&quot;대회 시작&quot;</span> 버튼을 누르면
          {league.type === 'tournament' ? ' 토너먼트 대진표가 자동으로 생성' : ' 라운드 로빈 일정이 자동으로 생성'}됩니다.
        </div>
      )}

      {league.type === 'tournament' && league.status === 'finished' && (
        <TournamentResults matches={matches} tn={tn} />
      )}

      <LeagueInfoCard league={league} teams={teams} matches={matches} />

      <div className="mb-6 flex gap-1 rounded-xl p-1 w-fit overflow-x-auto" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {detailTabs.filter(t => t.show).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-all whitespace-nowrap"
            style={tab === t.key
              ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
              : { color: 'var(--text-muted)' }
            }>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <InfoTab league={league} isOrganizer={isOrganizer}
          onUpdate={(updated) => setLeague(l => ({ ...l, ...updated }))} />
      )}

      {tab === 'teams' && (
        <div className="space-y-4">
          {isOrganizer && league.status === 'recruiting' && (
            <TeamSearchInvite onInvite={async (invTeamId) => {
              await manageFetch(`/league/${league.id}/teams`, { method: 'POST', body: JSON.stringify({ teamId: invTeamId }) })
              loadTeams()
            }} />
          )}
          {teams.length === 0 ? <Empty text="참가팀이 없습니다" /> : (
            <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>팀</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>참가일</th>
                    {isOrganizer && league.status === 'recruiting' && <th className="px-5 py-3.5" />}
                  </tr>
                </thead>
                <tbody>
                  {teams.map(t => (
                    <tr key={t.teamId} className="hover:opacity-80" style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {t.teamId === currentTeamId ? (
                          <span className="inline-flex items-center gap-1.5">
                            {tn(t.teamId)}
                            <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>우리팀</span>
                          </span>
                        ) : tn(t.teamId)}
                      </td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text-muted)' }}>{new Date(t.joinedAt).toLocaleDateString('ko-KR')}</td>
                      {isOrganizer && league.status === 'recruiting' && (
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => removeTeam(t.teamId)} className="hover:text-red-500 transition-colors" style={{ color: 'var(--text-muted)' }} title="팀 제거">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'matches' && (
        <MatchesSection leagueId={league.id} matches={matches} onRefresh={loadMatches} isOrganizer={isOrganizer}
          leagueStatus={league.status} leagueType={league.type} teamNames={teamNames} leagueTeams={teams} onMatchClick={setDetailMatch} />
      )}

      {tab === 'standings' && <StandingsTable standings={standings} tn={tn} currentTeamId={currentTeamId} matches={matches} />}

      {tab === 'bracket' && <BracketView matches={matches} tn={tn} onMatchClick={setDetailMatch} leagueStatus={league.status} />}

      {tab === 'stats' && <StatsTab matches={matches} leagueType={league.type} league={league} />}
    </div>
  )
}
