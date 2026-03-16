# 토너먼트 대진표 버그 수정 가이드

> 이 문서는 Claude Code가 참조하여 코드를 수정할 수 있도록 작성되었습니다.
> 각 항목에 파일 경로, 정확한 변경 위치, BEFORE/AFTER 코드, 변경 이유가 포함되어 있습니다.
> 심각도 순서(높음 → 낮음)로 정렬되어 있습니다.

---

## 버그 #1 [심각도: 높음]
### CustomBlockBracket 우측 커넥터 matchCount가 잘못됨

**파일:** `BracketView.tsx`
**위치:** `CustomBlockBracket` 컴포넌트 내부, 우측 블록 렌더링 부분 (약 580~598줄)

**문제 설명:**
우측 블록에서 `rightGroups`를 reverse한 뒤 커넥터를 그릴 때 `prevGroup.matches.length`를 사용하고 있다.
reversed 배열에서 prevGroup은 "더 상위 라운드 = 경기 수가 적은 쪽"이다.

예시: rightGroups = [8강(2경기), 준결승(1경기)] → reversed = [준결승(1), 8강(2)]
- ri=1일 때: prevGroup=준결승(1), group=8강(2)
- `canPair` 조건: `prevGroup.matches.length >= 2` → `1 >= 2` → **false**
- 커넥터가 그려지지 않고 빈 24px div만 렌더됨

더 큰 대진표(16팀+)에서 canPair가 true가 되더라도 `matchCount=prevGroup.matches.length`가 넘겨져서
`pairCount = 소수`가 되어 커넥터 라인이 비정상적으로 그려진다.

**비교 - 좌측 블록은 올바르게 작동:**
좌측에서는 `group.matches.length` (현재=큰 라운드)를 matchCount로 넘기고,
`nextGroup.matches.length * 2 === group.matches.length`로 canPair를 체크한다.
우측도 동일한 패턴이어야 한다.

**BEFORE:**
```tsx
{/* Right block (reversed for symmetry) */}
{(() => {
  const reversed = [...rightGroups].reverse()
  return reversed.map((group, ri) => {
    const prevGroup = reversed[ri - 1]
    const canPair = prevGroup && prevGroup.matches.length >= 2 && prevGroup.matches.length === group.matches.length * 2
    return (
      <React.Fragment key={`R-${group.round}`}>
        {ri === 0
          ? <HLine />
          : canPair
            ? <ConnectorSVG matchCount={prevGroup.matches.length} direction="right" />
            : <div style={{ width: 24, minWidth: 24 }} />
        }
        {renderBlockColumn(group)}
      </React.Fragment>
    )
  })
})()}
```

**AFTER:**
```tsx
{/* Right block (reversed for symmetry) */}
{(() => {
  const reversed = [...rightGroups].reverse()
  return reversed.map((group, ri) => {
    const prevGroup = reversed[ri - 1]
    // 우측은 reversed이므로 group이 더 큰 라운드(경기 수 많음), prevGroup이 상위 라운드(경기 수 적음)
    // 커넥터는 group(많은 쪽) → prevGroup(적은 쪽)으로 합쳐야 하므로 matchCount=group.matches.length
    const canPair = prevGroup && group.matches.length >= 2 && group.matches.length === prevGroup.matches.length * 2
    return (
      <React.Fragment key={`R-${group.round}`}>
        {ri === 0
          ? <HLine />
          : canPair
            ? <ConnectorSVG matchCount={group.matches.length} direction="right" />
            : <div style={{ width: 24, minWidth: 24 }} />
        }
        {renderBlockColumn(group)}
      </React.Fragment>
    )
  })
})()}
```

**변경 요약:**
1. `canPair` 조건: `prevGroup.matches.length >= 2 && prevGroup.matches.length === group.matches.length * 2` → `group.matches.length >= 2 && group.matches.length === prevGroup.matches.length * 2`
2. `ConnectorSVG matchCount`: `prevGroup.matches.length` → `group.matches.length`

---

## 버그 #2 [심각도: 높음]
### 메인 BracketView 우측 커넥터 matchCount도 잘못될 수 있음

**파일:** `BracketView.tsx`
**위치:** 메인 `BracketView` 컴포넌트, 오른쪽 브래킷 렌더링 부분 (약 431~440줄)

**문제 설명:**
`rightReversed`를 순회하면서 `ConnectorSVG matchCount={round.matchNumbers.length}`를 사용한다.
reversed 배열에서 ri=1부터 커넥터가 그려지는데, 이때 `round`는 현재 (더 큰 라운드)이고
커넥터는 ri-1번째 라운드(더 작은 라운드)와 ri번째 라운드(더 큰 라운드) 사이에 위치한다.

