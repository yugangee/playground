export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'pk';

export type TournamentRoundKey = 'R1' | 'R2' | 'QF' | 'SF' | 'LF' | 'RF' | 'F3' | 'F1';

export interface TournamentTeam {
  id: string;
  name: string;
  seed?: 1 | 2 | 3 | 4;
  isSedaily?: boolean;
}

export interface TBDTeam {
  tbd: true;
  fromMatch: number;
  label: string;
}

export type TeamSlot = TournamentTeam | TBDTeam;

export function isTBD(team: TeamSlot): team is TBDTeam {
  return (team as TBDTeam).tbd === true;
}

export interface MatchScore {
  home: number;
  away: number;
  pkHome?: number;
  pkAway?: number;
}

export interface TournamentMatch {
  matchNo: number;
  round: TournamentRoundKey;
  roundLabel: string;
  homeTeam: TeamSlot;
  awayTeam: TeamSlot;
  score?: MatchScore;
  status: MatchStatus;
  block: 'left' | 'right' | 'final';
  nextMatchNo?: number;
  isSedailyMatch?: boolean;
}

export interface PlayerRoster {
  no: number;
  jerseyNumber: number | null;
  name: string;
  department: string;
  role?: '주장' | '감독' | '총무' | '단장';
}

export interface TournamentRule {
  title: string;
  content: string;
}

export interface TournamentData {
  edition: number;
  year: number;
  title: string;
  teamsCount: number;
  matchesCount: number;
  matches: TournamentMatch[];
  rules: TournamentRule[];
  roster: PlayerRoster[];
}

export const ROUND_ORDER: TournamentRoundKey[] = ['R1', 'R2', 'QF', 'SF', 'LF', 'RF', 'F3', 'F1'];
export const ROUND_LABEL: Record<TournamentRoundKey, string> = {
  R1: '1회전',
  R2: '2회전',
  QF: '8강',
  SF: '4강',
  LF: '좌측블록 결승',
  RF: '우측블록 결승',
  F3: '3·4위전',
  F1: '결승',
};
