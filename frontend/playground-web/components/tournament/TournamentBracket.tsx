"use client";

import { Fragment, useState } from 'react';
import { TournamentMatch, TournamentRoundKey, ROUND_ORDER, ROUND_LABEL } from '@/types/tournament';
import MatchCard from './MatchCard';
import { ChevronRight } from 'lucide-react';

interface Props {
  matches: TournamentMatch[];
  scoreEditable?: boolean;
  onScoreEdit?: (match: TournamentMatch) => void;
}

const ROUND_TABS: { key: TournamentRoundKey | 'all' | 'sedaily'; label: string }[] = [
  { key: 'sedaily', label: '서경' },
  { key: 'all',     label: '대진표' },
  { key: 'R1',  label: '1R' },
  { key: 'R2',  label: '2R' },
  { key: 'R3',  label: '16강' },
  { key: 'QF',  label: '8강' },
  { key: 'SF',  label: '4강' },
  { key: 'F3',  label: '3결' },
  { key: 'F1',  label: '결승' },
];

// 서경 경기 경로 (matchNo 기준 — 52회: 9→33→46→53→56→59)
const SEDAILY_PATH_MATCHES = [9, 33, 46, 53, 56, 59];

// ─────────────────────────────────────────────────────────────
// 레이아웃 상수
// ─────────────────────────────────────────────────────────────
const HEADER_H = 32;   // 라운드 헤더 높이
const COL_W = 140;     // 라운드 열 너비
const CONN_W = 28;     // 커넥터 너비
const HLINE_W = 20;    // 수평 연결선 너비

