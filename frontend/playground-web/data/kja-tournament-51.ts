import { TournamentData, TournamentMatch, TournamentTeam, PlayerRoster, TournamentRule } from '@/types/tournament';

const t = (id: string, name: string, seed?: 1 | 2 | 3 | 4, isSedaily?: boolean): TournamentTeam =>
  ({ id, name, seed, isSedaily });

const tbd = (fromMatch: number, label?: string) => ({
  tbd: true as const,
  fromMatch,
  label: label ?? `${fromMatch}조 승자`,
});

const SEDAILY = t('sedaily', '서울경제', 4, true);

// ─────────────────────────────────────────
// 선수단 로스터 (20명)
// ─────────────────────────────────────────
const roster: PlayerRoster[] = [
  { no: 1,  jerseyNumber: 1,  name: '채민석', department: '사회부' },
  { no: 2,  jerseyNumber: 3,  name: '이건율', department: '산업부',        role: '총무' },
  { no: 3,  jerseyNumber: 4,  name: '이종호', department: '골프스포츠부',  role: '감독' },
  { no: 4,  jerseyNumber: 5,  name: '박호현', department: '사회부',        role: '주장' },
  { no: 5,  jerseyNumber: 7,  name: '박진용', department: '테크성장부',    role: '단장' },
  { no: 6,  jerseyNumber: 8,  name: '노해철', department: '산업부' },
  { no: 7,  jerseyNumber: 10, name: '정문영', department: '골프스포츠부' },
  { no: 8,  jerseyNumber: 11, name: '박성규', department: '사회부' },
  { no: 9,  jerseyNumber: 12, name: '이승령', department: '정치부' },
  { no: 10, jerseyNumber: 13, name: '박우인', department: '테크성장부' },
  { no: 11, jerseyNumber: 14, name: '장문항', department: '마켓시그널부' },
  { no: 12, jerseyNumber: 15, name: '허진',   department: '산업부' },
  { no: 13, jerseyNumber: 16, name: '황동건', department: '사회부' },
  { no: 14, jerseyNumber: 20, name: '이정훈', department: '마켓시그널부' },
  { no: 15, jerseyNumber: 21, name: '신중섭', department: '금융부' },
  { no: 16, jerseyNumber: 22, name: '박형윤', department: '건설부동산부' },
  { no: 17, jerseyNumber: 64, name: '이충희', department: '마켓시그널부' },
  { no: 18, jerseyNumber: 65, name: '김창영', department: '국제부' },
  { no: 19, jerseyNumber: null, name: '이동수', department: '-' },
  { no: 20, jerseyNumber: null, name: '김경택', department: '-' },
];

// ─────────────────────────────────────────
// 대회 규정 요약
// ─────────────────────────────────────────
const rules: TournamentRule[] = [
  {
    title: '경기 방식',
    content: '토너먼트 방식. 전·후반 각 15분 (휴식 10분). 무승부 시 승부차기 진행 (연장전 없음).',
  },
  {
    title: '최소 출전 인원',
    content: '경기 개시 시각까지 신분 확인이 완료된 선수가 7명 미만이면 몰수패. 경기 중 퇴장으로 6명 이하가 되어도 중지.',
  },
  {
    title: '경고 누적',
    content: '경고 2장 누적 → 다음 경기 1경기 출전정지. 퇴장(레드카드) → 다음 2경기 출전정지.',
  },
  {
    title: '경고 초기화',
    content: '8강까지 경고 1장만 받은 상태에서 4강 진출 시 이전 경고 초기화. 2장 누적 또는 레드카드 징계는 4강 이후에도 유효.',
  },
  {
    title: '승부차기(PK) 규칙',
    content: '후반 종료 시점에 출전 중인 선수로만 PK 순서 작성 가능. 후반 종료 후 교체 불가.',
  },
  {
    title: '신분 검인',
    content: '본부석에서 신분증(기자증 또는 신분증)으로 검인 필수. 등번호는 명단 기재 번호와 동일해야 하며 위배 시 즉시 퇴장.',
  },
  {
    title: '선수 교체',
    content: '무제한 교체 가능. 교체된 선수도 해당 경기에 재출전 가능.',
  },
  {
    title: '참가 자격',
    content: '사전에 등록·승인된 선수만 출전 가능. 부정 선수 발견 시 성적 무관 실격.',
  },
];

