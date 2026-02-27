'use client'

import { useEffect, useState, useCallback } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { useTeam } from '@/context/TeamContext'
import { useAuth } from '@/context/AuthContext'
import type { Match, Announcement, Poll, Attendance, TeamMember } from '@/types/manage'

const MIN_PLAYERS = 7

// ── 상수 ──────────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  pending:   'bg-amber-400',
  accepted:  'bg-violet-500',
  completed: 'bg-slate-400',
  rejected:  'bg-red-400',
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  accepted:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  completed: 'bg-slate-100  text-slate-600  dark:bg-slate-800      dark:text-slate-400',
  rejected:  'bg-red-100    text-red-600    dark:bg-red-900/30     dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   '대기',
  accepted:  '확정',
  completed: '완료',
  rejected:  '거절',
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function isFuture(dateStr: string) {
  return new Date(dateStr) > new Date()
}

function exportToICS(matches: Match[], teamName: string) {
  const fmtDt = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const now = fmtDt(new Date())
  const events = matches
    .filter(m => m.status !== 'rejected')
    .map(m => {
      const start = new Date(m.scheduledAt)
      const end   = new Date(start.getTime() + 90 * 60 * 1000)
      return [
        'BEGIN:VEVENT',
        `UID:playground-${m.id}@fun.sedaily.ai`,
        `DTSTAMP:${now}`,
        `DTSTART:${fmtDt(start)}`,
        `DTEND:${fmtDt(end)}`,
        `SUMMARY:⚽ ${m.venue}`,
        m.venueAddress ? `LOCATION:${m.venueAddress.replace(/,/g, '\\,')}` : '',
        `DESCRIPTION:상태: ${STATUS_LABEL[m.status] ?? m.status}`,
        'END:VEVENT',
      ].filter(Boolean).join('\r\n')
    })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Playground//${teamName}//KO`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${teamName}-일정.ics`
  a.click()
  URL.revokeObjectURL(url)
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { currentTeam, isLeader } = useTeam()
  const teamId = currentTeam?.id ?? ''

  const [matches, setMatches] = useState<Match[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [polls, setPolls] = useState<Poll[]>([])

  const loadMatches = useCallback(async () => {
    if (!teamId) return
    try { setMatches(await manageFetch(`/schedule/matches?teamId=${teamId}`)) } catch {}
  }, [teamId])

  const loadAnnouncements = async () => {
    if (!teamId) return
    try { setAnnouncements(await manageFetch(`/schedule/announcements?teamId=${teamId}`)) } catch {}
  }

  const loadMembers = useCallback(async () => {
    if (!teamId) return
    try { setMembers(await manageFetch(`/team/${teamId}/members`)) } catch {}
  }, [teamId])

  const loadPolls = useCallback(async () => {
    if (!teamId) return
    try { setPolls(await manageFetch(`/schedule/polls?teamId=${teamId}`)) } catch {}
  }, [teamId])

  useEffect(() => {
    loadMatches()
    loadAnnouncements()
    loadMembers()
    loadPolls()
  }, [teamId])

  const upcoming = matches
    .filter(m => isFuture(m.scheduledAt) && m.status !== 'rejected')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 3)

  if (!teamId) return <EmptyTeam />

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>일정·참석</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{currentTeam?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {matches.length > 0 && (
            <button
              onClick={() => exportToICS(matches, currentTeam?.name ?? '팀')}
              title="캘린더 내보내기 (.ics)"
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors hover:opacity-80"
              style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5M12 15h.007v.007H12V15Zm0 0h.007v.007H12V15Zm0 0v-3.75" />
              </svg>
              .ics
            </button>
          )}
          {isLeader && <MatchFormButton teamId={teamId} onSuccess={loadMatches} />}
        </div>
      </div>

      {/* 다가오는 경기 */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          다가오는 경기
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed py-10 text-center text-sm"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
            예정된 경기가 없습니다
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(m => (
              <UpcomingMatchCard key={m.id} match={m} onRefresh={loadMatches}
                isLeader={isLeader} teamId={teamId} members={members}
                onPollCreated={loadPolls} />
            ))}
          </div>
        )}
      </section>

      {/* 월간 캘린더 */}
      <section>
        <MonthCalendar matches={matches} />
      </section>

      {/* POTM / 투표 */}
      {polls.length > 0 && (
        <section>
          <PollsSection polls={polls} onVoted={loadPolls} />
        </section>
      )}

      {/* 최근 공지 */}
      {announcements.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            최근 공지
          </h2>
          <div className="space-y-2">
            {announcements.slice(0, 3).map(a => (
              <div key={a.id} className="rounded-2xl p-4 border"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{a.title}</div>
                    <div className="mt-1 text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{a.content}</div>
                  </div>
                  <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700">공지</span>
                </div>
                <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(a.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── 다가오는 경기 카드 ────────────────────────────────────────────────────────

function UpcomingMatchCard({ match: m, onRefresh, isLeader, teamId, members, onPollCreated }: {
  match: Match; onRefresh: () => void
  isLeader: boolean; teamId: string; members: TeamMember[]; onPollCreated: () => void
}) {
  const { user } = useAuth()
  const [myStatus, setMyStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [showResultModal, setShowResultModal] = useState(false)

  // 출석 상태 로드 (내 상태 + 전체 집계)
  const loadAttendances = async () => {
    if (m.status !== 'accepted') return
    try {
      const all: Attendance[] = await manageFetch(`/schedule/matches/${m.id}/attendance`)
      setAttendances(all)
      if (user) {
        const mine = all.find(a => a.userId === user.userId)
        if (mine) setMyStatus(mine.status)
      }
    } catch {}
  }

  useEffect(() => {
    loadAttendances()
  }, [m.id, m.status, user])

  const respond = async (status: 'attending' | 'absent') => {
    setLoading(true)
    try {
      await manageFetch(`/schedule/matches/${m.id}/attendance`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      setMyStatus(status)
      loadAttendances()
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  const daysUntil = Math.ceil((new Date(m.scheduledAt).getTime() - Date.now()) / 86400000)
  const dLabel = daysUntil === 0 ? 'D-DAY' : daysUntil > 0 ? `D-${daysUntil}` : null

  const attendingCount = attendances.filter(a => a.status === 'attending').length
  const absentCount = attendances.filter(a => a.status === 'absent').length
  const isUnderMin = m.status === 'accepted' && attendances.length > 0 && attendingCount < MIN_PLAYERS

  return (
    <div className="rounded-2xl border p-4 space-y-3"
      style={{
        background: 'var(--card-bg)',
        borderColor: isUnderMin ? 'rgba(239,68,68,0.4)' : 'var(--card-border)',
      }}>

      {/* 7명 미달 경고 배지 */}
      {isUnderMin && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 -mb-1"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <svg className="h-4 w-4 shrink-0" style={{ color: '#f87171' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: '#f87171' }}>
            출석 {attendingCount}명 — {MIN_PLAYERS}명 미달 시 몰수패
          </span>
        </div>
      )}

      {/* 상단 행 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--sidebar-bg)' }}>
            <svg className="h-5 w-5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.venue}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDateTime(m.scheduledAt)}</div>
            {m.venueAddress && (
              <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{m.venueAddress}</div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dLabel && (
            <span className="rounded-lg px-2 py-1 text-[11px] font-bold bg-violet-600 text-white">{dLabel}</span>
          )}
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[m.status] ?? ''}`}>
            {STATUS_LABEL[m.status] ?? m.status}
          </span>
        </div>
      </div>

      {/* 출석 응답 버튼 (확정된 경기만) */}
      {m.status === 'accepted' && (
        <div className="pt-1 border-t space-y-2" style={{ borderColor: 'var(--card-border)' }}>
          {/* 참석 현황 집계 */}
          {attendances.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  참가 {attendingCount}명
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  불참 {absentCount}명
                </span>
              </div>
              <div className="flex-1" />
              {/* 7명 게이지 */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: MIN_PLAYERS }).map((_, i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full transition-colors"
                    style={{ background: i < attendingCount ? '#7c3aed' : 'var(--card-border)' }}
                  />
                ))}
                <span className="text-[10px] font-bold ml-0.5"
                  style={{ color: attendingCount >= MIN_PLAYERS ? '#4ade80' : '#f87171' }}>
                  {attendingCount >= MIN_PLAYERS ? '✓' : `${MIN_PLAYERS - attendingCount}명 부족`}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>출석 응답</span>
            <AttendBtn
              label="참가"
              active={myStatus === 'attending'}
              activeClass="bg-violet-600 text-white"
              inactiveClass="text-sm"
              disabled={loading}
              onClick={() => respond('attending')}
            />
            <AttendBtn
              label="불참"
              active={myStatus === 'absent'}
              activeClass="bg-red-500 text-white"
              inactiveClass="text-sm"
              disabled={loading}
              onClick={() => respond('absent')}
            />
          </div>
        </div>
      )}

      {/* 완료된 경기 스코어 표시 */}
      {m.status === 'completed' && m.homeScore != null && m.awayScore != null && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-center gap-4"
          style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            {m.homeTeamId === teamId ? '우리팀' : '상대팀'}
          </span>
          <span className="text-3xl font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {m.homeScore}
          </span>
          <span className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>:</span>
          <span className="text-3xl font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {m.awayScore}
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            {m.awayTeamId === teamId ? '우리팀' : '상대팀'}
          </span>
        </div>
      )}

      {/* 결과 입력 버튼 (리더, 확정된 경기만) */}
      {isLeader && m.status === 'accepted' && (
        <button
          onClick={() => setShowResultModal(true)}
          className="w-full rounded-xl py-2 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}
        >
          ⚽ 경기 결과 입력
        </button>
      )}

      {/* 내비게이션 링크 */}
      {m.venueAddress && (
        <a
          href={`https://map.kakao.com/link/search/${encodeURIComponent(m.venueAddress)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: 'var(--accent, #8B5CF6)' }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
          </svg>
          지도 보기
        </a>
      )}

      {/* 결과 입력 모달 */}
      {showResultModal && (
        <MatchResultModal
          match={m}
          teamId={teamId}
          members={members}
          onClose={() => setShowResultModal(false)}
          onSuccess={() => {
            setShowResultModal(false)
            onRefresh()
            onPollCreated()
          }}
        />
      )}
    </div>
  )
}

function AttendBtn({
  label, active, activeClass, inactiveClass, disabled, onClick,
}: {
  label: string; active: boolean; activeClass: string; inactiveClass: string; disabled: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
        active ? activeClass : `hover:opacity-80 ${inactiveClass}`
      }`}
      style={active ? undefined : { background: 'var(--sidebar-bg)', color: 'var(--text-secondary)' }}
    >
      {label}
    </button>
  )
}

// ── 월간 캘린더 ───────────────────────────────────────────────────────────────

function MonthCalendar({ matches }: { matches: Match[] }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = today.toISOString().slice(0, 10)

  const matchByDate = matches.reduce((acc, m) => {
    const key = new Date(m.scheduledAt).toISOString().slice(0, 10)
    ;(acc[key] = acc[key] ?? []).push(m)
    return acc
  }, {} as Record<string, Match[]>)

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedMatches = selectedDate ? (matchByDate[selectedDate] ?? []) : []

  return (
    <div>
      {/* 월 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--card-bg)]"
          style={{ color: 'var(--text-muted)' }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {year}년 {month + 1}월
        </span>
        <button onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--card-bg)]"
          style={{ color: 'var(--text-muted)' }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className="py-1.5 text-[11px] font-semibold"
            style={{ color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--card-border)' }}>
        {cells.map((day, idx) => {
          if (day === null) return (
            <div key={`e-${idx}`} className="min-h-[64px] border-b border-r last:border-r-0"
              style={{ borderColor: 'var(--card-border)', background: 'var(--sidebar-bg)' }} />
          )
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayMatches = matchByDate[dateStr] ?? []
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const col = idx % 7
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className="min-h-[64px] border-b border-r last:border-r-0 p-2 text-left transition-colors"
              style={{
                borderColor: 'var(--card-border)',
                background: isSelected ? 'var(--card-bg)' : 'var(--main-bg, transparent)',
              }}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                isToday ? 'bg-violet-600 text-white' : ''
              }`}
                style={!isToday ? { color: col === 0 ? '#f87171' : col === 6 ? '#60a5fa' : 'var(--text-secondary)' } : undefined}
              >
                {day}
              </span>
              {dayMatches.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayMatches.slice(0, 3).map(m => (
                    <span key={m.id} className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[m.status] ?? 'bg-slate-400'}`} />
                  ))}
                  {dayMatches.length > 3 && (
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>+{dayMatches.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {([['pending', '대기'], ['accepted', '확정'], ['completed', '완료'], ['rejected', '거절']] as const).map(([s, l]) => (
          <div key={s} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />{l}
          </div>
        ))}
      </div>

      {/* 선택 날짜 경기 */}
      {selectedDate && (
        <div className="mt-6">
          <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {formatDateShort(selectedDate + 'T00:00:00')} 경기
          </div>
          {selectedMatches.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed py-8 text-center text-sm"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
              이 날 경기가 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {selectedMatches.map(m => (
                <div key={m.id} className="rounded-2xl border p-4"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.venue}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {new Date(m.scheduledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[m.status] ?? ''}`}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </div>
                  {m.status === 'accepted' && (
                    <QuickAttendRow matchId={m.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 캘린더 선택 날짜용 간단 출석 버튼 ─────────────────────────────────────────

function QuickAttendRow({ matchId }: { matchId: string }) {
  const [myStatus, setMyStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const respond = async (status: 'attending' | 'absent') => {
    setLoading(true)
    try {
      await manageFetch(`/schedule/matches/${matchId}/attendance`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      setMyStatus(status)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 pt-3 mt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>출석 응답</span>
      {(['attending', 'absent'] as const).map(s => (
        <button key={s} onClick={() => respond(s)} disabled={loading}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
            myStatus === s
              ? s === 'attending' ? 'bg-violet-600 text-white' : 'bg-red-500 text-white'
              : 'hover:opacity-80'
          }`}
          style={myStatus !== s ? { background: 'var(--sidebar-bg)', color: 'var(--text-secondary)' } : undefined}
        >
          {s === 'attending' ? '참가' : '불참'}
        </button>
      ))}
    </div>
  )
}

// ── 경기 등록 버튼 (대표만) ───────────────────────────────────────────────────

function MatchFormButton({ teamId, onSuccess }: { teamId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
        style={{ background: 'var(--accent, #8B5CF6)' }}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        경기 등록
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>경기 등록</h3>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <MatchForm teamId={teamId} onSuccess={() => { setOpen(false); onSuccess() }} />
          </div>
        </div>
      )}
    </>
  )
}

function MatchForm({ teamId, onSuccess }: { teamId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ homeTeamId: teamId, awayTeamId: '', scheduledAt: '', venue: '', venueAddress: '' })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await manageFetch('/schedule/matches', { method: 'POST', body: JSON.stringify(form) })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
        <label className={lbl}>주소 (선택)</label>
        <input value={form.venueAddress} onChange={e => set('venueAddress', e.target.value)} className={inp} placeholder="서울시 송파구..." />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        style={{ background: 'var(--accent, #8B5CF6)' }}>
        {loading ? '등록 중...' : '등록하기'}
      </button>
    </form>
  )
}

// ── 팀 없음 안내 ──────────────────────────────────────────────────────────────

function EmptyTeam() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20 mx-4 mt-6"
      style={{ borderColor: 'var(--card-border)' }}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: 'var(--card-bg)' }}>
        <svg className="h-6 w-6" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>먼저 팀을 만들거나 팀에 가입하세요</p>
    </div>
  )
}

// ── 경기 결과 입력 모달 (M2-C) ────────────────────────────────────────────────

function MatchResultModal({ match: m, teamId, members, onClose, onSuccess }: {
  match: Match; teamId: string; members: TeamMember[]; onClose: () => void; onSuccess: () => void
}) {
  const isHome = m.homeTeamId === teamId
  const [ourScore,   setOurScore]   = useState(0)
  const [theirScore, setTheirScore] = useState(0)
  const [loading, setLoading]       = useState(false)
  const [step, setStep]             = useState<'score' | 'potm'>('score')
  const [potmVote, setPotmVote]     = useState<string | null>(null)
  const [pollId, setPollId]         = useState<string | null>(null)

  const homeScore = isHome ? ourScore   : theirScore
  const awayScore = isHome ? theirScore : ourScore

  const submitScore = async () => {
    setLoading(true)
    try {
      // 스코어 + 완료 처리
      await manageFetch(`/schedule/matches/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ homeScore, awayScore, status: 'completed' }),
      })
      // POTM 투표 생성 (팀원이 있을 때만)
      if (members.length > 0) {
        const options = members.map(mem => mem.userId)
        const poll = await manageFetch('/schedule/polls', {
          method: 'POST',
          body: JSON.stringify({
            teamId,
            question: `⭐ POTM — ${m.venue} (${new Date(m.scheduledAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })})`,
            options,
          }),
        })
        setPollId(poll.id)
        setStep('potm')
      } else {
        onSuccess()
      }
    } finally {
      setLoading(false)
    }
  }

  const submitPOTM = async () => {
    if (!pollId || !potmVote) { onSuccess(); return }
    setLoading(true)
    try {
      const idx = members.findIndex(mem => mem.userId === potmVote)
      if (idx >= 0) {
        await manageFetch(`/schedule/polls/${pollId}/vote`, {
          method: 'POST',
          body: JSON.stringify({ optionIndex: idx }),
        })
      }
    } finally {
      setLoading(false)
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border shadow-2xl"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        onClick={e => e.stopPropagation()}>

        {step === 'score' ? (
          <>
            <div className="flex items-center justify-between p-5 pb-0">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>경기 결과 입력</h3>
              <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-5">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.venue} · {formatDateTime(m.scheduledAt)}</p>

              {/* 스코어 입력 */}
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>우리팀</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOurScore(s => Math.max(0, s - 1))}
                      className="h-9 w-9 rounded-xl text-lg font-bold transition-colors hover:opacity-70"
                      style={{ background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }}>−</button>
                    <span className="text-4xl font-black w-12 text-center tabular-nums"
                      style={{ color: 'var(--text-primary)' }}>{ourScore}</span>
                    <button onClick={() => setOurScore(s => s + 1)}
                      className="h-9 w-9 rounded-xl text-lg font-bold transition-colors hover:opacity-70"
                      style={{ background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }}>+</button>
                  </div>
                </div>
                <span className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>:</span>
                <div className="text-center">
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>상대팀</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTheirScore(s => Math.max(0, s - 1))}
                      className="h-9 w-9 rounded-xl text-lg font-bold transition-colors hover:opacity-70"
                      style={{ background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }}>−</button>
                    <span className="text-4xl font-black w-12 text-center tabular-nums"
                      style={{ color: 'var(--text-primary)' }}>{theirScore}</span>
                    <button onClick={() => setTheirScore(s => s + 1)}
                      className="h-9 w-9 rounded-xl text-lg font-bold transition-colors hover:opacity-70"
                      style={{ background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }}>+</button>
                  </div>
                </div>
              </div>

              {/* 결과 예고 */}
              <div className="rounded-xl px-4 py-2 text-center text-sm font-semibold"
                style={{
                  background: ourScore > theirScore ? 'rgba(74,222,128,0.12)' : ourScore < theirScore ? 'rgba(248,113,113,0.12)' : 'rgba(148,163,184,0.12)',
                  color: ourScore > theirScore ? '#4ade80' : ourScore < theirScore ? '#f87171' : 'var(--text-muted)',
                }}>
                {ourScore > theirScore ? '승리' : ourScore < theirScore ? '패배' : '무승부'}
              </div>

              <button onClick={submitScore} disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #c026d3, #7c3aed)' }}>
                {loading ? '저장 중...' : '결과 확정'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="text-3xl mb-2">⭐</div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>POTM 투표</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>오늘의 MVP를 선택하세요</p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map(mem => (
                  <button key={mem.userId}
                    onClick={() => setPotmVote(mem.userId)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-left transition-all"
                    style={{
                      background: potmVote === mem.userId ? 'rgba(124,58,237,0.15)' : 'var(--sidebar-bg)',
                      color: potmVote === mem.userId ? '#a78bfa' : 'var(--text-secondary)',
                      border: `1px solid ${potmVote === mem.userId ? 'rgba(124,58,237,0.4)' : 'var(--card-border)'}`,
                    }}>
                    {potmVote === mem.userId ? '⭐ ' : ''}{mem.userId}
                    {mem.position && <span className="ml-2 text-xs opacity-60">{mem.position}</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onSuccess()}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--sidebar-bg)', color: 'var(--text-muted)' }}>건너뛰기</button>
                <button onClick={submitPOTM} disabled={!potmVote || loading}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(to right, #c026d3, #7c3aed)' }}>
                  {loading ? '...' : '투표하기'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── POTM / 팀 투표 섹션 (M2-D) ───────────────────────────────────────────────

function PollsSection({ polls, onVoted }: { polls: Poll[]; onVoted: () => void }) {
  // 최근 3개만 표시
  const recent = polls.slice(0, 3)

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        투표
      </h2>
      <div className="space-y-3">
        {recent.map(poll => (
          <PollCard key={poll.id} poll={poll} onVoted={onVoted} />
        ))}
      </div>
    </div>
  )
}

function PollCard({ poll, onVoted }: { poll: Poll; onVoted: () => void }) {
  const [votes, setVotes] = useState<{ optionIndex: number; userId: string }[]>([])
  const [myVote, setMyVote] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    manageFetch(`/schedule/polls/${poll.id}/votes`)
      .then((data: { optionIndex: number; userId: string }[]) => {
        setVotes(data)
        if (user) {
          const mine = data.find(v => v.userId === user.userId)
          if (mine) setMyVote(mine.optionIndex)
        }
      })
      .catch(() => {})
  }, [poll.id, user])

  const vote = async (idx: number) => {
    if (myVote !== null) return
    setLoading(true)
    try {
      await manageFetch(`/schedule/polls/${poll.id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionIndex: idx }),
      })
      setMyVote(idx)
      onVoted()
    } finally {
      setLoading(false)
    }
  }

  const totalVotes = votes.length

  return (
    <div className="rounded-2xl border p-4 space-y-3"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{poll.question}</p>
        {poll.endsAt && new Date(poll.endsAt) < new Date() && (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500">종료</span>
        )}
      </div>
      <div className="space-y-1.5">
        {poll.options.map((opt, idx) => {
          const cnt = votes.filter(v => v.optionIndex === idx).length
          const pct = totalVotes ? Math.round((cnt / totalVotes) * 100) : 0
          const isMyVote = myVote === idx
          return (
            <button key={idx}
              onClick={() => vote(idx)}
              disabled={myVote !== null || loading}
              className="w-full rounded-xl overflow-hidden text-left transition-all"
              style={{
                border: `1px solid ${isMyVote ? 'rgba(124,58,237,0.4)' : 'var(--card-border)'}`,
                background: 'var(--sidebar-bg)',
              }}>
              <div className="relative px-3 py-2">
                {/* 진행 바 */}
                {myVote !== null && (
                  <div className="absolute inset-0 rounded-xl"
                    style={{ width: `${pct}%`, background: isMyVote ? 'rgba(124,58,237,0.12)' : 'rgba(148,163,184,0.08)', transition: 'width 0.5s ease' }} />
                )}
                <div className="relative flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate"
                    style={{ color: isMyVote ? '#a78bfa' : 'var(--text-secondary)' }}>
                    {isMyVote ? '✓ ' : ''}{opt}
                  </span>
                  {myVote !== null && (
                    <span className="text-xs font-bold shrink-0"
                      style={{ color: isMyVote ? '#a78bfa' : 'var(--text-muted)' }}>
                      {pct}%
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        총 {totalVotes}표
        {poll.endsAt && ` · ${new Date(poll.endsAt) > new Date() ? `~${new Date(poll.endsAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}` : '마감'}`}
      </p>
    </div>
  )
}

// ── 공통 스타일 ───────────────────────────────────────────────────────────────

const lbl = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide' as const
const inp = 'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-2' as const
