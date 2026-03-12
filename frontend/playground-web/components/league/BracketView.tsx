'use client'

import React, { useMemo } from 'react'
import { Empty } from './shared'
import { ROUND_ORDER, generateBracketTemplate, type LeagueMatch } from './utils'

/* ── 대회 결과 (결승 완료 시 표시) ─────────────────────────────────────────── */

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

/* ── 상수 ─────────────────────────────────────────────────────────────────── */

const CARD_W = 200

/* ── 매치 카드 (예시 스타일 적용) ─────────────────────────────────────────── */

function MatchCard({ match, tn, onClick, label }: {
  match?: LeagueMatch
  tn: (id: string) => string
  onClick?: () => void
  label?: string
}) {
  // 빈 슬롯
  if (!match) {
    return (
      <div style={{
        width: CARD_W, borderRadius: 10, overflow: 'hidden',
        border: '1px dashed var(--text-muted)', opacity: 0.4,
      }}>
        {label && (
          <div style={{
            padding: '5px 12px', fontSize: 10, fontWeight: 500, letterSpacing: '0.02em',
            color: 'var(--text-muted)', borderBottom: '1px dashed var(--text-muted)',
          }}>{label}</div>
        )}
        <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>미정</div>
        <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px dashed var(--text-muted)' }}>미정</div>
      </div>
    )
  }

  const isBye = match.homeTeamId === 'BYE' || match.awayTeamId === 'BYE'
  const isTbd = match.homeTeamId === 'TBD' && match.awayTeamId === 'TBD'
  const isCompleted = match.status === 'completed'

  const winner = (() => {
    if (!isCompleted) return null
    if (match.winner) return match.winner
    if ((match.homeScore ?? 0) > (match.awayScore ?? 0)) return match.homeTeamId
    if ((match.awayScore ?? 0) > (match.homeScore ?? 0)) return match.awayTeamId
    return null
  })()

  const teamName = (id: string) => {
    if (id === 'BYE') return '부전승'
    if (id === 'TBD') return '미정'
    return tn(id)
  }

  const timeStr = match.scheduledAt && match.scheduledAt !== '미정'
    ? new Date(match.scheduledAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  const teamRow = (id: string, score: number | undefined, isWin: boolean, isTop: boolean) => {
    const isPlaceholder = id === 'TBD' || id === 'BYE'
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px',
        borderTop: isTop ? undefined : '1px solid var(--input-border)',
        background: isWin ? 'rgba(16,185,129,0.08)' : undefined,
        opacity: isCompleted && !isWin && winner ? 0.45 : 1,
      }}>
        <span style={{
          flex: 1, fontSize: 13, letterSpacing: '-0.01em',
          fontWeight: isWin ? 700 : isPlaceholder ? 400 : 600,
          color: isPlaceholder ? 'var(--text-muted)' : 'var(--text-primary)',
          fontStyle: isPlaceholder ? 'italic' : undefined,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {teamName(id)}
        </span>
        {isCompleted && !isBye && score !== undefined && (
          <span style={{
            fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: isWin ? 'var(--text-primary)' : 'var(--text-muted)',
            minWidth: 22, textAlign: 'right',
          }}>
            {score}
          </span>
        )}
        {isCompleted && isBye && isWin && (
          <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            W.O.
          </span>
        )}
        {isWin && !isBye && <span style={{ fontSize: 10, color: '#10b981' }}>✓</span>}
      </div>
    )
  }

  return (
    <div
      style={{
        width: CARD_W, borderRadius: 10, overflow: 'hidden',
        border: isTbd ? '1px solid var(--input-border)' : `1px solid var(--input-border)`,
        background: 'var(--card-bg)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isBye && isCompleted ? 0.55 : 1,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
      onClick={onClick}
    >
      {/* 헤더 */}
      {label && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '5px 12px',
          background: 'rgba(0,0,0,0.03)',
          borderBottom: '1px solid var(--input-border)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>{label}</span>
          {timeStr && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeStr}</span>}
        </div>
      )}

      {teamRow(match.homeTeamId, match.homeScore, winner === match.homeTeamId, true)}
      {teamRow(match.awayTeamId, match.awayScore, winner === match.awayTeamId, false)}

      {match.pkScore && (
        <div style={{
          textAlign: 'center', fontSize: 9, fontWeight: 600, padding: '3px 0',
          color: 'var(--text-muted)', borderTop: '1px solid var(--input-border)',
          background: 'rgba(0,0,0,0.02)',
        }}>
          PK {match.pkScore.home}:{match.pkScore.away}
        </div>
      )}
    </div>
  )
}

