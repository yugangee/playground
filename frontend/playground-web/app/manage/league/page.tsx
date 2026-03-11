'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { manageFetch } from '@/lib/manageFetch'
import { useTeam } from '@/context/TeamContext'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import type { League, GoalRecord, CardRecord, TeamMember } from '@/types/manage'

type View = 'list' | 'create' | 'detail'
type MainTab = 'mine' | 'participated'

interface LeagueMatch {
  id: string
  leagueId: string
  homeTeamId: string
  awayTeamId: string
  scheduledAt: string
  venue: string
  status: string
  homeScore?: number
  awayScore?: number
  round?: string
  goals?: GoalRecord[]
  cards?: CardRecord[]
  guests?: string[]
  winner?: string
  pkScore?: { home: number; away: number }
}

interface LeagueTeam { leagueId: string; teamId: string; joinedAt: string }

// ── Bracket / Schedule generation ─────────────────────────────────────────────

function firstRoundName(n: number): string {
  if (n <= 2) return '결승'
  if (n <= 4) return '준결승'
  if (n <= 8) return '8강'
  if (n <= 16) return '16강'
  return '1라운드'
}

function generateTournamentPairs(teamIds: string[]) {
  const shuffled = [...teamIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const rName = firstRoundName(shuffled.length)
  const pairs: Array<{ homeTeamId: string; awayTeamId: string; round: string }> = []
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairs.push({ homeTeamId: shuffled[i], awayTeamId: shuffled[i + 1], round: rName })
  }
  return pairs
}

function generateRoundRobin(teamIds: string[]) {
  const teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push('BYE')
  const N = teams.length
  const pairs: Array<{ homeTeamId: string; awayTeamId: string; round: string }> = []

  for (let round = 0; round < N - 1; round++) {
    for (let i = 0; i < N / 2; i++) {
      const home = teams[i]
      const away = teams[N - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        pairs.push({ homeTeamId: home, awayTeamId: away, round: `${round + 1}라운드` })
      }
    }
    const last = teams.splice(N - 1, 1)[0]
    teams.splice(1, 0, last)
  }
  return pairs
}

// ── Page (with Suspense wrapper for useSearchParams) ─────────────────────────

export default function LeaguePage() {
  return (
    <Suspense fallback={
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--text-primary)' }} />
      </div>
    }>
      <LeaguePageInner />
    </Suspense>
  )
}

