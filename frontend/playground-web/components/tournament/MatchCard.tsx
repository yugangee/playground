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
  upcoming: '-',
  live: 'LIVE',
  completed: 'END',
  pk: 'PK',
};

const statusStyle: Record<string, React.CSSProperties> = {
  upcoming: { background: 'transparent', color: '#9CA3AF' },
  live:     { background: '#DBEAFE', color: '#1D4ED8' },
  completed:{ background: '#F3F4F6', color: '#6B7280' },
  pk:       { background: '#FEF3C7', color: '#92400E' },
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
      className={`rounded-lg ${onClick ? 'cursor-pointer card-hover' : ''} ${compact ? 'p-2.5' : 'p-3'}`}
      style={{ background: isSedaily ? '#EEF2FF' : '#F9FAFB' }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {match.matchNo}조
        </span>
        {match.status !== 'upcoming' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={statusStyle[match.status]}>
            {statusLabel[match.status]}
          </span>
        )}
      </div>

      {/* 팀 vs 스코어 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 text-right truncate">
          <span className="text-[11px] font-medium"
            style={{ color: homeIsSedaily ? '#4F46E5' : homeWon ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {teamName(match.homeTeam)}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {match.score ? (
            <>
              <span className="text-xs font-bold tabular-nums"
                style={{ color: homeWon ? '#16A34A' : '#9CA3AF' }}>
                {match.score.home}
              </span>
              <span className="text-[10px]" style={{ color: '#D1D5DB' }}>:</span>
              <span className="text-xs font-bold tabular-nums"
                style={{ color: awayWon ? '#16A34A' : '#9CA3AF' }}>
                {match.score.away}
              </span>
            </>
          ) : (
            <span className="text-[10px]" style={{ color: '#D1D5DB' }}>vs</span>
          )}
        </div>

        <div className="flex-1 truncate">
          <span className="text-[11px] font-medium"
            style={{ color: awayIsSedaily ? '#4F46E5' : awayWon ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {teamName(match.awayTeam)}
          </span>
        </div>
      </div>

      {/* 스코어 입력 버튼 */}
      {scoreEditable && !compact && (
        <button
          onClick={e => { e.stopPropagation(); onScoreEdit?.(match); }}
          className="mt-2.5 w-full py-1.5 rounded-md text-[10px] font-medium"
          style={{ background: '#4F46E5', color: 'white' }}
        >
          입력
        </button>
      )}
    </div>
  );
}
