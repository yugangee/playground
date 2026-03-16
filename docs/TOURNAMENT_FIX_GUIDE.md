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

---

## 버그 #9 [심각도: 높음]
### KJA 대회 데이터의 round 코드가 ROUND_ORDER / CustomBlockBracket과 매핑되지 않음

**파일들:** `BracketView.tsx`, `utils.ts`, `kja-tournament-51.ts` (또는 이 데이터를 DB에서 불러오는 레이어)

**문제 설명:**

KJA 51회 대회 데이터(`kja-tournament-51.ts`)의 round 값:
```
'R1', 'R2', 'QF', 'SF', 'LF', 'RF', 'F1', 'F3'
```

`utils.ts`의 `ROUND_ORDER`:
```ts
export const ROUND_ORDER = ['예선', '1라운드', '32강', '16강', '8강', '준결승', '4강', '결승']
```

**KJA 데이터의 round 코드가 ROUND_ORDER에 하나도 없다.**

이 때문에 `CustomBlockBracket`의 `groupByRound`에서:
```ts
const orderedRounds = [...roundSet.keys()].sort((a, b) => {
  const ai = ROUND_ORDER.indexOf(a)    // 'R1' → -1, 'R2' → -1, 'QF' → -1 ...
  const bi = ROUND_ORDER.indexOf(b)
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)  // 전부 99 vs 99 → 정렬 안됨
})
```

모든 round가 indexOf -1이 되어 우선순위 99로 동일해지고, **정렬이 사실상 무의미**해진다.
결과적으로 Map의 insertion order에 의존하게 되는데, 이는 데이터 입력 순서에 따라
라운드 열 순서가 바뀔 수 있다는 의미다.

**추가로**, `renderBlockColumn`에서 헤더를 `{group.round}`로 표시하므로,
화면에 "R1", "R2", "QF", "SF", "LF", "RF" 같은 코드가 그대로 노출되거나,
또는 다른 곳에서 `ROUND_ORDER`의 한글 라운드명을 헤더로 사용하면서
"예선 → 1라운드 → 32강 → 16강 → 8강 → 준결승 → 결승" 같은 비정상 헤더가 표시된다.

**실제 증상:** 대진표 상단에 라운드 헤더가
`예선 → 1라운드 → 32강 → 16강 → 8강 → 준결승 → 결승 → 결승 ← 4강 ← 준결승 ← 8강 ← 16강 ← 32강 ← 1라운드 ← 예선`
으로 표시됨. 이는 KJA 데이터와 무관한 template 기반 라운드명이 그대로 사용되고 있다는 뜻.

**근본 원인:** KJA 데이터에 `block` 필드가 있어서 `CustomBlockBracket`으로 분기되는데,
동시에 `bracketSize`가 설정되어 있으면 메인 `BracketView`의 template 기반 로직이 실행되어
`generateBracketTemplate(bracketSize)` → `getBracketRounds(bracketSize)`의 한글 라운드명이
좌/우로 분할되어 헤더에 표시됨. 즉 **template 기반 헤더 + block 기반 데이터가 혼합**되는 것.

**해결 방안 — 두 가지 중 선택:**

**중요 발견: KJA 데이터에는 `roundLabel` 필드가 이미 존재한다.**

```ts
{ matchNo: 1,  round: 'R1', roundLabel: '1회전', ... }
{ matchNo: 26, round: 'R2', roundLabel: '2회전', ... }
{ matchNo: 42, round: 'QF', roundLabel: '8강', ... }
{ matchNo: 50, round: 'SF', roundLabel: '4강', ... }
{ matchNo: 54, round: 'LF', roundLabel: '좌측 블록 결승', ... }
{ matchNo: 55, round: 'RF', roundLabel: '우측 블록 결승', ... }
{ matchNo: 56, round: 'F1', roundLabel: '결승', ... }
{ matchNo: 57, round: 'F3', roundLabel: '3·4위전', ... }
```

round 코드의 의미:
- `R1` = Round 1 = 1회전 (예선)
- `R2` = Round 2 = 2회전 (16강 수준이지만 대회에서는 '2회전'으로 부름)
- `QF` = Quarter Final = 8강
- `SF` = Semi Final = 4강
- `LF` = Left Final = 좌측 블록 결승
- `RF` = Right Final = 우측 블록 결승
- `F1` = Final = 결승
- `F3` = 3rd place Final = 3·4위전

**방안 A (권장): roundLabel을 헤더에 사용 + round 코드 기반 정렬**

