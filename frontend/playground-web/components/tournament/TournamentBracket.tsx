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
  { key: 'sedaily', label: '서경' },
  { key: 'all',     label: '전체' },
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
          {/* 경로 플로우 */}
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

          {/* 서경 경기 상세 카드 */}
          <div className="grid grid-cols-2 gap-3">
            {sedailyMatches.map(match => (
              <MatchCard key={match.matchNo} match={match} scoreEditable={scoreEditable} onScoreEdit={onScoreEdit} />
            ))}
          </div>
        </div>
      )}

      {/* 전체 / 라운드별 뷰 */}
      {activeTab !== 'sedaily' && (
        <div className="space-y-5">
          {/* 좌측 블록 */}
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

          {/* 우측 블록 */}
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

          {/* 결승 */}
          {finalMatches.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-muted)' }}>결승</p>
              <div className="grid grid-cols-2 gap-3">
                {finalMatches.map(m => (
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
