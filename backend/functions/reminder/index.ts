// M1-C: 자동 리마인드 스케줄러
// EventBridge hourly trigger → upcoming match 스캔 → 미응답 팀원 카카오 알림톡 (Solapi 스텁)
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ScheduledHandler } from 'aws-lambda'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const MATCHES     = process.env.MATCHES_TABLE!
const TEAM_MEMBERS = process.env.TEAM_MEMBERS_TABLE!
const ATTENDANCE  = process.env.ATTENDANCE_TABLE!

const SOLAPI_API_KEY    = process.env.SOLAPI_API_KEY ?? ''
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET ?? ''
const SOLAPI_SENDER     = process.env.SOLAPI_SENDER ?? ''
const KAKAO_PFID        = process.env.KAKAO_PFID ?? ''

// 리마인드 창 정의 (경기 N 시간 전 ±1시간)
const WINDOWS = [
  { label: 'D-2', hours: 48, templateId: 'pg-reminder-d2' },
  { label: 'D-1', hours: 24, templateId: 'pg-reminder-d1' },
  { label: '당일', hours:  6, templateId: 'pg-reminder-day' },
]

export const handler: ScheduledHandler = async () => {
  const now = Date.now()

  // 1. 전체 upcoming 경기 스캔 (pending/accepted)
  const items: Record<string, unknown>[] = []
  let lastKey: Record<string, unknown> | undefined
  do {
    const res = await db.send(new ScanCommand({
      TableName: MATCHES,
      FilterExpression: '#s IN (:p, :a)',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':p': 'pending', ':a': 'accepted' },
      ExclusiveStartKey: lastKey,
    }))
    items.push(...(res.Items ?? []))
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  console.log(`[Reminder] 스캔된 upcoming 경기 ${items.length}개`)
  let totalNotified = 0

  for (const match of items) {
    const scheduledAt = match.scheduledAt as string
    if (!scheduledAt) continue
    const matchTime   = new Date(scheduledAt).getTime()
    const hoursUntil  = (matchTime - now) / (1000 * 60 * 60)

    // 해당 리마인드 창 탐색
    const win = WINDOWS.find(w => hoursUntil >= w.hours - 1 && hoursUntil < w.hours + 1)
    if (!win) continue

    // 이미 이 창 리마인드 완료 여부 체크 (match 속성으로 저장)
    const sentKey = `reminded_${win.label}`
    if (match[sentKey]) continue

    const matchId = match.id as string
    const teamId  = match.homeTeamId as string
    if (!teamId) continue

    // 2. 팀원 조회
    const membersRes = await db.send(new QueryCommand({
      TableName: TEAM_MEMBERS,
      KeyConditionExpression: 'teamId = :t',
      ExpressionAttributeValues: { ':t': teamId },
    }))
    const members = membersRes.Items ?? []

    // 3. 참석 응답 여부 조회
    const attRes = await db.send(new QueryCommand({
      TableName: ATTENDANCE,
      KeyConditionExpression: 'matchId = :m',
      ExpressionAttributeValues: { ':m': matchId },
    }))
    const responded = new Set((attRes.Items ?? []).map(a => a.userId as string))

    // 4. 미응답 팀원 추출
    const pending = members.filter(m => !responded.has(m.userId as string))

    console.log(
      `[Reminder] ${win.label} — 매치 ${matchId} (${match.venue ?? '구장 미정'} @ ${scheduledAt}) ` +
      `팀 ${teamId} 미응답 ${pending.length}/${members.length}명`
    )

    if (pending.length === 0) {
      // 이미 전원 응답 → 리마인드 불필요, 완료 표시만
      await db.send(new UpdateCommand({
        TableName: MATCHES,
        Key: { id: matchId },
        UpdateExpression: 'SET #sk = :v',
        ExpressionAttributeNames: { '#sk': sentKey },
        ExpressionAttributeValues: { ':v': new Date().toISOString() },
      }))
      continue
    }

    // 5. 카카오 알림톡 발송 (Solapi)
    if (SOLAPI_API_KEY && SOLAPI_API_SECRET && KAKAO_PFID) {
      // TODO: 실제 팀원 전화번호는 pg-users 또는 teamMember.phone 필드에서 조회
      // 현재는 userId 목록 로그만
      const phones = pending
        .map(m => m.phone as string | undefined)
        .filter(Boolean) as string[]

      if (phones.length > 0) {
        const dateStr = new Date(scheduledAt).toLocaleString('ko-KR', {
          month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
        })
        const messages = phones.map(to => ({
          to,
          from: SOLAPI_SENDER,
          kakaoOptions: {
            pfId: KAKAO_PFID,
            templateId: win.templateId,
            variables: {
              '#{venue}': (match.venue as string) ?? '구장 미정',
              '#{date}': dateStr,
              '#{dday}': win.label,
            },
          },
        }))

        try {
          const solapiRes = await fetch('https://api.solapi.com/messages/v4/send-many', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `HMAC-SHA256 ApiKey=${SOLAPI_API_KEY}, Date=${new Date().toISOString()}, Salt=${Math.random().toString(36).slice(2)}`,
            },
            body: JSON.stringify({ messages }),
          })
          const data = await solapiRes.json()
          console.log(`[Reminder] Solapi 응답:`, JSON.stringify(data).slice(0, 200))
        } catch (e) {
          console.error('[Reminder] Solapi 오류:', e)
        }
      } else {
        console.log(`[Reminder] phone 필드 없음 — userId 대상: ${pending.map(m => m.userId).join(', ')}`)
      }
    } else {
      console.log(`[Reminder] Solapi 미설정 — 스텁 동작. 대상: ${pending.map(m => m.userId).join(', ')}`)
    }

    totalNotified += pending.length

    // 6. 리마인드 완료 표시 (중복 발송 방지)
    await db.send(new UpdateCommand({
      TableName: MATCHES,
      Key: { id: matchId },
      UpdateExpression: 'SET #sk = :v',
      ExpressionAttributeNames: { '#sk': sentKey },
      ExpressionAttributeValues: { ':v': new Date().toISOString() },
    }))
  }

  console.log(`[Reminder] 완료. 총 알림 대상 ${totalNotified}명 처리`)
}
