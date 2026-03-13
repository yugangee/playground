'use client'

import React, { useState, useEffect } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { Empty } from './shared'
import type { LeagueMatch } from './utils'
import type { TeamMember, League, PlayerDiscipline } from '@/types/manage'

type StatsSubTab = 'scorers' | 'assists' | 'cards' | 'teamRanking'

export default function StatsTab({ matches, leagueType, league, teamNames }: { matches: LeagueMatch[]; leagueType?: string; league?: League; teamNames?: Record<string, string> }) {
  const completed = matches.filter(m => m.status === 'completed' || m.status === 'forfeit')
  const [subTab, setSubTab] = useState<StatsSubTab>('scorers')
  const [discipline, setDiscipline] = useState<PlayerDiscipline[]>([])
  const [disciplineLoaded, setDisciplineLoaded] = useState(false)

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

  // Load discipline data from backend
  useEffect(() => {
    if (!league?.id || disciplineLoaded) return
    manageFetch(`/league/${league.id}/discipline`)
      .then((data: { players: PlayerDiscipline[] }) => {
        setDiscipline(data?.players ?? [])
        setDisciplineLoaded(true)
      })
      .catch(() => setDisciplineLoaded(true))
  }, [league?.id, completed.length])

  const mn = (id: string) => memberNames[id] ?? id.slice(0, 8)

  // 득점 집계
  type ScorerEntry = { id: string; teamId: string; goals: number; assists: number; gamesPlayed: number }
  const scorerMap = new Map<string, ScorerEntry>()
  const playerGames = new Map<string, Set<string>>()

  completed.forEach(m => {
    const allPlayerIds = new Set<string>()
    ;(m.goals ?? []).forEach(g => {
      if (g.scorer) allPlayerIds.add(g.scorer)
      if (g.assist) allPlayerIds.add(g.assist)
    })
    ;(m.cards ?? []).forEach(c => { if (c.playerId) allPlayerIds.add(c.playerId) })

    allPlayerIds.forEach(pid => {
      if (!playerGames.has(pid)) playerGames.set(pid, new Set())
      playerGames.get(pid)!.add(m.id)
    })

    ;(m.goals ?? []).forEach(g => {
      if (g.scorer) {
        const existing = scorerMap.get(g.scorer) ?? { id: g.scorer, teamId: '', goals: 0, assists: 0, gamesPlayed: 0 }
        existing.goals++
        scorerMap.set(g.scorer, existing)
      }
      if (g.assist) {
        const existing = scorerMap.get(g.assist) ?? { id: g.assist, teamId: '', goals: 0, assists: 0, gamesPlayed: 0 }
        existing.assists++
        scorerMap.set(g.assist, existing)
      }
    })
  })

  // 출전 경기 수 반영
  scorerMap.forEach((entry, pid) => {
    entry.gamesPlayed = playerGames.get(pid)?.size ?? 0
  })

  const scorers = Array.from(scorerMap.values()).sort((a, b) => b.goals - a.goals || b.assists - a.assists)
  const assistRanking = Array.from(scorerMap.values()).filter(s => s.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals)

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

  // 징계 규칙 (league.rules 기반, fallback 기본값)
  const yellowLimit = league?.rules?.yellowCardAccumulation ?? 2
  const redBan = league?.rules?.redCardSuspension ?? 1

  if (completed.length === 0) return <Empty text="완료된 경기가 없습니다" />

  const subTabs: { key: StatsSubTab; label: string }[] = [
    { key: 'scorers', label: '득점 순위' },
    { key: 'assists', label: '도움 순위' },
    { key: 'cards', label: '카드 현황' },
    { key: 'teamRanking', label: '팀 순위' },
  ]

  return (
    <div className="space-y-6">
      {/* 서브탭 */}
      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className="rounded-lg px-4 py-1.5 text-xs font-medium transition-all"
            style={subTab === t.key
              ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
              : { color: 'var(--text-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 득점 순위 */}
      {subTab === 'scorers' && (
        <div>
          {scorers.length === 0 ? (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>골 기록이 없습니다. 경기 상세에서 골을 기록해주세요.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['#', '선수', '골', '도움', '경기', '경기당 골'].map(h => (
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
                      <td className="px-4 py-3 text-center" style={{ color: 'var(--text-muted)' }}>{s.gamesPlayed}</td>
                      <td className="px-4 py-3 text-center font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {s.gamesPlayed > 0 ? (s.goals / s.gamesPlayed).toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 도움 순위 */}
      {subTab === 'assists' && (
        <div>
          {assistRanking.length === 0 ? (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>어시스트 기록이 없습니다.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['#', '선수', '도움', '골'].map(h => (
                      <th key={h} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide first:text-left" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assistRanking.slice(0, 10).map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: i < 3 ? '#3b82f6' : 'var(--text-muted)' }}>{i + 1}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{mn(s.id)}</td>
                      <td className="px-4 py-3 text-center font-bold" style={{ color: '#3b82f6' }}>{s.assists}</td>
                      <td className="px-4 py-3 text-center" style={{ color: 'var(--text-muted)' }}>{s.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 카드 현황 */}
      {subTab === 'cards' && (
        <div className="space-y-6">
          {cardList.length === 0 ? (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>카드 기록이 없습니다.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['선수', '옐로', '레드', '상태'].map(h => (
                      <th key={h} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide first:text-left" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cardList.map(c => {
                    const disc = discipline.find(d => d.playerId === c.id)
                    const isSuspended = disc ? disc.isSuspended : (c.yellow >= yellowLimit || c.red > 0)
                    const remainingBan = disc?.remainingBan ?? 0
                    const wasReset = disc?.warningReset ?? false
                    return (
                      <tr key={c.id} style={{
                        borderBottom: '1px solid var(--card-border)',
                        background: isSuspended ? 'rgba(239,68,68,0.04)' : undefined,
                      }}>
                        <td className="px-4 py-3 font-medium" style={{ color: isSuspended ? '#ef4444' : 'var(--text-primary)' }}>
                          {mn(c.id)}
                          {wasReset && (
                            <span className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>초기화</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.yellow > 0 && <span className="inline-flex items-center gap-1"><span className="inline-block h-4 w-3 rounded-sm bg-yellow-400" />{c.yellow}</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.red > 0 && <span className="inline-flex items-center gap-1"><span className="inline-block h-4 w-3 rounded-sm bg-red-500" />{c.red}</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isSuspended ? (
                            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                              출전정지{remainingBan > 0 ? ` (${remainingBan}경기)` : ''}
                            </span>
                          ) : c.yellow === yellowLimit - 1 ? (
                            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>경고</span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 징계 현황 (백엔드 discipline API 기반) */}
          {discipline.length > 0 && (() => {
            const suspended = discipline.filter(d => d.isSuspended || d.remainingBan > 0)
            const resetPlayers = discipline.filter(d => d.warningReset)
            const warned = discipline.filter(d => !d.isSuspended && d.remainingBan === 0 && d.totalYellows === yellowLimit - 1 && d.totalReds === 0)

            if (suspended.length === 0 && warned.length === 0 && resetPlayers.length === 0) return null

            return (
              <div>
                <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>징계 현황</h3>
                {resetPlayers.length > 0 && (
                  <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                    4강 진출 — 경고 초기화 대상: {resetPlayers.map(p => mn(p.playerId)).join(', ')}
                  </div>
                )}
                <div className="space-y-2">
                  {suspended.map(s => (
                    <div key={`sus-${s.playerId}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <span className="text-red-500 font-bold text-xs">출전정지</span>
                      <span style={{ color: 'var(--text-primary)' }}>{mn(s.playerId)}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        (옐로 {s.totalYellows} / 레드 {s.totalReds}, 잔여 {s.remainingBan}경기)
                      </span>
                    </div>
                  ))}
                  {warned.map(w => (
                    <div key={`warn-${w.playerId}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <span className="text-amber-500 font-bold text-xs">경고</span>
                      <span style={{ color: 'var(--text-primary)' }}>{mn(w.playerId)}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(옐로 {yellowLimit - 1}장 — 추가 시 출전정지)</span>
                      {w.warningReset && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>초기화됨</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* 팀 순위 */}
      {subTab === 'teamRanking' && (
        <div>
          {(() => {
            const teamStats = new Map<string, { w: number; d: number; l: number; gf: number; ga: number; cards: number }>()
            completed.forEach(m => {
              const hs = m.homeScore ?? 0; const as2 = m.awayScore ?? 0
              const home = teamStats.get(m.homeTeamId) ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0, cards: 0 }
              const away = teamStats.get(m.awayTeamId) ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0, cards: 0 }
              home.gf += hs; home.ga += as2; away.gf += as2; away.ga += hs
              if (hs > as2) { home.w++; away.l++ } else if (hs === as2) { home.d++; away.d++ } else { home.l++; away.w++ }
              ;(m.cards ?? []).forEach(() => { home.cards++; away.cards++ })
              teamStats.set(m.homeTeamId, home); teamStats.set(m.awayTeamId, away)
            })
            const ranked = Array.from(teamStats.entries())
              .map(([id, s]) => ({ id, ...s, pts: s.w * 3 + s.d }))
              .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga))

            return (
              <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                      {['#', '팀', '승', '무', '패', '득', '실', '승점'].map(h => (
                        <th key={h} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide first:text-left" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((t, i) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td className="px-3 py-3 font-medium" style={{ color: i < 3 ? '#10b981' : 'var(--text-muted)' }}>{i + 1}</td>
                        <td className="px-3 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{teamNames?.[t.id] ?? t.id.slice(0, 8)}</td>
                        <td className="px-3 py-3 text-center font-semibold text-emerald-600">{t.w}</td>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--text-muted)' }}>{t.d}</td>
                        <td className="px-3 py-3 text-center text-red-500">{t.l}</td>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--text-muted)' }}>{t.gf}</td>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--text-muted)' }}>{t.ga}</td>
                        <td className="px-3 py-3 text-center font-bold" style={{ color: 'var(--text-primary)' }}>{t.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
