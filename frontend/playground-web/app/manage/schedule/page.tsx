'use client'

import { useEffect, useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { useTeam } from '@/context/TeamContext'
import type { Match, Announcement, Poll } from '@/types/manage'

type Tab = 'calendar' | 'matches' | 'announcements' | 'polls'

export default function SchedulePage() {
  const [tab, setTab] = useState<Tab>('calendar')
  const { currentTeam, isLeader } = useTeam()
  const teamId = currentTeam?.id ?? ''
  const [matches, setMatches] = useState<Match[]>([])

  const loadMatches = async () => {
    if (!teamId) return
    try { setMatches(await manageFetch(`/schedule/matches?teamId=${teamId}`)) } catch {}
  }
  useEffect(() => { loadMatches() }, [teamId])

  if (!teamId) return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-600">먼저 팀을 만들거나 팀에 가입하세요</p>
    </div>
  )

  const tabs = [
    { key: 'calendar' as Tab, label: '캘린더' },
    { key: 'matches' as Tab, label: '경기' },
    { key: 'announcements' as Tab, label: '공지' },
    { key: 'polls' as Tab, label: '투표' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">경기 일정</h1>
        <p className="mt-1 text-sm text-slate-500">공지사항, 투표, 경기 일정을 관리합니다</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calendar' && <CalendarTab matches={matches} isLeader={isLeader} />}
      {tab === 'matches' && <MatchesTab teamId={teamId} isLeader={isLeader} matches={matches} onRefresh={loadMatches} />}
      {tab === 'announcements' && <AnnouncementsTab teamId={teamId} isLeader={isLeader} />}
      {tab === 'polls' && <PollsTab teamId={teamId} isLeader={isLeader} />}
    </div>
  )
}

// ── Calendar ──────────────────────────────────────────────────────────────────

const DOT_COLORS: Record<string, string> = {
  pending: 'bg-amber-400',
  accepted: 'bg-emerald-500',
  completed: 'bg-slate-400',
  rejected: 'bg-red-400',
}

function CalendarTab({ matches, isLeader }: { matches: Match[]; isLeader: boolean }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // matches indexed by YYYY-MM-DD
  const matchByDate = matches.reduce((acc, m) => {
    const d = new Date(m.scheduledAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      .replace(/\. /g, '-').replace('.', '').trim()
    const key = new Date(m.scheduledAt).toISOString().slice(0, 10)
    ;(acc[key] = acc[key] ?? []).push(m)
    return acc
  }, {} as Record<string, Match[]>)

  const todayStr = today.toISOString().slice(0, 10)
  const selectedMatches = selectedDate ? (matchByDate[selectedDate] ?? []) : []

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-900">
          {year}년 {month + 1}월
        </span>
        <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className={`py-1.5 text-[11px] font-semibold ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-slate-400'}`}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-slate-100">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="min-h-[72px] border-b border-r border-slate-50 bg-slate-50/50 last:border-r-0" />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayMatches = matchByDate[dateStr] ?? []
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const col = idx % 7
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`min-h-[72px] border-b border-r border-slate-100 p-2 text-left transition-colors last:border-r-0 hover:bg-slate-50 ${
                isSelected ? 'bg-emerald-50 hover:bg-emerald-50' : ''
              }`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                isToday ? 'bg-emerald-600 text-white' :
                col === 0 ? 'text-red-400' :
                col === 6 ? 'text-blue-400' :
                'text-slate-700'
              }`}>
                {day}
              </span>
              {dayMatches.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayMatches.slice(0, 3).map(m => (
                    <span key={m.id} className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[m.status] ?? 'bg-slate-400'}`} />
                  ))}
                  {dayMatches.length > 3 && <span className="text-[9px] text-slate-400">+{dayMatches.length - 3}</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {[['pending', '대기'], ['accepted', '확정'], ['completed', '완료'], ['rejected', '거절']].map(([s, l]) => (
          <div key={s} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`h-2 w-2 rounded-full ${DOT_COLORS[s]}`} />{l}
          </div>
        ))}
      </div>

      {/* Selected day matches */}
      {selectedDate && (
        <div className="mt-6">
          <div className="mb-3 text-sm font-semibold text-slate-700">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} 경기
          </div>
          {selectedMatches.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">이 날 경기가 없습니다</div>
          ) : (
            <div className="space-y-3">
              {selectedMatches.map(m => (
                <div key={m.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{m.venue}</div>
                      <div className="mt-0.5 text-sm text-slate-500">
                        {new Date(m.scheduledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <MatchStatusBadge status={m.status} />
                  </div>
                  {m.status === 'accepted' && <AttendanceRow matchId={m.id} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Matches ──────────────────────────────────────────────────────────────────

function MatchesTab({ teamId, isLeader, matches, onRefresh }: { teamId: string; isLeader: boolean; matches: Match[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)

  const updateStatus = async (id: string, status: string) => {
    await manageFetch(`/schedule/matches/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {isLeader ? (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            경기 등록
          </button>
          {showForm && <MatchForm teamId={teamId} onSuccess={() => { setShowForm(false); onRefresh() }} />}
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">경기 등록은 대표만 할 수 있습니다.</p>
      )}

      {matches.length === 0 ? <Empty text="등록된 경기가 없습니다" /> : (
        <div className="space-y-3">
          {matches.map(m => (
            <div key={m.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{m.venue}</div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {new Date(m.scheduledAt).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {m.venueAddress && <div className="mt-0.5 text-xs text-slate-400">{m.venueAddress}</div>}
                  </div>
                </div>
                <MatchStatusBadge status={m.status} />
              </div>

              {m.status === 'pending' && isLeader && (
                <div className="mt-4 flex gap-2 border-t border-slate-50 pt-4">
                  <button onClick={() => updateStatus(m.id, 'accepted')}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    수락
                  </button>
                  <button onClick={() => updateStatus(m.id, 'rejected')}
                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    거절
                  </button>
                </div>
              )}

              {m.status === 'accepted' && <AttendanceRow matchId={m.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MatchForm({ teamId, onSuccess }: { teamId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ homeTeamId: teamId, awayTeamId: '', scheduledAt: '', venue: '', venueAddress: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await manageFetch('/schedule/matches', { method: 'POST', body: JSON.stringify(form) }); onSuccess() }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">경기 등록</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>상대 팀 ID</label>
          <input value={form.awayTeamId} onChange={e => set('awayTeamId', e.target.value)} required className={inp} placeholder="상대 팀 ID" />
        </div>
        <div>
          <label className={lbl}>일시</label>
          <input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} required className={inp} />
        </div>
        <div>
          <label className={lbl}>구장명</label>
          <input value={form.venue} onChange={e => set('venue', e.target.value)} required className={inp} placeholder="잠실 구장" />
        </div>
        <div>
          <label className={lbl}>주소</label>
          <input value={form.venueAddress} onChange={e => set('venueAddress', e.target.value)} className={inp} placeholder="서울시 송파구..." />
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
        {loading ? '등록 중...' : '등록'}
      </button>
    </form>
  )
}

function AttendanceRow({ matchId }: { matchId: string }) {
  const [status, setStatus] = useState<string | null>(null)

  const respond = async (s: string) => {
    await manageFetch(`/schedule/matches/${matchId}/attendance`, { method: 'PUT', body: JSON.stringify({ status: s }) })
    setStatus(s)
  }

  return (
    <div className="mt-4 flex items-center gap-3 border-t border-slate-50 pt-4">
      <span className="text-xs font-medium text-slate-400">출석 응답</span>
      {(['attending', 'absent'] as const).map(s => (
        <button key={s} onClick={() => respond(s)}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            status === s
              ? s === 'attending' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}>
          {s === 'attending' ? '참가' : '불참'}
        </button>
      ))}
    </div>
  )
}

// ── Announcements ─────────────────────────────────────────────────────────────

function AnnouncementsTab({ teamId, isLeader }: { teamId: string; isLeader: boolean }) {
  const [items, setItems] = useState<Announcement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try { setItems(await manageFetch(`/schedule/announcements?teamId=${teamId}`)) } catch {}
  }
  useEffect(() => { load() }, [teamId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await manageFetch('/schedule/announcements', { method: 'POST', body: JSON.stringify({ ...form, teamId }) })
      setForm({ title: '', content: '' })
      setShowForm(false)
      load()
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {isLeader ? (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            공지 작성
          </button>
          {showForm && (
            <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">공지사항 작성</h3>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className={inp} placeholder="제목" />
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required className={inp} rows={4} placeholder="내용을 입력하세요..." />
              <button type="submit" disabled={loading}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {loading ? '등록 중...' : '등록'}
              </button>
            </form>
          )}
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">공지사항은 대표만 작성할 수 있습니다.</p>
      )}

      {items.length === 0 ? <Empty text="공지사항이 없습니다" /> : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{a.title}</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{a.content}</div>
                </div>
                <span className="flex-shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">공지</span>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                {new Date(a.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Polls ─────────────────────────────────────────────────────────────────────

function PollsTab({ teamId, isLeader }: { teamId: string; isLeader: boolean }) {
  const [items, setItems] = useState<Poll[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ question: '', options: ['', ''] })
  const [loading, setLoading] = useState(false)
  const [votes, setVotes] = useState<Record<string, number[]>>({})

  const load = async () => {
    try { setItems(await manageFetch(`/schedule/polls?teamId=${teamId}`)) } catch {}
  }
  useEffect(() => { load() }, [teamId])

  const loadVotes = async (pollId: string) => {
    const data = await manageFetch(`/schedule/polls/${pollId}/votes`)
    const counts = data.reduce((acc: number[], v: { optionIndex: number }) => {
      acc[v.optionIndex] = (acc[v.optionIndex] ?? 0) + 1
      return acc
    }, [])
    setVotes(v => ({ ...v, [pollId]: counts }))
  }

  const vote = async (pollId: string, optionIndex: number) => {
    await manageFetch(`/schedule/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ optionIndex }) })
    loadVotes(pollId)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await manageFetch('/schedule/polls', { method: 'POST', body: JSON.stringify({ ...form, teamId }) })
      setForm({ question: '', options: ['', ''] })
      setShowForm(false)
      load()
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {isLeader ? (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            투표 만들기
          </button>
          {showForm && (
            <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">새 투표 만들기</h3>
          <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} required className={inp} placeholder="투표 질문을 입력하세요" />
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <input key={i} value={opt}
                onChange={e => setForm(f => ({ ...f, options: f.options.map((o, j) => j === i ? e.target.value : o) }))}
                required className={inp} placeholder={`선택지 ${i + 1}`} />
            ))}
          </div>
          <button type="button" onClick={() => setForm(f => ({ ...f, options: [...f.options, ''] }))}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            + 선택지 추가
          </button>
              <div>
                <button type="submit" disabled={loading}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {loading ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">투표 생성은 대표만 할 수 있습니다.</p>
      )}

      {items.length === 0 ? <Empty text="투표가 없습니다" /> : (
        <div className="space-y-4">
          {items.map(p => (
            <div key={p.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-semibold text-slate-900">{p.question}</div>
                <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-600">투표</span>
              </div>
              <div className="space-y-2">
                {p.options.map((opt, i) => {
                  const count = votes[p.id]?.[i] ?? 0
                  const total = votes[p.id]?.reduce((a, b) => a + b, 0) ?? 0
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <button key={i} onClick={() => { vote(p.id, i); if (!votes[p.id]) loadVotes(p.id) }}
                      className="relative w-full overflow-hidden rounded-xl border border-slate-200 text-left transition-colors hover:border-emerald-300">
                      <div className="absolute inset-0 bg-emerald-50 transition-all" style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center justify-between px-4 py-3">
                        <span className="text-sm font-medium text-slate-700">{opt}</span>
                        <span className="text-xs font-semibold text-slate-500">{count}표 · {pct}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function MatchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-600',
    completed: 'bg-slate-100 text-slate-600',
  }
  const labels: Record<string, string> = { pending: '대기', accepted: '확정', rejected: '거절', completed: '완료' }
  return (
    <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
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

const lbl = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'
const inp = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
