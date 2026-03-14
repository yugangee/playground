/**
 * KJA 51회 한국기자협회 축구대회 대진표 템플릿
 *
 * 57경기, 비대칭 토너먼트 구조
 * - 좌측 블록: 예선(1-12) → 16강(26-33) → 8강(42-45) → 준결승(50-51) → 블록결승(54)
 * - 우측 블록: 예선(13-25) → 16강(34-41) → 8강(46-49) → 준결승(52-53) → 블록결승(55)
 * - 결승(56), 3/4위전(57)
 *
 * 시드: 1시드 YTN(26조 홈), 2시드 동아일보(30조 홈), 3시드 뉴스1(34조 홈), 4시드 서울경제(38조 홈)
 */

export interface KJAMatchTemplate {
  matchNumber: number
  round: string
  block: 'left' | 'right' | 'final'
  homeTeamId: string   // 'TBD', 'BYE', or seed label like 'SEED1'
  awayTeamId: string
  nextMatchNumber?: number
  nextMatchSlot?: 'home' | 'away'
  loserNextMatchNumber?: number
  loserNextMatchSlot?: 'home' | 'away'
  note?: string
}

// Seed slots — replaced with actual teamIds when creating
export const KJA_SEEDS = {
  SEED1: { label: '1시드 (전년도 우승)', slot: 26, position: 'home' as const },
  SEED2: { label: '2시드 (전년도 준우승)', slot: 30, position: 'home' as const },
  SEED3: { label: '3시드', slot: 34, position: 'home' as const },
  SEED4: { label: '4시드', slot: 38, position: 'home' as const },
}

