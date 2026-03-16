import { TournamentData, TournamentMatch, TournamentTeam, PlayerRoster, TournamentRule } from '@/types/tournament';

const t = (id: string, name: string, seed?: 1 | 2 | 3 | 4, isSedaily?: boolean): TournamentTeam =>
  ({ id, name, seed, isSedaily });

const tbd = (fromMatch: number, label?: string) => ({
  tbd: true as const,
  fromMatch,
  label: label ?? `${fromMatch}조 승자`,
});

const SEDAILY = t('sedaily', '서울경제', undefined, true);

// ─────────────────────────────────────────
// 선수단 로스터 (52회 — 51회와 동일 시 그대로, 변경 시 수정 필요)
// ─────────────────────────────────────────
const roster: PlayerRoster[] = [
  // TODO: 52회 선수단 명단 확정 후 업데이트
  // 아래는 51회 명단 임시 유지
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
// 대회 규정 요약 (52회 PDF 기반)
// ─────────────────────────────────────────
const rules: TournamentRule[] = [
  {
    title: '경기 방식',
    content: '토너먼트 방식. 전·후반 각 15분 (휴식 10분). 무승부 시 승부차기 진행 (연장전 없음). 3·4위전은 승부차기로만 진행.',
  },
  {
    title: '최소 출전 인원',
    content: '경기 개시 시각까지 신분 확인이 완료된 선수가 7명 미만이면 몰수패. 경기 중 퇴장으로 7명 미만이 되어도 중지.',
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
    content: '한국기자협회 회원(2025년 12월 현재 회원사). 사전에 등록·승인된 선수만 출전 가능. 부정 선수 발견 시 성적 무관 실격.',
  },
  {
    title: 'AI/VAR',
    content: 'AI 판독 사용 불가. VAR은 대회 본부 판단에 따라 적용 가능하나 원칙적으로 미적용.',
  },
];

// ─────────────────────────────────────────
// 경기 데이터 — 제52회 (57경기 + 결승 + 3·4위전 = 59경기)
//
// 구조 (PDF 대진표 및 시간표 기반):
// ┌─ 좌측 블록 ─────────────────────────────────────────┐
// │ 1회전: 1~9조 (9경기)                                 │
// │ 2회전: 28~33조 (6경기, 시드 YTN 28조 home)           │
// │ 16강:  44~47조 (4경기, 4/19)                         │
// │ 4강:   50~51조 (2경기, 4/25)                         │
// │ 블록결승: 54조 (4/25)                                 │
// └──────────────────────────────────────────────────────┘
// ┌─ 우측 블록 ─────────────────────────────────────────┐
// │ 1회전: 10~27조 (18경기 중 일부가 1회전)               │
// │ 2회전: 34~43조 (10경기 중 일부)                       │
// │ 16강:  48~51조는 아님 — PDF 참조                      │
// │ ...                                                   │
// └──────────────────────────────────────────────────────┘
//
// PDF 시간표 상세 기반으로 전체 재구성:
//
// === 4월 18일(토) 구장1: 고양 어울림누리 ===
// 1조  조선비즈 vs 메트로미디어     → 28조
// 2조  뉴스웨이 vs 더벨             → 29조
// 3조  매일경제 vs 노컷뉴스         → 29조
// 28조 YTN vs 1조 승자              → 44조 (YTN = 시드)
// 29조 2조 승자 vs 3조 승자         → 44조
// 4조  EBN vs 뉴스1                 → 30조
// 5조  디지털타임스 vs 아시아투데이  → 31조
// 6조  한국일보 vs 조선일보          → 31조
// 30조 쿠키뉴스 vs 4조 승자         → 45조
// 31조 5조 승자 vs 6조 승자         → 45조
// 7조  연합뉴스 vs 머니투데이        → 32조
// 8조  데일리안 vs 일요신문          → 32조
// 9조  뉴스핌 vs 서울경제            → 33조 ★ 서경 경기
// 32조 채널A vs 7조 승자            → 46조
// 33조 8조 승자 vs 9조 승자         → 46조
//
// === 4월 18일(토) 구장2: 노원 마들스타디움 ===
// 10조 MBC vs 연합뉴스TV            → 34조
// 11조 헤럴드경제 vs MTN             → 34조
// 12조 SBS Biz vs 연합인포맥스       → 36조
// 13조 한국경제신문 vs 이데일리      → 35조
// 34조 10조 승자 vs 11조 승자       → 47조
// 35조 12조 승자 vs 13조 승자       → 47조
// 17조 브릿지경제 vs 에너지경제      → 38조
// 18조 한겨레 vs 아주경제            → 38조
// 14조 문화일보 vs 한국경제TV        → 36조
// 38조 17조 승자 vs 18조 승자       → 49조
// 15조 더팩트 vs JTBC               → 37조
// 16조 MBN vs 서울신문              → 37조
// 36조 동아일보 vs 14조 승자        → 48조 (동아 = 시드)
// 37조 15조 승자 vs 16조 승자       → 48조
//
// === 4월 18일(토) 구장3: 농협대학교 ===
// 19조 세계일보 vs SBS              → 39조
// 20조 전자신문 vs 중앙일보          → 40조
// 21조 대한경제 vs CBS              → 40조
// 39조 19조 승자 vs 20조 승자       → 42조
// 22조 코리아헤럴드 vs 뉴시스        → 41조
// 23조 이투데이 vs 경향신문          → 41조
// 40조 국민일보 vs 21조 승자        → 50조
// 41조 22조 승자 vs 23조 승자       → 50조
// 24조 아이뉴스24 vs 파이낸셜뉴스    → 42조
// 25조 TV조선 vs KBS                → 43조
// 26조 뉴데일리 vs 아시아경제        → 43조
// 27조 뉴스토마토 vs 농민신문        → 43조
// 42조 24조 승자 vs 25조 승자       → 51조
// 43조 26조 승자 vs 27조 승자       → 51조
//
// === 4월 19일(일) 16강 — 농협대학교 ===
// 44조 28조 승자 vs 29조 승자       → 52조
// 45조 30조 승자 vs 31조 승자       → 52조
// 46조 32조 승자 vs 33조 승자       → 53조
// 47조 34조 승자 vs 35조 승자       → 53조
// 48조 36조 승자 vs 37조 승자       → 54조
// 49조 38조 승자 vs 39조 승자       → 54조
// 50조 40조 승자 vs 41조 승자       → 55조
// 51조 42조 승자 vs 43조 승자       → 55조
//
// === 4월 25일(토) 8강~결승 — 고양 어울림누리 ===
// 52조 44조 승자 vs 45조 승자       → 56조
// 53조 46조 승자 vs 47조 승자       → 56조
// 54조 48조 승자 vs 49조 승자       → 57조
// 55조 50조 승자 vs 51조 승자       → 57조
// 56조 52조 승자 vs 53조 승자       → 결승 (4강-1)
// 57조 54조 승자 vs 55조 승자       → 결승 (4강-2)
// 3·4위전 56조 패자 vs 57조 패자    (승부차기)
// 결승   56조 승자 vs 57조 승자
// ─────────────────────────────────────────

const matches: TournamentMatch[] = [
  // ══════════════════════════════════════════════════════
  // 좌측 블록 — 1회전 (1~9조) | 4월 18일
  // ══════════════════════════════════════════════════════
  { matchNo: 1,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 28, homeTeam: t('josunbiz',    '조선비즈'),     awayTeam: t('metro',       '메트로미디어') },
  { matchNo: 2,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 29, homeTeam: t('newsway',     '뉴스웨이'),     awayTeam: t('thebell',     '더벨') },
  { matchNo: 3,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 29, homeTeam: t('maeil',       '매일경제'),     awayTeam: t('nocutnews',   '노컷뉴스') },
  { matchNo: 4,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 30, homeTeam: t('ebn',         'EBN'),          awayTeam: t('news1',       '뉴스1') },
  { matchNo: 5,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 31, homeTeam: t('digitaltimes','디지털타임스'), awayTeam: t('asiatoday',   '아시아투데이') },
  { matchNo: 6,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 31, homeTeam: t('hankukilbo',  '한국일보'),     awayTeam: t('josunilbo',   '조선일보') },
  { matchNo: 7,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 32, homeTeam: t('yonhap',      '연합뉴스'),     awayTeam: t('moneytoday',  '머니투데이') },
  { matchNo: 8,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 32, homeTeam: t('dailyan',     '데일리안'),     awayTeam: t('ilyo',        '일요신문') },
  { matchNo: 9,  round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 33, homeTeam: t('newspim',     '뉴스핌'),       awayTeam: SEDAILY, isSedailyMatch: true },

  // ══════════════════════════════════════════════════════
  // 우측 블록 — 1회전 (10~27조) | 4월 18일
  // ══════════════════════════════════════════════════════
  { matchNo: 10, round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 34, homeTeam: t('mbc',         'MBC'),          awayTeam: t('yonhapnewstv','연합뉴스TV') },
  { matchNo: 11, round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 34, homeTeam: t('herald',      '헤럴드경제'),   awayTeam: t('mtn',         'MTN') },
  { matchNo: 12, round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 35, homeTeam: t('sbsbiz',      'SBS Biz'),      awayTeam: t('yonhapinfo',  '연합인포맥스') },
  { matchNo: 13, round: 'R1', roundLabel: '1회전', block: 'left',  status: 'upcoming', nextMatchNo: 35, homeTeam: t('hankuk',      '한국경제신문'), awayTeam: t('edaily',      '이데일리') },
  { matchNo: 14, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 36, homeTeam: t('munhwa',      '문화일보'),     awayTeam: t('hankuktv',    '한국경제TV') },
  { matchNo: 15, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 37, homeTeam: t('thefact',     '더팩트'),       awayTeam: t('jtbc',        'JTBC') },
  { matchNo: 16, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 37, homeTeam: t('mbn',         'MBN'),          awayTeam: t('seoulsinmun', '서울신문') },
  { matchNo: 17, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 38, homeTeam: t('bizwatch',    '브릿지경제'),   awayTeam: t('energy',      '에너지경제') },
  { matchNo: 18, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 38, homeTeam: t('hani',        '한겨레'),       awayTeam: t('ajueconomy',  '아주경제') },
  { matchNo: 19, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 39, homeTeam: t('segye',       '세계일보'),     awayTeam: t('sbs',         'SBS') },
  { matchNo: 20, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 39, homeTeam: t('electronic',  '전자신문'),     awayTeam: t('joongang',    '중앙일보') },
  { matchNo: 21, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 40, homeTeam: t('daehan',      '대한경제'),     awayTeam: t('cbs',         'CBS') },
  { matchNo: 22, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 41, homeTeam: t('koreaherald', '코리아헤럴드'), awayTeam: t('newsis',      '뉴시스') },
  { matchNo: 23, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 41, homeTeam: t('itoday',      '이투데이'),     awayTeam: t('kyunghyang',  '경향신문') },
  { matchNo: 24, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 42, homeTeam: t('inews24',     '아이뉴스24'),   awayTeam: t('financial',   '파이낸셜뉴스') },
  { matchNo: 25, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 43, homeTeam: t('tvchosun',    'TV조선'),       awayTeam: t('kbs',         'KBS') },
  { matchNo: 26, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 43, homeTeam: t('newdaily',    '뉴데일리'),     awayTeam: t('asiaeconomy', '아시아경제') },
  { matchNo: 27, round: 'R1', roundLabel: '1회전', block: 'right', status: 'upcoming', nextMatchNo: 43, homeTeam: t('newstomato',  '뉴스토마토'),   awayTeam: t('nongmin',     '농민신문') },

  // ══════════════════════════════════════════════════════
  // 좌측 블록 — 2회전 (28~33조) | 4월 18일
  // ══════════════════════════════════════════════════════
  { matchNo: 28, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 44, homeTeam: t('ytn', 'YTN', 1), awayTeam: tbd(1) },
  { matchNo: 29, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 44, homeTeam: tbd(2), awayTeam: tbd(3) },
  { matchNo: 30, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 45, homeTeam: t('cookie', '쿠키뉴스'), awayTeam: tbd(4) },
  { matchNo: 31, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 45, homeTeam: tbd(5), awayTeam: tbd(6) },
  { matchNo: 32, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 46, homeTeam: t('channela', '채널A'), awayTeam: tbd(7) },
  { matchNo: 33, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 46, homeTeam: tbd(8), awayTeam: tbd(9, '9조 승자 (서울경제 가능)'), isSedailyMatch: true },

  // ══════════════════════════════════════════════════════
  // 우측 블록 — 2회전 (34~43조) | 4월 18일
  // ══════════════════════════════════════════════════════
  { matchNo: 34, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 47, homeTeam: tbd(10), awayTeam: tbd(11) },
  { matchNo: 35, round: 'R2', roundLabel: '2회전', block: 'left',  status: 'upcoming', nextMatchNo: 47, homeTeam: tbd(12), awayTeam: tbd(13) },
  { matchNo: 36, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 48, homeTeam: t('donga', '동아일보', 2), awayTeam: tbd(14) },
  { matchNo: 37, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 48, homeTeam: tbd(15), awayTeam: tbd(16) },
  { matchNo: 38, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 49, homeTeam: tbd(17), awayTeam: tbd(18) },
  { matchNo: 39, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 49, homeTeam: tbd(19), awayTeam: tbd(20) },
  { matchNo: 40, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 50, homeTeam: t('kukmin', '국민일보'), awayTeam: tbd(21) },
  { matchNo: 41, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 50, homeTeam: tbd(22), awayTeam: tbd(23) },
  { matchNo: 42, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 51, homeTeam: tbd(24), awayTeam: tbd(25) },
  { matchNo: 43, round: 'R2', roundLabel: '2회전', block: 'right', status: 'upcoming', nextMatchNo: 51, homeTeam: tbd(26), awayTeam: tbd(27) },

  // ══════════════════════════════════════════════════════
  // 16강 (44~51조) | 4월 19일 — 농협대학교
  // ══════════════════════════════════════════════════════
  { matchNo: 44, round: 'R3', roundLabel: '16강', block: 'left',  status: 'upcoming', nextMatchNo: 52, homeTeam: tbd(28), awayTeam: tbd(29) },
  { matchNo: 45, round: 'R3', roundLabel: '16강', block: 'left',  status: 'upcoming', nextMatchNo: 52, homeTeam: tbd(30), awayTeam: tbd(31) },
  { matchNo: 46, round: 'R3', roundLabel: '16강', block: 'left',  status: 'upcoming', nextMatchNo: 53, homeTeam: tbd(32), awayTeam: tbd(33, '33조 승자 (서울경제 가능)'), isSedailyMatch: true },
  { matchNo: 47, round: 'R3', roundLabel: '16강', block: 'left',  status: 'upcoming', nextMatchNo: 53, homeTeam: tbd(34), awayTeam: tbd(35) },
  { matchNo: 48, round: 'R3', roundLabel: '16강', block: 'right', status: 'upcoming', nextMatchNo: 54, homeTeam: tbd(36), awayTeam: tbd(37) },
  { matchNo: 49, round: 'R3', roundLabel: '16강', block: 'right', status: 'upcoming', nextMatchNo: 54, homeTeam: tbd(38), awayTeam: tbd(39) },
  { matchNo: 50, round: 'R3', roundLabel: '16강', block: 'right', status: 'upcoming', nextMatchNo: 55, homeTeam: tbd(40), awayTeam: tbd(41) },
  { matchNo: 51, round: 'R3', roundLabel: '16강', block: 'right', status: 'upcoming', nextMatchNo: 55, homeTeam: tbd(42), awayTeam: tbd(43) },

  // ══════════════════════════════════════════════════════
  // 8강 (52~55조) | 4월 25일 — 고양 어울림누리
  // ══════════════════════════════════════════════════════
  { matchNo: 52, round: 'QF', roundLabel: '8강', block: 'left',  status: 'upcoming', nextMatchNo: 56, homeTeam: tbd(44), awayTeam: tbd(45) },
  { matchNo: 53, round: 'QF', roundLabel: '8강', block: 'left',  status: 'upcoming', nextMatchNo: 56, homeTeam: tbd(46, '46조 승자 (서울경제 가능)'), awayTeam: tbd(47), isSedailyMatch: true },
  { matchNo: 54, round: 'QF', roundLabel: '8강', block: 'right', status: 'upcoming', nextMatchNo: 57, homeTeam: tbd(48), awayTeam: tbd(49) },
  { matchNo: 55, round: 'QF', roundLabel: '8강', block: 'right', status: 'upcoming', nextMatchNo: 57, homeTeam: tbd(50), awayTeam: tbd(51) },

  // ══════════════════════════════════════════════════════
  // 4강 (56~57조) | 4월 25일
  // ══════════════════════════════════════════════════════
  { matchNo: 56, round: 'SF', roundLabel: '4강', block: 'left',  status: 'upcoming', nextMatchNo: 58, homeTeam: tbd(52), awayTeam: tbd(53, '53조 승자 (서울경제 가능)'), isSedailyMatch: true },
  { matchNo: 57, round: 'SF', roundLabel: '4강', block: 'right', status: 'upcoming', nextMatchNo: 58, homeTeam: tbd(54), awayTeam: tbd(55) },

  // ══════════════════════════════════════════════════════
  // 3·4위전 + 결승 | 4월 25일
  // ══════════════════════════════════════════════════════
  { matchNo: 58, round: 'F3', roundLabel: '3·4위전', block: 'final', status: 'upcoming',
    homeTeam: { tbd: true, fromMatch: 56, label: '56조 패자' },
    awayTeam: { tbd: true, fromMatch: 57, label: '57조 패자' } },
  { matchNo: 59, round: 'F1', roundLabel: '결승', block: 'final', status: 'upcoming',
    homeTeam: { tbd: true, fromMatch: 56, label: '56조 승자' },
    awayTeam: { tbd: true, fromMatch: 57, label: '57조 승자' } },
];

export const kja52: TournamentData = {
  edition: 52,
  year: 2026,
  title: '제52회 한국기자협회 서울지역 축구대회',
  teamsCount: 52,
  matchesCount: 59,
  matches,
  rules,
  roster,
};

// 서울경제 경기 경로 (하이라이트용)
// 9조 → 33조 → 46조 → 53조 → 56조 → 결승(59조)
export const sedailyPath = matches.filter(m => m.isSedailyMatch);
export const SEDAILY_PATH_MATCHES = [9, 33, 46, 53, 56, 59];