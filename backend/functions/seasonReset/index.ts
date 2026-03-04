/**
 * M3-A: 시즌 리셋 / 점수 감쇠 Lambda
 *
 * EventBridge scheduled rule이 매년 1월 1일 KST 00:00 (UTC 15:00 12/31)에 트리거.
 * 모든 선수/팀의 점수를 50% 감쇠시켜 새 시즌을 시작.
 * 감쇠 후 25점 미만이면 B등급 최소치 0점으로 리셋.
 *
 * 환경변수: STATS_TABLE, TEAMS_TABLE
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const STATS = process.env.STATS_TABLE ?? 'pg-stats'
const TEAMS = process.env.TEAMS_TABLE ?? 'pg-teams'

const DECAY = 0.5  // 50% 감쇠

// 선수 등급 커트라인 (scoring.mjs와 동일)
function playerTier(points: number) {
  if (points >= 701) return 'P'
  if (points >= 301) return 'SP'
  if (points >= 101) return 'A'
  if (points >= 25) return 'S'
  return 'B'
}

// 팀 등급 커트라인
function teamTier(tp: number) {
  if (tp >= 2001) return 'Legend'
  if (tp >= 801) return 'Elite'
  if (tp >= 251) return 'Crew'
  if (tp >= 51) return 'Club'
  return 'Rookie'
}

export const handler = async (event: unknown) => {
  console.log('[SeasonReset] Starting season decay...', new Date().toISOString())

  let statsReset = 0
  let teamsReset = 0

  // ── 선수 통계 감쇠 (pg-stats) ─────────────────────────────────────
  let lastKey: Record<string, unknown> | undefined
  do {
    const result = await db.send(new ScanCommand({
      TableName: STATS,
      ExclusiveStartKey: lastKey,
    }))
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined

    for (const item of result.Items ?? []) {
      const newPoints = Math.floor((item.points ?? 0) * DECAY)
      const newTier = playerTier(newPoints)
      // 연승 리셋, potm는 유지, goals/assists 유지
      await db.send(new UpdateCommand({
        TableName: STATS,
        Key: { teamId: item.teamId, userId: item.userId },
        UpdateExpression: 'SET points = :p, tier = :t, winStreak = :zero, seasonResetAt = :at',
        ExpressionAttributeValues: {
          ':p': newPoints,
          ':t': newTier,
          ':zero': 0,
          ':at': new Date().toISOString(),
        },
      }))
      statsReset++
    }
  } while (lastKey)

  // ── 팀 TP 감쇠 (pg-teams) ────────────────────────────────────────
  let teamLastKey: Record<string, unknown> | undefined
  do {
    const result = await db.send(new ScanCommand({
      TableName: TEAMS,
      ExclusiveStartKey: teamLastKey,
    }))
    teamLastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined

    for (const team of result.Items ?? []) {
      const oldTp = team.tp ?? 0
      if (oldTp === 0) continue
      const newTp = Math.floor(oldTp * DECAY)
      const newTier = teamTier(newTp)
      await db.send(new UpdateCommand({
        TableName: TEAMS,
        Key: { id: team.id },
        UpdateExpression: 'SET tp = :tp, tier = :t, winStreak = :zero, seasonResetAt = :at',
        ExpressionAttributeValues: {
          ':tp': newTp,
          ':t': newTier,
          ':zero': 0,
          ':at': new Date().toISOString(),
        },
      }))
      teamsReset++
    }
  } while (teamLastKey)

  console.log(`[SeasonReset] Done. statsReset=${statsReset}, teamsReset=${teamsReset}`)
  return { statsReset, teamsReset }
}
