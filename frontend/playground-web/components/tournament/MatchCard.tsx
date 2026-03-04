"use client";

import { TournamentMatch, isTBD } from '@/types/tournament';

interface Props {
  match: TournamentMatch;
  compact?: boolean;
  onClick?: (match: TournamentMatch) => void;
  scoreEditable?: boolean;
  onScoreEdit?: (match: TournamentMatch) => void;
}

function teamName(team: TournamentMatch['homeTeam']): string {
  if (isTBD(team)) return team.label;
  return team.name;
}

function isSedailyTeam(team: TournamentMatch['homeTeam']): boolean {
  if (isTBD(team)) return false;
  return team.isSedaily === true;
}

const statusLabel: Record<string, string> = {
  upcoming: '예정',
  live: '진행중',
  completed: '완료',
  pk: 'PK',
};

const statusStyle: Record<string, React.CSSProperties> = {
  upcoming: { background: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  live:     { background: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  completed:{ background: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  pk:       { background: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
};

export default function MatchCard({ match, compact = false, onClick, scoreEditable, onScoreEdit }: Props) {
  const homeIsSedaily = isSedailyTeam(match.homeTeam);
  const awayIsSedaily = isSedailyTeam(match.awayTeam);
  const isSedaily = match.isSedailyMatch || homeIsSedaily || awayIsSedaily;

  const homeWon = match.score && match.score.home > match.score.away;
  const awayWon = match.score && match.score.away > match.score.home;

  return (
    <div
      onClick={() => onClick?.(match)}
      className={`rounded-xl border transition-all ${onClick ? 'cursor-pointer hover:border-fuchsia-500/40' : ''} ${compact ? 'p-3' : 'p-4'}`}
      style={{
        background: isSedaily ? 'rgba(192,38,211,0.06)' : 'var(--card-bg)',
        borderColor: isSedaily ? 'rgba(192,38,211,0.35)' : 'var(--card-border)',
        boxShadow: isSedaily ? '0 0 12px rgba(192,38,211,0.1)' : undefined,
      }}
    >
      {/* 헤더: 조번호 + 상태 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          {match.matchNo}조 · {match.roundLabel}
        </span>
        <div className="flex items-center gap-1.5">
          {isSedaily && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(192,38,211,0.2)', color: '#e879f9' }}>
              서경 ★
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={statusStyle[match.status]}>
            {statusLabel[match.status]}
          </span>
        </div>
      </div>

      {/* 팀 vs 스코어 */}
      <div className="flex items-center gap-2">
        {/* 홈팀 */}
        <div className={`flex-1 text-right ${compact ? '' : ''}`}>
          <span
            className={`${compact ? 'text-sm' : 'text-[15px]'} font-semibold`}
            style={{ color: homeIsSedaily ? '#e879f9' : homeWon ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {teamName(match.homeTeam)}
            {match.homeTeam && !isTBD(match.homeTeam) && match.homeTeam.seed && (
              <span className="ml-1 text-[10px] text-amber-400">({match.homeTeam.seed}시드)</span>
            )}
          </span>
        </div>

        {/* 스코어 */}
        <div className="shrink-0 flex items-center gap-1">
          {match.score ? (
            <>
              <span className={`${compact ? 'text-base' : 'text-xl'} font-bold tabular-nums`}
                style={{ color: homeWon ? '#4ade80' : 'var(--text-muted)' }}>
                {match.score.home}
              </span>
              <span className="text-sm font-light" style={{ color: 'var(--text-muted)' }}>:</span>
              <span className={`${compact ? 'text-base' : 'text-xl'} font-bold tabular-nums`}
                style={{ color: awayWon ? '#4ade80' : 'var(--text-muted)' }}>
                {match.score.away}
              </span>
              {match.score.pkHome !== undefined && (
                <span className="text-[10px] text-amber-400 ml-1">
                  PK({match.score.pkHome}:{match.score.pkAway})
                </span>
              )}
            </>
          ) : (
            <span className="text-sm px-2 font-light" style={{ color: 'var(--text-muted)' }}>vs</span>
          )}
        </div>

        {/* 어웨이팀 */}
        <div className="flex-1">
          <span
            className={`${compact ? 'text-sm' : 'text-[15px]'} font-semibold`}
            style={{ color: awayIsSedaily ? '#e879f9' : awayWon ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {teamName(match.awayTeam)}
            {match.awayTeam && !isTBD(match.awayTeam) && match.awayTeam.seed && (
              <span className="ml-1 text-[10px] text-amber-400">({match.awayTeam.seed}시드)</span>
            )}
          </span>
        </div>
      </div>

      {/* TBD 안내 */}
      {(isTBD(match.homeTeam) || isTBD(match.awayTeam)) && !compact && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          {isTBD(match.homeTeam) && <span>{match.homeTeam.label}</span>}
          {isTBD(match.homeTeam) && isTBD(match.awayTeam) && <span> · </span>}
          {isTBD(match.awayTeam) && <span>{match.awayTeam.label}</span>}
        </p>
      )}

      {/* 스코어 입력 버튼 */}
      {scoreEditable && (
        <button
          onClick={e => { e.stopPropagation(); onScoreEdit?.(match); }}
          className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: 'rgba(192,38,211,0.15)', color: '#e879f9', border: '1px solid rgba(192,38,211,0.3)' }}
        >
          스코어 입력
        </button>
      )}
    </div>
  );
}
