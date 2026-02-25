'use client'

import { useEffect, useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { useTeam } from '@/context/TeamContext'
import type { League } from '@/types/manage'

type View = 'list' | 'create' | 'detail'

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

export default function LeaguePage() {
  const { currentTeam, isLeader } = useTeam()
  const teamId = currentTeam?.id ?? ''
  const [view, setView] = useState<View>('list')
  const [leagues, setLeagues] = useState<League[]>([])
  const [selected, setSelected] = useState<League | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!teamId) { setLoading(false); return }
    try { setLeagues(await manageFetch(`/league?organizerTeamId=${teamId}`)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [teamId])

  if (!teamId) return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-600">먼저 팀을 만들거나 팀에 가입하세요</p>
    </div>
  )

  if (loading) return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
    </div>
  )

  if (view === 'create') return <CreateForm teamId={teamId} onSuccess={() => { load(); setView('list') }} onCancel={() => setView('list')} />
  if (view === 'detail' && selected) return <LeagueDetail league={selected} onBack={() => setView('list')} isLeader={isLeader} />

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">리그 & 토너먼트</h1>
          <p className="mt-1 text-sm text-slate-500">리그 생성, 팀 초대, 대진표, 전적을 관리합니다</p>
        </div>
        {isLeader && (
          <button onClick={() => setView('create')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            만들기
          </button>
        )}
      </div>

      {leagues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">리그 또는 토너먼트가 없습니다</p>
          {isLeader && (
            <button onClick={() => setView('create')}
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              첫 리그 만들기
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map(l => (
            <button key={l.id} onClick={() => { setSelected(l); setView('detail') }}
              className="group rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <TypeBadge type={l.type} />
                <StatusBadge status={l.status} />
              </div>
              <div className="text-lg font-semibold text-slate-900">{l.name}</div>
              {l.region && <div className="mt-1 text-sm text-slate-400">{l.region}</div>}
              {l.startDate && (
                <div className="mt-2 text-xs text-slate-400">{l.startDate} ~ {l.endDate ?? '미정'}</div>
              )}
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                <span>상세 보기</span>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>
          ))}
        </div>
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
        <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">리그 만들기</h1>
          <p className="mt-0.5 text-sm text-slate-500">새로운 리그나 토너먼트를 개설하세요</p>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
        <Field label="이름" required>
          <input value={form.name} onChange={e => set('name', e.target.value)} required className={inp} placeholder="2025 봄 리그" />
        </Field>
        <Field label="유형">
          <select value={form.type} onChange={e => set('type', e.target.value)} className={inp}>
            <option value="league">리그</option>
            <option value="tournament">토너먼트</option>
          </select>
        </Field>
        <Field label="지역">
          <input value={form.region} onChange={e => set('region', e.target.value)} className={inp} placeholder="서울" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="시작일">
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inp} />
          </Field>
          <Field label="종료일">
            <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inp} />
          </Field>
        </div>
        <Field label="설명">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} className={inp} rows={3} placeholder="리그에 대한 설명을 입력하세요" />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input type="checkbox" checked={form.isPublic} onChange={e => set('isPublic', e.target.checked)}
            className="h-4 w-4 rounded accent-emerald-600" />
          공개 리그로 설정
        </label>

        {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? '생성 중...' : '만들기'}
        </button>
      </form>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

