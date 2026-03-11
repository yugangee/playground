'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { manageFetch } from '@/lib/manageFetch'
import { useTeam } from '@/context/TeamContext'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import type { League } from '@/types/manage'

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

    // 주최한 리그에서 찾기
    const inMine = leagues.find(l => l.id === deepLinkLeagueId)
    if (inMine) {
      setSelected(inMine)
      setView('detail')
      setMainTab('mine')
      setDeepLinkResolved(true)
      return
    }

    // 참가 리그에서 찾으려면 먼저 로드 필요
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

    // 두 목록 모두 로드 완료 후에도 못 찾으면 → 직접 조회
    if (!loadingParticipated) {
      manageFetch(`/league/${deepLinkLeagueId}`)
        .then((data: League) => {
          if (data) {
            setSelected(data)
            setView('detail')
          }
        })
        .catch(() => {})
        .finally(() => setDeepLinkResolved(true))
    }
  }, [deepLinkLeagueId, loading, loadingParticipated, leagues, participatedLeagues, deepLinkResolved])

  if (!teamId) return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20"
      style={{ borderColor: 'var(--card-border)' }}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: 'var(--card-bg)' }}>
        <svg className="h-6 w-6" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>먼저 팀을 만들거나 팀에 가입하세요</p>
    </div>
  )

  if (loading) return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--text-primary)' }} />
    </div>
  )

  if (view === 'create') return <CreateForm teamId={teamId} onSuccess={() => { load(); setView('list') }} onCancel={() => setView('list')} />
  if (view === 'detail' && selected) return (
    <LeagueDetail
      league={selected}
      onBack={() => { load(); loadParticipated(); setSelected(null); setView('list') }}
      isOrganizer={!!user?.sub && selected.organizerId === user.sub}
      currentTeamId={teamId}
    />
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>리그 &amp; 토너먼트</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>리그 생성, 팀 초대, 대진표, 전적을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/league" className="text-xs px-3 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
            리그 탐색 →
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

      {/* 탭 */}
      <div className="mb-6 flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {([['mine', '주최한 리그'], ['participated', '참가 중인 리그']] as [MainTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setMainTab(key)}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-all"
            style={mainTab === key
              ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
              : { color: 'var(--text-muted)' }
            }>
            {label}
          </button>
        ))}
      </div>

      {/* 주최한 리그 탭 */}
      {mainTab === 'mine' && (
        leagues.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20"
            style={{ borderColor: 'var(--card-border)' }}>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'var(--card-bg)' }}>
              <svg className="h-7 w-7" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>주최한 리그 또는 토너먼트가 없습니다</p>
            {isLeader && (
              <button onClick={() => setView('create')}
                className="mt-5 rounded-xl bg-[var(--btn-solid-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] hover:opacity-85">
                첫 리그 만들기
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map(l => (
              <button key={l.id} onClick={() => { setSelected(l); setView('detail') }}
                className="group rounded-2xl p-6 text-left transition-all hover:opacity-90"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <div className="mb-3 flex items-center justify-between">
                  <TypeBadge type={l.type} />
                  <StatusBadge status={l.status} />
                </div>
                <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{l.name}</div>
                {l.region && <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{l.region}</div>}
                {l.startDate && (
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{l.startDate} ~ {l.endDate ?? '미정'}</div>
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
      )}

      {/* 참가 중인 리그 탭 */}
      {mainTab === 'participated' && (
        loadingParticipated ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--text-primary)' }} />
          </div>
        ) : participatedLeagues.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20"
            style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>참가 중인 리그가 없습니다</p>
            <Link href="/league" className="mt-4 text-xs hover:underline" style={{ color: 'var(--text-primary)' }}>
              리그 탐색하기 →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {participatedLeagues.map(l => (
              <button key={l.id}
                onClick={() => { setSelected(l); setView('detail') }}
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
      )}
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
        <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
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

function LeagueDetail({ league: initialLeague, onBack, isOrganizer, currentTeamId }: {
  league: League; onBack: () => void; isOrganizer: boolean; currentTeamId: string
}) {
  const [league, setLeague] = useState(initialLeague)
  const [tab, setTab] = useState<'teams' | 'matches' | 'standings'>('teams')
  const [teams, setTeams] = useState<LeagueTeam[]>([])
  const [matches, setMatches] = useState<LeagueMatch[]>([])
  const [teamNames, setTeamNames] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)

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
    try {
      await manageFetch(`/league/${league.id}`, { method: 'DELETE' })
      onBack()
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  const removeTeam = async (rmTeamId: string) => {
    if (!confirm('이 팀을 리그에서 제거하시겠습니까?')) return
    try {
      await manageFetch(`/league/${league.id}/teams/${rmTeamId}`, { method: 'DELETE' })
      loadTeams()
    } catch (e) {
      alert(e instanceof Error ? e.message : '제거 실패')
    }
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
      await manageFetch(`/league/${league.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'finished' }),
      })
      setLeague(l => ({ ...l, status: 'finished' }))
    } catch (e) {
      alert(e instanceof Error ? e.message : '종료 실패')
    }
  }

  const standings = teams.map(t => {
    const teamMatches = matches.filter(m => (m.homeTeamId === t.teamId || m.awayTeamId === t.teamId) && m.status === 'completed')
    let w = 0, d = 0, l = 0, gf = 0, ga = 0
    teamMatches.forEach(m => {
      const isHome = m.homeTeamId === t.teamId
      const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0)
      const opScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0)
      gf += myScore; ga += opScore
      if (myScore > opScore) w++
      else if (myScore === opScore) d++
      else l++
    })
    return { teamId: t.teamId, w, d, l, gf, ga, pts: w * 3 + d }
  }).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga))

  const detailTabs = [
    { key: 'teams' as const, label: `참가팀 (${teams.length})` },
    { key: 'matches' as const, label: `경기 (${matches.length})` },
    { key: 'standings' as const, label: '순위' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-start gap-3">
        <button onClick={onBack} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
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
                <button
                  onClick={startLeague}
                  disabled={generating}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50">
                  {generating ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                      </svg>
                      대회 시작
                    </>
                  )}
                </button>
                <button
                  onClick={deleteLeague}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-85"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                  삭제
                </button>
              </>
            )}
            {league.status === 'ongoing' && (
              <button
                onClick={endLeague}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-85"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                대회 종료
              </button>
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

      <div className="mb-6 flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {detailTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-all"
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
                          <button onClick={() => removeTeam(t.teamId)}
                            className="hover:text-red-500 transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            title="팀 제거">
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
        <MatchesSection leagueId={league.id} matches={matches} onRefresh={loadMatches} isOrganizer={isOrganizer} leagueStatus={league.status} teamNames={teamNames} leagueTeams={teams} />
      )}

      {tab === 'standings' && (
        standings.length === 0 ? <Empty text="완료된 경기가 없습니다" /> : (
          <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['순위', '팀', '승', '무', '패', '득/실', '승점'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide first:text-left" style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.teamId} className={i === 0 ? 'bg-emerald-50/50' : ''} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-emerald-500 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber-400 text-white' : ''
                      }`} style={i > 2 ? { color: 'var(--text-muted)' } : undefined}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {s.teamId === currentTeamId
                        ? <span className="text-emerald-600 font-semibold">{tn(s.teamId)} ★</span>
                        : tn(s.teamId)}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-emerald-600">{s.w}</td>
                    <td className="px-4 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.d}</td>
                    <td className="px-4 py-3.5 text-center text-red-500">{s.l}</td>
                    <td className="px-4 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.gf}:{s.ga}</td>
                    <td className="px-4 py-3.5 text-center text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

function MatchesSection({ leagueId, matches, onRefresh, isOrganizer, leagueStatus, teamNames, leagueTeams }: {
  leagueId: string; matches: LeagueMatch[]; onRefresh: () => void; isOrganizer: boolean; leagueStatus: string
  teamNames: Record<string, string>; leagueTeams: LeagueTeam[]
}) {
  const tn = (id: string) => teamNames[id] ?? id
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ homeTeamId: '', awayTeamId: '', scheduledAt: '', venue: '', round: '' })
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await manageFetch(`/league/${leagueId}/matches`, { method: 'POST', body: JSON.stringify(form) })
      setShowForm(false)
      onRefresh()
    } finally { setLoading(false) }
  }

  const saveResult = async (matchId: string) => {
    const s = scores[matchId]
    if (!s) return
    await manageFetch(`/league/${leagueId}/matches/${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ homeScore: Number(s.home), awayScore: Number(s.away), status: 'completed' }),
    })
    onRefresh()
  }

  const deleteMatch = async (matchId: string) => {
    if (!confirm('이 경기를 삭제하시겠습니까?')) return
    try {
      await manageFetch(`/league/${leagueId}/matches/${matchId}`, { method: 'DELETE' })
      onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  const rounds = Array.from(new Set(matches.map(m => m.round ?? ''))).filter(Boolean)
  const ungrouped = matches.filter(m => !m.round)

  return (
    <div className="space-y-4">
      {isOrganizer && leagueStatus !== 'finished' && (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
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
          {rounds.map(round => (
            <div key={round}>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: 'var(--text-primary)', color: 'var(--card-bg)' }}>{round}</span>
                <div className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
              </div>
              <div className="space-y-3">
                {matches.filter(m => m.round === round).map(m => (
                  <MatchCard key={m.id} match={m} isOrganizer={isOrganizer} leagueStatus={leagueStatus}
                    scores={scores} setScores={setScores} onSave={() => saveResult(m.id)} onDelete={() => deleteMatch(m.id)} teamNames={teamNames} />
                ))}
              </div>
            </div>
          ))}
          {ungrouped.length > 0 && ungrouped.map(m => (
            <MatchCard key={m.id} match={m} isOrganizer={isOrganizer} leagueStatus={leagueStatus}
              scores={scores} setScores={setScores} onSave={() => saveResult(m.id)} onDelete={() => deleteMatch(m.id)} teamNames={teamNames} />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match: m, isOrganizer, leagueStatus, scores, setScores, onSave, onDelete, teamNames }: {
  match: LeagueMatch
  isOrganizer: boolean
  leagueStatus: string
  scores: Record<string, { home: string; away: string }>
  setScores: React.Dispatch<React.SetStateAction<Record<string, { home: string; away: string }>>>
  onSave: () => void
  onDelete: () => void
  teamNames: Record<string, string>
}) {
  const tn = (id: string) => teamNames[id] ?? id
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span style={{ color: 'var(--text-primary)' }}>{tn(m.homeTeamId)}</span>
          {m.status === 'completed'
            ? <span className="rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2 text-lg font-bold text-[var(--btn-solid-color)] tabular-nums">{m.homeScore} : {m.awayScore}</span>
            : <span style={{ color: 'var(--text-muted)' }}>vs</span>}
          <span style={{ color: 'var(--text-primary)' }}>{tn(m.awayTeamId)}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={m.status} />
          {isOrganizer && leagueStatus !== 'finished' && m.status !== 'completed' && (
            <button onClick={onDelete} className="hover:text-red-500 transition-colors" style={{ color: 'var(--text-muted)' }} title="경기 삭제">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(m.scheduledAt).toLocaleString('ko-KR')} · {m.venue}</div>

      {m.status !== 'completed' && isOrganizer && leagueStatus === 'ongoing' && (
        <div className="mt-4 flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
          <input type="number" placeholder="홈" value={scores[m.id]?.home ?? ''} onChange={e => setScores(s => ({ ...s, [m.id]: { ...s[m.id], home: e.target.value } }))}
            className="w-16 rounded-xl px-3 py-2 text-center text-sm outline-none" style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
          <span style={{ color: 'var(--text-muted)' }}>:</span>
          <input type="number" placeholder="원정" value={scores[m.id]?.away ?? ''} onChange={e => setScores(s => ({ ...s, [m.id]: { ...s[m.id], away: e.target.value } }))}
            className="w-16 rounded-xl px-3 py-2 text-center text-sm outline-none" style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
          <button onClick={onSave}
            className="rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2 text-xs font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85">
            결과 저장
          </button>
        </div>
      )}
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

  const results = query.trim()
    ? allTeams.filter(t => t.name?.toLowerCase().includes(query.toLowerCase()))
    : []

  const showDropdown = focused && query.trim().length > 0

  const handleInvite = async (team: { id: string; name: string }) => {
    setInviting(team.id)
    try {
      await onInvite(team.id)
      setQuery('')
      setFocused(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : '초대 실패')
    } finally { setInviting(null) }
  }

  return (
    <div className="relative max-w-xs">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        className={inp}
        style={inpStyle}
        placeholder="팀 이름으로 검색"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl shadow-lg"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {results.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-2.5 hover:opacity-80">
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
              <button
                onClick={() => handleInvite(t)}
                disabled={inviting === t.id}
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
