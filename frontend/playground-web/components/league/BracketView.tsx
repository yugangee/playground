'use client'

import React from 'react'
import { Empty } from './shared'
import { ROUND_ORDER, type LeagueMatch } from './utils'

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

export { TournamentResults }

export default function BracketView({ matches, tn, onMatchClick, leagueStatus }: {
  matches: LeagueMatch[]; tn: (id: string) => string; onMatchClick: (m: LeagueMatch) => void; leagueStatus?: string
}) {
  const getWinner = (m: LeagueMatch): string | null => {
    if (m.status !== 'completed') return null
    if (m.winner) return m.winner
    if ((m.homeScore ?? 0) > (m.awayScore ?? 0)) return m.homeTeamId
    if ((m.awayScore ?? 0) > (m.homeScore ?? 0)) return m.awayTeamId
    return null
  }

  const roundGroups: Array<{ round: string; matches: LeagueMatch[] }> = []
  const used = new Set<string>()

  for (const r of ROUND_ORDER) {
    const ms = matches.filter(m => m.round === r)
    if (ms.length > 0) {
      roundGroups.push({ round: r, matches: ms })
      ms.forEach(m => used.add(m.id))
    }
  }
  const remaining = matches.filter(m => m.round && !used.has(m.id) && m.round !== '3/4위전')
  const otherRounds = Array.from(new Set(remaining.map(m => m.round!)))
  for (const r of otherRounds) {
    const ms = remaining.filter(m => m.round === r)
    roundGroups.push({ round: r, matches: ms })
    ms.forEach(m => used.add(m.id))
  }

  const thirdPlaceMatch = matches.find(m => m.round === '3/4위전')

  if (roundGroups.length === 0) return <Empty text="대진표가 없습니다" />

  const finalMatch = matches.find(m => m.round === '결승' && m.status === 'completed')
  const champion = finalMatch ? getWinner(finalMatch) : null

  const MATCH_W = 200
  const MATCH_H = 72
  const COL_GAP = 48
  const ROUND_LABEL_H = 36

  const firstRoundMatchCount = roundGroups[0]?.matches.length ?? 1
  const totalHeight = firstRoundMatchCount * (MATCH_H + 24) - 24 + ROUND_LABEL_H

  const renderMatchCard = (m: LeagueMatch, x: number, y: number) => {
    const winner = getWinner(m)
    const isFinal = m.round === '결승'
    const borderColor = isFinal && champion ? '#f59e0b' : 'var(--card-border)'
    const borderWidth = isFinal && champion ? 2 : 1
    const isPending = m.status === 'pending'

    return (
      <g key={m.id} onClick={() => onMatchClick(m)} className="cursor-pointer" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}>
        <rect x={x} y={y} width={MATCH_W} height={MATCH_H} rx={10}
          fill="var(--card-bg)" stroke={borderColor} strokeWidth={borderWidth}
          strokeDasharray={isPending ? '6 3' : undefined} />
        <line x1={x} y1={y + MATCH_H / 2} x2={x + MATCH_W} y2={y + MATCH_H / 2}
          stroke="var(--card-border)" strokeWidth={1} />

        {/* Home */}
        <text x={x + 12} y={y + 23} fontSize={13}
          fontWeight={winner === m.homeTeamId ? 700 : 400}
          fill={winner === m.homeTeamId ? 'var(--text-primary)' : (m.status === 'completed' && winner && winner !== m.homeTeamId) ? 'var(--text-muted)' : 'var(--text-primary)'}>
          {champion === m.homeTeamId ? '\u{1F3C6} ' : ''}{tn(m.homeTeamId).length > 12 ? tn(m.homeTeamId).slice(0, 12) + '…' : tn(m.homeTeamId)}
        </text>
        <text x={x + MATCH_W - 12} y={y + 23} fontSize={13} fontWeight={600}
          textAnchor="end" fontFamily="monospace"
          fill={winner === m.homeTeamId ? 'var(--text-primary)' : 'var(--text-muted)'}>
          {m.status === 'completed' ? m.homeScore : isPending ? 'TBD' : '-'}
        </text>
        {winner === m.homeTeamId && (
          <rect x={x} y={y} width={3} height={MATCH_H / 2} rx={1} fill="#10b981" />
        )}

        {/* Away */}
        <text x={x + 12} y={y + MATCH_H / 2 + 23} fontSize={13}
          fontWeight={winner === m.awayTeamId ? 700 : 400}
          fill={winner === m.awayTeamId ? 'var(--text-primary)' : (m.status === 'completed' && winner && winner !== m.awayTeamId) ? 'var(--text-muted)' : 'var(--text-primary)'}>
          {champion === m.awayTeamId ? '\u{1F3C6} ' : ''}{tn(m.awayTeamId).length > 12 ? tn(m.awayTeamId).slice(0, 12) + '…' : tn(m.awayTeamId)}
        </text>
        <text x={x + MATCH_W - 12} y={y + MATCH_H / 2 + 23} fontSize={13} fontWeight={600}
          textAnchor="end" fontFamily="monospace"
          fill={winner === m.awayTeamId ? 'var(--text-primary)' : 'var(--text-muted)'}>
          {m.status === 'completed' ? m.awayScore : isPending ? 'TBD' : '-'}
        </text>
        {winner === m.awayTeamId && (
          <rect x={x} y={y + MATCH_H / 2} width={3} height={MATCH_H / 2} rx={1} fill="#10b981" />
        )}

        {m.pkScore && (
          <text x={x + MATCH_W / 2} y={y + MATCH_H + 14} fontSize={10} textAnchor="middle" fill="var(--text-muted)">
            PK {m.pkScore.home}:{m.pkScore.away}
          </text>
        )}

        <rect x={x} y={y} width={MATCH_W} height={MATCH_H} rx={10}
          fill="transparent" className="hover:fill-[rgba(0,0,0,0.03)] transition-colors" />
      </g>
    )
  }

  const positions: Array<{ match: LeagueMatch; x: number; y: number }> = []
  const colWidth = MATCH_W + COL_GAP

  roundGroups.forEach((group, gi) => {
    const x = gi * colWidth
    const matchCount = group.matches.length
    const availableHeight = totalHeight - ROUND_LABEL_H
    const spacing = matchCount > 1 ? availableHeight / matchCount : availableHeight
    const startY = ROUND_LABEL_H + (spacing - MATCH_H) / 2

    group.matches.forEach((m, mi) => {
      const y = startY + mi * spacing
      positions.push({ match: m, x, y })
    })
  })

  const svgWidth = roundGroups.length * colWidth - COL_GAP + 20
  const svgHeight = totalHeight + 30

  const connectors: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = []

  for (let gi = 0; gi < roundGroups.length - 1; gi++) {
    const currentRound = positions.filter(p => p.x === gi * colWidth)
    const nextRound = positions.filter(p => p.x === (gi + 1) * colWidth)

    for (let ni = 0; ni < nextRound.length; ni++) {
      const nextMatch = nextRound[ni]
      const pair = currentRound.slice(ni * 2, ni * 2 + 2)

      pair.forEach((curr, pi) => {
        const fromX = curr.x + MATCH_W
        const fromY = curr.y + MATCH_H / 2
        const toX = nextMatch.x
        const toY = nextMatch.y + (pi === 0 ? MATCH_H * 0.25 : MATCH_H * 0.75)
        connectors.push({ x1: fromX, y1: fromY, x2: toX, y2: toY, key: `conn-${gi}-${ni}-${pi}` })
      })
    }
  }

  return (
    <div className="space-y-6">
      {champion && leagueStatus === 'finished' && (
        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="text-lg">🏆</span>
          <span className="ml-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>우승: {tn(champion)}</span>
        </div>
      )}

      <div className="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <svg width={svgWidth} height={svgHeight} className="min-w-max">
          {roundGroups.map((group, gi) => (
            <g key={`label-${group.round}`}>
              <rect x={gi * colWidth + (MATCH_W - group.round.length * 14) / 2 - 8} y={2}
                width={group.round.length * 14 + 16} height={24} rx={6}
                fill="var(--btn-solid-bg)" />
              <text x={gi * colWidth + MATCH_W / 2} y={19}
                textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--btn-solid-color)">
                {group.round}
              </text>
            </g>
          ))}

          {connectors.map(c => (
            <path key={c.key}
              d={`M ${c.x1} ${c.y1} C ${c.x1 + (c.x2 - c.x1) * 0.5} ${c.y1}, ${c.x2 - (c.x2 - c.x1) * 0.5} ${c.y2}, ${c.x2} ${c.y2}`}
              fill="none" stroke="var(--card-border)" strokeWidth={1.5} />
          ))}

          {positions.map(p => renderMatchCard(p.match, p.x, p.y))}
        </svg>
      </div>

      {thirdPlaceMatch && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>3/4위전</span>
            <div className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
          </div>
          <div onClick={() => onMatchClick(thirdPlaceMatch)}
            className="w-52 rounded-xl cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            {(() => {
              const m = thirdPlaceMatch
              const winner = getWinner(m)
              return (
                <>
                  <div className="flex items-center justify-between px-3 py-2"
                    style={{ borderBottom: '1px solid var(--card-border)', fontWeight: winner === m.homeTeamId ? 700 : 400 }}>
                    <span className="text-sm truncate flex-1" style={{ color: winner === m.homeTeamId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {tn(m.homeTeamId)}
                    </span>
                    <span className="text-sm font-mono tabular-nums ml-2" style={{ color: 'var(--text-primary)' }}>
                      {m.status === 'completed' ? m.homeScore : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2"
                    style={{ fontWeight: winner === m.awayTeamId ? 700 : 400 }}>
                    <span className="text-sm truncate flex-1" style={{ color: winner === m.awayTeamId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
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
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
