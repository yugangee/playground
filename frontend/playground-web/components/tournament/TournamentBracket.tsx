"use client";

import { useState } from 'react';
import { TournamentMatch, TournamentRoundKey, ROUND_LABEL } from '@/types/tournament';
import MatchCard from './MatchCard';
import { ChevronRight } from 'lucide-react';

interface Props {
  matches: TournamentMatch[];
  scoreEditable?: boolean;
  onScoreEdit?: (match: TournamentMatch) => void;
}

const ROUND_TABS: { key: TournamentRoundKey | 'all' | 'sedaily'; label: string }[] = [
  { key: 'sedaily', label: '⭐ 서경 경로' },
  { key: 'all',     label: '전체' },
  { key: 'R1',  label: ROUND_LABEL['R1'] },
  { key: 'R2',  label: ROUND_LABEL['R2'] },
  { key: 'QF',  label: ROUND_LABEL['QF'] },
  { key: 'SF',  label: ROUND_LABEL['SF'] },
  { key: 'F3',  label: ROUND_LABEL['F3'] },
  { key: 'F1',  label: ROUND_LABEL['F1'] },
];

// 서경 경기 경로 (matchNo 기준)
const SEDAILY_PATH_MATCHES = [38, 48, 53, 55, 56];

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
  const finalMatches = filteredMatches.filter(m => m.block === 'final');

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="flex gap-2 flex-wrap">
        {ROUND_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              activeTab === tab.key
                ? { background: 'linear-gradient(to right, #c026d3, #7c3aed)', color: 'white' }
                : { background: 'var(--chip-inactive-bg)', color: 'var(--chip-inactive-color)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 서경 경기 경로 뷰 */}
      {activeTab === 'sedaily' && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4" style={{ background: 'rgba(192,38,211,0.06)', borderColor: 'rgba(192,38,211,0.25)' }}>
            <h3 className="text-sm font-bold mb-1" style={{ color: '#e879f9' }}>서울경제 어벤져스 대진 경로</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              4시드 배정. 우측 블록 38조에서 시작 → 8강(48조) → 4강(53조) → 우측 블록 결승(55조) → 결승
            </p>

            {/* 경로 플로우 */}
            <div className="flex items-start gap-2 overflow-x-auto pb-2">
              {sedailyMatches.map((match, i) => (
                <div key={match.matchNo} className="flex items-start gap-2 shrink-0">
                  <div className="w-44">
                    <MatchCard match={match} compact scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
                  </div>
                  {i < sedailyMatches.length - 1 && (
                    <div className="flex items-center h-16 mt-2">
                      <ChevronRight size={20} style={{ color: '#e879f9' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 서경 경기 상세 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sedailyMatches.map(match => (
              <MatchCard key={match.matchNo} match={match} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
            ))}
          </div>
        </div>
      )}

      {/* 전체 / 라운드별 뷰 */}
      {activeTab !== 'sedaily' && (
        <div className="space-y-8">
          {/* 좌측 블록 */}
          {leftBlock.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  좌측 블록 ({leftBlock.length}경기)
                </h3>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>→ 54조 결승</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {leftBlock.map(m => (
                  <MatchCard key={m.matchNo} match={m} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
                ))}
              </div>
            </div>
          )}

          {/* 우측 블록 */}
          {rightBlock.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  우측 블록 ({rightBlock.length}경기)
                </h3>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>→ 55조 결승 · 서경 경로</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rightBlock.map(m => (
                  <MatchCard key={m.matchNo} match={m} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
                ))}
              </div>
            </div>
          )}

          {/* 결승 */}
          {finalMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>결승 라운드</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                {finalMatches.map(m => (
                  <MatchCard key={m.matchNo} match={m} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
                ))}
              </div>
            </div>
          )}

          {filteredMatches.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>해당 라운드 경기가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