매핑 테이블을 새로 만들 필요 없이, 이미 데이터에 있는 `roundLabel`을 활용한다.
단, `LeagueMatch` 타입에 `roundLabel`이 없으므로 추가가 필요하거나,
또는 round 코드 → 정렬 순서만 별도 정의하면 된다.

`utils.ts`에 정렬 순서 매핑 추가:

```ts
// round 코드의 정렬 우선순위 (낮을수록 먼저 = 초기 라운드)
export const ROUND_SORT_ORDER: Record<string, number> = {
  // 한글 라운드명 (기존 호환)
  '예선': 0, '1라운드': 1, '32강': 2, '16강': 3, '8강': 4, '준결승': 5, '4강': 6, '결승': 7,
  // 영문 라운드 코드 (KJA 등 block 기반 대회)
  'R1': 0, 'R2': 1, 'QF': 4, 'SF': 6, 'LF': 7, 'RF': 7, 'F1': 8, 'F3': 9,
}
```

`CustomBlockBracket`의 `groupByRound`에서 정렬 수정:

**BEFORE:**
```ts
const orderedRounds = [...roundSet.keys()].sort((a, b) => {
  const ai = ROUND_ORDER.indexOf(a)
  const bi = ROUND_ORDER.indexOf(b)
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
})
```

**AFTER:**
```ts
const orderedRounds = [...roundSet.keys()].sort((a, b) => {
  const ai = ROUND_SORT_ORDER[a] ?? 99
  const bi = ROUND_SORT_ORDER[b] ?? 99
  return ai - bi
})
```

`renderBlockColumn`의 헤더에서 `roundLabel` 활용:

**BEFORE:**
```tsx
{group.round}
```

**AFTER:**
```tsx
{group.roundLabel ?? group.round}
```

이를 위해 `groupByRound`의 반환 타입에 `roundLabel`을 추가해야 한다:

**BEFORE:**
```ts
const groupByRound = (ms: LeagueMatch[]) => {
  const groups: Array<{ round: string; matches: LeagueMatch[] }> = []
```

**AFTER:**
```ts
const groupByRound = (ms: LeagueMatch[]) => {
  const groups: Array<{ round: string; roundLabel?: string; matches: LeagueMatch[] }> = []
```

그리고 group 생성 시 해당 라운드의 첫 번째 매치에서 roundLabel을 가져옴:

**BEFORE:**
```ts
for (const r of orderedRounds) {
  if (r !== '3/4위전') {
    groups.push({ round: r, matches: roundSet.get(r)!.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)) })
  }
}
```

**AFTER:**
```ts
for (const r of orderedRounds) {
  if (r !== '3/4위전' && r !== 'F3') {
    const roundMatches = roundSet.get(r)!.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))
    // roundLabel이 있으면 사용 (KJA 등 block 기반 대회)
    const label = (roundMatches[0] as any)?.roundLabel
    groups.push({ round: r, roundLabel: label, matches: roundMatches })
  }
}
```

**주의:** `LeagueMatch` 타입에는 `roundLabel`이 없다. 다음 중 하나를 선택:
1. `LeagueMatch` 인터페이스에 `roundLabel?: string` 추가 (권장)
2. `(roundMatches[0] as any)?.roundLabel`로 임시 접근 (빠른 수정용)

**방안 B: ROUND_ORDER 자체를 확장**

`utils.ts`의 `ROUND_ORDER`에 영문 코드를 삽입 위치에 맞게 추가:

```ts
export const ROUND_ORDER = [
  '예선', 'R1',
  '1라운드', 'R2',
  '32강',
  '16강',
  '8강', 'QF',
  '준결승',
  '4강', 'SF',
  'LF', 'RF',
  '결승', 'F1',
]
```

단, 이 방법은 indexOf 기반 정렬이므로 같은 우선순위가 필요한 'LF'와 'RF'를 처리하기 어렵다.
**방안 A(ROUND_SORT_ORDER 숫자 매핑)가 더 유연하므로 권장.**

---

## 버그 #10 [심각도: 높음]
### KJA 비대칭 구조에서 bracketSize와 block 로직이 충돌

**파일:** `BracketView.tsx`
**위치:** 메인 `BracketView` 컴포넌트 라우팅 로직 (약 360~371줄)

**문제 설명:**

```tsx
if (!bracketSize) {
  if (hasCustomBlocks) {
    return <CustomBlockBracket ... />   // block 기반
  }
  return <LegacyBracket ... />
}

// bracketSize가 있으면:
if (hasCustomBlocks) {
  return <CustomBlockBracket ... />     // block 기반 (OK)
}
// 아래는 template 기반 로직 (좌/우 대칭 분할)
```