`round.matchNumbers.length`는 현재(더 큰 쪽)의 경기 수이므로 matchCount 자체는 맞다.
하지만 좌측과 달리 **canPair 체크가 없어서** 비정상적 크기의 대진표에서 홀수 matchCount가 들어갈 수 있다.

**BEFORE:**
```tsx
{/* ── 오른쪽 브래킷 (역순) ── */}
{rightReversed.map((round, ri) => (
  <React.Fragment key={`R-${round.name}`}>
    {ri === 0
      ? <HLine />
      : <ConnectorSVG matchCount={round.matchNumbers.length} direction="right" />
    }
    <RoundColumn round={round} matchMap={matchMap} tn={tn} onSlotClick={onSlotClick} canClick={canClick} />
  </React.Fragment>
))}
```

**AFTER:**
```tsx
{/* ── 오른쪽 브래킷 (역순) ── */}
{rightReversed.map((round, ri) => {
  const prevRound = rightReversed[ri - 1]
  const canPair = prevRound && round.matchNumbers.length >= 2 && round.matchNumbers.length === prevRound.matchNumbers.length * 2
  return (
    <React.Fragment key={`R-${round.name}`}>
      {ri === 0
        ? <HLine />
        : canPair
          ? <ConnectorSVG matchCount={round.matchNumbers.length} direction="right" />
          : <div style={{ width: 24, minWidth: 24 }} />
      }
      <RoundColumn round={round} matchMap={matchMap} tn={tn} onSlotClick={onSlotClick} canClick={canClick} />
    </React.Fragment>
  )
})}
```

**변경 요약:**
1. `.map((round, ri) => (` 를 `.map((round, ri) => {` 블록으로 변경
2. `prevRound`와 `canPair` 체크 추가 (좌측 블록과 동일한 안전장치)
3. canPair 실패 시 빈 div fallback 추가

---

## 버그 #3 [심각도: 중간]
### MatchCard.tsx — PK/무승부 시 승자 판별 불가

**파일:** `MatchCard.tsx`
**위치:** 42~43줄

**문제 설명:**
`homeWon`과 `awayWon`을 `match.score.home > match.score.away`로만 판단한다.
토너먼트에서 동점 후 PK로 결정되는 경우 `score.home === score.away`이므로
둘 다 false가 되어 **양쪽 모두 패배 스타일(회색)**로 표시된다.

`match` 타입(`TournamentMatch`)에 `winner` 필드가 있는지 확인 필요.
만약 있으면 그걸 사용하고, 없으면 `pkScore` 등을 확인해야 한다.

**BEFORE:**
```tsx
const homeWon = match.score && match.score.home > match.score.away;
const awayWon = match.score && match.score.away > match.score.home;
```

**AFTER:**
```tsx
// winner 필드가 있으면 우선 사용 (PK, 몰수승 등 처리)
const homeWon = match.winner
  ? match.winner === 'home'
  : match.score && match.score.home > match.score.away;
const awayWon = match.winner
  ? match.winner === 'away'
  : match.score && match.score.away > match.score.home;
```

**주의:** `TournamentMatch` 타입 정의(`@/types/tournament`)에서 `winner` 필드가 어떤 값을 가지는지 확인해야 한다.
- `'home' | 'away'` 형태라면 위 코드 그대로 사용
- 팀 ID 형태라면 `match.winner === match.homeTeam.id` 등으로 비교
- `winner` 필드가 없으면 `TournamentMatch` 타입에 `winner?: 'home' | 'away'` 추가 필요

추가로 `status === 'pk'`인 경우에 대한 PK 스코어 표시도 고려:

**MatchCard.tsx 스코어 표시 영역 (73~84줄 부근) 아래에 PK 표시 추가:**

```tsx
{/* 기존 스코어 표시 코드 다음에 추가 */}
{match.status === 'pk' && match.pkScore && (
  <div className="text-[9px] text-center mt-1" style={{ color: '#92400E' }}>
    PK {match.pkScore.home}:{match.pkScore.away}
  </div>
)}
```

**주의:** `TournamentMatch` 타입에 `pkScore` 필드가 있는지 확인. 없으면 추가 필요:
```ts
pkScore?: { home: number; away: number }
```

---

## 버그 #4 [심각도: 중간]
### ConnectorSVG에 홀수 matchCount가 들어오면 비정상 동작

**파일:** `BracketView.tsx`
**위치:** `ConnectorSVG` 컴포넌트 (254~285줄)

**문제 설명:**
`pairCount = matchCount / 2`에서 홀수가 들어오면 소수점(예: 1.5)이 되어
for 루프가 `i < 1.5` → 1번만 실행되고, 마지막 매치의 커넥터가 누락된다.
정상적인 power-of-2 대진표에서는 발생하지 않지만, 비정상 데이터 방어가 필요하다.

