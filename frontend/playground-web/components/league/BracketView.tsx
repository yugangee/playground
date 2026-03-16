'use client'

import React, { useMemo } from 'react'
import { Medal, Trophy } from 'lucide-react'
import { Empty } from './shared'
import { ROUND_ORDER, generateBracketTemplate, nextPowerOf2, type LeagueMatch } from './utils'

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
    <div className="mb-6 rounded-2xl p-5" style={{ background: 'var(--color-warning-light)', border: '1px solid rgba(245,158,11,0.2)' }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>대회 결과</h3>
      <div className="flex items-end justify-center gap-4 mb-5">
        {second && (
          <div className="text-center">
            <div className="flex justify-center text-xl mb-1"><Medal size={20} style={{ color: '#94a3b8' }} /></div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{tn(second)}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>준우승</div>
          </div>
        )}
        {first && (
          <div className="text-center -mt-2">
            <div className="flex justify-center text-2xl mb-1"><Trophy size={24} style={{ color: '#f59e0b' }} /></div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{tn(first)}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>우승</div>
          </div>
        )}
        {third && (
          <div className="text-center">
            <div className="flex justify-center text-xl mb-1"><Medal size={20} style={{ color: '#d97706' }} /></div>
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
  const isCompleted = match.status === 'completed'
  const isForfeit = match.status === 'forfeit'

  const winner = (() => {
    if (!isCompleted && !isForfeit) return null
    if (match.winner) return match.winner
    if (isForfeit && match.forfeitTeamId) {
      return match.forfeitTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId
    }
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

  const isForfeitTeam = (id: string) => isForfeit && match.forfeitTeamId === id

  const teamRow = (id: string, score: number | undefined, isWin: boolean, isTop: boolean) => {
    const isPlaceholder = id === 'TBD' || id === 'BYE'
    const isForfeited = isForfeitTeam(id)
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px',
        borderTop: isTop ? undefined : '1px solid var(--input-border)',
        background: isWin ? 'rgba(16,185,129,0.08)' : isForfeited ? 'rgba(239,68,68,0.06)' : undefined,
        opacity: (isCompleted || isForfeit) && !isWin && winner ? 0.45 : 1,
      }}>
        <span style={{
          flex: 1, fontSize: 13, letterSpacing: '-0.01em',
          fontWeight: isWin ? 700 : isPlaceholder ? 400 : 600,
          color: isForfeited ? '#ef4444' : isPlaceholder ? 'var(--text-muted)' : 'var(--text-primary)',
          fontStyle: isPlaceholder ? 'italic' : undefined,
          textDecoration: isForfeited ? 'line-through' : undefined,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {teamName(id)}
        </span>
        {isForfeited && (
          <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            몰수패
          </span>
        )}
        {(isCompleted || isForfeit) && !isBye && !isForfeited && score !== undefined && (
          <span style={{
            fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: isWin ? 'var(--text-primary)' : 'var(--text-muted)',
            minWidth: 22, textAlign: 'right',
          }}>
            {score}
          </span>
        )}
        {(isCompleted || isForfeit) && isBye && isWin && (
          <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            W.O.
          </span>
        )}
        {isWin && !isBye && !isForfeit && <span style={{ fontSize: 10, color: '#10b981' }}>✓</span>}
      </div>
    )
  }

  return (
    <div
      className={onClick ? 'bracket-card-interactive' : ''}
      style={{
        width: CARD_W, borderRadius: 10, overflow: 'hidden',
        border: isForfeit ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--input-border)',
        background: 'var(--card-bg)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isBye && isCompleted ? 0.55 : 1,
        transition: 'all 0.2s ease',
      }}
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
  // 홀수 방어: 최소 2, 짝수로 보정
  const safeCount = Math.max(2, matchCount % 2 === 0 ? matchCount : matchCount + 1)
  const pairCount = safeCount / 2
  const segH = 100 / safeCount

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
  bracketSize?: number
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

  // Custom block-based bracket: if any match has a `block` field, use block layout
  const hasCustomBlocks = useMemo(() => matches.some(m => m.block), [matches])

  const template = useMemo(() => bracketSize ? generateBracketTemplate(bracketSize) : [], [bracketSize])

  if (!bracketSize) {
    if (matches.length === 0) return <Empty text="대진표가 없습니다" />
    if (hasCustomBlocks) {
      return <CustomBlockBracket matches={matches} tn={tn} onSlotClick={onSlotClick} leagueStatus={leagueStatus} />
    }
    return <LegacyBracket matches={matches} tn={tn} onMatchClick={m => onSlotClick(m.matchNumber ?? 0, m)} />
  }

  // If matches have custom block info, use block-based rendering
  if (hasCustomBlocks) {
    return <CustomBlockBracket matches={matches} tn={tn} onSlotClick={onSlotClick} leagueStatus={leagueStatus} />
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

  const p2 = nextPowerOf2(bracketSize)
  const finalMatch = finalMatchNumber ? matchMap.get(finalMatchNumber) : undefined
  // 3/4위전: 정규 매치(p2-1) 다음 번호. round 이름으로도 fallback 검색.
  const thirdPlaceNumber = p2 // = (p2 - 1) + 1 = 총 정규 매치 수 + 1
  const thirdPlaceMatch = matchMap.get(thirdPlaceNumber)
    ?? Array.from(matchMap.values()).find(m => m.round === '3/4위전')
  const canClick = (m?: LeagueMatch) => leagueStatus === 'ongoing' || m?.status === 'completed' || m?.status === 'forfeit' || false
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
          {rightReversed.map((round, ri) => {
            const prevRound = rightReversed[ri - 1]
            const canPair = prevRound && round.matchNumbers.length >= 2 && round.matchNumbers.length === prevRound.matchNumbers.length * 2
            return (
              <React.Fragment key={`R-${round.name}`}>
                {ri === 0
                  ? <HLine />
                  : canPair
                    ? <ConnectorSVG matchCount={round.matchNumbers.length} direction="right" />
                    : <div style={{ width: 24, minWidth: 24 }} />
                }
                <RoundColumn round={round} matchMap={matchMap} tn={tn} onSlotClick={onSlotClick} canClick={canClick} />
              </React.Fragment>
            )
          })}

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

/* ── 커스텀 블록 브래킷 (block 필드 기반 비대칭 대진표) ────────────────────── */

function CustomBlockBracket({ matches, tn, onSlotClick, leagueStatus }: {
  matches: LeagueMatch[]
  tn: (id: string) => string
  onSlotClick: (matchNumber: number, match?: LeagueMatch) => void
  leagueStatus?: string
}) {
  const canClick = (m?: LeagueMatch) => leagueStatus === 'ongoing' || m?.status === 'completed' || m?.status === 'forfeit' || false

  // Separate matches by block
  const leftMatches = matches.filter(m => m.block === 'left')
  const rightMatches = matches.filter(m => m.block === 'right')
  const finalMatches = matches.filter(m => m.block === 'final')
  const thirdPlaceMatch = matches.find(m => m.round === '3/4위전')

  // Group by round within each block
  const groupByRound = (ms: LeagueMatch[]) => {
    const groups: Array<{ round: string; matches: LeagueMatch[] }> = []
    const roundSet = new Map<string, LeagueMatch[]>()
    for (const m of ms) {
      const r = m.round ?? '?'
      if (!roundSet.has(r)) roundSet.set(r, [])
      roundSet.get(r)!.push(m)
    }
    // Sort rounds by ROUND_ORDER
    const orderedRounds = [...roundSet.keys()].sort((a, b) => {
      const ai = ROUND_ORDER.indexOf(a)
      const bi = ROUND_ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    for (const r of orderedRounds) {
      if (r !== '3/4위전') {
        groups.push({ round: r, matches: roundSet.get(r)!.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)) })
      }
    }
    return groups
  }

  const leftGroups = groupByRound(leftMatches)
  const rightGroups = groupByRound(rightMatches)

  const matchMap = new Map<number, LeagueMatch>()
  matches.forEach(m => { if (m.matchNumber) matchMap.set(m.matchNumber, m) })

  const renderBlockColumn = (group: { round: string; matches: LeagueMatch[] }) => (
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
            <MatchCard match={m} tn={tn}
              onClick={canClick(m) ? () => onSlotClick(m.matchNumber ?? 0, m) : undefined}
              label={m.matchNumber ? `#${m.matchNumber}` : undefined} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 'max-content' }}>

          {/* Left block */}
          {leftGroups.map((group, gi) => {
            const nextGroup = leftGroups[gi + 1]
            const isLast = gi >= leftGroups.length - 1
            const canPair = nextGroup && group.matches.length >= 2 && group.matches.length === nextGroup.matches.length * 2
            return (
              <React.Fragment key={`L-${group.round}`}>
                {renderBlockColumn(group)}
                {isLast
                  ? <HLine />
                  : canPair
                    ? <ConnectorSVG matchCount={group.matches.length} direction="left" />
                    : <div style={{ width: 24, minWidth: 24 }} />
                }
              </React.Fragment>
            )
          })}

          {/* Final (결승만 — 3/4위전은 하단 별도 표시) */}
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
            {finalMatches.filter(m => m.round !== '3/4위전').length > 0
              ? finalMatches.filter(m => m.round !== '3/4위전').map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                  <MatchCard match={m} tn={tn}
                    onClick={canClick(m) ? () => onSlotClick(m.matchNumber ?? 0, m) : undefined}
                    label={m.matchNumber ? `#${m.matchNumber}` : undefined} />
                </div>
              )) : (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <MatchCard match={undefined} tn={tn} label="결승" />
                </div>
              )}
          </div>

          {/* Right block (reversed for symmetry) */}
          {(() => {
            const reversed = [...rightGroups].reverse()
            return reversed.map((group, ri) => {
              const prevGroup = reversed[ri - 1]
              // 우측은 reversed이므로 group이 더 큰 라운드(경기 수 많음), prevGroup이 상위 라운드(경기 수 적음)
              // 커넥터는 group(많은 쪽) → prevGroup(적은 쪽)으로 합쳐야 하므로 matchCount=group.matches.length
              const canPair = prevGroup && group.matches.length >= 2 && group.matches.length === prevGroup.matches.length * 2
              return (
                <React.Fragment key={`R-${group.round}`}>
                  {ri === 0
                    ? <HLine />
                    : canPair
                      ? <ConnectorSVG matchCount={group.matches.length} direction="right" />
                      : <div style={{ width: 24, minWidth: 24 }} />
                  }
                  {renderBlockColumn(group)}
                </React.Fragment>
              )
            })
          })()}

        </div>
      </div>

      {/* 3/4위전 */}
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
          <MatchCard match={thirdPlaceMatch} tn={tn}
            onClick={canClick(thirdPlaceMatch) ? () => onSlotClick(thirdPlaceMatch.matchNumber ?? 0, thirdPlaceMatch) : undefined}
            label={thirdPlaceMatch.matchNumber ? `#${thirdPlaceMatch.matchNumber}` : undefined} />
        </div>
      )}
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
                // LegacyBracket은 좌→우 일방향 진행이므로 항상 direction="left"
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