// ─────────────────────────────────────────────────────────────
// 라운드 열 — 헤더 + 카드 영역 분리 (커넥터 정렬용)
// ─────────────────────────────────────────────────────────────
function RoundColumn({ label, matches, onScoreEdit, scoreEditable }: {
  label: string;
  matches: TournamentMatch[];
  scoreEditable?: boolean;
  onScoreEdit?: (match: TournamentMatch) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: COL_W, minWidth: COL_W }}>
      <div style={{
        height: HEADER_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid var(--input-border, #E5E7EB)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-muted, #9CA3AF)' }}>
          {label}
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {matches.map(m => (
          <div key={m.matchNo} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 0',
          }}>
            <div style={{ width: '100%' }}>
              <MatchCard match={m} compact scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SVG 커넥터 — 2:1 합류 라인 (헤더 오프셋 적용)
// ─────────────────────────────────────────────────────────────
function ConnectorSVG({ matchCount, direction }: {
  matchCount: number;
  direction: 'left' | 'right';
}) {
  const safeCount = Math.max(2, matchCount % 2 === 0 ? matchCount : matchCount + 1);
  const pairCount = safeCount / 2;
  const segH = 100 / safeCount;

  const paths: string[] = [];
  for (let i = 0; i < pairCount; i++) {
    const topY = segH * (i * 2) + segH / 2;
    const botY = segH * (i * 2 + 1) + segH / 2;
    const midY = (topY + botY) / 2;

    if (direction === 'left') {
      paths.push(`M 0 ${topY} L 50 ${topY} L 50 ${midY} L 100 ${midY}`);
      paths.push(`M 0 ${botY} L 50 ${botY} L 50 ${midY}`);
    } else {
      paths.push(`M 100 ${topY} L 50 ${topY} L 50 ${midY} L 0 ${midY}`);
      paths.push(`M 100 ${botY} L 50 ${botY} L 50 ${midY}`);
    }
  }

  return (
    <div style={{ width: CONN_W, minWidth: CONN_W, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: HEADER_H }} />
      <div style={{ flex: 1, position: 'relative' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0 }}>
          {paths.map((d, i) => (
            <path key={i} d={d} fill="none" strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              style={{ stroke: 'var(--text-muted, #D1D5DB)' }} />
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 수평 연결선 (4강 → 결승, 헤더 오프셋 적용)
// ─────────────────────────────────────────────────────────────
function HLine() {
  return (
    <div style={{ width: HLINE_W, minWidth: HLINE_W, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: HEADER_H }} />
      <div style={{ flex: 1, position: 'relative' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0 }}>
          <line x1="0" y1="50" x2="100" y2="50" strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{ stroke: 'var(--text-muted, #D1D5DB)' }} />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 구분선 (canPair 실패 시 fallback, 헤더 오프셋 적용)
// ─────────────────────────────────────────────────────────────
function Spacer() {
  return (
    <div style={{ width: CONN_W, minWidth: CONN_W, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: HEADER_H }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 1, height: '50%', background: 'var(--input-border, #E5E7EB)', opacity: 0.4 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BracketLayout — R1(예선) 제외, R2~결승 bracket 뷰
//
// KJA 52회 기준:
//   좌측: R2(8) → R3(4) → QF(2) → SF(1) | 결승 | SF(1) → QF(2) → R3(4) → R2(8) :우측
//   모든 라운드 간 비율이 정확히 2:1 → 완벽한 커넥터 라인
// ─────────────────────────────────────────────────────────────
function BracketLayout({ matches, scoreEditable, onScoreEdit }: {
  matches: TournamentMatch[];
  scoreEditable?: boolean;
  onScoreEdit?: (match: TournamentMatch) => void;
}) {
  // R1(예선) 제외 — 13+14=27경기는 bracket에 비실용적
  const bracketMatches = matches.filter(m => m.round !== 'R1');

  const leftMatches = bracketMatches.filter(m => m.block === 'left');
  const rightMatches = bracketMatches.filter(m => m.block === 'right');
  const finalMatches = bracketMatches.filter(m => m.block === 'final');

  const groupByRound = (ms: TournamentMatch[]) => {
    const groups: Array<{ round: TournamentRoundKey; label: string; matches: TournamentMatch[] }> = [];
    const roundMap = new Map<TournamentRoundKey, TournamentMatch[]>();

    for (const m of ms) {
      if (!roundMap.has(m.round)) roundMap.set(m.round, []);
      roundMap.get(m.round)!.push(m);
    }

    for (const r of ROUND_ORDER) {
      const roundMs = roundMap.get(r);
      if (roundMs && roundMs.length > 0) {
        roundMs.sort((a, b) => a.matchNo - b.matchNo);
        groups.push({ round: r, label: ROUND_LABEL[r] || r, matches: roundMs });
      }
    }
    return groups;
  };

  const leftGroups = groupByRound(leftMatches);
  const rightGroups = groupByRound(rightMatches);

  const finalMatch = finalMatches.find(m => m.round === 'F1');
  const thirdPlaceMatch = finalMatches.find(m => m.round === 'F3');

  const canPair = (current: number, next: number) =>
    current >= 2 && current === next * 2;

  // Bracket 높이 = 헤더 + 가장 많은 경기 수 × 슬롯 높이
  const maxLeft = leftGroups.length > 0 ? Math.max(...leftGroups.map(g => g.matches.length)) : 0;
  const maxRight = rightGroups.length > 0 ? Math.max(...rightGroups.map(g => g.matches.length)) : 0;
  const maxMatches = Math.max(maxLeft, maxRight, 2);
  const bracketHeight = HEADER_H + maxMatches * 64;

  return (
    <div>
      <div style={{ overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' }}>
        <div style={{
          display: 'flex', alignItems: 'stretch',
          minWidth: 'max-content', height: bracketHeight,
        }}>

          {/* ── 좌측 블록 (R2→R3→QF→SF, 왼→오 진행) ── */}
          {leftGroups.map((group, gi) => {
            const nextGroup = leftGroups[gi + 1];
            const isLast = gi >= leftGroups.length - 1;
            const paired = nextGroup && canPair(group.matches.length, nextGroup.matches.length);

            return (
              <Fragment key={`L-${group.round}`}>
                <RoundColumn
                  label={group.label}
                  matches={group.matches}
                  scoreEditable={scoreEditable}
                  onScoreEdit={onScoreEdit}
                />
                {isLast
                  ? <HLine />
                  : paired
                    ? <ConnectorSVG matchCount={group.matches.length} direction="left" />
                    : <Spacer />
                }
              </Fragment>
            );
          })}

          {/* ── 결승 + 3·4위전 (중앙) ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            width: 160, minWidth: 160, padding: '0 4px',
          }}>
            <div style={{
              height: HEADER_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderBottom: '2px solid #f59e0b',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#f59e0b' }}>
                결승
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
              {finalMatch && (
                <MatchCard match={finalMatch} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
              )}
              {thirdPlaceMatch && (
                <div>
                  <p style={{
                    textAlign: 'center', fontSize: 10, fontWeight: 600,
                    color: 'var(--text-muted, #9CA3AF)', marginBottom: 4,
                  }}>
                    3·4위전
                  </p>
                  <MatchCard match={thirdPlaceMatch} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
                </div>
              )}
            </div>
          </div>

          {/* ── 우측 블록 (SF→QF→R3→R2, 역순 렌더) ── */}
          {(() => {
            const reversed = [...rightGroups].reverse();
            return reversed.map((group, ri) => {
              const prevGroup = reversed[ri - 1];
              const paired = prevGroup
                && group.matches.length >= 2
                && group.matches.length === prevGroup.matches.length * 2;

              return (
                <Fragment key={`R-${group.round}`}>
                  {ri === 0
                    ? <HLine />
                    : paired
                      ? <ConnectorSVG matchCount={group.matches.length} direction="right" />
                      : <Spacer />
                  }
                  <RoundColumn
                    label={group.label}
                    matches={group.matches}
                    scoreEditable={scoreEditable}
                    onScoreEdit={onScoreEdit}
                  />
                </Fragment>
              );
            });
          })()}

        </div>
      </div>

      <p style={{ fontSize: 10, color: 'var(--text-muted, #9CA3AF)', textAlign: 'center', marginTop: 4 }}>
        1회전(예선)은 &apos;1R&apos; 탭에서 확인
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function TournamentBracket({ matches, scoreEditable, onScoreEdit }: Props) {
  const [activeTab, setActiveTab] = useState<string>('sedaily');

  const sedailyMatches = matches.filter(m => m.isSedailyMatch || SEDAILY_PATH_MATCHES.includes(m.matchNo));
  const filteredMatches = activeTab === 'all'
    ? matches
    : activeTab === 'sedaily'
    ? sedailyMatches
    : matches.filter(m => m.round === activeTab);

  const leftBlock = filteredMatches.filter(m => m.block === 'left');
  const rightBlock = filteredMatches.filter(m => m.block === 'right');
  const finalBlock = filteredMatches.filter(m => m.block === 'final');

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        {ROUND_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
            style={
              activeTab === tab.key
                ? { background: '#4F46E5', color: 'white' }
                : { background: '#F3F4F6', color: 'var(--text-muted)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 서경 경기 경로 뷰 */}
      {activeTab === 'sedaily' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
            {sedailyMatches.map((match, i) => (
              <div key={match.matchNo} className="flex items-center gap-1.5 shrink-0">
                <div className="w-36">
                  <MatchCard match={match} compact scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
                </div>
                {i < sedailyMatches.length - 1 && (
                  <ChevronRight size={14} style={{ color: '#9CA3AF' }} />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {sedailyMatches.map(match => (
              <MatchCard key={match.matchNo} match={match} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
            ))}
          </div>
        </div>
      )}

      {/* ★ 대진표 뷰 — bracket 레이아웃 (R2~결승) */}
      {activeTab === 'all' && (
        <BracketLayout
          matches={matches}
          scoreEditable={scoreEditable}
          onScoreEdit={onScoreEdit}
        />
      )}

      {/* 라운드별 뷰 — grid */}
      {activeTab !== 'sedaily' && activeTab !== 'all' && (
        <div className="space-y-5">
          {leftBlock.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-muted)' }}>
                좌측 블록 ({leftBlock.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {leftBlock.map(m => (
                  <MatchCard key={m.matchNo} match={m} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
                ))}
              </div>
            </div>
          )}

          {rightBlock.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-muted)' }}>
                우측 블록 ({rightBlock.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {rightBlock.map(m => (
                  <MatchCard key={m.matchNo} match={m} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
                ))}
              </div>
            </div>
          )}

          {finalBlock.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-muted)' }}>결승</p>
              <div className="grid grid-cols-2 gap-3">
                {finalBlock.map(m => (
                  <MatchCard key={m.matchNo} match={m} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
                ))}
              </div>
            </div>
          )}

          {filteredMatches.length === 0 && (
            <p className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>해당 라운드 경기 없음</p>
          )}
        </div>
      )}
    </div>
  );
}
