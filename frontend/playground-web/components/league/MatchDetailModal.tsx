'use client'

import React, { useState, useEffect } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { Section, inp, inpStyle } from './shared'
import type { LeagueMatch } from './utils'
import type { GoalRecord, CardRecord, TeamMember, MatchTeamStats } from '@/types/manage'

const QUARTERS = ['1Q', '2Q', '3Q', '4Q']

const STAT_KEYS: { key: keyof MatchTeamStats; label: string }[] = [
  { key: 'shots', label: '슈팅' },
  { key: 'shotsOnTarget', label: '유효 슈팅' },
  { key: 'corners', label: '코너킥' },
  { key: 'fouls', label: '파울' },
  { key: 'offsides', label: '오프사이드' },
  { key: 'possession', label: '점유율 (%)' },
]

type ModalTab = 'record' | 'timeline' | 'teamStats'

export default function MatchDetailModal({ match, leagueId, isOrganizer, leagueStatus, leagueType, teamNames, onClose, onSave }: {
  match: LeagueMatch; leagueId: string; isOrganizer: boolean; leagueStatus: string; leagueType?: string
  teamNames: Record<string, string>; onClose: () => void; onSave: () => void
}) {
  const tn = (id: string) => teamNames[id] ?? id
  const editable = isOrganizer && leagueStatus === 'ongoing' && match.status !== 'completed'
  const editableCompleted = isOrganizer && match.status === 'completed'
  const canEdit = editable || editableCompleted

  const [modalTab, setModalTab] = useState<ModalTab>('record')

  const [homeScore, setHomeScore] = useState(String(match.homeScore ?? ''))
  const [awayScore, setAwayScore] = useState(String(match.awayScore ?? ''))
  const [goals, setGoals] = useState<GoalRecord[]>(match.goals ?? [])
  const [cards, setCards] = useState<CardRecord[]>(match.cards ?? [])
  const [guests, setGuests] = useState(match.guests?.join(', ') ?? '')
  const [saving, setSaving] = useState(false)
  const [homePk, setHomePk] = useState(String(match.pkScore?.home ?? ''))
  const [awayPk, setAwayPk] = useState(String(match.pkScore?.away ?? ''))

  // 팀 스탯
  const rawMatch = match as LeagueMatch & { homeStats?: MatchTeamStats; awayStats?: MatchTeamStats }
  const [homeStats, setHomeStats] = useState<MatchTeamStats>(rawMatch.homeStats ?? {})
  const [awayStats, setAwayStats] = useState<MatchTeamStats>(rawMatch.awayStats ?? {})

  // 팀 멤버 로드
  const [homeMembers, setHomeMembers] = useState<TeamMember[]>([])
  const [awayMembers, setAwayMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    manageFetch(`/team/${match.homeTeamId}/members`).then(setHomeMembers).catch(() => {})
    manageFetch(`/team/${match.awayTeamId}/members`).then(setAwayMembers).catch(() => {})
  }, [match.homeTeamId, match.awayTeamId])

  const allMembers = [...homeMembers.map(m => ({ ...m, teamId: match.homeTeamId })), ...awayMembers.map(m => ({ ...m, teamId: match.awayTeamId }))]
  const memberName = (id: string) => allMembers.find(m => m.userId === id)?.name ?? id

  const addGoal = () => setGoals(g => [...g, { scorer: '', assist: '', minute: undefined, quarter: undefined }])
  const removeGoal = (i: number) => setGoals(g => g.filter((_, idx) => idx !== i))
  const updateGoal = (i: number, field: string, val: unknown) => setGoals(g => g.map((x, idx) => idx === i ? { ...x, [field]: val } : x))

  const addCard = () => setCards(c => [...c, { playerId: '', type: 'yellow' as const, minute: undefined, quarter: undefined }])
  const removeCard = (i: number) => setCards(c => c.filter((_, idx) => idx !== i))
  const updateCard = (i: number, field: string, val: unknown) => setCards(c => c.map((x, idx) => idx === i ? { ...x, [field]: val } : x))

  const save = async (markComplete: boolean) => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        goals: goals.filter(g => g.scorer),
        cards: cards.filter(c => c.playerId),
        guests: guests.split(',').map(s => s.trim()).filter(Boolean),
        homeStats: Object.values(homeStats).some(v => v != null) ? homeStats : undefined,
        awayStats: Object.values(awayStats).some(v => v != null) ? awayStats : undefined,
      }
      if (homeScore !== '') body.homeScore = Number(homeScore)
      if (awayScore !== '') body.awayScore = Number(awayScore)
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

  // 타임라인 데이터: 골+카드를 쿼터/분 순서로 정렬
  const timelineEvents = [
    ...goals.filter(g => g.scorer).map(g => ({
      type: 'goal' as const,
      quarter: g.quarter,
      minute: g.minute,
      label: `${memberName(g.scorer)}`,
      sub: g.assist ? `어시스트: ${memberName(g.assist)}` : undefined,
    })),
    ...cards.filter(c => c.playerId).map(c => ({
      type: 'card' as const,
      cardType: c.type,
      quarter: c.quarter,
      minute: c.minute,
      label: memberName(c.playerId),
      sub: c.type === 'yellow' ? '옐로카드' : '레드카드',
    })),
  ].sort((a, b) => {
    const qA = QUARTERS.indexOf(a.quarter ?? '')
    const qB = QUARTERS.indexOf(b.quarter ?? '')
    if (qA !== qB) return qA - qB
    return (a.minute ?? 0) - (b.minute ?? 0)
  })

  // 쿼터별 그룹핑
  const groupedTimeline = new Map<string, typeof timelineEvents>()
  timelineEvents.forEach(ev => {
    const q = ev.quarter ?? '기타'
    if (!groupedTimeline.has(q)) groupedTimeline.set(q, [])
    groupedTimeline.get(q)!.push(ev)
  })

  const modalTabs: { key: ModalTab; label: string }[] = [
    { key: 'record', label: '경기 기록' },
    { key: 'timeline', label: '타임라인' },
    { key: 'teamStats', label: '팀 스탯' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }}>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
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
        <div className="mb-4 flex items-center justify-center gap-4">
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

        {/* PK (토너먼트 동점) */}
        {leagueType === 'tournament' && homeScore !== '' && awayScore !== '' && homeScore === awayScore && canEdit && (
          <div className="mb-4 rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
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
        {leagueType === 'tournament' && match.pkScore && !canEdit && (
          <div className="mb-4 text-center text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            승부차기 (PK) {match.pkScore.home} : {match.pkScore.away}
          </div>
        )}

        {/* Modal tabs */}
        <div className="mb-4 flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {modalTabs.map(t => (
            <button key={t.key} onClick={() => setModalTab(t.key)}
              className="rounded-lg px-4 py-1.5 text-xs font-medium transition-all"
              style={modalTab === t.key
                ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
                : { color: 'var(--text-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: 경기 기록 */}
        {modalTab === 'record' && (
          <>
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
                        <option value="">어시스트</option>
                        {allMembers.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                      </select>
                      <select value={g.quarter ?? ''} onChange={e => updateGoal(i, 'quarter', e.target.value || undefined)} className="w-16 rounded-lg px-1 py-1.5 text-sm outline-none" style={inpStyle}>
                        <option value="">Q</option>
                        {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                      <input type="number" placeholder="분" value={g.minute ?? ''} onChange={e => updateGoal(i, 'minute', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-14 rounded-lg px-2 py-1.5 text-sm text-center outline-none" style={inpStyle} />
                      <button onClick={() => removeGoal(i)} className="text-red-400 hover:text-red-600 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                    </>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {g.quarter && <span className="font-mono text-xs mr-1 px-1 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{g.quarter}</span>}
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
                      <select value={c.type} onChange={e => updateCard(i, 'type', e.target.value)} className="w-20 rounded-lg px-2 py-1.5 text-sm outline-none" style={inpStyle}>
                        <option value="yellow">옐로</option>
                        <option value="red">레드</option>
                      </select>
                      <select value={c.quarter ?? ''} onChange={e => updateCard(i, 'quarter', e.target.value || undefined)} className="w-16 rounded-lg px-1 py-1.5 text-sm outline-none" style={inpStyle}>
                        <option value="">Q</option>
                        {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                      <input type="number" placeholder="분" value={c.minute ?? ''} onChange={e => updateCard(i, 'minute', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-14 rounded-lg px-2 py-1.5 text-sm text-center outline-none" style={inpStyle} />
                      <button onClick={() => removeCard(i)} className="text-red-400 hover:text-red-600 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      {c.quarter && <span className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{c.quarter}</span>}
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
          </>
        )}

        {/* Tab: 타임라인 */}
        {modalTab === 'timeline' && (
          <div>
            {timelineEvents.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>이벤트가 없습니다</div>
            ) : (
              <div className="space-y-4">
                {Array.from(groupedTimeline.entries()).map(([quarter, events]) => (
                  <div key={quarter}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-lg px-2.5 py-1 text-xs font-bold"
                        style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>{quarter}</span>
                      <div className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
                    </div>
                    <div className="space-y-2 pl-2">
                      {events.map((ev, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2"
                          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                          {ev.minute != null && (
                            <span className="flex-shrink-0 font-mono text-xs font-bold tabular-nums" style={{ color: 'var(--text-muted)' }}>{ev.minute}&apos;</span>
                          )}
                          {ev.type === 'goal' ? (
                            <span className="flex-shrink-0 text-sm">⚽</span>
                          ) : (
                            <span className={`flex-shrink-0 inline-block h-4 w-3 rounded-sm ${(ev as { cardType?: string }).cardType === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                          )}
                          <div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ev.label}</div>
                            {ev.sub && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{ev.sub}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: 팀 스탯 */}
        {modalTab === 'teamStats' && (
          <div className="space-y-4">
            {STAT_KEYS.map(({ key, label }) => {
              const hVal = homeStats[key] ?? 0
              const aVal = awayStats[key] ?? 0
              const maxVal = Math.max(hVal, aVal, 1)

              return (
                <div key={key}>
                  <div className="mb-1 text-xs font-medium text-center" style={{ color: 'var(--text-muted)' }}>{label}</div>
                  <div className="flex items-center gap-3">
                    {canEdit ? (
                      <input type="number" value={homeStats[key] ?? ''} onChange={e => setHomeStats(s => ({ ...s, [key]: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-14 rounded-lg px-2 py-1.5 text-sm text-center outline-none" style={inpStyle} min={0} />
                    ) : (
                      <span className="w-10 text-right text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{hVal}</span>
                    )}
                    <div className="flex flex-1 items-center gap-1">
                      <div className="flex-1 flex justify-end">
                        <div className="h-5 rounded-l-full transition-all" style={{ width: `${(hVal / maxVal) * 100}%`, background: '#3b82f6', minWidth: hVal > 0 ? '8px' : 0 }} />
                      </div>
                      <div className="flex-1">
                        <div className="h-5 rounded-r-full transition-all" style={{ width: `${(aVal / maxVal) * 100}%`, background: '#ef4444', minWidth: aVal > 0 ? '8px' : 0 }} />
                      </div>
                    </div>
                    {canEdit ? (
                      <input type="number" value={awayStats[key] ?? ''} onChange={e => setAwayStats(s => ({ ...s, [key]: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-14 rounded-lg px-2 py-1.5 text-sm text-center outline-none" style={inpStyle} min={0} />
                    ) : (
                      <span className="w-10 text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{aVal}</span>
                    )}
                  </div>
                </div>
              )
            })}
            <div className="flex items-center justify-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: '#3b82f6' }} />{tn(match.homeTeamId)}</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: '#ef4444' }} />{tn(match.awayTeamId)}</span>
            </div>
          </div>
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
