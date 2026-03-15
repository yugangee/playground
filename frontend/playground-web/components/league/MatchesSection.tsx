'use client'

import React, { useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { StatusBadge, Empty, lbl, lblStyle, inp, inpStyle } from './shared'
import type { LeagueMatch, LeagueTeam } from './utils'

function MatchCard({ match: m, isOrganizer, leagueStatus, onClick, onDelete, teamNames }: {
  match: LeagueMatch; isOrganizer: boolean; leagueStatus: string
  onClick: () => void; onDelete: () => void; teamNames: Record<string, string>
}) {
  const tn = (id: string) => id === 'BYE' ? '부전승' : id === 'TBD' ? '미정' : (teamNames[id] ?? id)
  const isBye = m.homeTeamId === 'BYE' || m.awayTeamId === 'BYE'
  const isTbd = m.homeTeamId === 'TBD' && m.awayTeamId === 'TBD'
  const goalCount = m.goals?.length ?? 0
  const cardCount = m.cards?.length ?? 0
  const isCompleted = m.status === 'completed'
  const isWinner = (teamId: string) => {
    if (!isCompleted) return false
    if (m.winner) return m.winner === teamId
    return (m.homeScore ?? 0) !== (m.awayScore ?? 0) &&
      ((m.homeTeamId === teamId && (m.homeScore ?? 0) > (m.awayScore ?? 0)) ||
       (m.awayTeamId === teamId && (m.awayScore ?? 0) > (m.homeScore ?? 0)))
  }

  return (
    <div className="overflow-hidden rounded-xl cursor-pointer transition-all hover:shadow-md"
      style={{ background: isBye ? 'rgba(0,0,0,0.02)' : 'var(--card-bg)', border: `1px solid ${isTbd ? 'var(--card-border)' : 'var(--card-border)'}`, opacity: isBye ? 0.7 : 1 }}
      onClick={onClick}>
      {/* 메인 컨텐츠 */}
      <div className="px-5 py-4">
        {/* 팀 vs 팀 — 중앙 스코어 */}
        <div className="flex items-center gap-3">
          {/* 홈팀 */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm font-semibold truncate"
                style={{ color: 'var(--text-primary)', fontWeight: isWinner(m.homeTeamId) ? 800 : 500 }}>
                {tn(m.homeTeamId)}
              </span>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: isWinner(m.homeTeamId) ? '#10b981' : 'var(--btn-solid-bg)', opacity: isCompleted && !isWinner(m.homeTeamId) ? 0.5 : 1 }}>
                {tn(m.homeTeamId).charAt(0)}
              </div>
            </div>
          </div>

          {/* 스코어 / VS */}
          <div className="flex-shrink-0 w-20 text-center">
            {isCompleted && isBye ? (
              <div className="rounded-lg px-3 py-1.5 text-xs font-bold"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                부전승
              </div>
            ) : isCompleted ? (
              <div className="rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums"
                style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
                {m.homeScore} : {m.awayScore}
              </div>
            ) : (
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>vs</span>
            )}
          </div>

          {/* 원정팀 */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: isWinner(m.awayTeamId) ? '#10b981' : 'var(--btn-solid-bg)', opacity: isCompleted && !isWinner(m.awayTeamId) ? 0.5 : 1 }}>
                {tn(m.awayTeamId).charAt(0)}
              </div>
              <span className="text-sm font-semibold truncate"
                style={{ color: 'var(--text-primary)', fontWeight: isWinner(m.awayTeamId) ? 800 : 500 }}>
                {tn(m.awayTeamId)}
              </span>
            </div>
          </div>
        </div>

        {/* PK 스코어 */}
        {m.pkScore && (
          <div className="mt-1 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            PK {m.pkScore.home}:{m.pkScore.away}
          </div>
        )}
      </div>

      {/* 하단 메타 라인 */}
      <div className="flex items-center gap-2 px-5 py-2.5 text-xs"
        style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
        <span>{new Date(m.scheduledAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        <span>·</span>
        <span>{m.venue}</span>

        {isCompleted && goalCount > 0 && (
          <span className="ml-auto rounded-full px-2 py-0.5"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>{goalCount}골</span>
        )}
        {isCompleted && cardCount > 0 && (
          <span className="rounded-full px-2 py-0.5"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{cardCount}카드</span>
        )}

        {!isCompleted && (
          <span className="ml-auto"><StatusBadge status={m.status} /></span>
        )}

        {isOrganizer && leagueStatus !== 'finished' && !isCompleted && (
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="transition-colors hover:text-red-500" style={{ color: 'var(--text-muted)' }} title="경기 삭제">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}

        {isOrganizer && !isCompleted && leagueStatus === 'ongoing' && (
          isTbd ? (
            <span className="text-xs font-semibold" style={{ color: 'var(--brand-primary)' }}>팀 배정 →</span>
          ) : (
            <span className="text-xs font-medium" style={{ color: 'var(--btn-solid-bg)' }}>결과 입력 →</span>
          )
        )}
      </div>
    </div>
  )
}

export default function MatchesSection({ leagueId, matches, onRefresh, isOrganizer, leagueStatus, leagueType, teamNames, leagueTeams, onMatchClick, hasBracketSize, onSwitchTab }: {
  leagueId: string; matches: LeagueMatch[]; onRefresh: () => void; isOrganizer: boolean; leagueStatus: string; leagueType?: string
  teamNames: Record<string, string>; leagueTeams: LeagueTeam[]; onMatchClick: (m: LeagueMatch) => void
  hasBracketSize?: boolean; onSwitchTab?: (tab: string) => void
}) {
  const tn = (id: string) => id === 'BYE' ? '부전승' : id === 'TBD' ? '미정' : (teamNames[id] ?? id)
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
      {/* bracketSize 토너먼트: 안내 배너 */}
      {hasBracketSize && leagueStatus === 'ongoing' && matches.some(m => m.homeTeamId === 'TBD' || m.awayTeamId === 'TBD') && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center justify-between"
          style={{ background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.15)', color: 'var(--brand-primary)' }}>
          <span>팀 미배정 경기가 있습니다. 경기를 클릭하거나 대진표에서 팀을 배정하세요.</span>
          {onSwitchTab && (
            <button onClick={() => onSwitchTab('bracket')}
              className="ml-3 flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
              style={{ background: 'rgba(147,51,234,0.12)', color: 'var(--brand-primary)' }}>
              대진표 보기
            </button>
          )}
        </div>
      )}

      {/* 경기 추가 버튼 & 폼 — bracketSize 토너먼트는 매치가 일괄 생성되므로 숨김 */}
      {isOrganizer && leagueStatus !== 'finished' && !hasBracketSize && (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold btn-press"
            style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            경기 추가
          </button>
          {showForm && (
            <form onSubmit={submit} className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
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
              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={loading}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold btn-press disabled:opacity-50"
                  style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
                  {loading ? '추가 중...' : '추가'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-xl px-5 py-2.5 text-sm font-medium"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                  취소
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {matches.length === 0 ? (
        <Empty text={leagueStatus === 'recruiting' ? '대회 시작 시 경기가 자동 생성됩니다' : '경기가 없습니다'} />
      ) : (
        <div className="space-y-6">
          {/* 최근 결과 피드 (리그) */}
          {leagueType === 'league' && (() => {
            const recent = matches.filter(m => m.status === 'completed')
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
              .slice(0, 5)
            if (recent.length === 0) return null
            return (
              <div>
                <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>최근 결과</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {recent.map(m => (
                    <div key={m.id} onClick={() => onMatchClick(m)}
                      className="flex-shrink-0 w-48 rounded-xl p-3 cursor-pointer transition-all hover:shadow-md"
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

          {/* 라운드 필터 */}
          {rounds.length > 1 && (
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
                <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>{round}</span>
                <div className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
              </div>
              <div className="space-y-3">
                {matches.filter(m => m.round === round).sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)).map(m => (
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