/* ── SVG 커넥터 ───────────────────────────────────────────────────────────── */

function ConnectorSVG({ matchCount, direction }: { matchCount: number; direction: 'left' | 'right' }) {
  const pairCount = matchCount / 2
  const segH = 100 / matchCount

  const paths: string[] = []
  for (let i = 0; i < pairCount; i++) {
    const topY = segH * (i * 2) + segH / 2
    const botY = segH * (i * 2 + 1) + segH / 2
    const midY = (topY + botY) / 2

    if (direction === 'left') {
      paths.push(`M 0 ${topY} L 50 ${topY} L 50 ${midY} L 100 ${midY}`)
      paths.push(`M 0 ${botY} L 50 ${botY} L 50 ${midY}`)
    } else {
      paths.push(`M 100 ${topY} L 50 ${topY} L 50 ${midY} L 0 ${midY}`)
      paths.push(`M 100 ${botY} L 50 ${botY} L 50 ${midY}`)
    }
  }

  return (
    <div style={{ width: 48, minWidth: 48, position: 'relative' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{ stroke: 'var(--text-secondary)' }} />
        ))}
      </svg>
    </div>
  )
}

/** 수평 연결선 (준결승 ↔ 결승) */
function HLine() {
  return (
    <div style={{ width: 32, minWidth: 32, position: 'relative' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <line x1="0" y1="50" x2="100" y2="50" strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          style={{ stroke: 'var(--text-secondary)' }} />
      </svg>
    </div>
  )
}

/* ── 라운드 열 ────────────────────────────────────────────────────────────── */

function RoundColumn({ round, matchMap, tn, onSlotClick, canClick }: {
  round: { name: string; matchNumbers: number[] }
  matchMap: Map<number, LeagueMatch>
  tn: (id: string) => string
  onSlotClick: (mn: number, match?: LeagueMatch) => void
  canClick: (m?: LeagueMatch) => boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: CARD_W }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--text-muted)', paddingBottom: 8,
          borderBottom: '1px solid var(--input-border)',
        }}>
          {round.name}
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {round.matchNumbers.map(mn => {
          const match = matchMap.get(mn)
          return (
            <div key={mn} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
              <MatchCard
                match={match} tn={tn}
                onClick={canClick(match) ? () => onSlotClick(mn, match) : undefined}
                label={`#${mn}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── 메인 BracketView (양쪽 대칭 + SVG 커넥터) ───────────────────────────── */

export default function BracketView({ bracketSize, matches, tn, onSlotClick, leagueStatus }: {
  bracketSize?: 4 | 8 | 16 | 32
  matches: LeagueMatch[]
  tn: (id: string) => string
  onSlotClick: (matchNumber: number, match?: LeagueMatch) => void
  leagueStatus?: string
}) {
  const matchMap = useMemo(() => {
    const map = new Map<number, LeagueMatch>()
    matches.forEach(m => { if (m.matchNumber) map.set(m.matchNumber, m) })
    return map
  }, [matches])

  const template = useMemo(() => bracketSize ? generateBracketTemplate(bracketSize) : [], [bracketSize])

  if (!bracketSize) {
    if (matches.length === 0) return <Empty text="대진표가 없습니다" />
    return <LegacyBracket matches={matches} tn={tn} onMatchClick={m => onSlotClick(m.matchNumber ?? 0, m)} />
  }

  // 좌/우/결승 분할
  const leftRounds: Array<{ name: string; matchNumbers: number[] }> = []
  const rightRounds: Array<{ name: string; matchNumbers: number[] }> = []
  let finalMatchNumber: number | null = null

  for (const round of template) {
    if (round.name === '결승') {
      finalMatchNumber = round.matchNumbers[0]
    } else {
      const half = Math.ceil(round.matchNumbers.length / 2)
      leftRounds.push({ name: round.name, matchNumbers: round.matchNumbers.slice(0, half) })
      rightRounds.push({ name: round.name, matchNumbers: round.matchNumbers.slice(half) })
    }
  }

  const finalMatch = finalMatchNumber ? matchMap.get(finalMatchNumber) : undefined
  const thirdPlaceNumber = bracketSize
  const thirdPlaceMatch = matchMap.get(thirdPlaceNumber)
  const canClick = (m?: LeagueMatch) => leagueStatus === 'ongoing' || m?.status === 'completed' || false
  const rightReversed = [...rightRounds].reverse()
  const firstRoundPerSide = leftRounds[0]?.matchNumbers.length ?? 1
  const minH = firstRoundPerSide * 80

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 'max-content', minHeight: minH }}>

          {/* ── 왼쪽 브래킷 ── */}
          {leftRounds.map((round, ri) => (
            <React.Fragment key={`L-${round.name}`}>
              <RoundColumn round={round} matchMap={matchMap} tn={tn} onSlotClick={onSlotClick} canClick={canClick} />
              {ri < leftRounds.length - 1
                ? <ConnectorSVG matchCount={round.matchNumbers.length} direction="left" />
                : <HLine />
              }
            </React.Fragment>
          ))}

          {/* ── 결승 ── */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: CARD_W + 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', color: '#f59e0b',
                paddingBottom: 8, borderBottom: '2px solid #f59e0b',
              }}>
                결승
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <MatchCard match={finalMatch} tn={tn}
                onClick={canClick(finalMatch) ? () => onSlotClick(finalMatchNumber!, finalMatch) : undefined}
                label={`#${finalMatchNumber}`} />
            </div>
          </div>

          {/* ── 오른쪽 브래킷 (역순) ── */}
          {rightReversed.map((round, ri) => (
            <React.Fragment key={`R-${round.name}`}>
              {ri === 0
                ? <HLine />
                : <ConnectorSVG matchCount={round.matchNumbers.length} direction="right" />
              }
              <RoundColumn round={round} matchMap={matchMap} tn={tn} onSlotClick={onSlotClick} canClick={canClick} />
            </React.Fragment>
          ))}

        </div>
      </div>

      {/* ── 3/4위전 ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            color: 'var(--text-muted)', paddingBottom: 8,
            borderBottom: '1px solid var(--input-border)',
          }}>3/4위전</span>
          <div style={{ flex: 1, height: 1, background: 'var(--input-border)' }} />
        </div>
        <MatchCard match={thirdPlaceMatch} tn={tn}
          onClick={canClick(thirdPlaceMatch) ? () => onSlotClick(thirdPlaceNumber, thirdPlaceMatch) : undefined}
          label={`#${thirdPlaceNumber}`} />
      </div>
    </div>
  )
}

/* ── 레거시 브래킷 (bracketSize 없는 기존 토너먼트) ──────────────────────── */

function LegacyBracket({ matches, tn, onMatchClick }: {
  matches: LeagueMatch[]; tn: (id: string) => string; onMatchClick: (m: LeagueMatch) => void
}) {
  const roundGroups: Array<{ round: string; matches: LeagueMatch[] }> = []
  const used = new Set<string>()

  for (const r of ROUND_ORDER) {
    const ms = matches.filter(m => m.round === r).sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))
    if (ms.length > 0) {
      roundGroups.push({ round: r, matches: ms })
      ms.forEach(m => used.add(m.id))
    }
  }
  const remaining = matches.filter(m => m.round && !used.has(m.id) && m.round !== '3/4위전')
  const otherRounds = Array.from(new Set(remaining.map(m => m.round!)))
  for (const r of otherRounds) {
    roundGroups.push({ round: r, matches: remaining.filter(m => m.round === r) })
  }

  const thirdPlaceMatch = matches.find(m => m.round === '3/4위전')
  if (roundGroups.length === 0) return <Empty text="대진표가 없습니다" />

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-4">
        <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 'max-content' }}>
          {roundGroups.map((group, gi) => (
            <React.Fragment key={group.round}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: CARD_W }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: 'var(--text-muted)', paddingBottom: 8,
                    borderBottom: '1px solid var(--input-border)',
                  }}>
                    {group.round}
                  </span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {group.matches.map(m => (
                    <div key={m.id} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                      <MatchCard match={m} tn={tn} onClick={() => onMatchClick(m)}
                        label={m.matchNumber ? `#${m.matchNumber}` : undefined} />
                    </div>
                  ))}
                </div>
              </div>
              {gi < roundGroups.length - 1 && (
                <ConnectorSVG matchCount={Math.max(2, group.matches.length)} direction="left" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      {thirdPlaceMatch && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              color: 'var(--text-muted)', paddingBottom: 8,
              borderBottom: '1px solid var(--input-border)',
            }}>3/4위전</span>
            <div style={{ flex: 1, height: 1, background: 'var(--input-border)' }} />
          </div>
          <MatchCard match={thirdPlaceMatch} tn={tn} onClick={() => onMatchClick(thirdPlaceMatch)}
            label={thirdPlaceMatch.matchNumber ? `#${thirdPlaceMatch.matchNumber}` : undefined} />
        </div>
      )}
    </div>
  )
}
