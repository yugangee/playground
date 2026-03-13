'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import type { League, Team } from '@/types/manage'
import { StatusBadge, BackBtn, Empty, TeamSearchInvite, AGE_GROUP_LABEL, SPORT_TYPE_LABEL } from './shared'
import { generateTournamentPairs, generateRoundRobin, generateFullBracket, type LeagueMatch, type LeagueTeam } from './utils'
import MatchDetailModal from './MatchDetailModal'
import BracketMatchSetup from './BracketMatchSetup'
import TeamDetailModal from './TeamDetailModal'
import MatchesSection from './MatchesSection'
import StandingsTable from './StandingsTable'
import BracketView, { TournamentResults } from './BracketView'
import StatsTab from './StatsTab'
import InfoTab from './InfoTab'
import LeagueInfoCard from './LeagueInfoCard'
import RosterTab from './RosterTab'
import { KJA_BRACKET_TEMPLATE, kjaTemplateToBatchPayload } from '@/data/kja-bracket-template'

type DetailTab = 'info' | 'teams' | 'matches' | 'standings' | 'bracket' | 'stats' | 'roster'

function getDefaultTab(league: League, matchCount: number): DetailTab {
  if (league.status === 'recruiting') return 'teams'
  if (league.type === 'tournament' && league.bracketSize) return 'bracket'
  if (league.type === 'tournament' && matchCount > 0) return 'bracket'
  if (league.type === 'league') return 'standings'
  return 'matches'
}