KJA 데이터에 `block` 필드가 있으면 `CustomBlockBracket`으로 분기되어야 하는데,
호출하는 쪽에서 `bracketSize`도 함께 넘기면:

1. `bracketSize`가 있으므로 첫 번째 분기 (`!bracketSize`) 통과
2. `hasCustomBlocks`가 true이므로 `CustomBlockBracket` 실행 — **여기까지는 OK**

하지만 만약 `bracketSize`가 있고 `block` 필드가 없는 경기가 섞여 있으면 문제가 된다.
또한, 호출하는 상위 컴포넌트에서 `bracketSize`를 전달하면서 동시에 template 기반의 
라운드명(예선, 1라운드, 32강...)을 UI 다른 곳에서 표시할 수 있다.

**확인 필요:** KJA 대회를 BracketView에 넘길 때 `bracketSize` prop이 설정되어 있는지.
설정되어 있다면 그 값이 무엇인지 (예: 57? 32? 64?).
`bracketSize`가 설정되어 있고 `hasCustomBlocks`도 true이면 `CustomBlockBracket`이 
올바르게 실행되지만, **상위 컴포넌트에서 bracketSize 기반으로 별도 헤더나 탭을 생성**하고 
있다면 거기서 ROUND_ORDER 한글명이 표시될 수 있다.

**조치:** 
1. KJA 대회를 불러오는 상위 컴포넌트에서 `bracketSize` prop을 확인
2. block 기반 데이터를 사용하는 대회에서는 `bracketSize`를 넘기지 않거나,
   넘기더라도 template 기반 라운드명을 UI에 사용하지 않도록 분기
3. 또는 `CustomBlockBracket`이 실행될 때 외부에서 주입되는 라운드 헤더를 무시하도록 처리

---

## 버그 #11 [심각도: 중간]
### KJA 대진표에서 3/4위전 매칭 실패 가능성

**파일:** `BracketView.tsx`
**위치:** `CustomBlockBracket` 내부 (477줄)

**문제 설명:**
```tsx
const thirdPlaceMatch = matches.find(m => m.round === '3/4위전')
```

KJA 데이터에서 3/4위전의 round 값은 `'F3'`이다:
```ts
{ matchNo: 57, round: 'F3', roundLabel: '3·4위전', ... }
```

`'F3' !== '3/4위전'`이므로 **thirdPlaceMatch가 항상 undefined**가 된다.
결과적으로 3/4위전이 화면에 표시되지 않는다.

**BEFORE:**
```tsx
const thirdPlaceMatch = matches.find(m => m.round === '3/4위전')
```

