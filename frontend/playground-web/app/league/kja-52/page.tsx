"use client";

import { useState } from 'react';
import { Calendar, ChevronRight, AlertTriangle, Shield } from 'lucide-react';
import TournamentBracket from '@/components/tournament/TournamentBracket';
import TeamRoster from '@/components/tournament/TeamRoster';
import { kja52 } from '@/data/kja-tournament-52';
import { kja51 } from '@/data/kja-tournament-51';
import { TournamentMatch } from '@/types/tournament';

type Tab = 'bracket' | 'schedule' | 'sedaily' | 'history' | 'rules';

const TABS: { key: Tab; label: string }[] = [
  { key: 'bracket',  label: '대진표' },
  { key: 'schedule', label: '경기 일정' },
  { key: 'sedaily',  label: '서경 어벤져스' },
  { key: 'history',  label: '이전 대회' },
  { key: 'rules',    label: '대회 규정' },
];

// ─────────────────────────────────────────────────────────────
// 스코어 입력 모달
// ─────────────────────────────────────────────────────────────
function ScoreModal({
  match,
  onClose,
  onSave,
}: {
  match: TournamentMatch;
  onClose: () => void;
  onSave: (matchNo: number, home: number, away: number, pkHome?: number, pkAway?: number) => void;
}) {
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [isPK, setIsPK] = useState(false);
  const [pkHome, setPkHome] = useState(0);
  const [pkAway, setPkAway] = useState(0);

  const handleSave = () => {
    onSave(match.matchNo, home, away, isPK ? pkHome : undefined, isPK ? pkAway : undefined);
    onClose();
  };

  const numInput = (value: number, onChange: (v: number) => void) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-lg font-bold text-lg transition-colors"
        style={{ background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}
      >−</button>
      <span className="text-2xl font-bold w-8 text-center tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg font-bold text-lg transition-colors"
        style={{ background: 'rgba(79,70,229,0.15)', color: '#818CF8', border: '1px solid rgba(79,70,229,0.3)' }}
      >+</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl border p-6 space-y-5"
        style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--card-border)' }}>
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>스코어 입력</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{match.matchNo}조 · {match.roundLabel}</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center space-y-2">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {match.homeTeam && 'name' in match.homeTeam ? match.homeTeam.name : '홈팀'}
            </p>
            {numInput(home, setHome)}
          </div>
          <span className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>:</span>
          <div className="flex-1 text-center space-y-2">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {match.awayTeam && 'name' in match.awayTeam ? match.awayTeam.name : '어웨이팀'}
            </p>
            {numInput(away, setAway)}
          </div>
        </div>

        {home === away && (
          <div>
            <button
              onClick={() => setIsPK(p => !p)}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: isPK ? '#fbbf24' : 'var(--text-muted)' }}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center`}
                style={{ borderColor: isPK ? '#fbbf24' : 'var(--card-border)', background: isPK ? 'rgba(251,191,36,0.2)' : 'transparent' }}>
                {isPK && <span className="text-[10px] text-amber-400">✓</span>}
              </div>
              승부차기(PK) 진행
            </button>

            {isPK && (
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="flex-1 text-center space-y-1">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>홈 PK</p>
                  {numInput(pkHome, setPkHome)}
                </div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>:</span>
                <div className="flex-1 text-center space-y-1">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>어웨이 PK</p>
                  {numInput(pkAway, setPkAway)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
            취소
          </button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(79,70,229,0.1)', border: '2px solid rgba(79,70,229,0.3)', color: '#4F46E5' }}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────────────────────
export default function KJA52Page() {
  const [activeTab, setActiveTab] = useState<Tab>('bracket');
  const [matches, setMatches] = useState(kja52.matches);
  const [editingMatch, setEditingMatch] = useState<TournamentMatch | null>(null);

  const handleScoreEdit = (match: TournamentMatch) => setEditingMatch(match);

  const handleScoreSave = (matchNo: number, home: number, away: number, pkHome?: number, pkAway?: number) => {
    setMatches(prev => prev.map(m => {
      if (m.matchNo !== matchNo) return m;
      const isPK = home === away && pkHome !== undefined;
      return {
        ...m,
        status: 'completed' as const,
        score: { home, away, pkHome: isPK ? pkHome : undefined, pkAway: isPK ? pkAway : undefined },
      };
    }));
  };

  const completedCount = matches.filter(m => m.status === 'completed').length;
  const sedailyMatch = matches.find(m => m.matchNo === 9);

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* 히어로 섹션 */}
      <div className="rounded-xl p-5" style={{ background: 'var(--card-bg)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#6B7280' }}>DEMO</span>
        </div>
        <h1 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          제52회 한국기자협회 서울지역 축구대회
        </h1>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          2026년 4월 · {kja52.teamsCount}개팀 · {kja52.matchesCount}경기
        </p>
        <div className="flex gap-2 flex-wrap">
          {[
            { seed: '1시드', name: 'YTN' },
            { seed: '2시드', name: '동아일보' },
          ].map(({ seed, name }) => (
            <span key={name} className="text-[11px] px-2 py-1 rounded"
              style={{ background: '#F9FAFB', color: 'var(--text-muted)' }}>
              {seed} {name}
            </span>
          ))}
          <span className="text-[11px] px-2 py-1 rounded"
            style={{ background: '#EEF2FF', color: '#4F46E5' }}>
            서울경제 · 1회전 9조
          </span>
        </div>
      </div>

      {/* 서경 경기 바로가기 */}
      {sedailyMatch && (
        <button onClick={() => setActiveTab('bracket')}
          className="w-full rounded-lg px-4 py-3 flex items-center justify-between text-left"
          style={{ background: '#EEF2FF' }}>
          <div className="flex items-center gap-2.5">
            <Shield size={16} style={{ color: '#4F46E5' }} />
            <span className="text-xs font-medium" style={{ color: '#4F46E5' }}>
              서울경제 첫 경기: 9조 뉴스핌 vs 서울경제
            </span>
          </div>
          <ChevronRight size={14} style={{ color: '#4F46E5' }} />
        </button>
      )}

      {/* 탭 */}
      <div className="flex gap-1 overflow-x-auto hide-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-2 text-xs font-medium shrink-0 rounded-lg transition-colors"
            style={
              activeTab === tab.key
                ? { background: '#4F46E5', color: 'white' }
                : { background: 'transparent', color: 'var(--text-muted)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 대진표 */}
      {activeTab === 'bracket' && (
        <TournamentBracket
          matches={matches}
          scoreEditable
          onScoreEdit={handleScoreEdit}
        />
      )}

      {/* 경기 일정 */}
      {activeTab === 'schedule' && (
        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--card-bg)' }}>
          <Calendar size={20} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>경기 일정</p>
          <div className="mt-3 p-2 rounded text-left text-[10px] space-y-0.5"
            style={{ background: '#FEF3C7', color: '#92400E' }}>
            <p>1일차: 4월 18일(토) — 고양 어울림누리, 노원 마들스타디움, 농협대학교</p>
            <p>2일차: 4월 19일(일) — 농협대학교</p>
            <p>3일차: 4월 25일(토) — 고양 어울림누리 (8강~결승)</p>
          </div>
        </div>
      )}

      {/* 서경 어벤져스 */}
      {activeTab === 'sedaily' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center font-semibold text-white text-[10px]"
              style={{ background: '#4F46E5' }}>SE</div>
            <div>
              <h2 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>서울경제 어벤져스</h2>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>시드 없음 · 1회전 출전</p>
            </div>
          </div>

          <div className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: '#FEF2F2' }}>
            <AlertTriangle size={12} style={{ color: '#DC2626' }} />
            <p className="text-[10px]" style={{ color: '#DC2626' }}>7명 미만 시 몰수패</p>
          </div>

          <TeamRoster roster={kja52.roster} />
        </div>
      )}

      {/* 이전 대회 */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>제51회 결과 (2025년)</p>
          <p className="text-[10px] p-2 rounded" style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>
            51회 대회 결과는 추후 업데이트 예정
          </p>
        </div>
      )}

      {/* 대회 규정 */}
      {activeTab === 'rules' && (
        <div className="space-y-2">
          {kja52.rules.map((rule, i) => (
            <RuleAccordion key={i} title={rule.title} content={rule.content} />
          ))}
        </div>
      )}

      {/* 스코어 입력 모달 */}
      {editingMatch && (
        <ScoreModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSave={handleScoreSave}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────────────────────
function RuleAccordion({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--card-bg)' }}>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <ChevronRight
          size={12}
          className="shrink-0 transition-transform"
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'none' }}
        />
      </button>
      {open && (
        <div className="px-3 pb-2">
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{content}</p>
        </div>
      )}
    </div>
  );
}
