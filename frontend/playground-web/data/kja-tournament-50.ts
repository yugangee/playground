export interface PastTournamentResult {
  edition: number;
  year: number;
  champion: string;
  runnerUp: string;
  third: string;
  fourth: string;
  note?: string;
}

export const kja50: PastTournamentResult = {
  edition: 50,
  year: 2024,
  champion: 'YTN',
  runnerUp: '동아일보',
  third: '뉴스1',
  fourth: '서울경제신문',
  note: '제50회 기준 시드 배정. 서울경제신문은 4위로 51회 4시드 배정.',
};

export const historicalResults: PastTournamentResult[] = [
  kja50,
  // 추가 역대 결과는 추후 입력
];