**BEFORE:**
```tsx
function ConnectorSVG({ matchCount, direction }: { matchCount: number; direction: 'left' | 'right' }) {
  const pairCount = matchCount / 2
```

**AFTER:**
```tsx
function ConnectorSVG({ matchCount, direction }: { matchCount: number; direction: 'left' | 'right' }) {
  // 홀수 방어: 최소 2, 짝수로 보정
  const safeCount = Math.max(2, matchCount % 2 === 0 ? matchCount : matchCount + 1)
  const pairCount = safeCount / 2
  const segH = 100 / safeCount
```

그리고 아래 for 루프에서 `segH`를 사용하는 부분이 `matchCount` 대신 `safeCount`를 참조하도록
기존 `100 / matchCount`를 삭제하고 위의 `segH`만 사용되는지 확인.

**변경 요약:**
1. `matchCount`를 `safeCount`로 보정 (짝수화, 최소 2)
2. `pairCount`와 `segH` 모두 `safeCount` 기반으로 계산

---

## 버그 #5 [심각도: 중간]
### 3/4위전 매치 넘버가 불명확한 방식으로 계산됨

**파일:** `BracketView.tsx`
**위치:** 메인 `BracketView` 컴포넌트 (약 390줄)

**문제 설명:**
```tsx
const thirdPlaceNumber = p2  // nextPowerOf2(bracketSize)
```
이것이 3/4위전 매치 넘버와 같은 이유는 수학적 우연이다:
- 정규 매치 수 = p2/2 + p2/4 + ... + 1 = p2 - 1
- 3/4위전 = p2 - 1 + 1 = p2

현재 동작은 맞지만, `generateFullBracket`이나 `generateBracketTemplate`의 매치 넘버 부여 방식이
바뀌면 깨진다. 명시적으로 계산하거나 round 이름으로 찾아야 한다.

**BEFORE:**
```tsx
const p2 = nextPowerOf2(bracketSize)
const finalMatch = finalMatchNumber ? matchMap.get(finalMatchNumber) : undefined
const thirdPlaceNumber = p2
const thirdPlaceMatch = matchMap.get(thirdPlaceNumber)
```

**AFTER:**
```tsx
const p2 = nextPowerOf2(bracketSize)
const finalMatch = finalMatchNumber ? matchMap.get(finalMatchNumber) : undefined
// 3/4위전: 정규 매치(p2-1) 다음 번호. round 이름으로도 fallback 검색.
const thirdPlaceNumber = p2 // = (p2 - 1) + 1 = 총 정규 매치 수 + 1
const thirdPlaceMatch = matchMap.get(thirdPlaceNumber)
  ?? Array.from(matchMap.values()).find(m => m.round === '3/4위전')
```

**변경 요약:**
1. 주석 추가로 `p2`가 왜 3/4위전 번호인지 명시
2. `matchMap.get()`이 실패할 경우 `round === '3/4위전'`으로 fallback 검색

---

## 버그 #6 [심각도: 중간]
### utils.ts — generateTournamentPairs가 홀수 팀을 처리하지 않음

**파일:** `utils.ts`
**위치:** `generateTournamentPairs` 함수 (약 222~233줄)

**문제 설명:**
팀이 홀수(예: 7팀)이면 마지막 팀이 짝 없이 누락된다.
`generateRoundRobin`에서는 BYE를 추가하는데, 이 함수에서는 안 한다.
`generateFullBracket`이 별도로 BYE를 처리하긴 하지만,
이 함수를 독립적으로 사용하면 팀이 빠진다.

**BEFORE:**
```tsx
export function generateTournamentPairs(teamIds: string[]) {
  const shuffled = [...teamIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const rName = firstRoundName(shuffled.length)
  const pairs: Array<{ homeTeamId: string; awayTeamId: string; round: string }> = []
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairs.push({ homeTeamId: shuffled[i], awayTeamId: shuffled[i + 1], round: rName })
  }
  return pairs
}
```

**AFTER:**
```tsx
export function generateTournamentPairs(teamIds: string[]) {
  const shuffled = [...teamIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  // 홀수 팀이면 BYE 추가 (마지막 팀이 부전승)
  if (shuffled.length % 2 !== 0) {
    shuffled.push('BYE')
  }
  const rName = firstRoundName(shuffled.length)
  const pairs: Array<{ homeTeamId: string; awayTeamId: string; round: string }> = []
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairs.push({ homeTeamId: shuffled[i], awayTeamId: shuffled[i + 1], round: rName })
  }
  return pairs
}
```

**변경 요약:**
1. shuffle 후 `shuffled.length % 2 !== 0`이면 `'BYE'` 추가