function LeagueDetail({ league, onBack, isLeader }: { league: League; onBack: () => void; isLeader: boolean }) {
  const [tab, setTab] = useState<'teams' | 'matches' | 'standings'>('teams')
  const [teams, setTeams] = useState<LeagueTeam[]>([])
  const [matches, setMatches] = useState<LeagueMatch[]>([])
  const [inviteTeamId, setInviteTeamId] = useState('')

  const loadTeams = async () => { try { setTeams(await manageFetch(`/league/${league.id}/teams`)) } catch {} }
  const loadMatches = async () => { try { setMatches(await manageFetch(`/league/${league.id}/matches`)) } catch {} }

  useEffect(() => { loadTeams(); loadMatches() }, [league.id])

  const invite = async () => {
    if (!inviteTeamId.trim()) return
    await manageFetch(`/league/${league.id}/teams`, { method: 'POST', body: JSON.stringify({ teamId: inviteTeamId }) })
    setInviteTeamId('')
    loadTeams()
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
    { key: 'teams' as const, label: '참가팀' },
    { key: 'matches' as const, label: '경기' },
    { key: 'standings' as const, label: '순위' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{league.name}</h1>
            <TypeBadge type={league.type} />
            <StatusBadge status={league.status} />
          </div>
          {league.region && <p className="mt-0.5 text-sm text-slate-500">{league.region}</p>}
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {detailTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'teams' && (
        <div className="space-y-4">
          {isLeader && (
            <div className="flex gap-2">
              <input value={inviteTeamId} onChange={e => setInviteTeamId(e.target.value)}
                className={`${inp} max-w-xs`} placeholder="팀 ID 입력" />
              <button onClick={invite}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                초대
              </button>
            </div>
          )}
          {teams.length === 0 ? <Empty text="참가팀이 없습니다" /> : (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">팀 ID</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">참가일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teams.map(t => (
                    <tr key={t.teamId} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-medium text-slate-900">{t.teamId}</td>
                      <td className="px-5 py-3.5 text-slate-500">{new Date(t.joinedAt).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'matches' && (
        <MatchesSection leagueId={league.id} matches={matches} onRefresh={loadMatches} isLeader={isLeader} />
      )}

      {tab === 'standings' && (
        standings.length === 0 ? <Empty text="완료된 경기가 없습니다" /> : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['순위', '팀', '승', '무', '패', '득/실', '승점'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 first:text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {standings.map((s, i) => (
                  <tr key={s.teamId} className={`hover:bg-slate-50/50 ${i === 0 ? 'bg-emerald-50/50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-emerald-500 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber-400 text-white' : 'text-slate-500'
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{s.teamId}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-emerald-600">{s.w}</td>
                    <td className="px-4 py-3.5 text-center text-slate-500">{s.d}</td>
                    <td className="px-4 py-3.5 text-center text-red-500">{s.l}</td>
                    <td className="px-4 py-3.5 text-center text-slate-500">{s.gf}:{s.ga}</td>
                    <td className="px-4 py-3.5 text-center text-lg font-bold text-slate-900">{s.pts}</td>
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

function MatchesSection({ leagueId, matches, onRefresh, isLeader }: { leagueId: string; matches: LeagueMatch[]; onRefresh: () => void; isLeader: boolean }) {
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

  return (
    <div className="space-y-4">
      {isLeader && (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            경기 추가
          </button>
          {showForm && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">경기 추가</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>홈팀 ID</label><input value={form.homeTeamId} onChange={e => setForm(f => ({ ...f, homeTeamId: e.target.value }))} required className={inp} /></div>
            <div><label className={lbl}>원정팀 ID</label><input value={form.awayTeamId} onChange={e => setForm(f => ({ ...f, awayTeamId: e.target.value }))} required className={inp} /></div>
            <div><label className={lbl}>일시</label><input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} required className={inp} /></div>
            <div><label className={lbl}>구장</label><input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} required className={inp} /></div>
            <div><label className={lbl}>라운드</label><input value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} className={inp} placeholder="8강, 준결승..." /></div>
          </div>
          <button type="submit" disabled={loading}
            className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {loading ? '추가 중...' : '추가'}
          </button>
        </form>
          )}
        </>
      )}

      {matches.length === 0 ? <Empty text="경기가 없습니다" /> : (
        <div className="space-y-3">
          {matches.map(m => (
            <div key={m.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              {m.round && (
                <span className="mb-3 inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{m.round}</span>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm font-semibold">
                  <span className="text-slate-900">{m.homeTeamId}</span>
                  {m.status === 'completed'
                    ? <span className="rounded-xl bg-slate-900 px-4 py-2 text-lg font-bold text-white tabular-nums">{m.homeScore} : {m.awayScore}</span>
                    : <span className="text-slate-300">vs</span>}
                  <span className="text-slate-900">{m.awayTeamId}</span>
                </div>
                <StatusBadge status={m.status} />
              </div>
              <div className="mt-2 text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleString('ko-KR')} · {m.venue}</div>

              {m.status !== 'completed' && isLeader && (
                <div className="mt-4 flex items-center gap-3 border-t border-slate-50 pt-4">
                  <input type="number" placeholder="홈" value={scores[m.id]?.home ?? ''} onChange={e => setScores(s => ({ ...s, [m.id]: { ...s[m.id], home: e.target.value } }))}
                    className="w-16 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm outline-none focus:border-emerald-500" />
                  <span className="text-slate-300">:</span>
                  <input type="number" placeholder="원정" value={scores[m.id]?.away ?? ''} onChange={e => setScores(s => ({ ...s, [m.id]: { ...s[m.id], away: e.target.value } }))}
                    className="w-16 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm outline-none focus:border-emerald-500" />
                  <button onClick={() => saveResult(m.id)}
                    className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100">
                    결과 저장
                  </button>
                </div>
              )}
            </div>
          ))}
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
    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center text-sm text-slate-400">
      {text}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-emerald-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const lbl = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'
const inp = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