function LeaguePageInner() {
  const { currentTeam, isLeader } = useTeam()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const deepLinkLeagueId = searchParams.get('leagueId')

  const teamId = currentTeam?.id ?? ''
  const [view, setView] = useState<View>('list')
  const [mainTab, setMainTab] = useState<MainTab>('mine')
  const [leagues, setLeagues] = useState<League[]>([])
  const [participatedLeagues, setParticipatedLeagues] = useState<League[]>([])
  const [selected, setSelected] = useState<League | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingParticipated, setLoadingParticipated] = useState(false)

  const load = async () => {
    if (!teamId) { setLoading(false); return }
    try { setLeagues(await manageFetch(`/league?organizerTeamId=${teamId}`)) }
    catch { setLeagues([]) }
    finally { setLoading(false) }
  }

  const loadParticipated = async () => {
    if (!teamId) return
    setLoadingParticipated(true)
    try {
      const data: League[] = await manageFetch(`/league?participantTeamId=${teamId}`)
      setParticipatedLeagues((data ?? []).filter(l => l.organizerTeamId !== teamId))
    } catch {
      setParticipatedLeagues([])
    } finally {
      setLoadingParticipated(false)
    }
  }

  useEffect(() => { load() }, [teamId])
  useEffect(() => { if (mainTab === 'participated') loadParticipated() }, [mainTab, teamId])

  // 딥링크: ?leagueId=xxx → 해당 리그 자동 열기
  const [deepLinkResolved, setDeepLinkResolved] = useState(false)
  useEffect(() => {
    if (!deepLinkLeagueId || deepLinkResolved || loading) return

    const inMine = leagues.find(l => l.id === deepLinkLeagueId)
    if (inMine) {
      setSelected(inMine)
      setView('detail')
      setMainTab('mine')
      setDeepLinkResolved(true)
      return
    }

    if (!loadingParticipated && participatedLeagues.length === 0 && !deepLinkResolved) {
      loadParticipated()
      return
    }

    const inParticipated = participatedLeagues.find(l => l.id === deepLinkLeagueId)
    if (inParticipated) {
      setSelected(inParticipated)
      setView('detail')
      setMainTab('participated')
      setDeepLinkResolved(true)
      return
    }

    if (!loadingParticipated && !deepLinkResolved) {
      manageFetch(`/league/${deepLinkLeagueId}`)
        .then((data: League) => {
          if (data) { setSelected(data); setView('detail') }
        })
        .catch(() => {})
        .finally(() => setDeepLinkResolved(true))
    }
  }, [deepLinkLeagueId, deepLinkResolved, loading, leagues, participatedLeagues, loadingParticipated])

  if (view === 'create') {
    return (
      <div className="mx-auto max-w-5xl">
        <CreateForm teamId={teamId} onSuccess={() => { load(); setView('list') }} onCancel={() => setView('list')} />
      </div>
    )
  }

  if (view === 'detail' && selected) {
    const isOrganizer = !!(user?.sub && selected.organizerId === user.sub)
    return (
      <div className="mx-auto max-w-5xl">
        <LeagueDetail
          league={selected}
          onBack={() => { setView('list'); setSelected(null) }}
          isOrganizer={isOrganizer}
          currentTeamId={teamId}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>리그 관리</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>주최하거나 참가한 리그를 관리하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/league" className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
            대회 탐색 →
          </Link>
          {isLeader && (
            <button onClick={() => setView('create')}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              만들기
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {([['mine', '주최한 리그'], ['participated', '참가 중인 리그']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setMainTab(k)}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-all"
            style={mainTab === k
              ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
              : { color: 'var(--text-muted)' }
            }>
            {label}
          </button>
        ))}
      </div>

      {mainTab === 'mine' && (
        loading ? <Spinner /> : leagues.length === 0
          ? <Empty text={isLeader ? '아직 주최한 리그가 없습니다' : '팀 리더만 리그를 만들 수 있습니다'} />
          : <LeagueGrid leagues={leagues} onSelect={l => { setSelected(l); setView('detail') }} currentTeamId={teamId} />
      )}

      {mainTab === 'participated' && (
        loadingParticipated ? <Spinner /> : participatedLeagues.length === 0
          ? <Empty text="참가 중인 리그가 없습니다" />
          : <LeagueGrid leagues={participatedLeagues} onSelect={l => { setSelected(l); setView('detail') }} currentTeamId={teamId} />
      )}
    </div>
  )
}

function LeagueGrid({ leagues, onSelect, currentTeamId }: { leagues: League[]; onSelect: (l: League) => void; currentTeamId: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {leagues.map(l => (
        <button key={l.id}
          onClick={() => onSelect(l)}
          className="group rounded-2xl p-6 text-left transition-all hover:opacity-90"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="mb-3 flex items-center justify-between">
            <TypeBadge type={l.type} />
            <StatusBadge status={l.status} />
          </div>
          <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{l.name}</div>
          {l.region && <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{l.region}</div>}
          {l.startDate && (
            <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {l.startDate} ~ {l.endDate ?? '미정'}
            </div>
          )}
          {l.organizerTeamId === currentTeamId && (
            <div className="mt-2 text-xs font-medium text-emerald-600">주최</div>
          )}
          <div className="mt-4 flex items-center gap-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: 'var(--btn-solid-bg)' }}>
            <span>상세 보기</span>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Create ────────────────────────────────────────────────────────────────────

function CreateForm({ teamId, onSuccess, onCancel }: { teamId: string; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'league', region: '', startDate: '', endDate: '', description: '', isPublic: true, organizerTeamId: teamId })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await manageFetch('/league', { method: 'POST', body: JSON.stringify(form) }); onSuccess() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : '생성 실패') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8 flex items-center gap-3">
        <BackBtn onClick={onCancel} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>리그 만들기</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>새로운 리그나 토너먼트를 개설하세요</p>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <Field label="이름" required>
          <input value={form.name} onChange={e => set('name', e.target.value)} required className={inp} style={inpStyle} placeholder="2025 봄 리그" />
        </Field>
        <Field label="유형">
          <select value={form.type} onChange={e => set('type', e.target.value)} className={inp} style={inpStyle}>
            <option value="league">리그 (라운드 로빈)</option>
            <option value="tournament">토너먼트 (단판 승부)</option>
          </select>
        </Field>
        <Field label="지역">
          <input value={form.region} onChange={e => set('region', e.target.value)} className={inp} style={inpStyle} placeholder="서울" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="시작일">
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inp} style={inpStyle} />
          </Field>
          <Field label="종료일">
            <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inp} style={inpStyle} />
          </Field>
        </div>
        <Field label="설명">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} className={inp} style={inpStyle} rows={3} placeholder="리그에 대한 설명을 입력하세요" />
        </Field>
        <label className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
          <input type="checkbox" checked={form.isPublic} onChange={e => set('isPublic', e.target.checked)}
            className="h-4 w-4 rounded accent-emerald-600" />
          공개 리그로 설정 (다른 팀이 탐색·참가 신청 가능)
        </label>
        {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-[var(--btn-solid-bg)] py-3 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? '생성 중...' : '만들기'}
        </button>
      </form>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

type DetailTab = 'teams' | 'matches' | 'standings' | 'bracket' | 'stats'

function LeagueDetail({ league: initialLeague, onBack, isOrganizer, currentTeamId }: {
  league: League; onBack: () => void; isOrganizer: boolean; currentTeamId: string
}) {
  const [league, setLeague] = useState(initialLeague)
  const [tab, setTab] = useState<DetailTab>('teams')
  const [teams, setTeams] = useState<LeagueTeam[]>([])
  const [matches, setMatches] = useState<LeagueMatch[]>([])
  const [teamNames, setTeamNames] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [detailMatch, setDetailMatch] = useState<LeagueMatch | null>(null)

  const fetchTeamNames = async (leagueTeams: LeagueTeam[]) => {
    const names: Record<string, string> = {}
    await Promise.all(leagueTeams.map(async t => {
      try {
        const data = await manageFetch(`/team/${t.teamId}`)
        names[t.teamId] = data?.name ?? t.teamId
      } catch { names[t.teamId] = t.teamId }
    }))
    setTeamNames(names)
  }

  const loadTeams = async () => {
    try {
      const data: LeagueTeam[] = await manageFetch(`/league/${league.id}/teams`)
      setTeams(data)
      fetchTeamNames(data)
    } catch {}
  }
  const loadMatches = async () => { try { setMatches(await manageFetch(`/league/${league.id}/matches`)) } catch {} }

  useEffect(() => { loadTeams(); loadMatches() }, [league.id])

  const tn = (id: string) => teamNames[id] ?? id

  const deleteLeague = async () => {
    if (!confirm(`"${league.name}" 리그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
    try { await manageFetch(`/league/${league.id}`, { method: 'DELETE' }); onBack() }
    catch (e) { alert(e instanceof Error ? e.message : '삭제 실패') }
  }

  const removeTeam = async (rmTeamId: string) => {
    if (!confirm('이 팀을 리그에서 제거하시겠습니까?')) return
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
      await loadMatches()
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
    { key: 'teams', label: `참가팀 (${teams.length})`, show: true },
    { key: 'matches', label: `경기 (${matches.length})`, show: true },
    { key: 'standings', label: '순위', show: !isTournament },
    { key: 'bracket', label: '대진표', show: isTournament && matches.length > 0 },
    { key: 'stats', label: '통계', show: matches.some(m => m.status === 'completed') },
  ]

  return (
    <div>
      {/* 경기 상세 모달 */}
      {detailMatch && (
        <MatchDetailModal
          match={detailMatch}
          leagueId={league.id}
          isOrganizer={isOrganizer}
          leagueStatus={league.status}
          leagueType={league.type}
          teamNames={teamNames}
          onClose={() => setDetailMatch(null)}
          onSave={() => { loadMatches(); setDetailMatch(null) }}
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
        <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
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
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">우리팀</span>
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

      {tab === 'stats' && <StatsTab matches={matches} leagueType={league.type} />}
    </div>
  )
}

// ── Match Detail Modal ───────────────────────────────────────────────────────

function MatchDetailModal({ match, leagueId, isOrganizer, leagueStatus, leagueType, teamNames, onClose, onSave }: {
  match: LeagueMatch; leagueId: string; isOrganizer: boolean; leagueStatus: string; leagueType?: string
  teamNames: Record<string, string>; onClose: () => void; onSave: () => void
}) {
  const tn = (id: string) => teamNames[id] ?? id
  const editable = isOrganizer && leagueStatus === 'ongoing' && match.status !== 'completed'
  const editableCompleted = isOrganizer && match.status === 'completed'

  const [homeScore, setHomeScore] = useState(String(match.homeScore ?? ''))
  const [awayScore, setAwayScore] = useState(String(match.awayScore ?? ''))
  const [goals, setGoals] = useState<GoalRecord[]>(match.goals ?? [])
  const [cards, setCards] = useState<CardRecord[]>(match.cards ?? [])
  const [guests, setGuests] = useState(match.guests?.join(', ') ?? '')
  const [saving, setSaving] = useState(false)
  const [homePk, setHomePk] = useState(String(match.pkScore?.home ?? ''))
  const [awayPk, setAwayPk] = useState(String(match.pkScore?.away ?? ''))

  // 팀 멤버 로드
  const [homeMembers, setHomeMembers] = useState<TeamMember[]>([])
  const [awayMembers, setAwayMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    manageFetch(`/team/${match.homeTeamId}/members`).then(setHomeMembers).catch(() => {})
    manageFetch(`/team/${match.awayTeamId}/members`).then(setAwayMembers).catch(() => {})
  }, [match.homeTeamId, match.awayTeamId])

  const allMembers = [...homeMembers.map(m => ({ ...m, teamId: match.homeTeamId })), ...awayMembers.map(m => ({ ...m, teamId: match.awayTeamId }))]
  const memberName = (id: string) => allMembers.find(m => m.userId === id)?.name ?? id

  const addGoal = () => setGoals(g => [...g, { scorer: '', assist: '', minute: undefined }])
  const removeGoal = (i: number) => setGoals(g => g.filter((_, idx) => idx !== i))
  const updateGoal = (i: number, field: string, val: unknown) => setGoals(g => g.map((x, idx) => idx === i ? { ...x, [field]: val } : x))

  const addCard = () => setCards(c => [...c, { playerId: '', type: 'yellow' as const, minute: undefined }])
  const removeCard = (i: number) => setCards(c => c.filter((_, idx) => idx !== i))
  const updateCard = (i: number, field: string, val: unknown) => setCards(c => c.map((x, idx) => idx === i ? { ...x, [field]: val } : x))

  const save = async (markComplete: boolean) => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        goals: goals.filter(g => g.scorer),
        cards: cards.filter(c => c.playerId),
        guests: guests.split(',').map(s => s.trim()).filter(Boolean),
      }
      if (homeScore !== '') body.homeScore = Number(homeScore)
      if (awayScore !== '') body.awayScore = Number(awayScore)
      // PK 결과 (토너먼트 동점 시)
      if (leagueType === 'tournament' && homePk !== '' && awayPk !== '') {
        body.pkScore = { home: Number(homePk), away: Number(awayPk) }
        body.winner = Number(homePk) > Number(awayPk) ? match.homeTeamId : match.awayTeamId
      }
      if (markComplete && homeScore !== '' && awayScore !== '') body.status = 'completed'

      await manageFetch(`/league/${leagueId}/matches/${match.id}`, {
        method: 'PATCH', body: JSON.stringify(body),
      })
      onSave()
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패')
    } finally { setSaving(false) }
  }

  const canEdit = editable || editableCompleted

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              <span>{tn(match.homeTeamId)}</span>
              <span style={{ color: 'var(--text-muted)' }}>vs</span>
              <span>{tn(match.awayTeamId)}</span>
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {match.round && <span className="mr-2 font-semibold">{match.round}</span>}
              {new Date(match.scheduledAt).toLocaleString('ko-KR')} · {match.venue}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Score */}
        <div className="mb-6 flex items-center justify-center gap-4">
          {canEdit ? (
            <>
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tn(match.homeTeamId)}</div>
                <input type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)} min={0}
                  className="w-20 rounded-xl px-3 py-3 text-center text-2xl font-bold outline-none" style={{ ...inpStyle }} />
              </div>
              <span className="text-xl font-bold" style={{ color: 'var(--text-muted)' }}>:</span>
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tn(match.awayTeamId)}</div>
                <input type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)} min={0}
                  className="w-20 rounded-xl px-3 py-3 text-center text-2xl font-bold outline-none" style={{ ...inpStyle }} />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tn(match.homeTeamId)}</div>
                <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{match.homeScore ?? '-'}</div>
              </div>
              <span className="text-xl font-bold" style={{ color: 'var(--text-muted)' }}>:</span>
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tn(match.awayTeamId)}</div>
                <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{match.awayScore ?? '-'}</div>
              </div>
            </div>
          )}
        </div>

        {/* PK (토너먼트 동점 시) */}
        {leagueType === 'tournament' && homeScore !== '' && awayScore !== '' && homeScore === awayScore && canEdit && (
          <div className="mb-6 rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>승부차기 (PK)</div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tn(match.homeTeamId)}</div>
                <input type="number" value={homePk} onChange={e => setHomePk(e.target.value)} min={0}
                  className="w-16 rounded-xl px-2 py-2 text-center text-lg font-bold outline-none" style={{ ...inpStyle }} />
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>:</span>
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tn(match.awayTeamId)}</div>
                <input type="number" value={awayPk} onChange={e => setAwayPk(e.target.value)} min={0}
                  className="w-16 rounded-xl px-2 py-2 text-center text-lg font-bold outline-none" style={{ ...inpStyle }} />
              </div>
            </div>
          </div>
        )}
        {/* PK 결과 표시 (읽기 전용) */}
        {leagueType === 'tournament' && match.pkScore && !canEdit && (
          <div className="mb-6 text-center text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            승부차기 (PK) {match.pkScore.home} : {match.pkScore.away}
          </div>
        )}

        {/* Goals */}
        <Section title={`골 기록 (${goals.length})`}>
          {goals.map((g, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              {canEdit ? (
                <>
                  <select value={g.scorer} onChange={e => updateGoal(i, 'scorer', e.target.value)} className="flex-1 rounded-lg px-2 py-1.5 text-sm outline-none" style={inpStyle}>
                    <option value="">득점자 선택</option>
                    {allMembers.map(m => <option key={m.userId} value={m.userId}>{m.name} ({tn(m.teamId!)})</option>)}
                  </select>
                  <select value={g.assist ?? ''} onChange={e => updateGoal(i, 'assist', e.target.value || undefined)} className="flex-1 rounded-lg px-2 py-1.5 text-sm outline-none" style={inpStyle}>
                    <option value="">어시스트 (선택)</option>
                    {allMembers.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                  </select>
                  <input type="number" placeholder="분" value={g.minute ?? ''} onChange={e => updateGoal(i, 'minute', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-16 rounded-lg px-2 py-1.5 text-sm text-center outline-none" style={inpStyle} />
                  <button onClick={() => removeGoal(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </>
              ) : (
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {g.minute != null && <span className="font-mono text-xs mr-2" style={{ color: 'var(--text-muted)' }}>{g.minute}&apos;</span>}
                  <span className="font-semibold">{memberName(g.scorer)}</span>
                  {g.assist && <span style={{ color: 'var(--text-muted)' }}> (어시스트: {memberName(g.assist)})</span>}
                </div>
              )}
            </div>
          ))}
          {canEdit && (
            <button onClick={addGoal} className="mt-1 text-xs font-medium hover:underline" style={{ color: 'var(--btn-solid-bg)' }}>+ 골 추가</button>
          )}
          {!canEdit && goals.length === 0 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>기록 없음</div>}
        </Section>

        {/* Cards */}
        <Section title={`카드 기록 (${cards.length})`}>
          {cards.map((c, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              {canEdit ? (
                <>
                  <select value={c.playerId} onChange={e => updateCard(i, 'playerId', e.target.value)} className="flex-1 rounded-lg px-2 py-1.5 text-sm outline-none" style={inpStyle}>
                    <option value="">선수 선택</option>
                    {allMembers.map(m => <option key={m.userId} value={m.userId}>{m.name} ({tn(m.teamId!)})</option>)}
                  </select>
                  <select value={c.type} onChange={e => updateCard(i, 'type', e.target.value)} className="w-24 rounded-lg px-2 py-1.5 text-sm outline-none" style={inpStyle}>
                    <option value="yellow">옐로</option>
                    <option value="red">레드</option>
                  </select>
                  <input type="number" placeholder="분" value={c.minute ?? ''} onChange={e => updateCard(i, 'minute', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-16 rounded-lg px-2 py-1.5 text-sm text-center outline-none" style={inpStyle} />
                  <button onClick={() => removeCard(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <span className={`inline-block h-4 w-3 rounded-sm ${c.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                  <span style={{ color: 'var(--text-primary)' }}>{memberName(c.playerId)}</span>
                  {c.minute != null && <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{c.minute}&apos;</span>}
                </div>
              )}
            </div>
          ))}
          {canEdit && (
            <button onClick={addCard} className="mt-1 text-xs font-medium hover:underline" style={{ color: 'var(--btn-solid-bg)' }}>+ 카드 추가</button>
          )}
          {!canEdit && cards.length === 0 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>기록 없음</div>}
        </Section>

        {/* Guests */}
        {(canEdit || (match.guests && match.guests.length > 0)) && (
          <Section title="용병">
            {canEdit ? (
              <input value={guests} onChange={e => setGuests(e.target.value)} className={inp} style={inpStyle} placeholder="이름을 콤마로 구분 (예: 홍길동, 김철수)" />
            ) : (
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{match.guests?.join(', ') || '없음'}</div>
            )}
          </Section>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="mt-6 flex gap-3">
            <button onClick={() => save(false)} disabled={saving}
              className="flex-1 rounded-xl py-3 text-sm font-semibold transition-colors hover:opacity-85 disabled:opacity-50"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
              {saving ? '저장 중...' : '임시 저장'}
            </button>
            <button onClick={() => save(true)} disabled={saving || homeScore === '' || awayScore === ''}
              className="flex-1 rounded-xl bg-[var(--btn-solid-bg)] py-3 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85 disabled:opacity-50">
              {saving ? '저장 중...' : '결과 확정'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Matches Section ──────────────────────────────────────────────────────────

function MatchesSection({ leagueId, matches, onRefresh, isOrganizer, leagueStatus, leagueType, teamNames, leagueTeams, onMatchClick }: {
  leagueId: string; matches: LeagueMatch[]; onRefresh: () => void; isOrganizer: boolean; leagueStatus: string; leagueType?: string
  teamNames: Record<string, string>; leagueTeams: LeagueTeam[]; onMatchClick: (m: LeagueMatch) => void
}) {
  const tn = (id: string) => teamNames[id] ?? id
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ homeTeamId: '', awayTeamId: '', scheduledAt: '', venue: '', round: '' })
  const [loading, setLoading] = useState(false)
  const [selectedRound, setSelectedRound] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await manageFetch(`/league/${leagueId}/matches`, { method: 'POST', body: JSON.stringify(form) })
      setShowForm(false)
      onRefresh()
    } finally { setLoading(false) }
  }

  const deleteMatch = async (matchId: string) => {
    if (!confirm('이 경기를 삭제하시겠습니까?')) return
    try { await manageFetch(`/league/${leagueId}/matches/${matchId}`, { method: 'DELETE' }); onRefresh() }
    catch (e) { alert(e instanceof Error ? e.message : '삭제 실패') }
  }

  const rounds = Array.from(new Set(matches.map(m => m.round ?? ''))).filter(Boolean)
  const ungrouped = matches.filter(m => !m.round)

  return (
    <div className="space-y-4">
      {isOrganizer && leagueStatus !== 'finished' && (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            경기 추가
          </button>
          {showForm && (
            <form onSubmit={submit} className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>경기 추가</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl} style={lblStyle}>홈팀</label>
                  <select value={form.homeTeamId} onChange={e => setForm(f => ({ ...f, homeTeamId: e.target.value }))} required className={inp} style={inpStyle}>
                    <option value="">선택</option>
                    {leagueTeams.map(t => <option key={t.teamId} value={t.teamId}>{tn(t.teamId)}</option>)}
                  </select>
                </div>
                <div><label className={lbl} style={lblStyle}>원정팀</label>
                  <select value={form.awayTeamId} onChange={e => setForm(f => ({ ...f, awayTeamId: e.target.value }))} required className={inp} style={inpStyle}>
                    <option value="">선택</option>
                    {leagueTeams.filter(t => t.teamId !== form.homeTeamId).map(t => <option key={t.teamId} value={t.teamId}>{tn(t.teamId)}</option>)}
                  </select>
                </div>
                <div><label className={lbl} style={lblStyle}>일시</label><input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} required className={inp} style={inpStyle} /></div>
                <div><label className={lbl} style={lblStyle}>구장</label><input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} required className={inp} style={inpStyle} /></div>
                <div><label className={lbl} style={lblStyle}>라운드</label><input value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} className={inp} style={inpStyle} placeholder="8강, 준결승..." /></div>
              </div>
              <button type="submit" disabled={loading}
                className="mt-4 rounded-xl bg-[var(--btn-solid-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] hover:opacity-85 disabled:opacity-50">
                {loading ? '추가 중...' : '추가'}
              </button>
            </form>
          )}
        </>
      )}

      {matches.length === 0 ? (
        <Empty text={leagueStatus === 'recruiting' ? '대회 시작 시 경기가 자동 생성됩니다' : '경기가 없습니다'} />
      ) : (
        <div className="space-y-6">
          {/* 최근 결과 피드 (리그 전용) */}
          {leagueType === 'league' && (() => {
            const recent = matches.filter(m => m.status === 'completed')
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
              .slice(0, 5)
            if (recent.length === 0) return null
            return (
              <div>
                <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>최근 결과</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {recent.map(m => (
                    <div key={m.id} onClick={() => onMatchClick(m)}
                      className="flex-shrink-0 w-44 rounded-xl p-3 cursor-pointer transition-all hover:opacity-90"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                      <div className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{m.round ?? ''}</div>
                      <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        <span className="truncate flex-1">{tn(m.homeTeamId)}</span>
                        <span className="mx-1.5 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums"
                          style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
                          {m.homeScore}:{m.awayScore}
                        </span>
                        <span className="truncate flex-1 text-right">{tn(m.awayTeamId)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* 라운드 필터 (리그 전용) */}
          {leagueType === 'league' && rounds.length > 1 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              <button onClick={() => setSelectedRound(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap"
                style={selectedRound === null
                  ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
                  : { color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                전체
              </button>
              {rounds.map(r => (
                <button key={r} onClick={() => setSelectedRound(r)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap"
                  style={selectedRound === r
                    ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
                    : { color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* 경기 목록 */}
          {(selectedRound ? rounds.filter(r => r === selectedRound) : rounds).map(round => (
            <div key={round}>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: 'var(--text-primary)', color: 'var(--card-bg)' }}>{round}</span>
                <div className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
              </div>
              <div className="space-y-3">
                {matches.filter(m => m.round === round).map(m => (
                  <MatchCard key={m.id} match={m} isOrganizer={isOrganizer} leagueStatus={leagueStatus}
                    onClick={() => onMatchClick(m)} onDelete={() => deleteMatch(m.id)} teamNames={teamNames} />
                ))}
              </div>
            </div>
          ))}
          {(!selectedRound && ungrouped.length > 0) && ungrouped.map(m => (
            <MatchCard key={m.id} match={m} isOrganizer={isOrganizer} leagueStatus={leagueStatus}
              onClick={() => onMatchClick(m)} onDelete={() => deleteMatch(m.id)} teamNames={teamNames} />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match: m, isOrganizer, leagueStatus, onClick, onDelete, teamNames }: {
  match: LeagueMatch; isOrganizer: boolean; leagueStatus: string
  onClick: () => void; onDelete: () => void; teamNames: Record<string, string>
}) {
  const tn = (id: string) => teamNames[id] ?? id
  const goalCount = m.goals?.length ?? 0
  const cardCount = m.cards?.length ?? 0
  const isWinner = (teamId: string) => {
    if (m.status !== 'completed') return false
    if (m.winner) return m.winner === teamId
    return (m.homeScore ?? 0) !== (m.awayScore ?? 0) &&
      ((m.homeTeamId === teamId && (m.homeScore ?? 0) > (m.awayScore ?? 0)) ||
       (m.awayTeamId === teamId && (m.awayScore ?? 0) > (m.homeScore ?? 0)))
  }

  return (
    <div className="rounded-2xl p-5 cursor-pointer transition-all hover:opacity-90"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span style={{ color: 'var(--text-primary)', fontWeight: isWinner(m.homeTeamId) ? 800 : 600 }}>{tn(m.homeTeamId)}</span>
          {m.status === 'completed'
            ? <span className="rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2 text-lg font-bold text-[var(--btn-solid-color)] tabular-nums">{m.homeScore} : {m.awayScore}</span>
            : <span style={{ color: 'var(--text-muted)' }}>vs</span>}
          <span style={{ color: 'var(--text-primary)', fontWeight: isWinner(m.awayTeamId) ? 800 : 600 }}>{tn(m.awayTeamId)}</span>
        </div>
        <div className="flex items-center gap-2">
          {m.status === 'completed' && goalCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{goalCount} 골</span>
          )}
          {m.status === 'completed' && cardCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{cardCount} 카드</span>
          )}
          <StatusBadge status={m.status} />
          {isOrganizer && leagueStatus !== 'finished' && m.status !== 'completed' && (
            <button onClick={e => { e.stopPropagation(); onDelete() }} className="hover:text-red-500 transition-colors" style={{ color: 'var(--text-muted)' }} title="경기 삭제">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{new Date(m.scheduledAt).toLocaleString('ko-KR')}</span>
        <span>·</span>
        <span>{m.venue}</span>
        {isOrganizer && m.status !== 'completed' && leagueStatus === 'ongoing' && (
          <span className="ml-auto text-xs font-medium" style={{ color: 'var(--btn-solid-bg)' }}>클릭하여 결과 입력 →</span>
        )}
      </div>
    </div>
  )
}

// ── Standings ────────────────────────────────────────────────────────────────

function StandingsTable({ standings, tn, currentTeamId, matches }: {
  standings: Array<{ teamId: string; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number; form: string[] }>
  tn: (id: string) => string; currentTeamId: string; matches?: LeagueMatch[]
}) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [detailTeamId, setDetailTeamId] = useState<string | null>(null)

  if (standings.length === 0) return <Empty text="완료된 경기가 없습니다" />

  const medalBg = (i: number) => {
    if (i === 0) return 'rgba(16,185,129,0.1)'
    if (i === 1) return 'rgba(148,163,184,0.1)'
    if (i === 2) return 'rgba(245,158,11,0.1)'
    return undefined
  }

  const zoneBorder = (i: number) => {
    if (i === 0) return '3px solid #10b981'
    if (i >= standings.length - 1 && standings.length > 3) return '3px solid #ef4444'
    return undefined
  }

  // 홈/원정 분리 성적
  const getHomeAway = (teamId: string) => {
    if (!matches) return null
    const teamMatches = matches.filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.status === 'completed')
    let hw = 0, hd = 0, hl = 0, hgf = 0, hga = 0, aw = 0, ad = 0, al = 0, agf = 0, aga = 0
    teamMatches.forEach(m => {
      const isHome = m.homeTeamId === teamId
      const my = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0)
      const op = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0)
      if (isHome) { hgf += my; hga += op; if (my > op) hw++; else if (my === op) hd++; else hl++ }
      else { agf += my; aga += op; if (my > op) aw++; else if (my === op) ad++; else al++ }
    })
    return { hw, hd, hl, hgf, hga, aw, ad, al, agf, aga }
  }

  return (
    <div className="space-y-3">
      {/* 범례 */}
      <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> 우승권</span>
        {standings.length > 3 && <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> 강등권</span>}
      </div>

      <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {['#', '팀', '경기', '승', '무', '패', '득', '실', '득실', '폼', '승점'].map(h => (
                  <th key={h} className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wide first:text-left" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const ha = getHomeAway(s.teamId)
                return (
                  <React.Fragment key={s.teamId}>
                    <tr className="cursor-pointer hover:opacity-80"
                      style={{ borderBottom: '1px solid var(--card-border)', background: medalBg(i), borderLeft: zoneBorder(i) }}
                      onClick={() => setExpandedTeam(expandedTeam === s.teamId ? null : s.teamId)}>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? 'bg-emerald-500 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber-400 text-white' : ''
                        }`} style={i > 2 ? { color: 'var(--text-muted)' } : undefined}>{i + 1}</span>
                      </td>
                      <td className="px-3 py-3.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                        <span className="cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); setDetailTeamId(s.teamId) }}>
                          {s.teamId === currentTeamId
                            ? <span className="text-emerald-600 font-semibold">{tn(s.teamId)} ★</span>
                            : tn(s.teamId)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.w + s.d + s.l}</td>
                      <td className="px-3 py-3.5 text-center font-semibold text-emerald-600">{s.w}</td>
                      <td className="px-3 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.d}</td>
                      <td className="px-3 py-3.5 text-center text-red-500">{s.l}</td>
                      <td className="px-3 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.gf}</td>
                      <td className="px-3 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.ga}</td>
                      <td className="px-3 py-3.5 text-center font-semibold" style={{ color: s.gd > 0 ? '#10b981' : s.gd < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {s.gd > 0 ? `+${s.gd}` : s.gd}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {s.form.map((f, fi) => (
                            <span key={fi} className={`inline-block h-4 w-4 rounded-full text-[9px] font-bold leading-4 text-center text-white ${
                              f === 'W' ? 'bg-emerald-500' : f === 'D' ? 'bg-slate-400' : 'bg-red-500'
                            }`}>{f}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.pts}</td>
                    </tr>
                    {/* 홈/원정 확장 행 */}
                    {expandedTeam === s.teamId && ha && (
                      <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <td colSpan={11} className="px-6 py-3">
                          <div className="flex gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <div><span className="font-semibold mr-2" style={{ color: 'var(--text-primary)' }}>홈</span> {ha.hw}승 {ha.hd}무 {ha.hl}패 (득 {ha.hgf} / 실 {ha.hga})</div>
                            <div><span className="font-semibold mr-2" style={{ color: 'var(--text-primary)' }}>원정</span> {ha.aw}승 {ha.ad}무 {ha.al}패 (득 {ha.agf} / 실 {ha.aga})</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 팀 상세 모달 */}
      {detailTeamId && matches && (
        <TeamDetailModal
          teamId={detailTeamId}
          teamName={tn(detailTeamId)}
          matches={matches}
          tn={tn}
          onClose={() => setDetailTeamId(null)}
        />
      )}
    </div>
  )
}

// ── Team Detail Modal ────────────────────────────────────────────────────────

function TeamDetailModal({ teamId, teamName, matches, tn, onClose }: {
  teamId: string; teamName: string; matches: LeagueMatch[]; tn: (id: string) => string; onClose: () => void
}) {
  const teamMatches = matches
    .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.status === 'completed')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  // 상대별 직접 대결 기록
  const h2h = new Map<string, { w: number; d: number; l: number; gf: number; ga: number }>()
  teamMatches.forEach(m => {
    const isHome = m.homeTeamId === teamId
    const oppId = isHome ? m.awayTeamId : m.homeTeamId
    const my = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0)
    const op = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0)
    const rec = h2h.get(oppId) ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0 }
    rec.gf += my; rec.ga += op
    if (my > op) rec.w++; else if (my === op) rec.d++; else rec.l++
    h2h.set(oppId, rec)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{teamName}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 경기 결과 */}
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>경기 결과</h3>
        {teamMatches.length === 0 ? <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>완료된 경기 없음</div> : (
          <div className="space-y-2 mb-5">
            {teamMatches.map(m => {
              const isHome = m.homeTeamId === teamId
              const my = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0)
              const op = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0)
              const result = my > op ? 'W' : my === op ? 'D' : 'L'
              const oppId = isHome ? m.awayTeamId : m.homeTeamId
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                  style={{ background: result === 'W' ? 'rgba(16,185,129,0.06)' : result === 'L' ? 'rgba(239,68,68,0.06)' : 'rgba(148,163,184,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-5 w-5 rounded-full text-[10px] font-bold leading-5 text-center text-white ${
                      result === 'W' ? 'bg-emerald-500' : result === 'D' ? 'bg-slate-400' : 'bg-red-500'
                    }`}>{result}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{isHome ? 'vs' : '@'}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{tn(oppId)}</span>
                  </div>
                  <span className="font-mono font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{my}:{op}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* 상대별 직접 대결 */}
        {h2h.size > 0 && (
          <>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>상대별 전적</h3>
            <div className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--card-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['상대', '승', '무', '패', '득', '실'].map(h => (
                      <th key={h} className="px-3 py-2 text-center first:text-left" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(h2h.entries()).map(([oppId, rec]) => (
                    <tr key={oppId} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{tn(oppId)}</td>
                      <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{rec.w}</td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>{rec.d}</td>
                      <td className="px-3 py-2 text-center text-red-500">{rec.l}</td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>{rec.gf}</td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>{rec.ga}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tournament Bracket ──────────────────────────────────────────────────────

const ROUND_ORDER = ['1라운드', '16강', '8강', '준결승', '결승']

function BracketView({ matches, tn, onMatchClick, leagueStatus }: {
  matches: LeagueMatch[]; tn: (id: string) => string; onMatchClick: (m: LeagueMatch) => void; leagueStatus?: string
}) {
  // 라운드별 그룹핑 (메인 트리: 3/4위전 제외)
  const mainGroups: Array<{ round: string; matches: LeagueMatch[] }> = []
  const used = new Set<string>()

  for (const r of ROUND_ORDER) {
    const ms = matches.filter(m => m.round === r)
    if (ms.length > 0) {
      mainGroups.push({ round: r, matches: ms })
      ms.forEach(m => used.add(m.id))
    }
  }
  // 기타 라운드 (커스텀 이름, 3/4위전 제외)
  const remaining = matches.filter(m => m.round && !used.has(m.id) && m.round !== '3/4위전')
  const otherRounds = Array.from(new Set(remaining.map(m => m.round!)))
  for (const r of otherRounds) {
    const ms = remaining.filter(m => m.round === r)
    mainGroups.push({ round: r, matches: ms })
    ms.forEach(m => used.add(m.id))
  }

  const thirdPlaceMatch = matches.find(m => m.round === '3/4위전')

  if (mainGroups.length === 0) return <Empty text="대진표가 없습니다" />

  const getWinner = (m: LeagueMatch): string | null => {
    if (m.status !== 'completed') return null
    if (m.winner) return m.winner
    if ((m.homeScore ?? 0) > (m.awayScore ?? 0)) return m.homeTeamId
    if ((m.awayScore ?? 0) > (m.homeScore ?? 0)) return m.awayTeamId
    return null
  }

  // 결승 우승팀
  const finalMatch = matches.find(m => m.round === '결승' && m.status === 'completed')
  const champion = finalMatch ? getWinner(finalMatch) : null

  const renderBracketMatch = (m: LeagueMatch, isChampionHighlight?: boolean) => {
    const winner = getWinner(m)
    const borderStyle = isChampionHighlight
      ? '2px solid #f59e0b'
      : '1px solid var(--card-border)'
    return (
      <div key={m.id} onClick={() => onMatchClick(m)}
        className="w-52 rounded-xl cursor-pointer transition-all hover:opacity-90"
        style={{ background: 'var(--card-bg)', border: borderStyle }}>
        <div className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: '1px solid var(--card-border)', fontWeight: winner === m.homeTeamId ? 700 : 400 }}>
          <span className="text-sm truncate flex-1" style={{ color: winner === m.homeTeamId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {champion === m.homeTeamId && <span className="mr-1">🏆</span>}
            {tn(m.homeTeamId)}
          </span>
          <span className="text-sm font-mono tabular-nums ml-2" style={{ color: 'var(--text-primary)' }}>
            {m.status === 'completed' ? m.homeScore : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2"
          style={{ fontWeight: winner === m.awayTeamId ? 700 : 400 }}>
          <span className="text-sm truncate flex-1" style={{ color: winner === m.awayTeamId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {champion === m.awayTeamId && <span className="mr-1">🏆</span>}
            {tn(m.awayTeamId)}
          </span>
          <span className="text-sm font-mono tabular-nums ml-2" style={{ color: 'var(--text-primary)' }}>
            {m.status === 'completed' ? m.awayScore : '-'}
          </span>
        </div>
        {m.pkScore && (
          <div className="px-3 py-1 text-[10px] text-center" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--card-border)' }}>
            PK {m.pkScore.home}:{m.pkScore.away}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 우승팀 배너 */}
      {champion && leagueStatus === 'finished' && (
        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="text-lg">🏆</span>
          <span className="ml-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>우승: {tn(champion)}</span>
        </div>
      )}

      {/* 메인 대진표 */}
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max items-stretch">
          {mainGroups.map(({ round, matches: rMatches }, gi) => (
            <div key={round} className="flex items-stretch">
              {/* 연결선 (첫 라운드 제외) */}
              {gi > 0 && (
                <div className="flex flex-col justify-around w-8 py-4">
                  {rMatches.map((_, mi) => (
                    <div key={mi} className="flex-1 flex items-center">
                      <div className="w-full h-px" style={{ background: 'var(--card-border)' }} />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col">
                <div className="mb-4 text-center">
                  <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: 'var(--text-primary)', color: 'var(--card-bg)' }}>{round}</span>
                </div>
                <div className="flex flex-col justify-around flex-1 gap-4">
                  {rMatches.map(m => renderBracketMatch(m, m.round === '결승' && !!champion))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3/4위전 */}
      {thirdPlaceMatch && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: 'var(--text-primary)', color: 'var(--card-bg)' }}>3/4위전</span>
            <div className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
          </div>
          {renderBracketMatch(thirdPlaceMatch)}
        </div>
      )}
    </div>
  )
}

// ── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ matches, leagueType }: { matches: LeagueMatch[]; leagueType?: string }) {
  const completed = matches.filter(m => m.status === 'completed')

  // 멤버 이름 로드
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [loadedTeams, setLoadedTeams] = useState<Set<string>>(new Set())

  useEffect(() => {
    const teamIds = new Set<string>()
    completed.forEach(m => { teamIds.add(m.homeTeamId); teamIds.add(m.awayTeamId) })
    const toLoad = Array.from(teamIds).filter(id => !loadedTeams.has(id))
    if (toLoad.length === 0) return

    Promise.all(toLoad.map(async tid => {
      try {
        const members: TeamMember[] = await manageFetch(`/team/${tid}/members`)
        return members.map(m => [m.userId, m.name] as [string, string])
      } catch { return [] }
    })).then(results => {
      const names: Record<string, string> = { ...memberNames }
      results.flat().forEach(([id, name]) => { names[id] = name })
      setMemberNames(names)
      setLoadedTeams(new Set([...loadedTeams, ...toLoad]))
    })
  }, [completed.length])

  const mn = (id: string) => memberNames[id] ?? id.slice(0, 8)

  // 득점 집계
  type ScorerEntry = { id: string; teamId: string; goals: number; assists: number }
  const scorerMap = new Map<string, ScorerEntry>()
  completed.forEach(m => {
    (m.goals ?? []).forEach(g => {
      if (g.scorer) {
        const existing = scorerMap.get(g.scorer) ?? { id: g.scorer, teamId: '', goals: 0, assists: 0 }
        existing.goals++
        scorerMap.set(g.scorer, existing)
      }
      if (g.assist) {
        const existing = scorerMap.get(g.assist) ?? { id: g.assist, teamId: '', goals: 0, assists: 0 }
        existing.assists++
        scorerMap.set(g.assist, existing)
      }
    })
  })
  const scorers = Array.from(scorerMap.values()).sort((a, b) => b.goals - a.goals || b.assists - a.assists)

  // 카드 집계
  type CardEntry = { id: string; teamId: string; yellow: number; red: number }
  const cardMap = new Map<string, CardEntry>()
  completed.forEach(m => {
    (m.cards ?? []).forEach(c => {
      if (c.playerId) {
        const existing = cardMap.get(c.playerId) ?? { id: c.playerId, teamId: '', yellow: 0, red: 0 }
        if (c.type === 'yellow') existing.yellow++
        else existing.red++
        cardMap.set(c.playerId, existing)
      }
    })
  })
  const cardList = Array.from(cardMap.values()).sort((a, b) => (b.yellow + b.red * 2) - (a.yellow + a.red * 2))

  if (completed.length === 0) return <Empty text="완료된 경기가 없습니다" />

  return (
    <div className="space-y-8">
      {/* 득점 순위 */}
      <div>
        <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>득점 순위</h3>
        {scorers.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>골 기록이 없습니다. 경기 상세에서 골을 기록해주세요.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['#', '선수', '골', '도움'].map(h => (
                    <th key={h} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide first:text-left" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scorers.slice(0, 10).map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: i < 3 ? '#10b981' : 'var(--text-muted)' }}>{i + 1}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{mn(s.id)}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-600">{s.goals}</td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--text-muted)' }}>{s.assists}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 카드 현황 */}
      <div>
        <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>카드 현황</h3>
        {cardList.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>카드 기록이 없습니다.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['선수', '옐로', '레드'].map(h => (
                    <th key={h} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide first:text-left" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cardList.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{mn(c.id)}</td>
                    <td className="px-4 py-3 text-center">
                      {c.yellow > 0 && <span className="inline-flex items-center gap-1"><span className="inline-block h-4 w-3 rounded-sm bg-yellow-400" />{c.yellow}</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.red > 0 && <span className="inline-flex items-center gap-1"><span className="inline-block h-4 w-3 rounded-sm bg-red-500" />{c.red}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 징계 현황 (토너먼트) */}
      {leagueType === 'tournament' && cardList.length > 0 && (() => {
        // KJA 규칙: 옐로 2장 누적(다른 경기) → 1경기 정지, 레드 → 2경기 정지
        // 4강 진출 시 옐로 1장은 초기화
        const hasReachedSemis = completed.some(m => m.round === '준결승' || m.round === '결승' || m.round === '3/4위전')

        const suspensions: Array<{ id: string; reason: string; banned: number }> = []
        const warnings: Array<{ id: string }> = []

        cardList.forEach(c => {
          let effectiveYellows = c.yellow
          // 4강 진출 시 옐로 1장만 보유 → 초기화
          if (hasReachedSemis && c.yellow === 1 && c.red === 0) {
            effectiveYellows = 0
          }

          if (c.red > 0) {
            suspensions.push({ id: c.id, reason: '레드카드', banned: c.red * 2 })
          }
          if (effectiveYellows >= 2) {
            const bans = Math.floor(effectiveYellows / 2)
            suspensions.push({ id: c.id, reason: `옐로 ${effectiveYellows}장 누적`, banned: bans })
          } else if (effectiveYellows === 1) {
            warnings.push({ id: c.id })
          }
        })

        if (suspensions.length === 0 && warnings.length === 0) return null

        return (
          <div>
            <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>징계 현황</h3>
            {hasReachedSemis && (
              <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                4강 진출 — 옐로카드 1장 보유 선수는 경고 초기화됨
              </div>
            )}
            <div className="space-y-2">
              {suspensions.map(s => (
                <div key={`sus-${s.id}-${s.reason}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <span className="text-red-500 font-bold text-xs">출전정지</span>
                  <span style={{ color: 'var(--text-primary)' }}>{mn(s.id)}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({s.reason}, {s.banned}경기)</span>
                </div>
              ))}
              {warnings.map(w => (
                <div key={`warn-${w.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <span className="text-amber-500 font-bold text-xs">경고</span>
                  <span style={{ color: 'var(--text-primary)' }}>{mn(w.id)}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(옐로 1장 — 추가 시 출전정지)</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Tournament Results ────────────────────────────────────────────────────────

function TournamentResults({ matches, tn }: {
  matches: LeagueMatch[]; tn: (id: string) => string
}) {
  const completed = matches.filter(m => m.status === 'completed')

  const getWinner = (m: LeagueMatch): string | null => {
    if (m.winner) return m.winner
    if ((m.homeScore ?? 0) > (m.awayScore ?? 0)) return m.homeTeamId
    if ((m.awayScore ?? 0) > (m.homeScore ?? 0)) return m.awayTeamId
    return null
  }

  const finalMatch = matches.find(m => m.round === '결승' && m.status === 'completed')
  const thirdMatch = matches.find(m => m.round === '3/4위전' && m.status === 'completed')

  if (!finalMatch) return null

  const first = getWinner(finalMatch)
  const second = first === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId
  const third = thirdMatch ? getWinner(thirdMatch) : null

  // 득점왕/도움왕
  const scorerMap = new Map<string, { goals: number; assists: number }>()
  completed.forEach(m => {
    (m.goals ?? []).forEach(g => {
      if (g.scorer) {
        const e = scorerMap.get(g.scorer) ?? { goals: 0, assists: 0 }
        e.goals++
        scorerMap.set(g.scorer, e)
      }
      if (g.assist) {
        const e = scorerMap.get(g.assist) ?? { goals: 0, assists: 0 }
        e.assists++
        scorerMap.set(g.assist, e)
      }
    })
  })
  const topScorer = Array.from(scorerMap.entries()).sort((a, b) => b[1].goals - a[1].goals)[0]
  const topAssist = Array.from(scorerMap.entries()).sort((a, b) => b[1].assists - a[1].assists)[0]

  const totalGoals = completed.reduce((sum, m) => sum + (m.goals?.length ?? 0), 0)
  const totalCards = completed.reduce((sum, m) => sum + (m.cards?.length ?? 0), 0)

  return (
    <div className="mb-6 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(16,185,129,0.08))', border: '1px solid rgba(245,158,11,0.2)' }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>대회 결과</h3>

      {/* 시상대 */}
      <div className="flex items-end justify-center gap-4 mb-5">
        {second && (
          <div className="text-center">
            <div className="text-xl mb-1">🥈</div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{tn(second)}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>준우승</div>
          </div>
        )}
        {first && (
          <div className="text-center -mt-2">
            <div className="text-2xl mb-1">🏆</div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{tn(first)}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>우승</div>
          </div>
        )}
        {third && (
          <div className="text-center">
            <div className="text-xl mb-1">🥉</div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{tn(third)}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>3위</div>
          </div>
        )}
      </div>

      {/* 개인상 + 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center text-xs">
        {topScorer && topScorer[1].goals > 0 && (
          <div className="rounded-lg p-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>득점왕</div>
            <div style={{ color: 'var(--text-muted)' }}>{topScorer[0].slice(0, 8)}… ({topScorer[1].goals}골)</div>
          </div>
        )}
        {topAssist && topAssist[1].assists > 0 && (
          <div className="rounded-lg p-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>도움왕</div>
            <div style={{ color: 'var(--text-muted)' }}>{topAssist[0].slice(0, 8)}… ({topAssist[1].assists}도움)</div>
          </div>
        )}
        <div className="rounded-lg p-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="font-bold" style={{ color: 'var(--text-primary)' }}>총 경기</div>
          <div style={{ color: 'var(--text-muted)' }}>{completed.length}경기</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="font-bold" style={{ color: 'var(--text-primary)' }}>총 골/카드</div>
          <div style={{ color: 'var(--text-muted)' }}>{totalGoals}골 / {totalCards}카드</div>
        </div>
      </div>
    </div>
  )
}

// ── League Info Card ──────────────────────────────────────────────────────────

function LeagueInfoCard({ league, teams, matches }: {
  league: League; teams: LeagueTeam[]; matches: LeagueMatch[]
}) {
  const completed = matches.filter(m => m.status === 'completed').length
  const total = matches.length
  const currentRound = (() => {
    if (matches.length === 0) return '-'
    const pending = matches.filter(m => m.status !== 'completed')
    if (pending.length === 0) return '완료'
    const rounds = pending.map(m => m.round).filter(Boolean)
    if (rounds.length === 0) return '-'
    const order = [...ROUND_ORDER, '3/4위전']
    const sorted = [...new Set(rounds)].sort((a, b) => {
      const ai = order.indexOf(a!); const bi = order.indexOf(b!)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    return sorted[0] ?? '-'
  })()

  const cards = [
    { label: '대회 형식', value: league.type === 'tournament' ? '토너먼트' : '리그', icon: league.type === 'tournament' ? '🏆' : '📊' },
    { label: '참가팀', value: `${teams.length}팀`, icon: '👥' },
    { label: '경기 진행', value: total > 0 ? `${completed}/${total}` : '-', icon: '⚽' },
    { label: league.type === 'tournament' ? '현재 라운드' : '진행률', value: league.type === 'tournament' ? currentRound : (total > 0 ? `${Math.round((completed / total) * 100)}%` : '-'), icon: '📍' },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl p-4 text-center"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-lg mb-1">{c.icon}</div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
          <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
      type === 'tournament' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
    }`}>
      {type === 'tournament' ? '토너먼트' : '리그'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    recruiting: 'bg-amber-100 text-amber-700',
    ongoing: 'bg-emerald-100 text-emerald-700',
    finished: 'bg-slate-100 text-slate-500',
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-slate-100 text-slate-500',
  }
  const labels: Record<string, string> = { recruiting: '모집중', ongoing: '진행중', finished: '종료', pending: '대기', completed: '완료' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed py-14 text-center text-sm"
      style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
      {text}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--text-primary)' }} />
    </div>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:opacity-70"
      style={{ color: 'var(--text-muted)' }}>
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}{required && <span className="ml-0.5" style={{ color: 'var(--btn-solid-bg)' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function TeamSearchInvite({ onInvite }: { onInvite: (teamId: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [allTeams, setAllTeams] = useState<{ id: string; name: string }[]>([])
  const [focused, setFocused] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)

  useEffect(() => {
    manageFetch('/discover/teams').then((data: { id: string; name: string }[]) => {
      setAllTeams(data ?? [])
    }).catch(() => {})
  }, [])

  const results = query.trim() ? allTeams.filter(t => t.name?.toLowerCase().includes(query.toLowerCase())) : []
  const showDropdown = focused && query.trim().length > 0

  const handleInvite = async (team: { id: string; name: string }) => {
    setInviting(team.id)
    try { await onInvite(team.id); setQuery(''); setFocused(false) }
    catch (e) { alert(e instanceof Error ? e.message : '초대 실패') }
    finally { setInviting(null) }
  }

  return (
    <div className="relative max-w-xs">
      <input value={query} onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
        className={inp} style={inpStyle} placeholder="팀 이름으로 검색" />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl shadow-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {results.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-2.5 hover:opacity-80">
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
              <button onClick={() => handleInvite(t)} disabled={inviting === t.id}
                className="rounded-lg bg-[var(--btn-solid-bg)] px-3 py-1 text-xs font-semibold text-[var(--btn-solid-color)] hover:opacity-85 disabled:opacity-50">
                {inviting === t.id ? '초대 중...' : '초대'}
              </button>
            </div>
          ))}
        </div>
      )}
      {showDropdown && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl px-4 py-3 text-sm shadow-lg"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
          검색 결과가 없습니다
        </div>
      )}
    </div>
  )
}

const lbl = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide'
const lblStyle = { color: 'var(--text-muted)' }
const inp = 'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all'
const inpStyle: React.CSSProperties = {
  border: '1px solid var(--card-border)',
  background: 'var(--card-bg)',
  color: 'var(--text-primary)',
}
