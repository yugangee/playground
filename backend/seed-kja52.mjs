/**
 * 제52회 한국기자협회 서울지역 축구대회 시드 스크립트
 *
 * 생성 항목:
 * 1. pg-teams: 서경 어벤져스 팀 레코드
 * 2. pg-team-members: ai01@sedaily.com 멤버 레코드
 * 3. pg-leagues: 대회 레코드
 * 4. pg-league-teams: 주최팀 참가 레코드
 * 5. pg-league-matches: 59개 매치 레코드 (커스텀 대진표)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'

const client = new DynamoDBClient({ region: 'us-east-1' })
const db = DynamoDBDocumentClient.from(client)

// ── 상수 ──────────────────────────────────────────────────────────────────────

const USER_SUB = '64a82468-5041-7023-f956-8bf26c683c3d'
const TEAM_ID = '3dcafab5-867a-4028-9049-808ab273c236'
const TEAM_NAME = '서경 어벤져스'
const LEAGUE_ID = randomUUID()
const NOW = new Date().toISOString()

// ── 1. 팀 생성 ──────────────────────────────────────────────────────────────

async function createTeam() {
  await db.send(new PutCommand({
    TableName: 'pg-teams',
    Item: {
      id: TEAM_ID,
      name: TEAM_NAME,
      region: '서울',
      sportType: '축구',
      leaderId: USER_SUB,
      description: '서울경제 축구팀 - 서경 어벤져스',
      logoUrl: 'https://d1t0vkbh1b2z3x.cloudfront.net/uploads/team-logos/eb8e32e1-25e9-4f02-aca0-1c0b6f7d7b22.png',
      createdAt: NOW,
    },
  }))

  await db.send(new PutCommand({
    TableName: 'pg-team-members',
    Item: {
      teamId: TEAM_ID,
      userId: USER_SUB,
      name: '서경 관리자',
      role: 'leader',
      position: '매니저',
      joinedAt: NOW,
    },
  }))

  console.log('✅ 팀 생성 완료:', TEAM_NAME)
}

// ── 2. 대회 생성 ────────────────────────────────────────────────────────────

async function createLeague() {
  await db.send(new PutCommand({
    TableName: 'pg-leagues',
    Item: {
      id: LEAGUE_ID,
      name: '제52회 한국기자협회 서울지역 축구대회',
      type: 'tournament',
      organizerId: USER_SUB,
      organizerTeamId: TEAM_ID,
      status: 'recruiting',
      isPublic: 'true',
      description: '한국기자협회 서울지역 회원사 대상 축구대회. 토너먼트 방식으로 진행되며, 무승부 시 승부차기. 3·4위전은 승부차기로 진행.',
      bracketSize: 59,
      rules: {
        halvesPerMatch: 2,
        minutesPerHalf: 15,
        halftimeMinutes: 10,
        substitutionRule: '무제한 (교체 선수 재출전 가능)',
        maxSubstitutions: 99,
        yellowCardAccumulation: 2,
        redCardSuspension: 2,
        penaltyShootout: true,
        maxGuestsPerMatch: 0,
        maxPlayersPerTeam: 30,
        minPlayersPerMatch: 7,
        warningResetAtSemifinals: true,
        warningResetCondition: '8강까지 경고 1장만 받은 상태에서 4강 진출 시 초기화',
        noExtraTime: true,
        thirdPlaceByPK: true,
      },
      registration: {
        deadline: '2026-01-09T02:00:00.000Z',
        fee: 300000,
        currency: 'KRW',
        maxTeams: 59,
        rosterDeadline: '2026-03-27T06:00:00.000Z',
        rosterMaxPlayers: 30,
      },
      venues: [
        { name: '고양 어울림누리 별무리경기장', address: '경기 고양시 덕양구 어울림로 33 고양어울림누리' },
        { name: '노원 마들스타디움', address: '서울 노원구 덕릉로 450' },
        { name: '농협대학교 축구장', address: '경기 고양시 덕양구 서삼릉길 281' },
      ],
      schedule: {
        dates: ['2026-04-18', '2026-04-19', '2026-04-25'],
        day1: '예선~32강 (3개 구장 동시)',
        day2: '16강 (농협대학교)',
        day3: '8강~결승 (고양 어울림누리)',
      },
      seeds: {
        1: { teamName: 'YTN', reason: '직전대회 우승' },
        2: { teamName: '채널A', reason: '직전대회 준우승' },
        3: { teamName: '동아일보', reason: '직전대회 3위' },
        4: { teamName: '국민일보', reason: '직전대회 4위' },
      },
      createdAt: NOW,
    },
  }))

  // 주최팀 자동 참가
  await db.send(new PutCommand({
    TableName: 'pg-league-teams',
    Item: {
      leagueId: LEAGUE_ID,
      teamId: TEAM_ID,
      joinedAt: NOW,
    },
  }))

  console.log('✅ 대회 생성 완료:', LEAGUE_ID)
}

// ── 3. 매치 생성 (59경기) ───────────────────────────────────────────────────

const V1 = '고양 어울림누리 별무리경기장'
const V2 = '노원 마들스타디움'
const V3 = '농협대학교 축구장'

function dt(month, day, hour, minute) {
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`
}

// 서울경제 = 서경 어벤져스의 대회 참가명
const SEOUL_ECONOMY_ID = TEAM_ID

function teamId(name) {
  if (name === '서울경제') return SEOUL_ECONOMY_ID
  return name // 외부 팀은 이름을 ID로 사용
}

const matches = [
  // ── 1라운드 (4/18) ── 고양 어울림누리 ──
  { n: 1,  round: '1라운드', home: '조선비즈',     away: '메트로미디어',  time: dt(4,18,8,0),   venue: V1, next: 28, slot: 'away' },
  { n: 2,  round: '1라운드', home: '뉴스웨이',     away: '더벨',         time: dt(4,18,8,40),  venue: V1, next: 29, slot: 'home' },
  { n: 3,  round: '1라운드', home: '매일경제',     away: '노컷뉴스',     time: dt(4,18,9,20),  venue: V1, next: 29, slot: 'away' },
  { n: 4,  round: '1라운드', home: 'EBN',          away: '뉴스1',        time: dt(4,18,11,20), venue: V1, next: 30, slot: 'away' },
  { n: 5,  round: '1라운드', home: '디지털타임스',  away: '아시아투데이',  time: dt(4,18,12,0),  venue: V1, next: 31, slot: 'home' },
  { n: 6,  round: '1라운드', home: '한국일보',     away: '조선일보',     time: dt(4,18,12,40), venue: V1, next: 31, slot: 'away' },
  { n: 7,  round: '1라운드', home: '연합뉴스',     away: '머니투데이',   time: dt(4,18,14,40), venue: V1, next: 32, slot: 'away' },
  { n: 8,  round: '1라운드', home: '데일리안',     away: '일요신문',     time: dt(4,18,15,20), venue: V1, next: 33, slot: 'home' },
  { n: 9,  round: '1라운드', home: '뉴스핌',       away: '서울경제',     time: dt(4,18,16,0),  venue: V1, next: 33, slot: 'away' },

  // ── 1라운드 (4/18) ── 노원 마들스타디움 ──
  { n: 10, round: '1라운드', home: 'MBC',          away: '연합뉴스TV',   time: dt(4,18,8,40),  venue: V2, next: 34, slot: 'home' },
  { n: 11, round: '1라운드', home: '헤럴드경제',   away: 'MTN',          time: dt(4,18,9,20),  venue: V2, next: 34, slot: 'away' },
  { n: 12, round: '1라운드', home: 'SBS Biz',      away: '연합인포맥스',  time: dt(4,18,10,0),  venue: V2, next: 35, slot: 'home' },
  { n: 13, round: '1라운드', home: '한국경제신문',  away: '이데일리',     time: dt(4,18,10,40), venue: V2, next: 35, slot: 'away' },
  { n: 14, round: '1라운드', home: '문화일보',     away: '한국경제TV',   time: dt(4,18,14,0),  venue: V2, next: 36, slot: 'away' },
  { n: 15, round: '1라운드', home: '더팩트',       away: 'JTBC',         time: dt(4,18,15,20), venue: V2, next: 37, slot: 'home' },
  { n: 16, round: '1라운드', home: 'MBN',          away: '서울신문',     time: dt(4,18,16,0),  venue: V2, next: 37, slot: 'away' },
  { n: 17, round: '1라운드', home: '브릿지경제',   away: '에너지경제',   time: dt(4,18,12,40), venue: V2, next: 38, slot: 'home' },
  { n: 18, round: '1라운드', home: '한겨레',       away: '아주경제',     time: dt(4,18,13,20), venue: V2, next: 38, slot: 'away' },

  // ── 1라운드 (4/18) ── 농협대학교 축구장 ──
  { n: 19, round: '1라운드', home: '세계일보',     away: 'SBS',          time: dt(4,18,8,40),  venue: V3, next: 39, slot: 'home' },
  { n: 20, round: '1라운드', home: '전자신문',     away: '중앙일보',     time: dt(4,18,9,20),  venue: V3, next: 39, slot: 'away' },
  { n: 21, round: '1라운드', home: '대한경제',     away: 'CBS',          time: dt(4,18,10,0),  venue: V3, next: 40, slot: 'away' },
  { n: 22, round: '1라운드', home: '코리아헤럴드', away: '뉴시스',       time: dt(4,18,11,20), venue: V3, next: 41, slot: 'home' },
  { n: 23, round: '1라운드', home: '이투데이',     away: '경향신문',     time: dt(4,18,12,0),  venue: V3, next: 41, slot: 'away' },
  { n: 24, round: '1라운드', home: '아이뉴스24',   away: '파이낸셜뉴스', time: dt(4,18,14,0),  venue: V3, next: 42, slot: 'home' },
  { n: 25, round: '1라운드', home: 'TV조선',       away: 'KBS',          time: dt(4,18,14,40), venue: V3, next: 42, slot: 'away' },
  { n: 26, round: '1라운드', home: '뉴데일리',     away: '아시아경제',   time: dt(4,18,15,20), venue: V3, next: 43, slot: 'home' },
  { n: 27, round: '1라운드', home: '뉴스토마토',   away: '농민신문',     time: dt(4,18,16,0),  venue: V3, next: 43, slot: 'away' },

  // ── 32강 (4/18) ── 고양 어울림누리 ──
  { n: 28, round: '32강', home: 'YTN',      away: null,  time: dt(4,18,10,0),  venue: V1, next: 44, slot: 'home', label: 'YTN vs 1조 승자' },
  { n: 29, round: '32강', home: null,        away: null,  time: dt(4,18,10,40), venue: V1, next: 44, slot: 'away', label: '2조 승자 vs 3조 승자' },
  { n: 30, round: '32강', home: '루키뉴스',  away: null,  time: dt(4,18,13,20), venue: V1, next: 45, slot: 'home', label: '루키뉴스 vs 4조 승자' },
  { n: 31, round: '32강', home: null,        away: null,  time: dt(4,18,14,0),  venue: V1, next: 45, slot: 'away', label: '5조 승자 vs 6조 승자' },
  { n: 32, round: '32강', home: '채널A',     away: null,  time: dt(4,18,16,40), venue: V1, next: 46, slot: 'home', label: '채널A vs 7조 승자' },
  { n: 33, round: '32강', home: null,        away: null,  time: dt(4,18,17,20), venue: V1, next: 46, slot: 'away', label: '8조 승자 vs 9조 승자' },

  // ── 32강 (4/18) ── 노원 마들스타디움 ──
  { n: 34, round: '32강', home: null,        away: null,  time: dt(4,18,11,20), venue: V2, next: 47, slot: 'home', label: '10조 승자 vs 11조 승자' },
  { n: 35, round: '32강', home: null,        away: null,  time: dt(4,18,12,0),  venue: V2, next: 47, slot: 'away', label: '12조 승자 vs 13조 승자' },
  { n: 36, round: '32강', home: '동아일보',  away: null,  time: dt(4,18,16,40), venue: V2, next: 48, slot: 'home', label: '동아일보 vs 14조 승자' },
  { n: 37, round: '32강', home: null,        away: null,  time: dt(4,18,17,20), venue: V2, next: 48, slot: 'away', label: '15조 승자 vs 16조 승자' },
  { n: 38, round: '32강', home: null,        away: null,  time: dt(4,18,14,40), venue: V2, next: 49, slot: 'home', label: '17조 승자 vs 18조 승자' },
  { n: 39, round: '32강', home: null,        away: null,  time: dt(4,18,10,40), venue: V3, next: 49, slot: 'away', label: '19조 승자 vs 20조 승자' },

  // ── 32강 (4/18) ── 농협대학교 축구장 ──
  { n: 40, round: '32강', home: '국민일보',  away: null,  time: dt(4,18,12,40), venue: V3, next: 50, slot: 'home', label: '국민일보 vs 21조 승자' },
  { n: 41, round: '32강', home: null,        away: null,  time: dt(4,18,13,20), venue: V3, next: 50, slot: 'away', label: '22조 승자 vs 23조 승자' },
  { n: 42, round: '32강', home: null,        away: null,  time: dt(4,18,16,40), venue: V3, next: 51, slot: 'home', label: '24조 승자 vs 25조 승자' },
  { n: 43, round: '32강', home: null,        away: null,  time: dt(4,18,17,20), venue: V3, next: 51, slot: 'away', label: '26조 승자 vs 27조 승자' },

  // ── 16강 (4/19) ── 농협대학교 축구장 ──
  { n: 44, round: '16강', home: null, away: null, time: dt(4,19,10,0),  venue: V3, next: 52, slot: 'home', label: '28조 승자 vs 29조 승자' },
  { n: 45, round: '16강', home: null, away: null, time: dt(4,19,10,40), venue: V3, next: 52, slot: 'away', label: '30조 승자 vs 31조 승자' },
  { n: 46, round: '16강', home: null, away: null, time: dt(4,19,11,20), venue: V3, next: 53, slot: 'home', label: '32조 승자 vs 33조 승자' },
  { n: 47, round: '16강', home: null, away: null, time: dt(4,19,12,0),  venue: V3, next: 53, slot: 'away', label: '34조 승자 vs 35조 승자' },
  { n: 48, round: '16강', home: null, away: null, time: dt(4,19,12,40), venue: V3, next: 54, slot: 'home', label: '36조 승자 vs 37조 승자' },
  { n: 49, round: '16강', home: null, away: null, time: dt(4,19,13,20), venue: V3, next: 54, slot: 'away', label: '38조 승자 vs 39조 승자' },
  { n: 50, round: '16강', home: null, away: null, time: dt(4,19,14,0),  venue: V3, next: 55, slot: 'home', label: '40조 승자 vs 41조 승자' },
  { n: 51, round: '16강', home: null, away: null, time: dt(4,19,14,40), venue: V3, next: 55, slot: 'away', label: '42조 승자 vs 43조 승자' },

  // ── 8강 (4/25) ── 고양 어울림누리 ──
  { n: 52, round: '8강', home: null, away: null, time: dt(4,25,9,0),   venue: V1, next: 56, slot: 'home', label: '44조 승자 vs 45조 승자' },
  { n: 53, round: '8강', home: null, away: null, time: dt(4,25,9,40),  venue: V1, next: 56, slot: 'away', label: '46조 승자 vs 47조 승자' },
  { n: 54, round: '8강', home: null, away: null, time: dt(4,25,10,20), venue: V1, next: 57, slot: 'home', label: '48조 승자 vs 49조 승자' },
  { n: 55, round: '8강', home: null, away: null, time: dt(4,25,11,0),  venue: V1, next: 57, slot: 'away', label: '50조 승자 vs 51조 승자' },

  // ── 준결승 (4/25) ── 고양 어울림누리 ──
  { n: 56, round: '준결승', home: null, away: null, time: dt(4,25,12,20), venue: V1, next: 59, slot: 'home', loserNext: 58, loserSlot: 'home', label: '52조 승자 vs 53조 승자 (4강-1)' },
  { n: 57, round: '준결승', home: null, away: null, time: dt(4,25,13,0),  venue: V1, next: 59, slot: 'away', loserNext: 58, loserSlot: 'away', label: '54조 승자 vs 55조 승자 (4강-2)' },

  // ── 3/4위전 (4/25) ── 고양 어울림누리 ──
  { n: 58, round: '3/4위전', home: null, away: null, time: dt(4,25,14,20), venue: V1, next: null, slot: null, label: '56조 패자 vs 57조 패자 (승부차기)' },

  // ── 결승 (4/25) ── 고양 어울림누리 ──
  { n: 59, round: '결승', home: null, away: null, time: dt(4,25,14,40), venue: V1, next: null, slot: null, label: '56조 승자 vs 57조 승자' },
]

async function createMatches() {
  const items = matches.map(m => ({
    id: randomUUID(),
    leagueId: LEAGUE_ID,
    matchNumber: m.n,
    round: m.round,
    homeTeamId: m.home ? teamId(m.home) : 'TBD',
    homeTeamName: m.home || 'TBD',
    awayTeamId: m.away ? teamId(m.away) : 'TBD',
    awayTeamName: m.away || 'TBD',
    scheduledAt: m.time,
    venue: m.venue,
    status: 'pending',
    label: m.label || `${m.home || 'TBD'} vs ${m.away || 'TBD'}`,
    ...(m.next ? { nextMatchNumber: m.next, nextMatchSlot: m.slot } : {}),
    ...(m.loserNext ? { loserNextMatchNumber: m.loserNext, loserNextMatchSlot: m.loserSlot } : {}),
    createdAt: NOW,
  }))

  // BatchWriteCommand는 25개 제한이므로 분할
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25)
    await db.send(new BatchWriteCommand({
      RequestItems: {
        'pg-league-matches': batch.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    }))
    console.log(`  매치 ${i + 1}~${Math.min(i + 25, items.length)} / ${items.length} 저장`)
  }

  console.log('✅ 매치 59개 생성 완료')
}

// ── 실행 ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏆 제52회 한국기자협회 서울지역 축구대회 시드 시작...\n')

  await createTeam()
  await createLeague()
  await createMatches()

  console.log('\n✨ 시드 완료!')
  console.log(`   대회 ID: ${LEAGUE_ID}`)
  console.log(`   팀 ID:   ${TEAM_ID}`)
  console.log(`   주최자:  ai01@sedaily.com (${USER_SUB})`)
}

main().catch(err => {
  console.error('❌ 시드 실패:', err)
  process.exit(1)
})