export const KJA_BRACKET_TEMPLATE: KJAMatchTemplate[] = [
  // ─── Left block: 예선 (1-12) ────────────────────────────────────────────
  { matchNumber: 1,  round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 26, nextMatchSlot: 'away' },
  { matchNumber: 2,  round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 27, nextMatchSlot: 'home' },
  { matchNumber: 3,  round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 27, nextMatchSlot: 'away' },
  { matchNumber: 4,  round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 28, nextMatchSlot: 'home' },
  { matchNumber: 5,  round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 28, nextMatchSlot: 'away' },
  { matchNumber: 6,  round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 29, nextMatchSlot: 'home' },
  { matchNumber: 7,  round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 29, nextMatchSlot: 'away' },
  { matchNumber: 8,  round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 30, nextMatchSlot: 'away' },
  { matchNumber: 9,  round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 31, nextMatchSlot: 'home' },
  { matchNumber: 10, round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 31, nextMatchSlot: 'away' },
  { matchNumber: 11, round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 32, nextMatchSlot: 'home' },
  { matchNumber: 12, round: '예선', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 32, nextMatchSlot: 'away' },

  // ─── Right block: 예선 (13-25) ──────────────────────────────────────────
  { matchNumber: 13, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 34, nextMatchSlot: 'away' },
  { matchNumber: 14, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 35, nextMatchSlot: 'home' },
  { matchNumber: 15, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 35, nextMatchSlot: 'away' },
  { matchNumber: 16, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 36, nextMatchSlot: 'home' },
  { matchNumber: 17, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 36, nextMatchSlot: 'away' },
  { matchNumber: 18, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 37, nextMatchSlot: 'home' },
  { matchNumber: 19, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 37, nextMatchSlot: 'away' },
  { matchNumber: 20, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 38, nextMatchSlot: 'away' },
  { matchNumber: 21, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 39, nextMatchSlot: 'home' },
  { matchNumber: 22, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 39, nextMatchSlot: 'away' },
  { matchNumber: 23, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 40, nextMatchSlot: 'home' },
  { matchNumber: 24, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 40, nextMatchSlot: 'away' },
  { matchNumber: 25, round: '예선', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 41, nextMatchSlot: 'home',
    note: '우측 예선 13경기 — 33조/41조는 부전승(BYE) 또는 추가 배정' },

  // ─── Left block: 16강 (26-33) — 시드 1,2 포함 ─────────────────────────
  { matchNumber: 26, round: '16강', block: 'left', homeTeamId: 'SEED1', awayTeamId: 'TBD', nextMatchNumber: 42, nextMatchSlot: 'home', note: '1시드' },
  { matchNumber: 27, round: '16강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 42, nextMatchSlot: 'away' },
  { matchNumber: 28, round: '16강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 43, nextMatchSlot: 'home' },
  { matchNumber: 29, round: '16강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 43, nextMatchSlot: 'away' },
  { matchNumber: 30, round: '16강', block: 'left', homeTeamId: 'SEED2', awayTeamId: 'TBD', nextMatchNumber: 44, nextMatchSlot: 'home', note: '2시드' },
  { matchNumber: 31, round: '16강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 44, nextMatchSlot: 'away' },
  { matchNumber: 32, round: '16강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 45, nextMatchSlot: 'home' },
  { matchNumber: 33, round: '16강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'BYE', nextMatchNumber: 45, nextMatchSlot: 'away', note: '부전승 슬롯 (팀 수 홀수 시)' },

  // ─── Right block: 16강 (34-41) — 시드 3,4 포함 ────────────────────────
  { matchNumber: 34, round: '16강', block: 'right', homeTeamId: 'SEED3', awayTeamId: 'TBD', nextMatchNumber: 46, nextMatchSlot: 'home', note: '3시드' },
  { matchNumber: 35, round: '16강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 46, nextMatchSlot: 'away' },
  { matchNumber: 36, round: '16강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 47, nextMatchSlot: 'home' },
  { matchNumber: 37, round: '16강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 47, nextMatchSlot: 'away' },
  { matchNumber: 38, round: '16강', block: 'right', homeTeamId: 'SEED4', awayTeamId: 'TBD', nextMatchNumber: 48, nextMatchSlot: 'home', note: '4시드' },
  { matchNumber: 39, round: '16강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 48, nextMatchSlot: 'away' },
  { matchNumber: 40, round: '16강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 49, nextMatchSlot: 'home' },
  { matchNumber: 41, round: '16강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'BYE', nextMatchNumber: 49, nextMatchSlot: 'away', note: '부전승 슬롯' },

  // ─── Left block: 8강 (42-45) ────────────────────────────────────────────
  { matchNumber: 42, round: '8강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 50, nextMatchSlot: 'home' },
  { matchNumber: 43, round: '8강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 50, nextMatchSlot: 'away' },
  { matchNumber: 44, round: '8강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 51, nextMatchSlot: 'home' },
  { matchNumber: 45, round: '8강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 51, nextMatchSlot: 'away' },

  // ─── Right block: 8강 (46-49) ───────────────────────────────────────────
  { matchNumber: 46, round: '8강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 52, nextMatchSlot: 'home' },
  { matchNumber: 47, round: '8강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 52, nextMatchSlot: 'away' },
  { matchNumber: 48, round: '8강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 53, nextMatchSlot: 'home' },
  { matchNumber: 49, round: '8강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 53, nextMatchSlot: 'away' },

  // ─── Left block: 준결승 (50-51) ─────────────────────────────────────────
  { matchNumber: 50, round: '준결승', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 54, nextMatchSlot: 'home' },
  { matchNumber: 51, round: '준결승', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 54, nextMatchSlot: 'away' },

  // ─── Right block: 준결승 (52-53) ────────────────────────────────────────
  { matchNumber: 52, round: '준결승', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 55, nextMatchSlot: 'home' },
  { matchNumber: 53, round: '준결승', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD', nextMatchNumber: 55, nextMatchSlot: 'away' },

  // ─── 4강 (블록 결승) ────────────────────────────────────────────────────
  { matchNumber: 54, round: '4강', block: 'left', homeTeamId: 'TBD', awayTeamId: 'TBD',
    nextMatchNumber: 56, nextMatchSlot: 'home', loserNextMatchNumber: 57, loserNextMatchSlot: 'home' },
  { matchNumber: 55, round: '4강', block: 'right', homeTeamId: 'TBD', awayTeamId: 'TBD',
    nextMatchNumber: 56, nextMatchSlot: 'away', loserNextMatchNumber: 57, loserNextMatchSlot: 'away' },

  // ─── 결승 & 3/4위전 ────────────────────────────────────────────────────
  { matchNumber: 56, round: '결승', block: 'final', homeTeamId: 'TBD', awayTeamId: 'TBD' },
  { matchNumber: 57, round: '3/4위전', block: 'final', homeTeamId: 'TBD', awayTeamId: 'TBD' },
]

/** Convert template to API-ready match creation payload */
export function kjaTemplateToBatchPayload(
  seedMap: Record<string, string>,  // e.g. { SEED1: 'teamId-xxx', SEED2: 'teamId-yyy', ... }
  defaultDate: string,
  venue: string,
): Array<Record<string, unknown>> {
  return KJA_BRACKET_TEMPLATE.map(m => {
    let homeTeamId = m.homeTeamId
    let awayTeamId = m.awayTeamId

    // Replace seed placeholders with actual teamIds
    if (homeTeamId.startsWith('SEED') && seedMap[homeTeamId]) homeTeamId = seedMap[homeTeamId]
    if (awayTeamId.startsWith('SEED') && seedMap[awayTeamId]) awayTeamId = seedMap[awayTeamId]

    // Keep SEED labels as TBD if not yet assigned
    if (homeTeamId.startsWith('SEED')) homeTeamId = 'TBD'
    if (awayTeamId.startsWith('SEED')) awayTeamId = 'TBD'

    return {
      homeTeamId,
      awayTeamId,
      matchNumber: m.matchNumber,
      round: m.round,
      block: m.block,
      nextMatchNumber: m.nextMatchNumber,
      nextMatchSlot: m.nextMatchSlot,
      loserNextMatchNumber: m.loserNextMatchNumber,
      loserNextMatchSlot: m.loserNextMatchSlot,
      scheduledAt: defaultDate,
      venue,
    }
  })
}