export default function LeagueDetail({ league: initialLeague, onBack, isOrganizer, currentTeamId }: {
  league: League; onBack: () => void; isOrganizer: boolean; currentTeamId: string
}) {
  const [league, setLeague] = useState(initialLeague)
  const [teams, setTeams] = useState<LeagueTeam[]>([])
  const [matches, setMatches] = useState<LeagueMatch[]>([])
  const [allTeams, setAllTeams] = useState<Record<string, Team>>({})
  const [teamNames, setTeamNames] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [detailMatch, setDetailMatch] = useState<LeagueMatch | null>(null)
  const [detailTeam, setDetailTeam] = useState<Team | null>(null)
  const [tabOverride, setTabOverride] = useState<DetailTab | null>(null)
  const [setupMatch, setSetupMatch] = useState<LeagueMatch | null>(null)

  const tab = tabOverride ?? getDefaultTab(league, matches.length)
  const setTab = (t: DetailTab) => setTabOverride(t)

  const isTournament = league.type === 'tournament'

  const fetchAllTeamInfo = async () => {
    try {
      const data = await manageFetch('/team/all')
      const rawTeams: Team[] = data?.teams ?? data ?? []
      const teamsMap: Record<string, Team> = {}
      const names: Record<string, string> = {}
      rawTeams.forEach((t: Team) => {
        if (t.id && t.name) { teamsMap[t.id] = t; names[t.id] = t.name }
      })
      setAllTeams(prev => ({ ...prev, ...teamsMap }))
      setTeamNames(prev => ({ ...prev, ...names }))
    } catch {
      // fallback: 개별 조회
    }
  }

  const fetchTeamNames = async (teamIds: string[]) => {
    const uniqueIds = Array.from(new Set(teamIds)).filter(id => !teamNames[id])
    if (uniqueIds.length === 0) return
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
    fetchAllTeamInfo().then(() => {
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

  const isKJATemplate = league.bracketSize === 52 || league.name.includes('기자협회') || league.name.includes('KJA')

  const startLeague = async () => {
    // KJA 커스텀 대진표 → 57경기 일괄 생성
    if (isTournament && isKJATemplate) {
      if (!confirm(`KJA 52팀 대진표 (57경기)를 생성하고 대회를 시작하시겠습니까?\n대진표에서 시드 팀과 참가 팀을 배정할 수 있습니다.`)) return
      setGenerating(true)
      try {
        const defaultDate = league.startDate
          ? new Date(league.startDate).toISOString()
          : new Date().toISOString()
        const venue = league.region ?? '미정'

        const batchPayload = kjaTemplateToBatchPayload({}, defaultDate, venue)
        await manageFetch(`/league/${league.id}/matches`, {
          method: 'POST',
          body: JSON.stringify({ matches: batchPayload }),
        })

        await manageFetch(`/league/${league.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ongoing' }),
        })

        setLeague(l => ({ ...l, status: 'ongoing' }))
        setTabOverride('bracket')
        await loadMatches()
      } catch (e) {
        alert(e instanceof Error ? e.message : '대회 시작 실패')
      } finally { setGenerating(false) }
      return
    }

    // 고정 대진표 → TBD 매치 일괄 생성
    if (isTournament && league.bracketSize) {
      if (!confirm(`${league.bracketSize}팀 대진표를 생성하고 대회를 시작하시겠습니까?\n대진표에서 팀을 배정할 수 있습니다.`)) return
      setGenerating(true)
      try {
        const bracketMatches = generateFullBracket(league.bracketSize!, new Map())

        const defaultDate = league.startDate
          ? new Date(league.startDate).toISOString()
          : new Date().toISOString()
        const venue = league.region ?? '미정'

        // Use batch creation if available
        try {
          await manageFetch(`/league/${league.id}/matches`, {
            method: 'POST',
            body: JSON.stringify({
              matches: bracketMatches.map(bm => ({
                homeTeamId: bm.homeTeamId,
                awayTeamId: bm.awayTeamId,
                round: bm.round,
                matchNumber: bm.matchNumber,
                scheduledAt: defaultDate,
                venue,
              })),
            }),
          })
        } catch {
          // Fallback to individual creation
          for (const bm of bracketMatches) {
            await manageFetch(`/league/${league.id}/matches`, {
              method: 'POST',
              body: JSON.stringify({
                homeTeamId: bm.homeTeamId,
                awayTeamId: bm.awayTeamId,
                round: bm.round,
                matchNumber: bm.matchNumber,
                scheduledAt: defaultDate,
                venue,
              }),
            })
          }
        }

        await manageFetch(`/league/${league.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ongoing' }),
        })

        setLeague(l => ({ ...l, status: 'ongoing' }))
        setTabOverride('bracket')
        await loadMatches()
      } catch (e) {
        alert(e instanceof Error ? e.message : '대회 시작 실패')
      } finally { setGenerating(false) }
      return
    }

    // 레거시 토너먼트 또는 리그
    const tLabel = isTournament ? '토너먼트 대진표' : '라운드 로빈 일정'
    if (!confirm(`${tLabel}을 자동 생성하고 대회를 시작하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    setGenerating(true)
    try {
      const leagueTeams: LeagueTeam[] = await manageFetch(`/league/${league.id}/teams`)
      const teamIds = leagueTeams.map(t => t.teamId)
      if (teamIds.length < 2) { alert('최소 2팀 이상 참가해야 대회를 시작할 수 있습니다'); return }

      const pairs = isTournament
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
      setTabOverride(isTournament ? 'bracket' : 'matches')
      const newMatches = await loadMatches()
      const newIds = new Set<string>()
      newMatches.forEach(m => { newIds.add(m.homeTeamId); newIds.add(m.awayTeamId) })
      const missingIds = Array.from(newIds).filter(id => !teamNames[id])
      if (missingIds.length > 0) fetchTeamNames(missingIds)
    } catch (e) {
      alert(e instanceof Error ? e.message : '대회 시작 실패')
    } finally { setGenerating(false) }
  }

  // 통합 매치 클릭 핸들러 — 대진표 탭 & 경기 탭 공용
  const handleMatchAction = (match: LeagueMatch) => {
    const isTbdMatch = match.homeTeamId === 'TBD' || match.awayTeamId === 'TBD'
      || match.homeTeamId === 'BYE' || match.awayTeamId === 'BYE'

    if (isOrganizer && isTbdMatch && match.status !== 'completed' && league.bracketSize) {
      setSetupMatch(match)  // BracketMatchSetup 모달
    } else {
      setDetailMatch(match)  // MatchDetailModal
    }
  }

  // 대진표 슬롯 클릭 핸들러
  const handleSlotClick = (matchNumber: number, match?: LeagueMatch) => {
    if (!match) return // 매치 미생성 상태 (recruiting)
    handleMatchAction(match)
  }

  const endLeague = async () => {
    if (!confirm('대회를 종료하시겠습니까?')) return
    try {
      await manageFetch(`/league/${league.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'finished' }) })
      setLeague(l => ({ ...l, status: 'finished' }))
    } catch (e) { alert(e instanceof Error ? e.message : '종료 실패') }
  }

  // 순위 계산
  const standings = useMemo(() => teams.map(t => {
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
  }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf), [teams, matches])

  // 탭 정의 — 모집중이면 참가팀+정보만, 진행중/종료면 전체
  const isRecruiting = league.status === 'recruiting'
  const detailTabs: { key: DetailTab; label: string; show: boolean }[] = isTournament
    ? [
        { key: 'teams', label: `참가팀 (${teams.length})`, show: true },
        { key: 'roster', label: '선수 등록', show: teams.length > 0 },
        { key: 'bracket', label: '대진표', show: !isRecruiting && (!!league.bracketSize || matches.length > 0) },
        { key: 'matches', label: `경기 (${matches.length})`, show: !isRecruiting },
        { key: 'stats', label: '통계', show: !isRecruiting && matches.some(m => m.status === 'completed') },
        { key: 'info', label: '정보', show: true },
      ]
    : [
        { key: 'teams', label: `참가팀 (${teams.length})`, show: true },
        { key: 'roster', label: '선수 등록', show: teams.length > 0 },
        { key: 'standings', label: '순위', show: !isRecruiting },
        { key: 'matches', label: `경기 (${matches.length})`, show: !isRecruiting },
        { key: 'stats', label: '통계', show: !isRecruiting && matches.some(m => m.status === 'completed') },
        { key: 'info', label: '정보', show: true },
      ]

  const typeLabel = isTournament ? '토너먼트' : '리그'

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

      {/* ─── Header (팀 관리 스타일) ────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <BackBtn onClick={onBack} />
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ background: isTournament ? '#a855f7' : '#3b82f6' }}>
            {isTournament ? '🏆' : '📊'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>{league.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{typeLabel}</span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>·</span>
              <StatusBadge status={league.status} />
              {league.region && (
                <>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>·</span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{league.region}</span>
                </>
              )}
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{teams.length}팀</span>
            </div>
            {league.description && (
              <p className="mt-1 text-sm line-clamp-1" style={{ color: 'var(--text-muted)' }}>{league.description}</p>
            )}
          </div>

          {/* 액션 버튼 */}
          {isOrganizer && (
            <div className="flex flex-shrink-0 gap-2">
              {league.status === 'recruiting' && (
                <>
                  <button onClick={startLeague} disabled={generating}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
                    {generating ? (
                      <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />생성 중...</>
                    ) : (
                      <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>대회 시작</>
                    )}
                  </button>
                  <button onClick={deleteLeague}
                    className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:opacity-85"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                    삭제
                  </button>
                </>
              )}
              {league.status === 'ongoing' && (
                <button onClick={endLeague}
                  className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:opacity-85"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                  대회 종료
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── 모집 안내 배너 ───────────────────────────────────────── */}
      {isOrganizer && league.status === 'recruiting' && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#d97706' }}>
          <span className="font-semibold">모집중</span> — 팀을 초대한 후 <span className="font-semibold">&quot;대회 시작&quot;</span> 버튼을 누르면
          {isTournament && isKJATemplate
            ? ' KJA 52팀 커스텀 대진표(57경기)가 생성되고, 대진표에서 직접 팀을 배정할 수 있습니다'
            : isTournament && league.bracketSize
              ? ` ${league.bracketSize}팀 대진표가 생성되고, 대진표에서 직접 팀을 배정할 수 있습니다`
              : isTournament ? ' 토너먼트 대진표가 자동으로 생성됩니다' : ' 라운드 로빈 일정이 자동으로 생성됩니다'}
          .
        </div>
      )}

      {/* ─── 요약 카드 ────────────────────────────────────────────── */}
      <LeagueInfoCard league={league} teams={teams} matches={matches} />

      {/* ─── 탭 바 (팀 관리 스타일) ───────────────────────────────── */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl p-1"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {detailTabs.filter(t => t.show).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 rounded-lg py-2 text-xs font-semibold transition-colors whitespace-nowrap min-w-0"
            style={tab === t.key
              ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
              : { color: 'var(--text-muted)' }
            }>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 탭 콘텐츠 ───────────────────────────────────────────── */}
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
            <div className="grid gap-3 sm:grid-cols-2">
              {teams.map(t => {
                const team = allTeams[t.teamId]
                return (
                  <div key={t.teamId}
                    className="overflow-hidden rounded-xl cursor-pointer transition-all hover:shadow-md"
                    style={{ background: 'var(--card-bg)', border: `1px solid ${t.teamId === currentTeamId ? '#10b981' : 'var(--card-border)'}` }}
                    onClick={() => team && setDetailTeam(team)}>
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        {team?.logoUrl ? (
                          <img src={team.logoUrl} alt={tn(t.teamId)}
                            className="h-10 w-10 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                            style={{ background: t.teamId === currentTeamId ? '#10b981' : 'var(--btn-solid-bg)' }}>
                            {tn(t.teamId).charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {tn(t.teamId)}
                            </span>
                            {t.teamId === currentTeamId && (
                              <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>우리팀</span>
                            )}
                          </div>
                          {team && (
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {team.region && (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{team.region}</span>
                              )}
                              {team.sportType && (
                                <>
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {SPORT_TYPE_LABEL[team.sportType] ?? team.sportType}
                                  </span>
                                </>
                              )}
                              {team.ageGroup && (
                                <>
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {AGE_GROUP_LABEL[team.ageGroup] ?? team.ageGroup}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {team?.description && (
                        <p className="mt-2 text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>{team.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 text-xs"
                      style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                      <span>참가일: {new Date(t.joinedAt).toLocaleDateString('ko-KR')}</span>
                      {isOrganizer && league.status === 'recruiting' && (
                        <button onClick={(e) => { e.stopPropagation(); removeTeam(t.teamId) }}
                          className="transition-colors hover:text-red-500" title="팀 제거">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'matches' && (
        <MatchesSection leagueId={league.id} matches={matches} onRefresh={loadMatches} isOrganizer={isOrganizer}
          leagueStatus={league.status} leagueType={league.type} teamNames={teamNames} leagueTeams={teams}
          onMatchClick={handleMatchAction} hasBracketSize={!!league.bracketSize}
          onSwitchTab={(t) => setTab(t as DetailTab)} />
      )}

      {tab === 'standings' && <StandingsTable standings={standings} tn={tn} currentTeamId={currentTeamId} matches={matches} />}

      {tab === 'bracket' && (
        <div className="space-y-6">
          {league.status === 'finished' && (
            <TournamentResults matches={matches} tn={tn} />
          )}
          <BracketView
            bracketSize={league.bracketSize}
            matches={matches}
            tn={tn}
            onSlotClick={handleSlotClick}
            leagueStatus={league.status}
          />
        </div>
      )}

      {tab === 'roster' && (
        <RosterTab
          leagueId={league.id}
          teams={teams}
          teamNames={teamNames}
          isOrganizer={isOrganizer}
          leagueStatus={league.status}
          maxPlayers={league.rules?.maxPlayersPerTeam ?? 30}
        />
      )}

      {tab === 'stats' && <StatsTab matches={matches} leagueType={league.type} league={league} teamNames={teamNames} />}

      {/* ─── 팀 상세 모달 ─────────────────────────────────────── */}
      {detailTeam && (
        <TeamDetailModal team={detailTeam} onClose={() => setDetailTeam(null)} />
      )}

      {/* ─── 팀 배정 모달 ─────────────────────────────────────── */}
      {setupMatch && (
        <BracketMatchSetup
          leagueId={league.id}
          match={setupMatch}
          teams={teams}
          teamNames={teamNames}
          onSave={async () => {
            setSetupMatch(null)
            const newMatches = await loadMatches()
            const missingIds = Array.from(new Set(
              newMatches.flatMap(m => [m.homeTeamId, m.awayTeamId])
            )).filter(id => !teamNames[id])
            if (missingIds.length > 0) fetchTeamNames(missingIds)
          }}
          onClose={() => setSetupMatch(null)}
        />
      )}
    </div>
  )
}
