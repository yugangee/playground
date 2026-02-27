"use client";

import { useState } from 'react';
import { Trophy, Users, Calendar, ChevronRight, AlertTriangle, Shield, Zap } from 'lucide-react';
import TournamentBracket from '@/components/tournament/TournamentBracket';
import TeamRoster from '@/components/tournament/TeamRoster';
import { kja51 } from '@/data/kja-tournament-51';
import { kja50 } from '@/data/kja-tournament-50';
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
        style={{ background: 'rgba(192,38,211,0.15)', color: '#e879f9', border: '1px solid rgba(192,38,211,0.3)' }}
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

        {/* 무승부인 경우 PK 토글 */}
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
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(to right, #c026d3, #7c3aed)' }}>
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
export default function KJA51Page() {
  const [activeTab, setActiveTab] = useState<Tab>('bracket');
  const [matches, setMatches] = useState(kja51.matches);
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
  const sedailyMatch = matches.find(m => m.matchNo === 38);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── 히어로 섹션 ── */}
      <div className="relative rounded-2xl overflow-hidden border"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(192,38,211,0.12) 50%, rgba(16,185,129,0.08) 100%)', borderColor: 'rgba(192,38,211,0.25)' }}>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
                  style={{ background: 'rgba(192,38,211,0.2)', color: '#e879f9', border: '1px solid rgba(192,38,211,0.3)' }}>
                  LIVE DEMO
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                  ★ 4시드 서울경제 참가 중
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                제51회 한국기자협회<br className="sm:hidden" /> 서울지역 축구대회
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                2025년 9월 예정 · 토너먼트 방식 · 전후반 각 15분
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Stat icon={<Users size={14} />} value={`${kja51.teamsCount}개`} label="참가팀" />
              <Stat icon={<Trophy size={14} />} value={`${kja51.matchesCount}경기`} label="총 경기" />
              <Stat icon={<Zap size={14} />} value={`${completedCount}`} label="완료" />
            </div>
          </div>

          {/* 시드 팀 배너 */}
          <div className="mt-4 flex gap-2 flex-wrap">
            {[
              { seed: 1, name: 'YTN', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
              { seed: 2, name: '동아일보', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
              { seed: 3, name: '뉴스1', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
              { seed: 4, name: '서울경제', bg: 'rgba(192,38,211,0.15)', color: '#e879f9', highlight: true },
            ].map(s => (
              <span key={s.seed} className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"
                style={{ background: s.bg, color: s.color, border: s.highlight ? `1px solid ${s.color}50` : undefined }}>
                <Trophy size={11} /> {s.seed}시드 {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 서경 경기 바로가기 배너 ── */}
      {sedailyMatch && (
        <div className="rounded-xl border p-4 flex items-center justify-between gap-3"
          style={{ background: 'rgba(192,38,211,0.06)', borderColor: 'rgba(192,38,211,0.25)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(192,38,211,0.2)' }}>
              <Shield size={16} style={{ color: '#e879f9' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                서울경제 첫 경기: <span style={{ color: '#e879f9' }}>38조</span> (2회전)
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                서울경제 vs 19조 승자 · 우측 블록 · 4시드
              </p>
            </div>
          </div>
          <button onClick={() => setActiveTab('bracket')} className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: '#e879f9' }}>
            경로 보기 <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── 탭 ── */}
      <div className="flex gap-1 overflow-x-auto hide-scrollbar border-b" style={{ borderColor: 'var(--card-border)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-semibold shrink-0 transition-colors border-b-2"
            style={
              activeTab === tab.key
                ? { color: '#e879f9', borderColor: '#e879f9' }
                : { color: 'var(--text-muted)', borderColor: 'transparent' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 탭 콘텐츠 ── */}

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
        <div className="space-y-4">
          <div className="rounded-xl border p-8 text-center"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <Calendar size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>경기 일정 추후 공지</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              2025년 8월 말 선수 명단 제출 마감 후 일정이 확정됩니다.
            </p>
            <div className="mt-4 p-3 rounded-lg text-left text-xs space-y-1"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
              <p>• 선수 명단 제출 마감: 2025.8.29(금) 오후 3시</p>
              <p>• 예선 → 16강 → 8강~결승: 2025년 9월 예정</p>
              <p>• 대회 장소: 추후 공지</p>
            </div>
          </div>
        </div>
      )}

      {/* 서경 어벤져스 */}
      {activeTab === 'sedaily' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #c026d3, #7c3aed)' }}>
              SE
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>서울경제신문 어벤져스</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>제51회 한국기자협회 서울지역 축구대회 · 4시드</p>
            </div>
          </div>

          {/* 7명 경고 배지 */}
          <div className="rounded-xl border p-4 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}>
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#f87171' }}>최소 출전 인원 규정</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                경기 개시 시각까지 신분 확인이 완료된 선수 <strong style={{ color: 'var(--text-secondary)' }}>7명 이상</strong>이어야 합니다.
                7명 미만 시 <strong style={{ color: '#f87171' }}>몰수패</strong>. 총무(이건율)의 출석 확인이 최우선 과제입니다.
              </p>
            </div>
          </div>

          <TeamRoster roster={kja51.roster} />
        </div>
      )}

      {/* 이전 대회 */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>직전 대회 결과 (제{kja50.edition}회)</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { rank: '우승', team: kja50.champion, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: '🥇' },
              { rank: '준우승', team: kja50.runnerUp, color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', icon: '🥈' },
              { rank: '3위', team: kja50.third, color: '#fb923c', bg: 'rgba(251,146,60,0.1)', icon: '🥉' },
              { rank: '4위', team: kja50.fourth, color: '#e879f9', bg: 'rgba(232,121,249,0.1)', icon: '★' },
            ].map(r => (
              <div key={r.rank} className="rounded-xl border p-4 text-center space-y-2"
                style={{ background: r.bg, borderColor: `${r.color}40` }}>
                <p className="text-2xl">{r.icon}</p>
                <p className="text-xs font-semibold" style={{ color: r.color }}>{r.rank}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{r.team}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border p-4 text-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <p style={{ color: 'var(--text-muted)' }}>{kja50.note}</p>
          </div>

          <div className="rounded-xl border p-4" style={{ background: 'rgba(192,38,211,0.06)', borderColor: 'rgba(192,38,211,0.25)' }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: '#e879f9' }}>한국기자협회 축구대회 연혁</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              1972년 첫 개최. 올해 51회째를 맞는 유서 깊은 대회로, 회원 언론인의 체력 향상과 친목 도모를 목적으로 합니다.
              2014년 이후 서울지역 대회로 운영. 2020~2021년 코로나19로 취소. 제51회부터 KT스카이라이프 AI 중계('포착') 도입.
            </p>
          </div>
        </div>
      )}

      {/* 대회 규정 */}
      {activeTab === 'rules' && (
        <div className="space-y-3">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>대회 주요 규정</h2>
          {kja51.rules.map((rule, i) => (
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
function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center rounded-xl border px-3 py-2 min-w-16"
      style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}>
      <div className="flex items-center justify-center gap-1 text-fuchsia-400 mb-0.5">{icon}</div>
      <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function RuleAccordion({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ background: open ? 'rgba(192,38,211,0.06)' : 'var(--card-bg)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <ChevronRight
          size={16}
          className="shrink-0 transition-transform"
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'none' }}
        />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1" style={{ background: 'var(--card-bg)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{content}</p>
        </div>
      )}
    </div>
  );
}
