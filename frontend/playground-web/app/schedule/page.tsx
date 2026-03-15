'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { Trophy, Bell } from 'lucide-react'
import { manageFetch } from '@/lib/manageFetch'
import { useTeam } from '@/context/TeamContext'
import { useAuth } from '@/context/AuthContext'
import { GpsTracker } from '@/components/GpsTracker'
import type { Match, Announcement, Poll, Attendance, TeamMember, GoalRecord, CardRecord, Lineup, League, LeagueMatch } from '@/types/manage'

const MIN_PLAYERS = 7

// ── 상수 ──────────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  pending:   'bg-amber-400',
  accepted:  'bg-white',
  completed: 'bg-slate-400',
  rejected:  'bg-red-400',
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  accepted:  'bg-white/10 text-white dark:bg-white/10 dark:text-white',
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

function isMatchToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function memberLabel(mem: TeamMember) {
  const num = mem.number ? `#${mem.number}` : ''
  const pos = mem.position ? ` ${mem.position.slice(0, 3).toUpperCase()}` : ''
  return (num + pos).trim() || mem.userId.slice(0, 6) + '…'
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
        `SUMMARY:${m.venue}`,
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

// ── M2-A: QR 체크인 배너 ─────────────────────────────────────────────────────

function QRCheckInBanner({ matchId, matches, onDismiss }: {
  matchId: string; matches: Match[]; onDismiss: () => void
}) {
  const match = matches.find(m => m.id === matchId)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [arrivalNum, setArrivalNum] = useState<number | null>(null)

  if (!match) return null

  const checkIn = async () => {
    setStatus('loading')
    try {
      await manageFetch(`/schedule/matches/${matchId}/attendance`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'attending' }),
      })
      const all: { userId: string; status: string }[] =
        await manageFetch(`/schedule/matches/${matchId}/attendance`)
      setArrivalNum(all.filter(a => a.status === 'attending').length)
      setStatus('done')
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.35)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>경기 체크인</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {match.venue} · {formatDateTime(match.scheduledAt)}
          </p>
        </div>
        <button onClick={onDismiss}
          className="text-xs px-2 py-0.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
          닫기
        </button>
      </div>
      {status === 'idle' && (
        <button onClick={checkIn}
          className="w-full rounded-xl py-3 text-sm font-bold btn-press"
          style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
          ✓ 체크인 완료
        </button>
      )}
      {status === 'loading' && (
        <p className="text-center text-sm py-2" style={{ color: 'var(--text-muted)' }}>처리 중...</p>
      )}
      {status === 'done' && (
        <div className="text-center py-3">
          <p className="text-3xl font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {arrivalNum}번째
          </p>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            도착 완료! 본부석 신분 확인을 준비해 주세요 🪪
          </p>
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { currentTeam, isLeader } = useTeam()
  const teamId = currentTeam?.id ?? ''

  const [matches, setMatches] = useState<Match[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [checkInMatchId, setCheckInMatchId] = useState<string | null>(null)
  const [showGps, setShowGps] = useState(false)

  // M2-A: QR URL ?match=ID 감지 → 체크인 배너 노출
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mid = params.get('match')
    if (mid) setCheckInMatchId(mid)
  }, [])

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

  const isTrainingMatch = (m: Match) => m.matchType === 'training' || m.awayTeamId === 'training'

  const upcoming = matches
    .filter(m => isFuture(m.scheduledAt) && m.status !== 'rejected' && !isTrainingMatch(m))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 3)

  const upcomingTrainings = matches
    .filter(m => isFuture(m.scheduledAt) && isTrainingMatch(m))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  // M3-E: 상대팀이 제안한 대기 중 경기 (awayTeam = 우리팀)
  const pendingProposals = matches.filter(
    m => m.status === 'pending' && m.awayTeamId === teamId && isFuture(m.scheduledAt) && !isTrainingMatch(m)
  )

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
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
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

      {/* M2-A: QR 체크인 배너 */}
      {checkInMatchId && (
        <QRCheckInBanner
          matchId={checkInMatchId}
          matches={matches}
          onDismiss={() => setCheckInMatchId(null)}
        />
      )}

      {/* M3-E: 경기 제안 수신 알림 배너 */}
      {pendingProposals.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Bell size={18} className="mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
              경기 제안 {pendingProposals.length}건 수신
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              상대팀에서 경기를 제안했습니다 — 아래에서 수락 또는 거절해 주세요
            </p>
          </div>
        </div>
      )}

      {/* 다가오는 일정 (훈련+경기 통합, 시간순) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>다가오는 일정</h2>
        </div>

        {(() => {
          const allUpcoming = [
            ...upcoming.map(m => ({ ...m, isTraining: false })),
            ...upcomingTrainings.map(m => ({ ...m, isTraining: true })),
          ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

          if (allUpcoming.length === 0) {
            return (
              <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
                예정된 일정이 없습니다
              </p>
            )
          }

          const grouped = allUpcoming.reduce((acc, s) => {
            const date = new Date(s.scheduledAt)
            const key = `${date.getFullYear()}년 ${date.getMonth() + 1}월`
            if (!acc[key]) acc[key] = []
            acc[key].push(s)
            return acc
          }, {} as Record<string, typeof allUpcoming>)

          return (
            <div className="space-y-6">
              {Object.entries(grouped).map(([month, monthSchedules]) => (
                <div key={month}>
                  <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>{month}</p>
                  <div className="space-y-3">
                    {monthSchedules.map(s => {
                      const date = new Date(s.scheduledAt)
                      const day = date.getDate()
                      const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
                      const categoryColor = s.isTraining ? '#10b981' : '#3b82f6'
                      const categoryLabel = s.isTraining ? '훈련' : '경기'
                      const title = s.isTraining ? '훈련' : `vs ${s.awayTeamId === teamId ? s.homeTeamId : s.awayTeamId}`

                      return (
                        <div key={s.id} className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-xs font-medium" style={{ color: categoryColor }}>{currentTeam?.name}</p>
                            {s.status === 'pending' && (
                              <span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                            )}
                          </div>
                          <div className="flex gap-4">
                            <div className="text-center flex-shrink-0" style={{ minWidth: '40px' }}>
                              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{day}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{weekday}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p>
                              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · {s.venue}
                              </p>
                              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                <span style={{ color: categoryColor }}>{'\u25CF'}</span> {categoryLabel}
                                {s.status === 'pending' && <span> · 대기중</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </section>

      {/* 월간 캘린더 */}
      <section>
        <MonthCalendar matches={matches} />
      </section>

      {/* M3-A: 팀 통계 */}
      {matches.length > 0 && (
        <section>
          <TeamStatsSection matches={matches} members={members} teamId={teamId} polls={polls} sportType={currentTeam?.sportType} />
        </section>
      )}

      {/* M3-E: 최근 경기 결과 + 이의 신청 */}
      {matches.filter(m => m.status === 'completed' && m.matchType !== 'training' && m.awayTeamId !== 'training').length > 0 && (
        <section>
          <RecentResultsSection matches={matches} teamId={teamId} isLeader={isLeader} onRefresh={loadMatches} />
        </section>
      )}

      {/* M2-C: 경고 누적 트래커 */}
      {matches.length > 0 && (
        <section>
          <CardTrackerSection matches={matches} members={members} isLeader={isLeader} onRefresh={loadMatches} />
        </section>
      )}

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

      {/* M4: GPS 퍼포먼스 트래커 플로팅 버튼 */}
      <button
        onClick={() => setShowGps(true)}
        title="GPS 퍼포먼스 트래커"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ background: '#10b981' }}
      >
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
      </button>

      {showGps && <GpsTracker onClose={() => setShowGps(false)} />}
    </div>
  )
}

// ── 훈련 일정 카드 (M5-A) ──────────────────────────────────────────────────────