// ─────────────────────────────────────────
// 경기 데이터 (55조 + 결승 + 3·4위전)
// ─────────────────────────────────────────
const matches: TournamentMatch[] = [
  // ══════════════════════════════════════
  // 좌측 블록 — 1회전 (1~12조)
  // ══════════════════════════════════════
  { matchNo: 1,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 26, homeTeam: t('josunilbo',   '조선일보'),     awayTeam: t('hankuk',     '한국경제신문') },
  { matchNo: 2,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 27, homeTeam: t('mbc',         'MBC'),          awayTeam: t('sbs',        'SBS') },
  { matchNo: 3,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 27, homeTeam: t('josubiz',     '조선비즈'),     awayTeam: t('itodayyy',   '이투데이') },
  { matchNo: 4,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 28, homeTeam: t('newstomato',  '뉴스토마토'),   awayTeam: t('thefact',    '더팩트') },
  { matchNo: 5,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 29, homeTeam: t('bizwatch',    '비즈워치'),     awayTeam: t('financial',  '파이낸셜뉴스') },
  { matchNo: 6,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 29, homeTeam: t('edaily',      '이데일리'),     awayTeam: t('koreaherald','코리아헤럴드') },
  { matchNo: 7,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 30, homeTeam: t('newdaily',    '뉴데일리'),     awayTeam: t('herald',     '헤럴드경제') },
  { matchNo: 8,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 31, homeTeam: t('seoulsinmun', '서울신문'),     awayTeam: t('mbn',        'MBN') },
  { matchNo: 9,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 31, homeTeam: t('asiaeconomy', '아시아경제'),   awayTeam: t('cbs',        'CBS') },
  { matchNo: 10, round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 32, homeTeam: t('yonhapnewstv','연합뉴스TV'),  awayTeam: t('jtbc',       'JTBC') },
  { matchNo: 11, round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 33, homeTeam: t('joongang',    '중앙일보'),     awayTeam: t('dailyan',    '데일리안') },
  { matchNo: 12, round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 33, homeTeam: t('mtn',         'MTN'),          awayTeam: t('thebell',    '더벨') },

  // ══════════════════════════════════════
  // 우측 블록 — 1회전 (13~25조)
  // ══════════════════════════════════════
  { matchNo: 13, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 34, homeTeam: t('tvchosun',    'TV조선'),       awayTeam: t('kyunghyang',  '경향신문') },
  { matchNo: 14, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 35, homeTeam: t('sbsbiz',      'SBS Biz'),      awayTeam: t('kukmin',      '국민일보') },
  { matchNo: 15, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 35, homeTeam: t('electronic',  '전자신문'),     awayTeam: t('newsway',     '뉴스웨이') },
  { matchNo: 16, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 36, homeTeam: t('hankukilbo',  '한국일보'),     awayTeam: t('ilgansports', '일간스포츠') },
  { matchNo: 17, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 37, homeTeam: t('kbs',         'KBS'),          awayTeam: t('newsis',      '뉴시스') },
  { matchNo: 18, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 37, homeTeam: t('nongmin',     '농민신문'),     awayTeam: t('segye',       '세계일보') },
  { matchNo: 19, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 38, homeTeam: t('hansecon',    '한스경제'),     awayTeam: t('yonhapinfo',  '연합인포맥스') },
  { matchNo: 20, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 39, homeTeam: t('hankuktv',    '한국경제TV'),   awayTeam: t('hani',        '한겨레신문') },
  { matchNo: 21, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 39, homeTeam: t('moneytody',   '머니투데이'),   awayTeam: t('inews24',     '아이뉴스24') },
  { matchNo: 22, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 40, homeTeam: t('ajueconomy',  '아주경제'),     awayTeam: t('metro',       '메트로미디어') },
  { matchNo: 23, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 40, homeTeam: t('shina',       '신아일보'),     awayTeam: t('channela',    '채널A') },
  { matchNo: 24, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 41, homeTeam: t('ebn',         'EBN'),          awayTeam: t('munhwa',      '문화일보') },
  { matchNo: 25, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 41, homeTeam: t('cookie',      '쿠키뉴스'),     awayTeam: t('energy',      '에너지경제') },

  // ══════════════════════════════════════
  // 좌측 블록 — 2회전 (26~33조)
  // ══════════════════════════════════════
  { matchNo: 26, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 42, homeTeam: t('ytn', 'YTN', 1), awayTeam: tbd(1) },
  { matchNo: 27, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 42, homeTeam: tbd(2), awayTeam: tbd(3) },
  { matchNo: 28, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 43, homeTeam: t('daehan', '대한경제'), awayTeam: tbd(4) },
  { matchNo: 29, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 43, homeTeam: tbd(5), awayTeam: tbd(6) },
  { matchNo: 30, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 44, homeTeam: t('donga', '동아일보', 2), awayTeam: tbd(7) },
  { matchNo: 31, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 44, homeTeam: tbd(8), awayTeam: tbd(9) },
  { matchNo: 32, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 45, homeTeam: t('ilyoshinmun', '일요신문'), awayTeam: tbd(10) },
  { matchNo: 33, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 45, homeTeam: tbd(11), awayTeam: tbd(12) },

  // ══════════════════════════════════════
  // 우측 블록 — 2회전 (34~41조)
  // ══════════════════════════════════════
  { matchNo: 34, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 46, homeTeam: t('news1', '뉴스1', 3), awayTeam: tbd(13) },
  { matchNo: 35, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 46, homeTeam: tbd(14), awayTeam: tbd(15) },
  { matchNo: 36, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 47, homeTeam: t('yonhap', '연합뉴스'), awayTeam: tbd(16) },
  { matchNo: 37, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 47, homeTeam: tbd(17), awayTeam: tbd(18) },
  { matchNo: 38, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 48, homeTeam: SEDAILY, awayTeam: tbd(19), isSedailyMatch: true },
  { matchNo: 39, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 48, homeTeam: tbd(20), awayTeam: tbd(21) },
  { matchNo: 40, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 49, homeTeam: tbd(22), awayTeam: tbd(23) },
  { matchNo: 41, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 49, homeTeam: tbd(24), awayTeam: tbd(25) },

  // ══════════════════════════════════════
  // 좌측 블록 — 8강 (42~45조)
  // ══════════════════════════════════════
  { matchNo: 42, round: 'QF', roundLabel: '8강', block: 'left',  status: 'upcoming', nextMatchNo: 50, homeTeam: tbd(26), awayTeam: tbd(27) },
  { matchNo: 43, round: 'QF', roundLabel: '8강', block: 'left',  status: 'upcoming', nextMatchNo: 50, homeTeam: tbd(28), awayTeam: tbd(29) },
  { matchNo: 44, round: 'QF', roundLabel: '8강', block: 'left',  status: 'upcoming', nextMatchNo: 51, homeTeam: tbd(30), awayTeam: tbd(31) },
  { matchNo: 45, round: 'QF', roundLabel: '8강', block: 'left',  status: 'upcoming', nextMatchNo: 51, homeTeam: tbd(32), awayTeam: tbd(33) },

  // ══════════════════════════════════════
  // 우측 블록 — 8강 (46~49조)
  // ══════════════════════════════════════
  { matchNo: 46, round: 'QF', roundLabel: '8강', block: 'right', status: 'upcoming', nextMatchNo: 52, homeTeam: tbd(34), awayTeam: tbd(35) },
  { matchNo: 47, round: 'QF', roundLabel: '8강', block: 'right', status: 'upcoming', nextMatchNo: 52, homeTeam: tbd(36), awayTeam: tbd(37) },
  { matchNo: 48, round: 'QF', roundLabel: '8강', block: 'right', status: 'upcoming', nextMatchNo: 53, homeTeam: tbd(38, '38조 승자 (서울경제 가능)'), awayTeam: tbd(39), isSedailyMatch: true },
  { matchNo: 49, round: 'QF', roundLabel: '8강', block: 'right', status: 'upcoming', nextMatchNo: 53, homeTeam: tbd(40), awayTeam: tbd(41) },

  // ══════════════════════════════════════
  // 좌측 블록 — 4강 (50~51조)
  // ══════════════════════════════════════
  { matchNo: 50, round: 'SF', roundLabel: '4강', block: 'left',  status: 'upcoming', nextMatchNo: 54, homeTeam: tbd(42), awayTeam: tbd(43) },
  { matchNo: 51, round: 'SF', roundLabel: '4강', block: 'left',  status: 'upcoming', nextMatchNo: 54, homeTeam: tbd(44), awayTeam: tbd(45) },

  // ══════════════════════════════════════
  // 우측 블록 — 4강 (52~53조)
  // ══════════════════════════════════════
  { matchNo: 52, round: 'SF', roundLabel: '4강', block: 'right', status: 'upcoming', nextMatchNo: 55, homeTeam: tbd(46), awayTeam: tbd(47) },
  { matchNo: 53, round: 'SF', roundLabel: '4강', block: 'right', status: 'upcoming', nextMatchNo: 55, homeTeam: tbd(48, '48조 승자 (서울경제 가능)'), awayTeam: tbd(49), isSedailyMatch: true },

  // ══════════════════════════════════════
  // 블록 결승 (54~55조)
  // ══════════════════════════════════════
  { matchNo: 54, round: 'LF', roundLabel: '좌측 블록 결승', block: 'left',  status: 'upcoming', homeTeam: tbd(50), awayTeam: tbd(51) },
  { matchNo: 55, round: 'RF', roundLabel: '우측 블록 결승', block: 'right', status: 'upcoming', homeTeam: tbd(52), awayTeam: tbd(53, '53조 승자 (서울경제 가능)'), isSedailyMatch: true },

  // ══════════════════════════════════════
  // 결승 + 3·4위전
  // ══════════════════════════════════════
  { matchNo: 56, round: 'F1', roundLabel: '결승', block: 'final', status: 'upcoming', homeTeam: tbd(54), awayTeam: tbd(55) },
  { matchNo: 57, round: 'F3', roundLabel: '3·4위전', block: 'final', status: 'upcoming', homeTeam: { tbd: true, fromMatch: 54, label: '54조 패자' }, awayTeam: { tbd: true, fromMatch: 55, label: '55조 패자' } },
];

export const kja51: TournamentData = {
  edition: 51,
  year: 2025,
  title: '제51회 한국기자협회 서울지역 축구대회',
  teamsCount: 52,
  matchesCount: 57,
  matches,
  rules,
  roster,
};

// 서울경제 경기 경로 (하이라이트용)
export const sedailyPath = matches.filter(m => m.isSedailyMatch);