**AFTER (ROUND_SORT_ORDER 기반 — 버그 #9의 수정이 적용된 상태에서):**

`groupByRound`에서 이미 `r !== 'F3'` 조건이 추가되었으므로 (버그 #9 AFTER 참조),
3/4위전은 그룹에서 제외된다. 별도로 찾는 코드만 수정:

```tsx
const thirdPlaceMatch = matches.find(m => 
  m.round === '3/4위전' || m.round === 'F3'
)
```

또는 `ROUND_SORT_ORDER`에 `'3/4위전': 9, 'F3': 9`가 들어있으므로,
정렬 순서 9를 "3/4위전 계열"로 판별할 수도 있지만 단순 비교가 더 명확하다.

---

## 버그 #12 [심각도: 중간]
### KJA 좌측 블록에서 canPair 조건 실패 — 커넥터 라인 누락

**파일:** `BracketView.tsx`
**위치:** `CustomBlockBracket` 좌측 블록 렌더링 (541줄)

**문제 설명:**

KJA 좌측 블록의 라운드별 경기 수:
- R1 (예선): 12경기
- R2 (16강): 8경기  
- QF (8강): 4경기
- SF (준결승): 2경기
- LF (4강): 1경기

`canPair` 조건:
```tsx
const canPair = nextGroup && group.matches.length >= 2 
  && group.matches.length === nextGroup.matches.length * 2
```

- R1(12) → R2(8): `12 === 8 * 2` → `12 === 16` → **false!**
- R2(8) → QF(4): `8 === 4 * 2` → `8 === 8` → **true** ✅
- QF(4) → SF(2): `4 === 2 * 2` → `4 === 4` → **true** ✅
- SF(2) → LF(1): `2 === 1 * 2` → `2 === 2` → **true** ✅

**R1 → R2 사이의 커넥터가 그려지지 않는다.** 12 → 8은 정확히 2:1 비율이 아니기 때문.
KJA 대회는 예선 12경기에서 12명의 승자 + 시드/직행 4팀 = 16팀이 16강(8경기)에 진출하는 구조라
예선→16강은 2:1 병합이 아닌 비정규 연결이다.

우측도 동일: R1(13경기) → R2(8경기) = 2:1이 아님 → 커넥터 없음.

**해결 방안:**

canPair 실패 시 빈 div만 렌더되므로 시각적으로 "예선과 16강 사이에 연결선이 없는" 상태.
이건 구조적으로 올바른 bracket 커넥터를 그릴 수 없는 비정규 비율이므로,
두 가지 선택지가 있다:

**방안 A: 단순 간격만 두기 (현재 동작 유지)**
canPair 실패 시 24px 간격만 있으면 되므로, 현재 코드가 이미 fallback으로 처리하고 있다.
추가로 간격을 좁히거나 시각적으로 "→" 화살표 등을 넣을 수 있다.

**방안 B: 비정규 비율도 커넥터를 그리는 새 컴포넌트 추가**
예선 12경기 → 16강 8경기처럼 N:M 비율의 연결선을 그리는 커넥터.
구현 복잡도가 높으므로 후순위로 미뤄도 됨.

**권장:** 방안 A 유지. 단, canPair 실패 시 빈 공간이 아닌 얇은 구분선 정도를 넣으면
시각적으로 "여기서 다음 라운드로 넘어간다"는 것을 알 수 있다:

```tsx
// canPair 실패 시 fallback을 약간 개선
: <div style={{ width: 24, minWidth: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 1, height: '60%', background: 'var(--input-border)', opacity: 0.3 }} />
  </div>
```

---

## 적용 순서 권장

### 1차 (즉시 수정 — 대진표가 비정상 표시되는 원인)
1. **버그 #9** — KJA round 코드 매핑 (ROUND_CODE_MAP 추가 + 정렬/헤더 적용)
2. **버그 #10** — bracketSize + block 충돌 확인 (상위 컴포넌트 확인 필요)
3. **버그 #11** — 3/4위전 round 매칭 ('F3' → '3/4위전')
4. **버그 #1** — CustomBlockBracket 우측 커넥터 matchCount/canPair

### 2차 (기능 버그)
5. **버그 #2** — 메인 BracketView 우측 커넥터 안전장치
6. **버그 #3** — MatchCard.tsx PK 승자 표시 (`TournamentMatch` 타입 확인 후)
7. **버그 #12** — KJA 예선→16강 비정규 비율 커넥터 (간격 개선)

### 3차 (방어 코드)
8. **버그 #4** — ConnectorSVG 홀수 방어
9. **버그 #5** — 3/4위전 fallback 검색
10. **버그 #6** — generateTournamentPairs 홀수 팀

### 4차 (리팩토링)
11. **버그 #7, #8** — 주석 추가, hover DOM 조작 개선

---

## 관련 파일 목록

| 파일 | 수정 여부 | 버그 번호 |
|------|-----------|-----------|
| `BracketView.tsx` | 수정 필요 | #1, #2, #4, #5, #7, #8, #9(헤더), #10, #11, #12 |
| `MatchCard.tsx` | 수정 필요 | #3 |
| `utils.ts` | 수정 필요 | #6, #9(ROUND_CODE_MAP 추가) |
| `kja-tournament-51.ts` | 확인 필요 | #9(방안B 선택 시만 수정) |
| `TournamentBracket.tsx` | 확인 필요 | #9(방안B 선택 시 ROUND_TABS 수정) |
| `TeamRoster.tsx` | 수정 불필요 | — |
| 상위 컴포넌트 (BracketView 호출부) | 확인 필요 | #10(bracketSize prop 확인) |

---

## 참고: 타입 확인 필요 항목

1. 버그 #3 수정 시 `@/types/tournament`의 `TournamentMatch` 타입을 확인해야 합니다:
   - `winner` 필드가 존재하는지, 어떤 값 형태인지 (`'home'|'away'` vs 팀ID vs 팀 객체)
   - `pkScore` 필드가 존재하는지
   - 이에 따라 버그 #3의 AFTER 코드가 달라집니다.

2. 버그 #10 수정 시 BracketView를 호출하는 상위 컴포넌트를 찾아서 확인해야 합니다:
   - `bracketSize` prop이 어떤 값으로 전달되는지
   - 상위에서 별도로 라운드 헤더/탭을 생성하는 부분이 있는지