function TrainingCard({ match: m, isLeader, members, onRefresh }: {
  match: Match; isLeader: boolean; members: TeamMember[]; onRefresh: () => void
}) {
  const { user } = useAuth()
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [myStatus, setMyStatus]       = useState<AttendanceStatus | null>(null)
  const [voting, setVoting]           = useState(false)
  const [deleting, setDeleting]       = useState(false)

  useEffect(() => {
    manageFetch(`/schedule/matches/${m.id}/attendance`).then((list: Attendance[]) => {
      setAttendances(list)
      const mine = list.find(a => a.userId === user?.sub)
      setMyStatus(mine?.status ?? null)
    }).catch(() => {})
  }, [m.id, user?.sub])

  const vote = async (status: AttendanceStatus) => {
    if (!user?.sub || voting) return
    setVoting(true)
    try {
      await manageFetch(`/schedule/matches/${m.id}/attendance`, {
        method: 'PUT', body: JSON.stringify({ status }),
      })
      setMyStatus(status)
      const list: Attendance[] = await manageFetch(`/schedule/matches/${m.id}/attendance`)
      setAttendances(list)
    } finally { setVoting(false) }
  }

  const deleteTraining = async () => {
    if (!isLeader || deleting) return
    if (!confirm('이 훈련 일정을 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      await manageFetch(`/schedule/matches/${m.id}`, { method: 'DELETE' })
      onRefresh()
    } catch { setDeleting(false) }
  }

  const attending = attendances.filter(a => a.status === 'attending')
  const absent    = attendances.filter(a => a.status === 'absent')
  const dt = new Date(m.scheduledAt)
  const dateStr = dt.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  const timeStr = dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const note = m.note && !m.note.startsWith('DISPUTE:') ? m.note : null

  return (
    <div className="rounded-2xl border p-4 space-y-3"
      style={{ background: 'var(--card-bg)', borderColor: 'rgba(124,58,237,0.3)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold rounded-lg px-2 py-0.5"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
              훈련
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {dateStr} {timeStr}
            </span>
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{m.venue}</p>
          {m.venueAddress && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.venueAddress}</p>
          )}
          {note && (
            <p className="text-xs mt-1.5 rounded-lg px-2.5 py-1.5"
              style={{ background: 'var(--sidebar-bg)', color: 'var(--text-secondary)' }}>
              {note}
            </p>
          )}
        </div>
        {isLeader && (
          <button onClick={deleteTraining} disabled={deleting}
            className="shrink-0 rounded-lg px-2 py-1 text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            삭제
          </button>
        )}
      </div>

      {/* 참석 응답 */}
      <div className="flex items-center gap-2">
        <button onClick={() => vote('attending')} disabled={voting}
          className="flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all"
          style={{
            background: myStatus === 'attending' ? 'rgba(74,222,128,0.2)' : 'var(--sidebar-bg)',
            color: myStatus === 'attending' ? '#4ade80' : 'var(--text-muted)',
            border: `1px solid ${myStatus === 'attending' ? 'rgba(74,222,128,0.4)' : 'var(--card-border)'}`,
          }}>
          {myStatus === 'attending' ? '참석 완료' : '참석'}
        </button>
        <button onClick={() => vote('absent')} disabled={voting}
          className="flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all"
          style={{
            background: myStatus === 'absent' ? 'rgba(239,68,68,0.1)' : 'var(--sidebar-bg)',
            color: myStatus === 'absent' ? '#ef4444' : 'var(--text-muted)',
            border: `1px solid ${myStatus === 'absent' ? 'rgba(239,68,68,0.3)' : 'var(--card-border)'}`,
          }}>
          {myStatus === 'absent' ? '불참 완료' : '불참'}
        </button>
      </div>
      {attendances.length > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          참석 {attending.length}명 · 불참 {absent.length}명 · 미응답 {members.length - attending.length - absent.length}명
        </p>
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
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [showLineup, setShowLineup] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState(
    m.note && !m.note.startsWith('DISPUTE:') ? m.note : ''
  )
  const [savingNote, setSavingNote] = useState(false)
  const isGameDay = isMatchToday(m.scheduledAt)

  // M1-C: 경기 공유 카드 (카톡방 붙여넣기용)
  const shareMatch = async () => {
    const dateStr = new Date(m.scheduledAt).toLocaleString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
    })
    const lines = [
      `경기 안내 — ${m.venue}`,
      `${dateStr}`,
      m.venueAddress ? `${m.venueAddress}` : '',
      `경기 당일 신분증 지참 필수`,
      '',
      `체크인: https://fun.sedaily.ai/schedule?match=${m.id}`,
    ].filter(l => l !== undefined) as string[]
    const text = lines.join('\n')
    const url  = `https://fun.sedaily.ai/schedule?match=${m.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: '경기 안내', text, url })
      } else {
        await navigator.clipboard.writeText(text)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
    } catch {}
  }

  // 출석 상태 로드 (내 상태 + 전체 집계)
  const loadAttendances = async () => {
    if (m.status !== 'accepted') return
    try {
      const all: Attendance[] = await manageFetch(`/schedule/matches/${m.id}/attendance`)
      setAttendances(all)
      if (user) {
        const mine = all.find(a => a.userId === user.username)
        if (mine) setMyStatus(mine.status)
      }
    } catch {}
  }

  useEffect(() => {
    loadAttendances()
  }, [m.id, m.status, user])

  // M2-A: 경기 당일 자동 갱신 (30초)
  useEffect(() => {
    if (!isGameDay || m.status !== 'accepted') return
    const interval = setInterval(loadAttendances, 30000)
    return () => clearInterval(interval)
  }, [isGameDay, m.status, m.id])

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

      {/* M2-A: 경기 당일 배너 */}
      {isGameDay && m.status === 'accepted' && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>경기 당일 — 체크인 현황</span>
          <span className="ml-auto text-xs font-bold tabular-nums"
            style={{ color: attendingCount >= MIN_PLAYERS ? '#4ade80' : '#f87171' }}>
            {attendingCount} / {MIN_PLAYERS}명
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
            <span className="rounded-lg px-2 py-1 text-[11px] font-bold" style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>{dLabel}</span>
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
                <span className="h-2 w-2 rounded-full" style={{ background: 'var(--text-primary)' }} />
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
                    style={{ background: i < attendingCount ? 'var(--text-primary)' : 'var(--card-border)' }}
                  />
                ))}
                <span className="text-[10px] font-bold ml-0.5"
                  style={{ color: attendingCount >= MIN_PLAYERS ? '#4ade80' : '#f87171' }}>
                  {attendingCount >= MIN_PLAYERS ? '✓' : `${MIN_PLAYERS - attendingCount}명 부족`}
                </span>
              </div>
            </div>
          )}

          {/* M2-A: 경기 당일 멤버 체크인 그리드 */}
          {isGameDay && members.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {members.map(mem => {
                const att = attendances.find(a => a.userId === mem.userId)
                const st = att?.status ?? 'pending'
                return (
                  <span key={mem.userId} className="text-xs rounded-lg px-2 py-1 font-medium"
                    style={{
                      background: st === 'attending' ? 'rgba(74,222,128,0.15)' : st === 'absent' ? 'rgba(248,113,113,0.12)' : 'var(--sidebar-bg)',
                      color: st === 'attending' ? '#4ade80' : st === 'absent' ? '#f87171' : 'var(--text-muted)',
                      border: `1px solid ${st === 'attending' ? 'rgba(74,222,128,0.3)' : st === 'absent' ? 'rgba(248,113,113,0.25)' : 'var(--card-border)'}`,
                    }}>
                    {st === 'attending' ? '✓' : st === 'absent' ? '✗' : '?'} {memberLabel(mem)}
                  </span>
                )
              })}
            </div>
          )}

          {/* M2-A: 경기 당일 대형 체크인 버튼 */}
          {isGameDay && myStatus === null && (
            <button
              onClick={() => respond('attending')}
              disabled={loading}
              className="w-full rounded-2xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
              style={{ background: '#10b981' }}
            >
              {loading ? '처리 중...' : '경기 당일 체크인'}
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>출석 응답</span>
            <AttendBtn
              label="참가"
              active={myStatus === 'attending'}
              activeClass="bg-white text-black"
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

      {/* M2-B: 라인업 (확정된 경기) */}
      {m.status === 'accepted' && (
        <LineupSection
          match={m}
          members={members}
          isLeader={isLeader}
          showLineup={showLineup}
          onToggle={() => setShowLineup(v => !v)}
          onSaved={onRefresh}
        />
      )}

      {/* M2-A: 용병 임시 등록 (확정된 경기) */}
      {m.status === 'accepted' && (
        <GuestSection match={m} isLeader={isLeader} onSaved={onRefresh} />
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

      {/* M3-C: 미디어 아카이브 */}
      <MediaSection match={m} isLeader={isLeader} onSaved={onRefresh} />

      {/* M2-C: 경기 이벤트 타임라인 (득점 + 카드 시간순) */}
      <EventTimeline match={m} members={members} />

      {/* M2-C: 득점 + 경고 기록 버튼 (리더, 확정된 경기) */}
      {isLeader && m.status === 'accepted' && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex-1 rounded-xl py-2 text-xs font-semibold hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
            style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            득점 기록
          </button>
          <button
            onClick={() => setShowCardModal(true)}
            className="flex-1 rounded-xl py-2 text-xs font-semibold hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
            style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            경고 기록
          </button>
        </div>
      )}

      {/* 결과 입력 + QR 공유 버튼 (확정된 경기) */}
      {m.status === 'accepted' && (
        <div className="flex gap-2">
          {isLeader && (
            <button
              onClick={() => setShowResultModal(true)}
              className="flex-1 rounded-xl py-2 text-xs font-semibold hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              경기 결과 입력
            </button>
          )}
          <button
            onClick={() => setShowQRModal(true)}
            className="rounded-xl px-3 py-2 text-xs font-semibold hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
            style={{ background: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}
          >
            QR
          </button>
          <button
            onClick={shareMatch}
            className="rounded-xl px-3 py-2 text-xs font-semibold hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
            style={{ background: shareCopied ? 'rgba(74,222,128,0.12)' : 'rgba(156,163,175,0.08)',
              color: shareCopied ? '#4ade80' : 'var(--text-muted)',
              border: `1px solid ${shareCopied ? 'rgba(74,222,128,0.3)' : 'var(--card-border)'}` }}
          >
            {shareCopied ? '복사됨!' : '공유'}
          </button>
          {/* M3-E: 주장 채팅방 */}
          {m.captainRoomId && (
            <a
              href={`/chat?roomId=${m.captainRoomId}`}
              className="rounded-xl px-3 py-2 text-xs font-semibold hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
              style={{ background: 'rgba(251,146,60,0.08)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}
            >
              주장채팅
            </a>
          )}
        </div>
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

      {/* M5-A: 경기 노트 (리더 — 상대팀 분석 메모) */}
      {isLeader && m.status !== 'completed' && (
        <div className="border-t pt-2" style={{ borderColor: 'var(--card-border)' }}>
          <button
            onClick={() => setShowNote(v => !v)}
            className="flex w-full items-center justify-between text-[11px] font-semibold py-1"
            style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1.5">
              경기 노트
              {noteText.trim() && !showNote && (
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>저장됨</span>
              )}
            </span>
            <svg className={`h-3.5 w-3.5 transition-transform ${showNote ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showNote && (
            <div className="mt-2 space-y-2">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="상대팀 분석, 전술 메모, 주의사항 등..."
                rows={3}
                className="w-full rounded-xl border px-3 py-2 text-xs outline-none resize-none"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={async () => {
                  setSavingNote(true)
                  try {
                    await manageFetch(`/schedule/matches/${m.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ note: noteText.trim() || undefined }),
                    })
                    setShowNote(false)
                    onRefresh()
                  } finally { setSavingNote(false) }
                }}
                disabled={savingNote}
                className="rounded-xl px-4 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: '#3b82f6' }}>
                {savingNote ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>
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

      {/* M2-C: 득점 기록 모달 */}
      {showGoalModal && (
        <GoalModal
          match={m}
          members={members}
          attendances={attendances}
          onClose={() => setShowGoalModal(false)}
          onSuccess={() => {
            setShowGoalModal(false)
            onRefresh()
          }}
        />
      )}

      {/* M2-C: 경고/퇴장 기록 모달 */}
      {showCardModal && (
        <CardModal
          match={m}
          members={members}
          attendances={attendances}
          onClose={() => setShowCardModal(false)}
          onSuccess={() => {
            setShowCardModal(false)
            onRefresh()
          }}
        />
      )}

      {/* M2-A: QR 체크인 모달 */}
      {showQRModal && (
        <QRModal match={m} onClose={() => setShowQRModal(false)} />
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
        active ? activeClass : `hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all ${inactiveClass}`
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
                isToday ? 'bg-white text-black' : ''
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
              ? s === 'attending' ? 'bg-white text-black' : 'bg-red-500 text-white'
              : 'hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all'
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
  const [formType, setFormType] = useState<'match' | 'training'>('match')

  const openAs = (type: 'match' | 'training') => { setFormType(type); setOpen(true) }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button onClick={() => openAs('match')}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-white transition-colors"
          style={{ background: 'var(--accent, #8B5CF6)' }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          경기
        </button>
        <button onClick={() => openAs('training')}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)' }}>
          훈련
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formType === 'training' ? '훈련 일정 등록' : '경기 등록'}
              </h3>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <MatchForm teamId={teamId} formType={formType} onSuccess={() => { setOpen(false); onSuccess() }} />
          </div>
        </div>
      )}
    </>
  )
}

const VENUE_STORAGE_KEY = 'pg_saved_venues'
type SavedVenue = { name: string; address: string }

function loadSavedVenues(): SavedVenue[] {
  try { return JSON.parse(localStorage.getItem(VENUE_STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveVenue(venue: string, address: string) {
  try {
    const list = loadSavedVenues().filter(v => v.name !== venue)
    localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify([{ name: venue, address }, ...list].slice(0, 10)))
  } catch {}
}
function removeVenueFromStorage(name: string) {
  try {
    localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(loadSavedVenues().filter(v => v.name !== name)))
  } catch {}
}

function MatchForm({ teamId, formType = 'match', onSuccess }: { teamId: string; formType?: 'match' | 'training'; onSuccess: () => void }) {
  const isTraining = formType === 'training'
  const [form, setForm] = useState({
    homeTeamId: teamId,
    awayTeamId: isTraining ? 'training' : '',
    scheduledAt: '', venue: '', venueAddress: '',
    matchType: formType,
  })
  const [loading, setLoading] = useState(false)
  const [savedVenues, setSavedVenues] = useState<SavedVenue[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => { setSavedVenues(loadSavedVenues()) }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const filteredVenues = savedVenues.filter(v =>
    form.venue === '' || v.name.toLowerCase().includes(form.venue.toLowerCase())
  )
  const isSaved = savedVenues.some(v => v.name === form.venue)

  const toggleFavorite = () => {
    if (isSaved) {
      removeVenueFromStorage(form.venue)
      setSavedVenues(prev => prev.filter(v => v.name !== form.venue))
    } else if (form.venue) {
      saveVenue(form.venue, form.venueAddress)
      setSavedVenues(loadSavedVenues())
    }
  }

  const selectVenue = (v: SavedVenue) => {
    setForm(f => ({ ...f, venue: v.name, venueAddress: v.address }))
    setShowSuggestions(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const body: Record<string, string> = { ...form }
      if (isTraining && note) body.note = note
      await manageFetch('/schedule/matches', { method: 'POST', body: JSON.stringify(body) })
      if (form.venue) {
        saveVenue(form.venue, form.venueAddress)
        setSavedVenues(loadSavedVenues())
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!isTraining && (
        <div>
          <label className={lbl}>상대 팀 ID</label>
          <input value={form.awayTeamId} onChange={e => set('awayTeamId', e.target.value)} required className={inp} placeholder="상대 팀 ID"
            style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }} />
        </div>
      )}
      <div>
        <label className={lbl}>일시</label>
        <input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} required className={inp}
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }} />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <label className={lbl} style={{ margin: 0 }}>{isTraining ? '훈련 장소' : '구장명'}</label>
          {form.venue && (
            <button type="button" onClick={toggleFavorite}
              className="text-[11px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: isSaved ? '#fbbf24' : 'var(--text-muted)' }}>
              {isSaved ? '저장됨' : '즐겨찾기'}
            </button>
          )}
        </div>
        <input
          value={form.venue}
          onChange={e => { set('venue', e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          required className={inp} placeholder={isTraining ? '운동장 / 풋살장 이름' : '잠실 구장'}
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
        />
        {showSuggestions && filteredVenues.length > 0 && (
          <div className="absolute z-10 left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            {filteredVenues.map(v => (
              <button key={v.name} type="button" onMouseDown={() => selectVenue(v)}
                className="w-full text-left px-3.5 py-2.5 border-b last:border-b-0 hover:opacity-75 transition-opacity"
                style={{ borderColor: 'var(--card-border)' }}>
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <span style={{ color: '#fbbf24' }}>&#9733;</span>{v.name}
                </div>
                {v.address && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{v.address}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className={lbl}>주소 (선택)</label>
        <input value={form.venueAddress} onChange={e => set('venueAddress', e.target.value)} className={inp} placeholder="서울시 송파구..."
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }} />
      </div>
      {isTraining && (
        <div>
          <label className={lbl}>훈련 내용 (선택)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            className={inp} placeholder="패스 훈련, 슈팅 연습, 세트피스 등..."
            style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)', resize: 'none' }} />
        </div>
      )}
      <button type="submit" disabled={loading}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        style={{ background: 'var(--accent, #8B5CF6)' }}>
        {loading ? '등록 중...' : isTraining ? '훈련 일정 등록' : '경기 등록'}
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
            question: `POTM — ${m.venue} (${new Date(m.scheduledAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })})`,
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
                className="w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
                style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
                {loading ? '저장 중...' : '결과 확정'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="text-3xl mb-2"><Trophy size={28} style={{ color: '#fbbf24' }} /></div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>POTM 투표</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>오늘의 MVP를 선택하세요</p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map(mem => (
                  <button key={mem.userId}
                    onClick={() => setPotmVote(mem.userId)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-left transition-all"
                    style={{
                      background: potmVote === mem.userId ? 'rgba(255,255,255,0.1)' : 'var(--sidebar-bg)',
                      color: potmVote === mem.userId ? 'var(--text-primary)' : 'var(--text-secondary)',
                      border: `1px solid ${potmVote === mem.userId ? 'rgba(255,255,255,0.2)' : 'var(--card-border)'}`,
                    }}>
                    {potmVote === mem.userId ? '* ' : ''}{mem.userId}
                    {mem.position && <span className="ml-2 text-xs opacity-60">{mem.position}</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onSuccess()}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--sidebar-bg)', color: 'var(--text-muted)' }}>건너뛰기</button>
                <button onClick={submitPOTM} disabled={!potmVote || loading}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
                  style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
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
  const [finalizing, setFinalizing] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const { user } = useAuth()
  const { currentTeam, isLeader } = useTeam()

  useEffect(() => {
    manageFetch(`/schedule/polls/${poll.id}/votes`)
      .then((data: { optionIndex: number; userId: string }[]) => {
        setVotes(data)
        if (user) {
          const mine = data.find(v => v.userId === user.username)
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

  const finalize = async () => {
    setFinalizing(true)
    try {
      await manageFetch(`/schedule/polls/${poll.id}/finalize`, { method: 'POST' })
      setFinalized(true)
    } catch { /* ignore */ } finally {
      setFinalizing(false)
    }
  }

  const totalVotes = votes.length
  const isPotm = poll.question.startsWith('POTM')
  const isEnded = !!poll.endsAt && new Date(poll.endsAt) < new Date()

  return (
    <div className="rounded-2xl border p-4 space-y-3"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{poll.question}</p>
        {isEnded && (
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
                border: `1px solid ${isMyVote ? 'rgba(255,255,255,0.2)' : 'var(--card-border)'}`,
                background: 'var(--sidebar-bg)',
              }}>
              <div className="relative px-3 py-2">
                {/* 진행 바 */}
                {myVote !== null && (
                  <div className="absolute inset-0 rounded-xl"
                    style={{ width: `${pct}%`, background: isMyVote ? 'rgba(255,255,255,0.1)' : 'rgba(148,163,184,0.08)', transition: 'width 0.5s ease' }} />
                )}
                <div className="relative flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate"
                    style={{ color: isMyVote ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {isMyVote ? '✓ ' : ''}{opt}
                  </span>
                  {myVote !== null && (
                    <span className="text-xs font-bold shrink-0"
                      style={{ color: isMyVote ? 'var(--text-primary)' : 'var(--text-muted)' }}>
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
      {/* M2-D: POTM 확정 (주장만) */}
      {isPotm && isEnded && isLeader && !finalized && (
        <button
          onClick={finalize}
          disabled={finalizing}
          className="w-full rounded-xl py-2 text-xs font-bold transition-colors disabled:opacity-60"
          style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
          {finalizing ? '확정 중...' : 'POTM 확정하기'}
        </button>
      )}
      {finalized && (
        <div className="rounded-xl py-2 text-center text-xs font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}>
          ✓ POTM 뱃지 수여 완료
        </div>
      )}
    </div>
  )
}

// ── M2-A: QR 체크인 모달 ──────────────────────────────────────────────────────

function QRModal({ match: m, onClose }: { match: Match; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  const qrData = `https://fun.sedaily.ai/schedule?match=${m.id}`

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrData, {
      width: 220,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    }).catch(() => {})
  }, [qrData])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative w-full max-w-xs rounded-2xl border p-5 space-y-4"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>QR 체크인 공유</h3>
          <button onClick={onClose}
            className="rounded-full p-1.5 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR 코드 */}
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl overflow-hidden p-3" style={{ background: 'white' }}>
            <canvas ref={canvasRef} />
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{m.venue}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(m.scheduledAt)}</p>
          </div>
          <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
            팀원이 QR을 스캔하면 경기 페이지로 이동합니다
          </p>
        </div>

        {/* 링크 복사 */}
        <button
          onClick={copyLink}
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
          style={{
            background: copied ? 'rgba(74,222,128,0.1)' : 'var(--sidebar-bg)',
            color: copied ? '#4ade80' : 'var(--text-secondary)',
            border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--card-border)'}`,
          }}>
          {copied ? '✓ 링크 복사됨' : '🔗 링크 복사'}
        </button>
      </div>
    </div>
  )
}

// ── M3-C: 미디어 아카이브 (경기 사진 업로드) ──────────────────────────────────

const AUTH_API = process.env.NEXT_PUBLIC_API_URL ?? ''

function MediaSection({ match: m, isLeader, onSaved }: {
  match: Match; isLeader: boolean; onSaved: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const media = m.media ?? []

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
        const res = await fetch(`${AUTH_API}/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: `matches/${m.id}`, fileName: file.name, contentType: file.type }),
        })
        if (!res.ok) continue
        const { uploadUrl, publicUrl } = await res.json()
        await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
        newUrls.push(publicUrl)
      }
      if (newUrls.length > 0) {
        await manageFetch(`/schedule/matches/${m.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ media: [...media, ...newUrls] }),
        })
        onSaved()
      }
    } finally {
      setUploading(false)
    }
  }

  const removeMedia = async (url: string) => {
    const updated = media.filter(u => u !== url)
    await manageFetch(`/schedule/matches/${m.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ media: updated }),
    })
    onSaved()
  }

  if (media.length === 0 && !isLeader) return null

  return (
    <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          미디어 ({media.length})
        </span>
        {isLeader && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-[10px] font-semibold rounded-lg px-2.5 py-1 transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
              {uploading ? '업로드 중…' : '+ 사진 추가'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </>
        )}
      </div>

      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {media.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden"
              style={{ background: 'var(--sidebar-bg)' }}>
              {url.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  src={url}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(url)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={`경기 사진 ${i + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(url)}
                />
              )}
              {isLeader && (
                <button
                  onClick={() => removeMedia(url)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 라이트박스 */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightbox(null)}>
          {lightbox.match(/\.(mp4|webm|mov)$/i) ? (
            <video src={lightbox} controls className="max-w-full max-h-[85vh] rounded-xl" onClick={e => e.stopPropagation()} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightbox} alt="경기 사진" className="max-w-full max-h-[85vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  )
}

// ── M2-A: 용병(Guest) 임시 등록 ─────────────────────────────────────────────

function GuestSection({ match: m, isLeader, onSaved }: {
  match: Match; isLeader: boolean; onSaved: () => void
}) {
  const [guests, setGuests] = useState<string[]>(m.guests ?? [])
  const [newName, setNewName] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [saving, setSaving] = useState(false)

  const patchGuests = async (updated: string[]) => {
    setSaving(true)
    try {
      await manageFetch(`/schedule/matches/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ guests: updated }),
      })
      setGuests(updated)
      onSaved()
    } finally { setSaving(false) }
  }

  const addGuest = async () => {
    const name = newName.trim()
    if (!name || guests.includes(name)) return
    await patchGuests([...guests, name])
    setNewName('')
    setShowInput(false)
  }

  return (
    <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          용병 {guests.length > 0 ? `(${guests.length}명)` : ''}
        </span>
        {isLeader && !showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="text-[11px] font-semibold rounded-lg px-2.5 py-1 transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)' }}>
            + 추가
          </button>
        )}
      </div>

      {guests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {guests.map(name => (
            <div key={name} className="flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {name}
              {isLeader && (
                <button
                  onClick={() => patchGuests(guests.filter(g => g !== name))}
                  disabled={saving}
                  className="ml-1 hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {guests.length === 0 && !showInput && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {isLeader ? '+ 추가 버튼으로 용병을 등록하세요' : '등록된 용병이 없습니다'}
        </p>
      )}

      {showInput && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }}
            placeholder="이름 입력"
            className="flex-1 rounded-xl border px-3 py-1.5 text-xs outline-none focus:ring-1"
            style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            autoFocus
          />
          <button onClick={addGuest} disabled={saving || !newName.trim()}
            className="rounded-xl px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: 'var(--accent, #8B5CF6)' }}>
            {saving ? '…' : '추가'}
          </button>
          <button onClick={() => { setShowInput(false); setNewName('') }}
            className="rounded-xl px-2.5 py-1.5 text-xs"
            style={{ background: 'var(--sidebar-bg)', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
            취소
          </button>
        </div>
      )}
    </div>
  )
}

// ── M2-C: 경기 이벤트 타임라인 ───────────────────────────────────────────────

function EventTimeline({ match: m, members }: { match: Match; members: TeamMember[] }) {
  type TLEvent =
    | { kind: 'goal'; minute?: number; scorer: string; assist?: string }
    | { kind: 'card'; minute?: number; playerId: string; type: CardRecord['type'] }

  const events: TLEvent[] = [
    ...(m.goals ?? []).map(g => ({ kind: 'goal' as const, ...g })),
    ...(m.cards ?? []).map(c => ({ kind: 'card' as const, ...c })),
  ].sort((a, b) => {
    if (a.minute == null && b.minute == null) return 0
    if (a.minute == null) return 1
    if (b.minute == null) return -1
    return a.minute - b.minute
  })

  if (events.length === 0) return null

  return (
    <div className="rounded-xl px-3 py-2 space-y-1"
      style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }}>
      {events.map((ev, i) => {
        if (ev.kind === 'goal') {
          const scorer = members.find(mem => mem.userId === ev.scorer)
          const helper = ev.assist ? members.find(mem => mem.userId === ev.assist) : null
          return (
            <div key={`ev-${i}`} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span className="font-medium tabular-nums text-[10px] w-7 shrink-0" style={{ color: 'var(--text-muted)' }}>
                {ev.minute != null ? `${ev.minute}'` : ''}
              </span>
              <span className="font-semibold">{scorer ? memberLabel(scorer) : ev.scorer.slice(0, 8)}</span>
              {helper && <span style={{ color: 'var(--text-muted)' }}>(A {memberLabel(helper)})</span>}
            </div>
          )
        }
        const player = members.find(mem => mem.userId === ev.playerId)
        return (
          <div key={`ev-${i}`} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className={`w-3 h-4 rounded-sm inline-block ${ev.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
            <span className="font-medium tabular-nums text-[10px] w-7 shrink-0" style={{ color: 'var(--text-muted)' }}>
              {ev.minute != null ? `${ev.minute}'` : ''}
            </span>
            <span className="font-semibold">{player ? memberLabel(player) : ev.playerId.slice(0, 8)}</span>
            <span style={{ color: 'var(--text-muted)' }}>{ev.type === 'yellow' ? '경고' : '퇴장'}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── M2-C: 득점 기록 모달 ─────────────────────────────────────────────────────

function GoalModal({ match: m, members, attendances, onClose, onSuccess }: {
  match: Match; members: TeamMember[]; attendances: Attendance[]; onClose: () => void; onSuccess: () => void
}) {
  const [scorer, setScorer] = useState<string | null>(null)
  const [assist, setAssist] = useState<string | null>(null)
  const [minute, setMinute] = useState('')
  const [loading, setLoading] = useState(false)

  // 참가 응답한 멤버 우선, 없으면 전체
  const attending = attendances.filter(a => a.status === 'attending').map(a => a.userId)
  const selectable = attending.length > 0
    ? members.filter(m => attending.includes(m.userId))
    : members

  const submit = async () => {
    if (!scorer) return
    setLoading(true)
    try {
      const newGoal: GoalRecord = {
        scorer,
        ...(assist ? { assist } : {}),
        ...(minute ? { minute: parseInt(minute, 10) } : {}),
      }
      const updatedGoals = [...(m.goals ?? []), newGoal]
      await manageFetch(`/schedule/matches/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ goals: updatedGoals }),
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border shadow-2xl"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>득점 기록</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-5 space-y-4">
          {/* 시간 */}
          <div>
            <label className={lbl} style={{ color: 'var(--text-muted)' }}>시간 (선택)</label>
            <input
              type="number" min="1" max="120" value={minute}
              onChange={e => setMinute(e.target.value)}
              placeholder="예: 45"
              className={inp}
              style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* 득점자 */}
          <div>
            <label className={lbl} style={{ color: 'var(--text-muted)' }}>득점자</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {selectable.map(mem => (
                <button key={mem.userId}
                  onClick={() => setScorer(mem.userId === scorer ? null : mem.userId)}
                  className="w-full rounded-xl px-3 py-2 text-sm text-left font-medium transition-all"
                  style={{
                    background: scorer === mem.userId ? 'rgba(74,222,128,0.15)' : 'var(--sidebar-bg)',
                    color: scorer === mem.userId ? '#4ade80' : 'var(--text-secondary)',
                    border: `1px solid ${scorer === mem.userId ? 'rgba(74,222,128,0.4)' : 'var(--card-border)'}`,
                  }}>
                  {scorer === mem.userId ? '* ' : ''}{memberLabel(mem)}
                  {mem.role === 'leader' && <span className="ml-1 text-[10px] opacity-50">주장</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 어시스트 */}
          <div>
            <label className={lbl} style={{ color: 'var(--text-muted)' }}>어시스트 (선택)</label>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {selectable.filter(mem => mem.userId !== scorer).map(mem => (
                <button key={mem.userId}
                  onClick={() => setAssist(mem.userId === assist ? null : mem.userId)}
                  className="w-full rounded-xl px-3 py-2 text-sm text-left font-medium transition-all"
                  style={{
                    background: assist === mem.userId ? 'rgba(96,165,250,0.12)' : 'var(--sidebar-bg)',
                    color: assist === mem.userId ? '#60a5fa' : 'var(--text-secondary)',
                    border: `1px solid ${assist === mem.userId ? 'rgba(96,165,250,0.3)' : 'var(--card-border)'}`,
                  }}>
                  {assist === mem.userId ? 'A ' : ''}{memberLabel(mem)}
                </button>
              ))}
            </div>
          </div>

          <button onClick={submit} disabled={!scorer || loading}
            className="w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
            style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
            {loading ? '저장 중...' : '득점 기록하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── M2-B: 라인업 섹션 ────────────────────────────────────────────────────────

// ── M2-B: 2D 포메이션 보드 ────────────────────────────────────────────────────

type FormationType = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2'

const FORMATION_POSITIONS: Record<FormationType, [number, number][]> = {
  '4-3-3':   [[50,88],[12,70],[35,68],[65,68],[88,70],[20,46],[50,44],[80,46],[15,20],[50,16],[85,20]],
  '4-4-2':   [[50,88],[12,70],[35,68],[65,68],[88,70],[12,48],[37,46],[63,46],[88,48],[32,18],[68,18]],
  '4-2-3-1': [[50,88],[12,70],[35,68],[65,68],[88,70],[30,55],[70,55],[15,36],[50,32],[85,36],[50,14]],
  '3-5-2':   [[50,88],[20,70],[50,68],[80,70],[8,50],[28,46],[50,44],[72,46],[92,50],[32,18],[68,18]],
  '5-3-2':   [[50,88],[8,68],[28,72],[50,72],[72,72],[92,68],[20,46],[50,44],[80,46],[32,18],[68,18]],
}
const ALL_FORMATIONS: FormationType[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2']

function FormationBoard({ starters, members, formation, onFormationChange, onStartersChange, isLeader }: {
  starters: string[]; members: TeamMember[]; formation: FormationType
  onFormationChange: (f: FormationType) => void
  onStartersChange?: (newStarters: string[]) => void
  isLeader: boolean
}) {
  const positions = FORMATION_POSITIONS[formation]
  const [selectedPos, setSelectedPos] = useState<number | null>(null)

  const handlePosClick = (idx: number) => {
    if (!isLeader || !onStartersChange) return
    if (selectedPos === null) {
      setSelectedPos(idx)
    } else if (selectedPos === idx) {
      setSelectedPos(null)
    } else {
      // 두 포지션 선수 교체
      const next = [...starters]
      const a = next[selectedPos] ?? ''
      const b = next[idx] ?? ''
      next[selectedPos] = b
      next[idx] = a
      onStartersChange(next)
      setSelectedPos(null)
    }
  }

  return (
    <div className="space-y-2 mt-2">
      {isLeader && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>포메이션</span>
          {ALL_FORMATIONS.map(f => (
            <button key={f} onClick={() => onFormationChange(f)}
              className="text-[10px] font-bold rounded-lg px-2 py-0.5 transition-all"
              style={{
                background: formation === f ? 'var(--btn-solid-bg)' : 'transparent',
                color: formation === f ? 'var(--btn-solid-color)' : 'var(--text-muted)',
                border: `1px solid ${formation === f ? 'var(--btn-solid-bg)' : 'var(--card-border)'}`,
              }}>
              {f}
            </button>
          ))}
        </div>
      )}
      {!isLeader && (
        <p className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{formation}</p>
      )}
      {isLeader && onStartersChange && (
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          포지션을 탭해 선택 후, 다른 포지션 탭으로 선수 위치 교체
        </p>
      )}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '140%', borderRadius: 10, overflow: 'hidden', background: '#15803d' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 100 140" preserveAspectRatio="none">
          <rect x="4" y="4" width="92" height="132" rx="2" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
          <line x1="4" y1="70" x2="96" y2="70" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8"/>
          <circle cx="50" cy="70" r="12" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8"/>
          <circle cx="50" cy="70" r="1" fill="rgba(255,255,255,0.6)"/>
          <rect x="24" y="4" width="52" height="22" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
          <rect x="36" y="4" width="28" height="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
          <rect x="24" y="114" width="52" height="22" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
          <rect x="36" y="126" width="28" height="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
        </svg>
        {positions.map(([x, y], idx) => {
          const userId = starters[idx]
          const mem = userId ? members.find(mb => mb.userId === userId) : null
          const isGK = idx === 0
          const isSelected = selectedPos === idx
          const isSwapTarget = selectedPos !== null && selectedPos !== idx
          return (
            <div
              key={idx}
              onClick={() => handlePosClick(idx)}
              style={{
                position: 'absolute', left: `${x}%`, top: `${y}%`,
                transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 1,
                cursor: isLeader && onStartersChange ? 'pointer' : 'default',
                pointerEvents: isLeader && onStartersChange ? 'auto' : 'none',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: isSelected
                  ? 'rgba(251,191,36,0.95)'
                  : userId
                    ? (isGK ? 'rgba(250,204,21,0.9)' : 'rgba(167,139,250,0.9)')
                    : 'rgba(255,255,255,0.2)',
                border: `2px solid ${
                  isSelected ? '#fbbf24'
                  : isSwapTarget && userId ? 'rgba(251,191,36,0.6)'
                  : userId ? (isGK ? '#fde68a' : '#c4b5fd')
                  : 'rgba(255,255,255,0.3)'
                }`,
                boxShadow: isSelected ? '0 0 0 3px rgba(251,191,36,0.4)' : isSwapTarget && userId ? '0 0 0 2px rgba(251,191,36,0.25)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {userId && (
                  <span style={{ fontSize: 6, fontWeight: 800, color: isGK ? '#713f12' : '#2e1065', lineHeight: 1 }}>
                    {mem?.number ?? idx + 1}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 7, fontWeight: 700, color: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.95)',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)', maxWidth: 34, textAlign: 'center', lineHeight: 1.1 }}>
                {mem ? (mem.number ? `#${mem.number}` : memberLabel(mem).slice(0, 5)) : (isGK ? 'GK' : `P${idx}`)}
              </span>
            </div>
          )
        })}
      </div>
      {selectedPos !== null && (
        <p className="text-[10px] text-center" style={{ color: '#fbbf24' }}>
          {starters[selectedPos]
            ? `${memberLabel(members.find(m => m.userId === starters[selectedPos])!) || '선수'} 선택됨 — 교체할 포지션 탭`
            : '빈 포지션 선택됨 — 교체할 포지션 탭'}
          {'  '}
          <button onClick={() => setSelectedPos(null)} style={{ textDecoration: 'underline' }}>취소</button>
        </p>
      )}
    </div>
  )
}

type HalfTab = 'first' | 'second'

function LineupSection({ match: m, members, isLeader, showLineup, onToggle, onSaved }: {
  match: Match; members: TeamMember[]
  isLeader: boolean; showLineup: boolean; onToggle: () => void; onSaved: () => void
}) {
  // 전반 (first half) 상태
  const startersFirst = m.lineup?.starters ?? []
  const subsFirst     = m.lineup?.subs ?? []
  const [localStarters,  setLocalStarters]  = useState<string[]>(startersFirst)
  const [localSubs,      setLocalSubs]      = useState<string[]>(subsFirst)

  // 후반 (second half) 상태
  const startersSecond = m.lineupSecond?.starters ?? []
  const subsSecond     = m.lineupSecond?.subs ?? []
  const [localStarters2, setLocalStarters2] = useState<string[]>(startersSecond)
  const [localSubs2,     setLocalSubs2]     = useState<string[]>(subsSecond)

  const [halfTab,        setHalfTab]        = useState<HalfTab>('first')
  const [saving,         setSaving]         = useState(false)
  const [formation,      setFormation]      = useState<FormationType>('4-3-3')
  const [showFormation,  setShowFormation]  = useState(false)

  // 현재 탭에 따른 상태 참조
  const curLocalStarters = halfTab === 'first' ? localStarters  : localStarters2
  const curLocalSubs     = halfTab === 'first' ? localSubs      : localSubs2
  const curStarters      = halfTab === 'first' ? startersFirst  : startersSecond
  const curSubs          = halfTab === 'first' ? subsFirst      : subsSecond
  const setCurStarters   = halfTab === 'first' ? setLocalStarters  : setLocalStarters2
  const setCurSubs       = halfTab === 'first' ? setLocalSubs      : setLocalSubs2

  const cycle = (userId: string) => {
    if (curLocalStarters.includes(userId)) {
      setCurStarters(s => s.filter(id => id !== userId))
      setCurSubs(s => [...s, userId])
    } else if (curLocalSubs.includes(userId)) {
      setCurSubs(s => s.filter(id => id !== userId))
    } else {
      if (curLocalStarters.length < 11) {
        setCurStarters(s => [...s, userId])
      } else {
        setCurSubs(s => [...s, userId])
      }
    }
  }

  // 전반 라인업을 후반에 복사
  const copyFirstToSecond = () => {
    setLocalStarters2([...localStarters])
    setLocalSubs2([...localSubs])
  }

  const save = async () => {
    setSaving(true)
    try {
      if (halfTab === 'first') {
        const lineup: Lineup = { starters: localStarters, subs: localSubs }
        await manageFetch(`/schedule/matches/${m.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ lineup }),
        })
      } else {
        const lineupSecond: Lineup = { starters: localStarters2, subs: localSubs2 }
        await manageFetch(`/schedule/matches/${m.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ lineupSecond }),
        })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const starterCount = isLeader ? curLocalStarters.length : curStarters.length
  const hasAnyLineup = startersFirst.length > 0 || startersSecond.length > 0
  const hasSecond    = startersSecond.length > 0

  return (
    <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-xs font-semibold py-0.5"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="flex items-center gap-2">
          <span>라인업</span>
          {hasAnyLineup && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
              전반 {startersFirst.length}명{hasSecond ? ` · 후반 ${startersSecond.length}명` : ''}
            </span>
          )}
        </span>
        <svg className={`h-4 w-4 transition-transform ${showLineup ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {showLineup && (
        <div className="mt-3 space-y-3">
          {/* 전반 / 후반 탭 */}
          <div className="flex rounded-xl overflow-hidden border text-xs font-semibold"
            style={{ borderColor: 'var(--card-border)' }}>
            {(['first', 'second'] as HalfTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setHalfTab(tab)}
                className="flex-1 py-1.5 transition-colors"
                style={{
                  background: halfTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: halfTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {tab === 'first' ? '전반 (1H)' : '후반 (2H)'}
                {tab === 'second' && hasSecond && (
                  <span className="ml-1 text-[10px]" style={{ color: '#4ade80' }}>●</span>
                )}
              </button>
            ))}
          </div>

          {/* 후반 탭: 전반에서 복사 버튼 */}
          {halfTab === 'second' && isLeader && localStarters2.length === 0 && localStarters.length > 0 && (
            <button
              onClick={copyFirstToSecond}
              className="w-full rounded-xl py-1.5 text-xs font-semibold border"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              전반 라인업 복사해서 시작
            </button>
          )}

          {isLeader && (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              선수를 탭해 선발(●) / 교체(△) / 미선발로 순환 · 선발 최대 11명
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {members.map(mem => {
              const inStarters = isLeader ? curLocalStarters.includes(mem.userId) : curStarters.includes(mem.userId)
              const inSubs     = isLeader ? curLocalSubs.includes(mem.userId)     : curSubs.includes(mem.userId)
              const state = inStarters ? 'starter' : inSubs ? 'sub' : 'out'
              return (
                <button
                  key={mem.userId}
                  onClick={isLeader ? () => cycle(mem.userId) : undefined}
                  disabled={!isLeader}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${isLeader ? 'hover:bg-[var(--hover-overlay)] active:scale-[0.98]' : ''}`}
                  style={{
                    background: state === 'starter' ? 'rgba(74,222,128,0.15)' :
                                state === 'sub'     ? 'rgba(96,165,250,0.12)' : 'var(--sidebar-bg)',
                    color: state === 'starter' ? '#4ade80' :
                           state === 'sub'     ? '#60a5fa' : 'var(--text-muted)',
                    border: `1px solid ${
                      state === 'starter' ? 'rgba(74,222,128,0.3)' :
                      state === 'sub'     ? 'rgba(96,165,250,0.25)' : 'var(--card-border)'
                    }`,
                  }}>
                  {state === 'starter' ? '● ' : state === 'sub' ? '△ ' : ''}{memberLabel(mem)}
                </button>
              )
            })}
          </div>

          {/* 범례 + 저장 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span><span style={{ color: '#4ade80' }}>●</span> 선발 {starterCount}/11</span>
              <span><span style={{ color: '#60a5fa' }}>△</span> 교체</span>
            </div>
            {isLeader && (
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
                style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}
              >
                {saving ? '저장 중...' : `${halfTab === 'first' ? '전반' : '후반'} 저장`}
              </button>
            )}
          </div>

          {/* M2-B: 2D 포메이션 보드 (현재 탭 기준 선발진) */}
          {(isLeader ? curLocalStarters : curStarters).length > 0 && (
            <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
              <button
                onClick={() => setShowFormation(v => !v)}
                className="flex w-full items-center justify-between text-xs font-semibold py-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="flex items-center gap-2">
                  <span>포메이션 보드</span>
                  {!showFormation && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
                      {formation}
                    </span>
                  )}
                </span>
                <svg className={`h-4 w-4 transition-transform ${showFormation ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {showFormation && (
                <FormationBoard
                  starters={isLeader ? curLocalStarters : curStarters}
                  members={members}
                  formation={formation}
                  onFormationChange={setFormation}
                  onStartersChange={isLeader ? setCurStarters : undefined}
                  isLeader={isLeader}
                />
              )}
            </div>
          )}

          {/* M2-B: PK 순서 */}
          {startersFirst.length > 0 && (
            <PKOrderSection match={m} members={members} isLeader={isLeader} onSaved={onSaved} />
          )}
        </div>
      )}
    </div>
  )
}

// ── M2-B: PK 순서 관리 ───────────────────────────────────────────────────────

function PKOrderSection({ match: m, members, isLeader, onSaved }: {
  match: Match; members: TeamMember[]; isLeader: boolean; onSaved: () => void
}) {
  const starters = m.lineup?.starters ?? []
  const [order, setOrder] = useState<string[]>(m.pkOrder ?? starters)
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  if (starters.length === 0) return null

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...order]
    const to = idx + dir
    if (to < 0 || to >= next.length) return
    ;[next[idx], next[to]] = [next[to], next[idx]]
    setOrder(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      await manageFetch(`/schedule/matches/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ pkOrder: order }),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const hasOrder = m.pkOrder && m.pkOrder.length > 0

  return (
    <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
      <button
        onClick={() => setShow(v => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold py-0.5"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="flex items-center gap-2">
          <span>PK 순서</span>
          {hasOrder && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>
              {m.pkOrder!.length}명 설정
            </span>
          )}
        </span>
        <svg className={`h-4 w-4 transition-transform ${show ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {show && (
        <div className="mt-3 space-y-2">
          {isLeader && (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              KJA 규칙: 후반 종료 시점 출전 선수로만 PK 참여 · ↑↓로 순서 조정
            </p>
          )}
          <div className="space-y-1">
            {order.map((userId, idx) => {
              const mem = members.find(mem2 => mem2.userId === userId)
              return (
                <div key={userId}
                  className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                  style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }}>
                  <span className="text-xs font-black tabular-nums w-4 shrink-0" style={{ color: '#60a5fa' }}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {mem ? memberLabel(mem) : userId.slice(0, 8)}
                  </span>
                  {isLeader && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        className="h-6 w-6 rounded-lg flex items-center justify-center text-xs disabled:opacity-30 hover:opacity-70"
                        style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>↑</button>
                      <button
                        onClick={() => move(idx, 1)}
                        disabled={idx === order.length - 1}
                        className="h-6 w-6 rounded-lg flex items-center justify-center text-xs disabled:opacity-30 hover:opacity-70"
                        style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>↓</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {isLeader && (
            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-xl py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: '#3b82f6' }}>
              {saving ? '저장 중...' : 'PK 순서 저장'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── M2-C: 경고/퇴장 기록 모달 ────────────────────────────────────────────────

function CardModal({ match: m, members, attendances, onClose, onSuccess }: {
  match: Match; members: TeamMember[]; attendances: Attendance[]; onClose: () => void; onSuccess: () => void
}) {
  const [player, setPlayer] = useState<string | null>(null)
  const [cardType, setCardType] = useState<'yellow' | 'red'>('yellow')
  const [minute, setMinute] = useState('')
  const [loading, setLoading] = useState(false)

  const attending = attendances.filter(a => a.status === 'attending').map(a => a.userId)
  const selectable = attending.length > 0
    ? members.filter(mem => attending.includes(mem.userId))
    : members

  const submit = async () => {
    if (!player) return
    setLoading(true)
    try {
      const newCard: CardRecord = {
        playerId: player,
        type: cardType,
        ...(minute ? { minute: parseInt(minute, 10) } : {}),
      }
      const updatedCards = [...(m.cards ?? []), newCard]
      await manageFetch(`/schedule/matches/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ cards: updatedCards }),
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border shadow-2xl"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>경고/퇴장 기록</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-5 space-y-4">
          {/* 카드 종류 */}
          <div>
            <label className={lbl} style={{ color: 'var(--text-muted)' }}>카드 종류</label>
            <div className="flex gap-2">
              {(['yellow', 'red'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setCardType(t)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all"
                  style={{
                    background: cardType === t
                      ? (t === 'yellow' ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)')
                      : 'var(--sidebar-bg)',
                    color: cardType === t
                      ? (t === 'yellow' ? '#fbbf24' : '#f87171')
                      : 'var(--text-muted)',
                    border: `1px solid ${cardType === t
                      ? (t === 'yellow' ? 'rgba(251,191,36,0.4)' : 'rgba(248,113,113,0.4)')
                      : 'var(--card-border)'}`,
                  }}>
                  {t === 'yellow' ? '경고' : '퇴장'}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 */}
          <div>
            <label className={lbl} style={{ color: 'var(--text-muted)' }}>시간 (선택)</label>
            <input
              type="number" min="1" max="120" value={minute}
              onChange={e => setMinute(e.target.value)}
              placeholder="예: 35"
              className={inp}
              style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* 선수 */}
          <div>
            <label className={lbl} style={{ color: 'var(--text-muted)' }}>선수</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {selectable.map(mem => (
                <button key={mem.userId}
                  onClick={() => setPlayer(mem.userId === player ? null : mem.userId)}
                  className="w-full rounded-xl px-3 py-2 text-sm text-left font-medium transition-all"
                  style={{
                    background: player === mem.userId
                      ? (cardType === 'yellow' ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)')
                      : 'var(--sidebar-bg)',
                    color: player === mem.userId
                      ? (cardType === 'yellow' ? '#fbbf24' : '#f87171')
                      : 'var(--text-secondary)',
                    border: `1px solid ${player === mem.userId
                      ? (cardType === 'yellow' ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)')
                      : 'var(--card-border)'}`,
                  }}>
                  {player === mem.userId ? '* ' : ''}{memberLabel(mem)}
                  {mem.role === 'leader' && <span className="ml-1 text-[10px] opacity-50">주장</span>}
                </button>
              ))}
            </div>
          </div>

          <button onClick={submit} disabled={!player || loading}
            className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{
              background: cardType === 'yellow'
                ? '#f59e0b'
                : '#ef4444',
            }}>
            {loading ? '저장 중...' : cardType === 'yellow' ? '경고 기록하기' : '퇴장 기록하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── M2-C: 경고 누적 트래커 섹션 ──────────────────────────────────────────────

function CardTrackerSection({ matches, members, isLeader, onRefresh }: {
  matches: Match[]; members: TeamMember[]; isLeader: boolean; onRefresh: () => void
}) {
  const { user } = useAuth()
  const [resetting, setResetting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // 최신 경고 초기화 이벤트 탐색
  const latestReset = matches
    .filter(m => m.cardReset)
    .sort((a, b) => new Date(b.cardReset!.at).getTime() - new Date(a.cardReset!.at).getTime())[0]?.cardReset

  // 초기화 이후 경기만 집계
  const relevant = matches.filter(m => {
    if (m.status !== 'accepted' && m.status !== 'completed') return false
    if (latestReset && new Date(m.scheduledAt) <= new Date(latestReset.at)) return false
    return true
  })

  type CardStat = { yellows: number; reds: number }
  const cardMap: Record<string, CardStat> = {}
  for (const m of relevant) {
    for (const c of m.cards ?? []) {
      const entry = cardMap[c.playerId] ?? { yellows: 0, reds: 0 }
      if (c.type === 'yellow') entry.yellows++
      else entry.reds++
      cardMap[c.playerId] = entry
    }
  }

  const players = Object.entries(cardMap)
    .filter(([, v]) => v.yellows > 0 || v.reds > 0)
    .sort((a, b) => (b[1].yellows + b[1].reds * 3) - (a[1].yellows + a[1].reds * 3))

  const doReset = async () => {
    const latestCompleted = matches
      .filter(m => m.status === 'completed' && m.matchType !== 'training' && m.awayTeamId !== 'training')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0]
    if (!latestCompleted) return
    setResetting(true)
    try {
      await manageFetch(`/schedule/matches/${latestCompleted.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ cardReset: { at: new Date().toISOString(), by: user?.userId ?? 'leader' } }),
      })
      onRefresh()
    } finally {
      setResetting(false)
      setShowConfirm(false)
    }
  }

  if (players.length === 0 && !latestReset) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          경고 현황
        </h2>
        {isLeader && players.length > 0 && !showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-[10px] font-semibold rounded-lg px-2.5 py-1 transition-opacity hover:opacity-70"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
          >
            🔄 KJA 4강 초기화
          </button>
        )}
      </div>

      {/* 초기화 확인 패널 */}
      {showConfirm && (
        <div className="rounded-xl px-3 py-2.5 mb-3 space-y-2"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>KJA 4강 경고 초기화</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            8강까지 경고 1장 보유 선수의 카드가 초기화됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 rounded-lg py-1.5 text-xs font-semibold"
              style={{ background: 'var(--sidebar-bg)', color: 'var(--text-muted)' }}>취소</button>
            <button
              onClick={doReset}
              disabled={resetting}
              className="flex-1 rounded-lg py-1.5 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: '#f59e0b' }}>
              {resetting ? '처리 중...' : '초기화 확인'}
            </button>
          </div>
        </div>
      )}

      {/* 초기화 적용됨 배지 */}
      {latestReset && (
        <div className="mb-2 flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
            ✓ 경고 초기화됨
          </span>
          {new Date(latestReset.at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 이후 기록 표시 중
        </div>
      )}

      {players.length === 0 ? (
        <div className="rounded-2xl border px-4 py-6 text-center text-xs"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
          초기화 이후 경고 기록이 없습니다
        </div>
      ) : (
        <div className="rounded-2xl border p-4 space-y-2.5"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          {players.map(([userId, stat]) => {
            const mem = members.find(m => m.userId === userId)
            const suspendedMatches = Math.floor(stat.yellows / 2) + stat.reds * 2
            const isSuspended = suspendedMatches > 0
            const nearSuspension = stat.yellows % 2 === 1 && stat.yellows >= 1

            return (
              <div key={userId} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>
                      {mem ? memberLabel(mem) : userId.slice(0, 8) + '…'}
                    </span>
                    {isSuspended && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        출전정지 {suspendedMatches}경기
                      </span>
                    )}
                    {!isSuspended && nearSuspension && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        경고 주의
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {stat.yellows > 0 && (
                    <span className="text-xs font-bold tabular-nums" style={{ color: '#fbbf24' }}>
                      Y {stat.yellows}
                    </span>
                  )}
                  {stat.reds > 0 && (
                    <span className="text-xs font-bold tabular-nums" style={{ color: '#f87171' }}>
                      R {stat.reds}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          <p className="text-[10px] pt-2 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}>
            경고 2장 = 1경기 출전정지 · 레드카드 = 2경기 정지 (KJA 규칙)
          </p>
        </div>
      )}
    </div>
  )
}

// ── M3-E: 최근 경기 결과 + 스코어 이의 신청 ──────────────────────────────────

function RecentResultsSection({ matches, teamId, isLeader, onRefresh }: {
  matches: Match[]; teamId: string; isLeader: boolean; onRefresh: () => void
}) {
  const [disputingId, setDisputingId] = useState<string | null>(null)
  const [disputeNote, setDisputeNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [sharedId, setSharedId] = useState<string | null>(null)

  const completed = [...matches.filter(m =>
    m.status === 'completed' && m.matchType !== 'training' && m.awayTeamId !== 'training'
  )].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 5)

  if (completed.length === 0) return null

  const submitDispute = async (m: Match) => {
    if (!disputeNote.trim()) return
    setSaving(true)
    try {
      await manageFetch(`/schedule/matches/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ note: `DISPUTE: ${disputeNote.trim()} (${new Date().toLocaleDateString('ko-KR')})` }),
      })
      onRefresh()
      setDisputingId(null)
      setDisputeNote('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        최근 경기 결과
      </h2>
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        {completed.map((m, i) => {
          const isHome   = m.homeTeamId === teamId
          const our      = isHome ? m.homeScore : m.awayScore
          const their    = isHome ? m.awayScore : m.homeScore
          const isWin    = our != null && their != null && our > their
          const isDraw   = our != null && their != null && our === their
          const hasScore = our != null && their != null
          const isDisputed = m.note?.startsWith('DISPUTE:')
          const canDispute = isLeader && m.awayTeamId === teamId && hasScore && !isDisputed

          return (
            <div key={m.id}>
              <div className={`flex items-center gap-3 px-4 py-3 ${i < completed.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: 'var(--card-border)' }}>
                {/* 결과 배지 */}
                {hasScore ? (
                  <span className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: isWin ? 'rgba(74,222,128,0.15)' : isDraw ? 'rgba(148,163,184,0.15)' : 'rgba(248,113,113,0.15)',
                      color: isWin ? '#4ade80' : isDraw ? '#94a3b8' : '#f87171',
                    }}>
                    {isWin ? 'W' : isDraw ? 'D' : 'L'}
                  </span>
                ) : (
                  <span className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                    style={{ background: 'var(--sidebar-bg)', color: 'var(--text-muted)' }}>–</span>
                )}

                {/* 경기 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {m.venue}
                    {isDisputed && (
                      <span className="ml-1.5 text-[9px] font-bold" style={{ color: '#f59e0b' }}>이의신청</span>
                    )}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(m.scheduledAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </p>
                </div>

                {/* 스코어 */}
                {hasScore && (
                  <div className="shrink-0 text-sm font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    <span style={{ color: isWin ? '#4ade80' : isDraw ? 'var(--text-secondary)' : '#f87171' }}>{our}</span>
                    <span style={{ color: 'var(--text-muted)' }}> : </span>
                    <span>{their}</span>
                  </div>
                )}

                {/* 결과 공유 버튼 */}
                {hasScore && (
                  <button
                    onClick={async () => {
                      const dateStr = new Date(m.scheduledAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
                      const resultLabel = isWin ? '승' : isDraw ? '무승부' : '패'
                      const goals = (m.goals ?? [])
                        .map(g => {
                          const sc = members.find(mb => mb.userId === g.scorer)
                          return sc ? `${memberLabel(sc)} 1골` : null
                        })
                        .filter(Boolean)
                      const lines = [
                        `경기 결과 — ${m.venue}`,
                        `${dateStr} · ${resultLabel}`,
                        `${our} : ${their}`,
                        goals.length > 0 ? `득점: ${goals.join(', ')}` : '',
                        '',
                        `Playground — fun.sedaily.ai`,
                      ].filter(Boolean)
                      const text = lines.join('\n')
                      try {
                        if (navigator.share) await navigator.share({ title: '경기 결과', text })
                        else {
                          await navigator.clipboard.writeText(text)
                          setSharedId(m.id)
                          setTimeout(() => setSharedId(null), 2000)
                        }
                      } catch {}
                    }}
                    className="shrink-0 text-[10px] font-semibold rounded-lg px-2 py-1 transition-opacity hover:opacity-70"
                    style={{
                      background: sharedId === m.id ? 'rgba(74,222,128,0.1)' : 'rgba(148,163,184,0.06)',
                      color: sharedId === m.id ? '#4ade80' : 'var(--text-muted)',
                      border: `1px solid ${sharedId === m.id ? 'rgba(74,222,128,0.3)' : 'var(--card-border)'}`,
                    }}>
                    {sharedId === m.id ? '✓' : '공유'}
                  </button>
                )}

                {/* 이의 신청 버튼 (원정팀 리더만) */}
                {canDispute && (
                  <button
                    onClick={() => { setDisputingId(m.id); setDisputeNote('') }}
                    className="shrink-0 text-[10px] font-semibold rounded-lg px-2 py-1 transition-opacity hover:opacity-70"
                    style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                    이의
                  </button>
                )}
              </div>

              {/* 이의 신청 입력 패널 */}
              {disputingId === m.id && (
                <div className="px-4 pb-3 space-y-2 border-t"
                  style={{ borderColor: 'var(--card-border)', background: 'rgba(245,158,11,0.04)' }}>
                  <p className="text-xs font-semibold pt-2.5" style={{ color: '#f59e0b' }}>스코어 이의 신청</p>
                  <input
                    value={disputeNote}
                    onChange={e => setDisputeNote(e.target.value)}
                    placeholder="예: 실제 스코어는 2:1 이었습니다"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDisputingId(null)}
                      className="flex-1 rounded-xl py-2 text-xs font-semibold"
                      style={{ background: 'var(--sidebar-bg)', color: 'var(--text-muted)' }}>취소</button>
                    <button
                      onClick={() => submitDispute(m)}
                      disabled={saving || !disputeNote.trim()}
                      className="flex-1 rounded-xl py-2 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#f59e0b' }}>
                      {saving ? '제출 중…' : '제출'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── M3-A + M3-B + M3-D: 팀 통계 섹션 ────────────────────────────────────────

type TierDef = { name: string; min: number; color: string; minWins: number; minGames?: number }

const COMPETITIVE_TIERS: readonly TierDef[] = [
  { name: 'Legend', min: 2001, color: '#fbbf24', minWins: 50 },
  { name: 'Elite',  min: 801,  color: '#a78bfa', minWins: 20 },
  { name: 'Crew',   min: 251,  color: '#60a5fa', minWins: 10 },
  { name: 'Club',   min: 51,   color: '#4ade80', minWins: 5  },
  { name: 'Rookie', min: 0,    color: '#94a3b8', minWins: 0  },
]

const BASKETBALL_TIERS: readonly TierDef[] = [
  { name: 'Legend', min: 1501, color: '#fbbf24', minWins: 40 },
  { name: 'Elite',  min: 601,  color: '#a78bfa', minWins: 15 },
  { name: 'Crew',   min: 201,  color: '#60a5fa', minWins: 8  },
  { name: 'Club',   min: 41,   color: '#4ade80', minWins: 4  },
  { name: 'Rookie', min: 0,    color: '#94a3b8', minWins: 0  },
]

// M3-D: 동아리형 — 활동 횟수 기반 승급 (minWins=0, minGames 사용)
const CLUB_TIERS: readonly TierDef[] = [
  { name: '마스터', min: 301, color: '#fbbf24', minWins: 0, minGames: 100 },
  { name: '전문가', min: 181, color: '#a78bfa', minWins: 0, minGames: 60  },
  { name: '마니아', min: 91,  color: '#60a5fa', minWins: 0, minGames: 30  },
  { name: '동호인', min: 31,  color: '#4ade80', minWins: 0, minGames: 10  },
  { name: '새내기', min: 0,   color: '#94a3b8', minWins: 0, minGames: 0   },
]

const SPORT_CATEGORY: Record<string, 'competitive' | 'club'> = {
  soccer: 'competitive', futsal: 'competitive',
  basketball: 'competitive', baseball: 'competitive', volleyball: 'competitive', ice_hockey: 'competitive',
  running: 'club', snowboard: 'club', badminton: 'club',
}

function getTeamTiers(sportType?: string): readonly TierDef[] {
  if (!sportType) return COMPETITIVE_TIERS
  if (SPORT_CATEGORY[sportType] === 'club') return CLUB_TIERS
  if (sportType === 'basketball') return BASKETBALL_TIERS
  return COMPETITIVE_TIERS
}

// M3-D: 종목별 PIS 축 레이블
const SPORT_PIS_LABELS: Record<string, [string, string, string, string, string]> = {
  baseball:  ['안타/득점', 'RBI',    '공격P', '규율', '활약도'],
  running:   ['기록',      '참가',   '활동P', '규율', '활약도'],
  snowboard: ['기록',      '참가',   '활동P', '규율', '활약도'],
  badminton: ['득점',      '서브',   '공격P', '규율', '활약도'],
  volleyball:['득점',      '세터',   '공격P', '규율', '활약도'],
}

function getPisLabels(sportType?: string): [string, string, string, string, string] {
  return SPORT_PIS_LABELS[sportType ?? ''] ?? ['득점', '어시스트', '공격P', '규율', '활약도']
}

type SeasonFilter = 'all' | '6m' | '3m'

function TeamStatsSection({ matches, members, teamId, polls = [], sportType }: {
  matches: Match[]; members: TeamMember[]; teamId: string; polls?: Poll[]; sportType?: string
}) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>('all')
  const [potmWins, setPotmWins] = useState<Record<string, number>>({})
  const [attendanceMap, setAttendanceMap] = useState<Record<string, number> | null>(null)
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [statsCopied, setStatsCopied] = useState(false)
  // M3-B: 토너먼트 전적
  type TournamentStat = { league: League; w: number; d: number; l: number; total: number }
  const [tournamentStats, setTournamentStats] = useState<TournamentStat[]>([])

  // 시즌 필터 변경 시 출석 데이터 초기화
  useEffect(() => { setAttendanceMap(null) }, [seasonFilter])

  // M3-A: POTM 횟수 집계 — POTM 접두사 poll 투표 집계
  useEffect(() => {
    const potmPolls = polls.filter(p => p.question.startsWith('POTM'))
    if (potmPolls.length === 0) { setPotmWins({}); return }
    Promise.all(
      potmPolls.map(p =>
        manageFetch(`/schedule/polls/${p.id}/votes`)
          .then((votes: { optionIndex: number; userId: string }[]) => {
            if (votes.length === 0) return null
            const counts: Record<number, number> = {}
            votes.forEach(v => { counts[v.optionIndex] = (counts[v.optionIndex] ?? 0) + 1 })
            const topIdx = parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
            return p.options[topIdx] ?? null
          })
          .catch(() => null)
      )
    ).then(winners => {
      const winsMap: Record<string, number> = {}
      winners.forEach(uid => { if (uid) winsMap[uid] = (winsMap[uid] ?? 0) + 1 })
      setPotmWins(winsMap)
    })
  }, [polls.length, teamId])

  // M3-B: 토너먼트 전적 — 이 팀이 주최한 토너먼트 경기 결과 집계
  useEffect(() => {
    if (!teamId) return
    const fetchTournamentStats = async () => {
      try {
        const leagues: League[] = await manageFetch(`/league?organizerTeamId=${teamId}`)
        const tournamentLeagues = leagues.filter(l => l.type === 'tournament')
        if (tournamentLeagues.length === 0) { setTournamentStats([]); return }
        const stats = await Promise.all(
          tournamentLeagues.map(async (league) => {
            const lMatches: LeagueMatch[] = await manageFetch(`/league/${league.id}/matches`).catch(() => [])
            let w = 0, d = 0, l = 0
            lMatches.forEach(m => {
              if (m.status !== 'completed' || m.homeScore == null || m.awayScore == null) return
              const isHome = m.homeTeamId === teamId
              const our = isHome ? m.homeScore : m.awayScore
              const their = isHome ? m.awayScore : m.homeScore
              if (our > their) w++
              else if (our === their) d++
              else l++
            })
            return { league, w, d, l, total: w + d + l }
          })
        )
        setTournamentStats(stats.filter(s => s.total > 0))
      } catch {}
    }
    fetchTournamentStats()
  }, [teamId])

  const seasonCutoff = seasonFilter === 'all' ? null
    : seasonFilter === '6m' ? new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const completed = [...matches.filter(m =>
    m.status === 'completed' &&
    m.matchType !== 'training' && m.awayTeamId !== 'training' &&
    (seasonCutoff === null || new Date(m.scheduledAt) >= seasonCutoff)
  )].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  // 팀 전적 + 포인트 계산 (scoring.mjs 룰 동일 적용)
  let wins = 0, draws = 0, losses = 0, teamPoints = 0, curStreak = 0, maxStreak = 0
  let homeWins = 0, homeDraws = 0, homeLosses = 0
  let awayWins = 0, awayDraws = 0, awayLosses = 0
  let totalGoalsFor = 0, totalGoalsAgainst = 0
  const opponentRecord: Record<string, { wins: number; draws: number; losses: number }> = {}
  for (const m of completed) {
    if (m.homeScore == null || m.awayScore == null) continue
    const isHome = m.homeTeamId === teamId
    const our   = isHome ? m.homeScore : m.awayScore
    const their = isHome ? m.awayScore : m.homeScore
    totalGoalsFor += our
    totalGoalsAgainst += their
    const streakBonus = our > their && curStreak >= 1 ? curStreak : 0
    teamPoints += 3 + (our > their ? 4 : our === their ? 1 : 0) + streakBonus
    const oppId = isHome ? m.awayTeamId : m.homeTeamId
    opponentRecord[oppId] = opponentRecord[oppId] ?? { wins: 0, draws: 0, losses: 0 }
    if (our > their) {
      wins++;   curStreak++
      if (isHome) homeWins++;   else awayWins++
      opponentRecord[oppId].wins++
    } else if (our === their) {
      draws++;  curStreak = 0
      if (isHome) homeDraws++;  else awayDraws++
      opponentRecord[oppId].draws++
    } else {
      losses++; curStreak = 0
      if (isHome) homeLosses++; else awayLosses++
      opponentRecord[oppId].losses++
    }
    maxStreak = Math.max(maxStreak, curStreak)
  }
  const scoredMatches = completed.filter(m => m.homeScore != null && m.awayScore != null).length
  const avgGoalsFor     = scoredMatches > 0 ? (totalGoalsFor / scoredMatches).toFixed(1) : null
  const avgGoalsAgainst = scoredMatches > 0 ? (totalGoalsAgainst / scoredMatches).toFixed(1) : null
  const homeGames = homeWins + homeDraws + homeLosses
  const awayGames = awayWins + awayDraws + awayLosses

  // 팀 등급 (M3-D: 종목별 티어 사용)
  const TEAM_TIERS = getTeamTiers(sportType)
  const isClubSport = sportType ? SPORT_CATEGORY[sportType] === 'club' : false
  const tierMetric  = isClubSport ? completed.length : teamPoints  // 동아리형: 총 경기수 기준
  const tierIdx    = TEAM_TIERS.findIndex(t => tierMetric >= t.min)
  const tier       = TEAM_TIERS[tierIdx === -1 ? TEAM_TIERS.length - 1 : tierIdx]
  const nextTier   = tierIdx > 0 ? TEAM_TIERS[tierIdx - 1] : null
  const tierPct    = nextTier
    ? Math.min(100, Math.round(((tierMetric - tier.min) / (nextTier.min - tier.min)) * 100))
    : 100

  // 선수별 기록 집계 (시즌 필터 적용 — goals + cards)
  type PStat = { goals: number; assists: number; yellows: number; reds: number }
  const pMap: Record<string, PStat> = {}
  for (const m of completed) {
    for (const g of m.goals ?? []) {
      pMap[g.scorer] = pMap[g.scorer] ?? { goals: 0, assists: 0, yellows: 0, reds: 0 }
      pMap[g.scorer].goals++
      if (g.assist) {
        pMap[g.assist] = pMap[g.assist] ?? { goals: 0, assists: 0, yellows: 0, reds: 0 }
        pMap[g.assist].assists++
      }
    }
    for (const c of m.cards ?? []) {
      pMap[c.playerId] = pMap[c.playerId] ?? { goals: 0, assists: 0, yellows: 0, reds: 0 }
      if (c.type === 'yellow') pMap[c.playerId].yellows++
      else                     pMap[c.playerId].reds++
    }
  }
  const activePlayers = Object.entries(pMap)
    .filter(([, s]) => s.goals + s.assists + s.yellows + s.reds > 0)
    .sort((a, b) => (b[1].goals + b[1].assists) - (a[1].goals + a[1].assists))

  // PIS 정규화 기준 (팀 내 최대값 대비 %)
  const pisMaxGoals   = Math.max(...activePlayers.map(([, s]) => s.goals), 1)
  const pisMaxAssists = Math.max(...activePlayers.map(([, s]) => s.assists), 1)
  const pisMaxGA      = Math.max(...activePlayers.map(([, s]) => s.goals + s.assists), 1)

  // 활약도: 완료 경기 중 기록(골/어시/카드)이 있는 경기 수
  const involvementMap: Record<string, number> = {}
  for (const m of completed) {
    const involved = new Set<string>()
    m.goals?.forEach(g => { involved.add(g.scorer); if (g.assist) involved.add(g.assist) })
    m.cards?.forEach(c => involved.add(c.playerId))
    involved.forEach(uid => { involvementMap[uid] = (involvementMap[uid] ?? 0) + 1 })
  }
  const maxInvolvement = Math.max(...Object.values(involvementMap), 1)

  const hasStats = completed.length > 0

  // 팀 통계 공유 텍스트 생성
  const shareTeamStats = async () => {
    const filterLabel = seasonFilter === 'all' ? '전체' : seasonFilter === '6m' ? '최근 6개월' : '최근 3개월'
    const topScorer = activePlayers[0]
    const topMem = topScorer ? members.find(m => m.userId === topScorer[0]) : null
    const lines = [
      `팀 통계 요약 (${filterLabel})`,
      `${completed.length}경기 · ${wins}승 ${draws}무 ${losses}패 · 승률 ${hasStats ? Math.round((wins / completed.length) * 100) : 0}%`,
      avgGoalsFor ? `평균 득점 ${avgGoalsFor}골 · 최장 연승 ${maxStreak}연승` : '',
      tier ? `현재 등급: ${tier.name} (${teamPoints}pt)` : '',
      topScorer ? `득점왕: ${topMem ? memberLabel(topMem) : topScorer[0].slice(0,6)} ${topScorer[1].goals}골` : '',
      '',
      `Playground — fun.sedaily.ai`,
    ].filter(Boolean)
    const text = lines.join('\n')
    try {
      if (navigator.share) await navigator.share({ title: '팀 통계', text })
      else {
        await navigator.clipboard.writeText(text)
        setStatsCopied(true)
        setTimeout(() => setStatsCopied(false), 2000)
      }
    } catch {}
  }

  // M3-A: 출석왕 — 완료 경기 attendance 병렬 로드 (사용자 트리거)
  const loadAttendanceStats = async () => {
    if (completed.length === 0) return
    setLoadingAttendance(true)
    try {
      const allAttendances = await Promise.all(
        completed.map(m =>
          manageFetch(`/schedule/matches/${m.id}/attendance`)
            .then((a: { userId: string; status: string }[]) =>
              a.filter(x => x.status === 'attending')
            )
            .catch(() => [])
        )
      )
      const countMap: Record<string, number> = {}
      allAttendances.flat().forEach(a => {
        countMap[a.userId] = (countMap[a.userId] ?? 0) + 1
      })
      setAttendanceMap(countMap)
    } finally {
      setLoadingAttendance(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          팀 통계
        </h2>
        <div className="flex items-center gap-1">
          {(['all', '6m', '3m'] as SeasonFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setSeasonFilter(f)}
              className="text-[10px] font-semibold rounded-lg px-2 py-0.5 transition-all"
              style={{
                background: seasonFilter === f ? 'var(--text-primary)' : 'transparent',
                color: seasonFilter === f ? 'var(--page-bg)' : 'var(--text-muted)',
                border: `1px solid ${seasonFilter === f ? 'var(--text-primary)' : 'var(--card-border)'}`,
              }}>
              {f === 'all' ? '전체' : f === '6m' ? '6개월' : '3개월'}
            </button>
          ))}
          {hasStats && (
            <button
              onClick={shareTeamStats}
              className="text-[10px] font-semibold rounded-lg px-2 py-0.5 transition-all ml-1"
              style={{
                background: statsCopied ? 'rgba(74,222,128,0.12)' : 'transparent',
                color: statsCopied ? '#4ade80' : 'var(--text-muted)',
                border: `1px solid ${statsCopied ? 'rgba(74,222,128,0.3)' : 'var(--card-border)'}`,
              }}>
              {statsCopied ? '✓' : '공유'}
            </button>
          )}
        </div>
      </div>
      <div className="rounded-2xl border p-4 space-y-4"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

        {/* M3-B: 팀 등급 진행 바 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black" style={{ color: tier.color }}>{tier.name}</span>
              <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {isClubSport ? `${completed.length}회 활동` : `${teamPoints} pt`}
              </span>
              {!isClubSport && curStreak >= 2 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  {curStreak}연승
                </span>
              )}
            </div>
            {nextTier && (
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {isClubSport
                  ? `→ ${nextTier.name} (${(nextTier.minGames ?? 0) - completed.length}회)`
                  : `→ ${nextTier.name} (${nextTier.min - teamPoints}pt)`
                }
              </span>
            )}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${tierPct}%`, background: tier.color }} />
          </div>
          {/* 승급 조건 체크리스트 (M3-D: 동아리형은 활동 횟수 조건) */}
          {nextTier && (() => {
            const metricOk = tierMetric >= nextTier.min
            const winOk    = isClubSport
              ? completed.length >= (nextTier.minGames ?? 0)
              : wins >= nextTier.minWins
            const allOk  = metricOk && winOk
            return (
              <div className="mt-2 rounded-xl px-3 py-2 space-y-1"
                style={{ background: allOk ? 'rgba(74,222,128,0.08)' : 'var(--sidebar-bg)', border: `1px solid ${allOk ? 'rgba(74,222,128,0.3)' : 'var(--card-border)'}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {nextTier.name} 승급 조건
                </p>
                {isClubSport ? (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span>{winOk ? '\u2713' : '\u2610'}</span>
                    <span style={{ color: winOk ? '#4ade80' : 'var(--text-secondary)' }}>
                      활동 횟수 {completed.length} / {nextTier.minGames ?? 0}회
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span>{metricOk ? '\u2713' : '\u2610'}</span>
                      <span style={{ color: metricOk ? '#4ade80' : 'var(--text-secondary)' }}>
                        포인트 {teamPoints} / {nextTier.min}pt
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span>{winOk ? '\u2713' : '\u2610'}</span>
                      <span style={{ color: winOk ? '#4ade80' : 'var(--text-secondary)' }}>
                        누적 승리 {wins} / {nextTier.minWins}승
                      </span>
                    </div>
                  </>
                )}
                {allOk && (
                  <p className="text-[11px] font-bold mt-1" style={{ color: '#4ade80' }}>
                    모든 조건 충족 — {nextTier.name} 승급 가능!
                  </p>
                )}
              </div>
            )
          })()}
        </div>

        {/* 전적 요약 */}
        <div className="flex items-center gap-4 pt-1 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <div className="text-center">
            <p className="text-2xl font-black tabular-nums" style={{ color: '#4ade80' }}>{wins}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>승</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black tabular-nums" style={{ color: 'var(--text-secondary)' }}>{draws}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>무</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black tabular-nums" style={{ color: '#f87171' }}>{losses}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>패</p>
          </div>
          <div className="flex-1" />
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {hasStats ? `승률 ${Math.round((wins / completed.length) * 100)}%` : '기록 없음'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {completed.length}경기 · 최대 {maxStreak}연승
            </p>
          </div>
        </div>

        {/* M3-B: 홈/원정 분리 + 평균 득실점 */}
        {hasStats && (
          <div className="grid grid-cols-2 gap-3 border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--sidebar-bg)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                홈 ({homeGames}경기)
              </p>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: '#4ade80' }}>{homeWins}</span>
                <span style={{ color: 'var(--text-muted)' }}> / </span>
                <span>{homeDraws}</span>
                <span style={{ color: 'var(--text-muted)' }}> / </span>
                <span style={{ color: '#f87171' }}>{homeLosses}</span>
              </p>
              {homeGames > 0 && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  승률 {Math.round((homeWins / homeGames) * 100)}%
                </p>
              )}
            </div>
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--sidebar-bg)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                원정 ({awayGames}경기)
              </p>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: '#4ade80' }}>{awayWins}</span>
                <span style={{ color: 'var(--text-muted)' }}> / </span>
                <span>{awayDraws}</span>
                <span style={{ color: 'var(--text-muted)' }}> / </span>
                <span style={{ color: '#f87171' }}>{awayLosses}</span>
              </p>
              {awayGames > 0 && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  승률 {Math.round((awayWins / awayGames) * 100)}%
                </p>
              )}
            </div>
            {avgGoalsFor && (
              <div className="col-span-2 flex items-center justify-center gap-6 rounded-xl px-3 py-2.5"
                style={{ background: 'var(--sidebar-bg)' }}>
                <div className="text-center">
                  <p className="text-base font-black tabular-nums" style={{ color: '#4ade80' }}>{avgGoalsFor}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>평균 득점</p>
                </div>
                <div className="h-6 w-px" style={{ background: 'var(--card-border)' }} />
                <div className="text-center">
                  <p className="text-base font-black tabular-nums" style={{ color: '#f87171' }}>{avgGoalsAgainst}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>평균 실점</p>
                </div>
                <div className="h-6 w-px" style={{ background: 'var(--card-border)' }} />
                <div className="text-center">
                  <p className="text-base font-black tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {maxStreak > 0 ? `${maxStreak}연승` : '–'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>최장 연승</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* M3-A: 선수 기록 테이블 (클릭 → 경기별 G/A 확장) */}
        {activePlayers.length > 0 && (
          <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              선수 기록
            </p>
            {/* 헤더 */}
            <div className="grid grid-cols-[1fr_28px_28px_28px_28px] gap-x-1 pb-1.5 mb-0.5 border-b text-center"
              style={{ borderColor: 'var(--card-border)' }}>
              <span className="text-[10px] font-semibold text-left" style={{ color: 'var(--text-muted)' }}>선수</span>
              <span className="text-[10px] font-bold" style={{ color: '#4ade80' }}>G</span>
              <span className="text-[10px] font-bold" style={{ color: '#60a5fa' }}>A</span>
              <span className="text-[10px] font-bold" style={{ color: '#fbbf24' }}>Y</span>
              <span className="text-[10px] font-bold" style={{ color: '#f87171' }}>R</span>
            </div>
            <div className="space-y-0">
              {activePlayers.map(([userId, s], rank) => {
                const mem = members.find(m => m.userId === userId)
                const isExpanded = expandedPlayer === userId
                const matchBreakdown = completed
                  .map(m => ({
                    matchId: m.id,
                    date: m.scheduledAt,
                    venue: m.venue,
                    goals: (m.goals ?? []).filter(g => g.scorer === userId).length,
                    assists: (m.goals ?? []).filter(g => g.assist === userId).length,
                  }))
                  .filter(mb => mb.goals + mb.assists > 0)
                return (
                  <div key={userId}>
                    <div
                      onClick={() => setExpandedPlayer(isExpanded ? null : userId)}
                      className="grid grid-cols-[1fr_28px_28px_28px_28px] gap-x-1 py-1.5 border-b text-center items-center cursor-pointer hover:opacity-75 transition-opacity"
                      style={{ borderColor: 'var(--card-border)' }}>
                      <div className="flex items-center gap-1 min-w-0 text-left">
                        {rank === 0 && <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>}
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                          {mem ? memberLabel(mem) : userId.slice(0, 8) + '…'}
                        </span>
                        {potmWins[userId] > 0 && (
                          <span className="shrink-0 text-[9px] font-bold" style={{ color: '#fbbf24' }}>
                            <Trophy size={10} className="inline" />{potmWins[userId]}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-[9px] pl-1" style={{ color: 'var(--text-muted)' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                      <span className="text-xs font-bold tabular-nums"
                        style={{ color: s.goals > 0 ? '#4ade80' : 'var(--text-muted)' }}>
                        {s.goals || '–'}
                      </span>
                      <span className="text-xs font-bold tabular-nums"
                        style={{ color: s.assists > 0 ? '#60a5fa' : 'var(--text-muted)' }}>
                        {s.assists || '–'}
                      </span>
                      <span className="text-xs font-bold tabular-nums"
                        style={{ color: s.yellows > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                        {s.yellows || '–'}
                      </span>
                      <span className="text-xs font-bold tabular-nums"
                        style={{ color: s.reds > 0 ? '#f87171' : 'var(--text-muted)' }}>
                        {s.reds || '–'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="border-b"
                        style={{ borderColor: 'var(--card-border)', background: 'var(--sidebar-bg)' }}>
                        {/* M3-A: PIS Spider Chart */}
                        <div style={{ height: '130px' }}>
                          <ResponsiveContainer width="99%" height="100%">
                            {(() => {
                              const [l0, l1, l2, l3, l4] = getPisLabels(sportType)
                              return (
                            <RadarChart data={[
                              { s: l0, v: Math.round(s.goals / pisMaxGoals * 100) },
                              { s: l1, v: Math.round(s.assists / pisMaxAssists * 100) },
                              { s: l2, v: Math.round((s.goals + s.assists) / pisMaxGA * 100) },
                              { s: l3, v: Math.max(0, 100 - s.yellows * 15 - s.reds * 40) },
                              { s: l4, v: Math.round((involvementMap[userId] ?? 0) / maxInvolvement * 100) },
                            ]} cx="50%" cy="50%" outerRadius="65%">
                              <PolarGrid stroke="rgba(148,163,184,0.15)" />
                              <PolarAngleAxis dataKey="s" tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 600 }} />
                              <Radar dataKey="v" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={1.5} />
                            </RadarChart>
                              )
                            })()}
                          </ResponsiveContainer>
                        </div>
                        {/* 경기별 G/A 내역 */}
                        {matchBreakdown.length > 0 && (
                          <div className="px-3 pb-2.5 space-y-1.5 border-t" style={{ borderColor: 'var(--card-border)' }}>
                            {matchBreakdown.map(mb => (
                              <div key={mb.matchId} className="flex items-center justify-between">
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                  {new Date(mb.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} · {mb.venue}
                                </span>
                                <span className="text-[10px] font-bold flex items-center gap-2">
                                  {mb.goals > 0 && <span style={{ color: '#4ade80' }}>{mb.goals}G</span>}
                                  {mb.assists > 0 && <span style={{ color: '#60a5fa' }}>{mb.assists}A</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* M3-A: 출석왕 */}
        {hasStats && (
          <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                출석왕
              </p>
              {attendanceMap === null && (
                <button
                  onClick={loadAttendanceStats}
                  disabled={loadingAttendance}
                  className="text-[10px] font-semibold rounded-lg px-2.5 py-1 transition-opacity hover:opacity-70 disabled:opacity-50"
                  style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                  {loadingAttendance ? '불러오는 중…' : '불러오기'}
                </button>
              )}
            </div>
            {attendanceMap !== null && (
              <div className="space-y-1">
                {Object.entries(attendanceMap)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([uid, count], rank) => {
                    const mem = members.find(m => m.userId === uid)
                    const rankNum = rank + 1
                    return (
                      <div key={uid} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-1.5">
                          {rankNum <= 3 && <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">{rankNum}</span>}
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {mem ? memberLabel(mem) : uid.slice(0, 8) + '…'}
                          </span>
                        </div>
                        <span className="text-xs font-bold tabular-nums" style={{ color: '#60a5fa' }}>
                          {count}/{completed.length}경기
                        </span>
                      </div>
                    )
                  })}
                {Object.keys(attendanceMap).length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>출석 데이터 없음</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* M3-B: 상대전적 */}
        {Object.keys(opponentRecord).length > 0 && (
          <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              상대전적
            </p>
            {Object.entries(opponentRecord)
              .sort((a, b) => (b[1].wins - b[1].losses) - (a[1].wins - a[1].losses))
              .map(([oppId, rec]) => {
                const total = rec.wins + rec.draws + rec.losses
                const winRate = total > 0 ? Math.round((rec.wins / total) * 100) : 0
                return (
                  <div key={oppId} className="flex items-center justify-between py-1.5 border-b last:border-0"
                    style={{ borderColor: 'var(--card-border)' }}>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      vs {oppId.slice(0, 8)}…
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] tabular-nums font-semibold">
                        <span style={{ color: '#4ade80' }}>{rec.wins}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{rec.draws}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / </span>
                        <span style={{ color: '#f87171' }}>{rec.losses}</span>
                      </span>
                      <span className="text-[10px] w-8 text-right" style={{ color: 'var(--text-muted)' }}>
                        {winRate}%
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* M3-B: 토너먼트 전적 */}
        {tournamentStats.length > 0 && (
          <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              토너먼트 기록
            </p>
            <div className="space-y-2">
              {tournamentStats.map(({ league, w, d, l, total }) => {
                const winRate = total > 0 ? Math.round((w / total) * 100) : 0
                const statusColor = league.status === 'finished' ? '#94a3b8' : league.status === 'ongoing' ? '#4ade80' : '#fbbf24'
                return (
                  <div key={league.id} className="rounded-xl px-3 py-2" style={{ background: 'var(--sidebar-bg)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {league.name}
                        </span>
                        <span className="text-[10px] rounded-full px-2 py-0.5 font-medium"
                          style={{ background: `${statusColor}20`, color: statusColor }}>
                          {league.status === 'finished' ? '종료' : league.status === 'ongoing' ? '진행중' : '모집중'}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {total}경기 · {winRate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold tabular-nums">
                      <span style={{ color: '#4ade80' }}>{w}승</span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{d}무</span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ color: '#f87171' }}>{l}패</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!hasStats && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
            완료된 경기가 없습니다
          </p>
        )}
      </div>
    </div>
  )
}

// ── 공통 스타일 ───────────────────────────────────────────────────────────────

const lbl = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide' as const
const inp = 'w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-2' as const