**주의:** `firstRoundName`에 넘기는 `shuffled.length`가 BYE 포함 수가 되므로,
BYE 추가 전의 원래 팀 수를 기준으로 라운드 이름을 정해야 하는지 확인 필요.
현재 `firstRoundName`은 팀 수 기반 분기이므로 1 차이는 결과에 영향 없음 (예: 7→8팀, 둘 다 '8강').

---

## 버그 #7 [심각도: 낮음]
### LegacyBracket — 모든 커넥터가 direction="left"로만 그려짐

**파일:** `BracketView.tsx`
**위치:** `LegacyBracket` 컴포넌트 (약 673~675줄)

**문제 설명:**
LegacyBracket은 좌→우 일방향으로 라운드를 나열하면서 커넥터를 모두 `direction="left"`로 그린다.
좌우 대칭 bracket이 아닌 단순 진행형이므로 의도된 것일 수 있지만,
`CustomBlockBracket`이나 메인 `BracketView`와 달리 좌우 대칭이 아니다.

**판단:** 레거시 지원용이라면 현재 상태 유지 가능. 대칭 구조로 변경하고 싶다면
메인 `BracketView`와 동일한 좌/우 분할 로직을 적용해야 하지만 규모가 크므로 후순위.

**조치:** 현재 유지. 단, 아래 주석을 추가하여 의도를 명확히:

```tsx
{gi < roundGroups.length - 1 && (
  // LegacyBracket은 좌→우 일방향 진행이므로 항상 direction="left"
  <ConnectorSVG matchCount={Math.max(2, group.matches.length)} direction="left" />
)}
```

---

## 버그 #8 [심각도: 낮음]
### BracketView MatchCard — onMouseEnter/Leave에서 DOM 직접 조작

**파일:** `BracketView.tsx`
**위치:** `MatchCard` 컴포넌트 (약 219~221줄)

**문제 설명:**
```tsx
onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)' } }}
onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
```
React에서 DOM style을 직접 조작하면 React의 가상 DOM과 불일치가 생길 수 있다.
CSS `:hover` 또는 state 기반으로 변경하는 것이 정석.

**BEFORE:**
```tsx
<div
  style={{
    width: CARD_W, borderRadius: 10, overflow: 'hidden',
    border: isForfeit ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--input-border)',
    background: 'var(--card-bg)',
    cursor: onClick ? 'pointer' : 'default',
    opacity: isBye && isCompleted ? 0.55 : 1,
    transition: 'all 0.2s ease',
  }}
  onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)' } }}
  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
  onClick={onClick}
>
```

**AFTER (방법 A — CSS class 활용, Tailwind 사용 중이라면 이 방법 권장):**
```tsx
<div
  className={onClick ? 'bracket-card-interactive' : ''}
  style={{
    width: CARD_W, borderRadius: 10, overflow: 'hidden',
    border: isForfeit ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--input-border)',
    background: 'var(--card-bg)',
    cursor: onClick ? 'pointer' : 'default',
    opacity: isBye && isCompleted ? 0.55 : 1,
    transition: 'all 0.2s ease',
  }}
  onClick={onClick}
>
```

그리고 전역 CSS (또는 해당 컴포넌트의 스타일)에 추가:
```css
.bracket-card-interactive:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
```

---

## 적용 순서 권장

1. **버그 #1** — CustomBlockBracket 우측 커넥터 (가장 시급, 라인이 안 그려지는 버그)
2. **버그 #2** — 메인 BracketView 우측 커넥터 안전장치
3. **버그 #3** — MatchCard.tsx PK 승자 표시 (`TournamentMatch` 타입 확인 후)
4. **버그 #4** — ConnectorSVG 홀수 방어
5. **버그 #5** — 3/4위전 fallback 검색
6. **버그 #6** — generateTournamentPairs 홀수 팀
7. **버그 #7, #8** — 주석/리팩토링 (시간 될 때)

---

## 관련 파일 목록

| 파일 | 수정 여부 | 버그 번호 |
|------|-----------|-----------|
| `BracketView.tsx` | 수정 필요 | #1, #2, #4, #5, #7, #8 |
| `MatchCard.tsx` | 수정 필요 | #3 |
| `utils.ts` | 수정 필요 | #6 |
| `TournamentBracket.tsx` | 수정 불필요 | — |
| `TeamRoster.tsx` | 수정 불필요 | — |

---

## 참고: 타입 확인 필요 항목

버그 #3 수정 시 `@/types/tournament`의 `TournamentMatch` 타입을 확인해야 합니다:
- `winner` 필드가 존재하는지, 어떤 값 형태인지 (`'home'|'away'` vs 팀ID vs 팀 객체)
- `pkScore` 필드가 존재하는지
- 이에 따라 버그 #3의 AFTER 코드가 달라집니다.
