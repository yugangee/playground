/**
 * 제52회 KJA 대회 — 59개 팀 UUID 생성 + 매치 업데이트 마이그레이션
 *
 * 1. pg-teams: 58개 외부 팀 레코드 생성 (서경 어벤져스는 이미 존재)
 * 2. pg-league-teams: 59개 팀 참가 등록
 * 3. pg-league-matches: 기존 59개 삭제 → UUID 기반으로 재생성
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'

const client = new DynamoDBClient({ region: 'us-east-1' })
const db = DynamoDBDocumentClient.from(client)

const LEAGUE_ID = 'd5a7c5d7-6751-4327-8985-adfd8e4fbc79'
const TEAM_ID = '3dcafab5-867a-4028-9049-808ab273c236' // 서경 어벤져스
const NOW = new Date().toISOString()

// ── 59개 팀 정의 (서울경제 = 서경 어벤져스) ─────────────────────────────────

const ALL_TEAM_NAMES = [
  '조선비즈', '메트로미디어', '뉴스웨이', '더벨', '매일경제', '노컷뉴스',
  'EBN', '뉴스1', '디지털타임스', '아시아투데이', '한국일보', '조선일보',
  '연합뉴스', '머니투데이', '데일리안', '일요신문', '뉴스핌', '서울경제',
  'MBC', '연합뉴스TV', '헤럴드경제', 'MTN', 'SBS Biz', '연합인포맥스',
  '한국경제신문', '이데일리', '문화일보', '한국경제TV', '더팩트', 'JTBC',
  'MBN', '서울신문', '브릿지경제', '에너지경제', '한겨레', '아주경제',
  '세계일보', 'SBS', '전자신문', '중앙일보', '대한경제', 'CBS',
  '코리아헤럴드', '뉴시스', '이투데이', '경향신문', '아이뉴스24', '파이낸셜뉴스',
  'TV조선', 'KBS', '뉴데일리', '아시아경제', '뉴스토마토', '농민신문',
  'YTN', '채널A', '동아일보', '국민일보', '루키뉴스',
]

// 팀 이름 → UUID 매핑 생성
const teamMap = new Map()
for (const name of ALL_TEAM_NAMES) {
  if (name === '서울경제') {
    teamMap.set(name, TEAM_ID)
  } else {
    teamMap.set(name, randomUUID())
  }
}

function tid(name) {
  return teamMap.get(name)
}

// ── 1. pg-teams 생성 (58개 새 팀) ───────────────────────────────────────────

async function createTeams() {
  const newTeams = ALL_TEAM_NAMES.filter(n => n !== '서울경제')

  for (let i = 0; i < newTeams.length; i += 25) {
    const batch = newTeams.slice(i, i + 25)
    await db.send(new BatchWriteCommand({
      RequestItems: {
        'pg-teams': batch.map(name => ({
          PutRequest: {
            Item: {
              id: tid(name),
              name,
              region: '서울',
              sportType: '축구',
              leaderId: 'external',
              description: `한국기자협회 소속 - ${name}`,
              createdAt: NOW,
            },
          },
        })),
      },
    }))
    console.log(`  pg-teams ${i + 1}~${Math.min(i + 25, newTeams.length)} / ${newTeams.length}`)
  }
  console.log('✅ 58개 팀 pg-teams 생성 완료')
}

// ── 2. pg-league-teams 참가 등록 (59개) ─────────────────────────────────────

async function registerTeams() {
  const allEntries = ALL_TEAM_NAMES.map(name => ({
    leagueId: LEAGUE_ID,
    teamId: tid(name),
    teamName: name === '서울경제' ? '서경 어벤져스' : name,
    joinedAt: NOW,
  }))

  for (let i = 0; i < allEntries.length; i += 25) {
    const batch = allEntries.slice(i, i + 25)
    await db.send(new BatchWriteCommand({
      RequestItems: {
        'pg-league-teams': batch.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    }))
    console.log(`  pg-league-teams ${i + 1}~${Math.min(i + 25, allEntries.length)} / ${allEntries.length}`)
  }
  console.log('✅ 59개 팀 pg-league-teams 참가 등록 완료')
}

// ── 3. 기존 매치 삭제 ───────────────────────────────────────────────────────

async function deleteExistingMatches() {
  const result = await db.send(new QueryCommand({
    TableName: 'pg-league-matches',
    IndexName: 'leagueId-index',
    KeyConditionExpression: 'leagueId = :lid',
    ExpressionAttributeValues: { ':lid': LEAGUE_ID },
  }))
  const existing = result.Items ?? []

  for (const m of existing) {
    await db.send(new DeleteCommand({
      TableName: 'pg-league-matches',
      Key: { id: m.id },
    }))
  }
  console.log(`✅ 기존 매치 ${existing.length}개 삭제 완료`)
}

// ── 4. UUID 기반 매치 재생성 ────────────────────────────────────────────────

const V1 = '고양 어울림누리 별무리경기장'
const V2 = '노원 마들스타디움'
const V3 = '농협대학교 축구장'

function dt(month, day, hour, minute) {
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`
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

async function recreateMatches() {
  const items = matches.map(m => ({
    id: randomUUID(),
    leagueId: LEAGUE_ID,
    matchNumber: m.n,
    round: m.round,
    homeTeamId: m.home ? tid(m.home) : 'TBD',
    homeTeamName: m.home || 'TBD',
    awayTeamId: m.away ? tid(m.away) : 'TBD',
    awayTeamName: m.away || 'TBD',
    scheduledAt: m.time,
    venue: m.venue,
    status: 'pending',
    label: m.label || `${m.home || 'TBD'} vs ${m.away || 'TBD'}`,
    ...(m.next ? { nextMatchNumber: m.next, nextMatchSlot: m.slot } : {}),
    ...(m.loserNext ? { loserNextMatchNumber: m.loserNext, loserNextMatchSlot: m.loserSlot } : {}),
    createdAt: NOW,
  }))

  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25)
    await db.send(new BatchWriteCommand({
      RequestItems: {
        'pg-league-matches': batch.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    }))
    console.log(`  pg-league-matches ${i + 1}~${Math.min(i + 25, items.length)} / ${items.length}`)
  }
  console.log('✅ 매치 59개 UUID 기반으로 재생성 완료')
}

// ── 실행 ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 제52회 KJA 대회 — 팀 UUID 마이그레이션 시작...\n')

  console.log('1/4. pg-teams 생성 (58개 외부 팀)...')
  await createTeams()

  console.log('\n2/4. pg-league-teams 참가 등록 (59개 팀)...')
  await registerTeams()

  console.log('\n3/4. 기존 매치 삭제...')
  await deleteExistingMatches()

  console.log('\n4/4. 매치 UUID 기반 재생성...')
  await recreateMatches()

  console.log('\n✨ 마이그레이션 완료!')
  console.log(`   대회 ID: ${LEAGUE_ID}`)
  console.log(`   팀 수: 59개 (서경 어벤져스 + 58개 외부 팀)`)
  console.log(`   매치 수: 59개`)

  // 팀 매핑 출력
  console.log('\n📋 팀 UUID 매핑:')
  for (const [name, id] of teamMap.entries()) {
    console.log(`   ${name.padEnd(12)} → ${id}`)
  }
}

main().catch(err => {
  console.error('❌ 마이그레이션 실패:', err)
  process.exit(1)
})
