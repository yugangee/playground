# KJA 52회 대회 데이터 교체 가이드

> Claude Code가 참조하여 기존 51회 데이터를 52회로 교체하는 작업을 수행할 수 있도록 작성됨.
> 첨부된 `kja-tournament-52.ts` 파일을 기반으로 하되, 아래 수정사항을 반드시 반영해야 함.

---

## 1. 개요

- 기존 파일: `kja-tournament-51.ts` (51회 대회, 2025년)
- 신규 파일: `kja-tournament-52.ts` (52회 대회, 2026년)
- 첨부된 `kja-tournament-52.ts`는 대부분 정확하지만, **block 배정에 오류**가 있어 아래 수정이 필요

### 52회 대회 핵심 정보
- 대회명: 제52회 한국기자협회 서울지역 축구대회
- 일정: 4월 18일(토), 19일(일), 25일(토)
- 장소: 고양 어울림누리(1일차 일부, 3일차), 노원 마들스타디움(1일차 일부), 농협대학교(1일차 일부, 2일차)
- 참가팀: 52개 팀
- 총 경기: 59경기 (1회전 27 + 2회전 16 + 16강 8 + 8강 4 + 4강 2 + 3·4위전 1 + 결승 1)
- 시드: 1시드 YTN(28조 home), 2시드 동아일보(36조 home)
- 직행팀(1회전 면제): YTN, 쿠키뉴스, 채널A, 동아일보, 국민일보
- 서울경제: 시드 없음, 1회전 9조부터 출전 (뉴스핌 vs 서울경제)

---

## 2. 첨부 파일의 수정이 필요한 부분

### 수정 A: block 배정 오류 — 10~13조를 'left'로 변경

대진표 이미지에서 10~13조는 **좌측 하단**에 위치하며 34→47→53→56 경로로 진행한다.
첨부 파일에서는 block: 'right'로 되어 있는데, block: 'left'로 변경해야 한다.

**변경 대상 (matchNo 10, 11, 12, 13):**

```ts
// BEFORE (잘못됨)
{ matchNo: 10, round: 'R1', roundLabel: '1회전', block: 'right', ... }
{ matchNo: 11, round: 'R1', roundLabel: '1회전', block: 'right', ... }
{ matchNo: 12, round: 'R1', roundLabel: '1회전', block: 'right', ... }
{ matchNo: 13, round: 'R1', roundLabel: '1회전', block: 'right', ... }

// AFTER (올바름)
{ matchNo: 10, round: 'R1', roundLabel: '1회전', block: 'left', ... }
{ matchNo: 11, round: 'R1', roundLabel: '1회전', block: 'left', ... }
{ matchNo: 12, round: 'R1', roundLabel: '1회전', block: 'left', ... }
{ matchNo: 13, round: 'R1', roundLabel: '1회전', block: 'left', ... }
```

### 수정 B: 34조, 35조도 'left'로 변경

10~13조가 좌측이면 그 승자가 가는 34조, 35조도 좌측 블록이다.

```ts
// BEFORE
{ matchNo: 34, round: 'R2', roundLabel: '2회전', block: 'right', ... }
{ matchNo: 35, round: 'R2', roundLabel: '2회전', block: 'right', ... }

// AFTER
{ matchNo: 34, round: 'R2', roundLabel: '2회전', block: 'left', ... }
{ matchNo: 35, round: 'R2', roundLabel: '2회전', block: 'left', ... }
```

### 수정 C: 47조도 'left'로 변경

34조, 35조 → 47조이므로 47조도 좌측.

```ts
// BEFORE
{ matchNo: 47, round: 'R3', roundLabel: '16강', block: 'right', ... }

// AFTER
{ matchNo: 47, round: 'R3', roundLabel: '16강', block: 'left', ... }
```

### 수정 D: 12조, 13조의 nextMatchNo 확인

대진표에서:
- 12조 (SBS Biz vs 연합인포맥스) → **35조**
- 13조 (한국경제신문 vs 이데일리) → **35조**

첨부 파일에서 12조의 nextMatchNo가 36으로 되어 있는데, 이는 잘못됨.
대진표 이미지를 보면 12조→35조, 13조→35조가 맞다.

```ts
// BEFORE
{ matchNo: 12, ..., nextMatchNo: 36, ... }  // 잘못됨
{ matchNo: 13, ..., nextMatchNo: 35, ... }  // 맞음

// AFTER  
{ matchNo: 12, ..., nextMatchNo: 35, ... }  // 수정
{ matchNo: 13, ..., nextMatchNo: 35, ... }  // 유지
```

**주의:** 12조와 13조가 둘 다 35조로 가면, 35조의 대진은 `tbd(12) vs tbd(13)`이 된다.
현재 첨부 파일의 35조는 `tbd(12) vs tbd(13)`으로 되어 있으므로 35조 자체는 맞다.

### 수정 E: 14조의 nextMatchNo 확인

대진표에서 14조(문화일보 vs 한국경제TV) → **36조**.
첨부 파일에서도 nextMatchNo: 36으로 되어 있으므로 맞다. 단, 14조는 우측 블록이어야 한다.

```ts
// 14조는 block: 'right' 유지 (올바름)
{ matchNo: 14, round: 'R1', roundLabel: '1회전', block: 'right', ..., nextMatchNo: 36, ... }
```

### 수정 F: 36조의 구성 확인

대진표에서 36조 = 동아일보(시드) vs 14조 승자.
첨부 파일: `homeTeam: t('donga', '동아일보', 2), awayTeam: tbd(14)` — 맞다.

### 수정 G: 39조의 구성 확인

대진표에서:
- 19조 → 39조
- 20조 → 39조 (대진표 이미지에서 전자신문/중앙일보가 39조로 들어감)

하지만 현재 첨부 파일에서:
```ts
{ matchNo: 20, ..., nextMatchNo: 40, ... }  // 20조→40조로 되어 있음
```

대진표 이미지를 보면 20조(전자신문 vs 중앙일보)는 39조가 아니라... 
사실 이 부분은 대진표 이미지에서 정확히 읽기 어렵다. PDF 시간표를 참조하면:

구장3 (농협대) 시간표:
```
39조: 19조 승자 vs 20조 승자
```

**따라서 20조→39조가 아닌 경우:**
시간표에 명확히 `39조 = 19조 승자 vs 20조 승자`로 나와있다.
현재 파일에서 39조는:
```ts
{ matchNo: 39, ..., homeTeam: tbd(19), awayTeam: tbd(20) }
```
이는 시간표와 일치한다.

하지만 matchNo 20의 nextMatchNo가 40이 아닌 39여야 한다:

```ts
// BEFORE (잘못됨 — 시간표 기준 39조 = 19조 승자 vs 20조 승자)
{ matchNo: 20, ..., nextMatchNo: 40, ... }

// AFTER
{ matchNo: 20, ..., nextMatchNo: 39, ... }
```

그리고 39조의 대진은 이미 `tbd(19) vs tbd(20)`으로 맞다.

그런데 40조는 현재 `국민일보 vs tbd(21)`인데, 21조만 들어오고 20조는 안 들어온다.
시간표를 보면: `40조 = 국민일보 vs 21조 승자` — 맞다. 국민일보가 직행.

### 수정 H: 전체 블록 배정 최종 정리

대진표 이미지 기준 블록 배정:

**좌측 블록 (LEFT) — 56조로 수렴:**
- 1회전: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
- 2회전: 28, 29, 30, 31, 32, 33, 34, 35
- 16강: 44, 45, 46, 47
- 8강: 52, 53
- 4강: 56

**우측 블록 (RIGHT) — 57조로 수렴:**
- 1회전: 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27
- 2회전: 36, 37, 38, 39, 40, 41, 42, 43
- 16강: 48, 49, 50, 51
- 8강: 54, 55
- 4강: 57

**결승 블록 (FINAL):**
- 58 (3·4위전), 59 (결승)

---

## 3. 작업 순서

### Step 0: TournamentRoundKey 타입에 'R3' 추가

52회 대회는 51회와 달리 1회전→2회전→**16강**→8강 4단계 구조이다.
51회에는 16강 라운드가 없어서 R1→R2→QF로 바로 갔지만,
52회에서는 16강(44~51조)이 추가되어 새 round 코드 `'R3'`가 필요하다.

**파일:** `@/types/tournament.ts`

**변경 1 — TournamentRoundKey에 'R3' 추가:**

```ts
// BEFORE
export type TournamentRoundKey = 'R1' | 'R2' | 'QF' | 'SF' | 'LF' | 'RF' | 'F3' | 'F1';

// AFTER
export type TournamentRoundKey = 'R1' | 'R2' | 'R3' | 'QF' | 'SF' | 'LF' | 'RF' | 'F3' | 'F1';
```

**변경 2 — ROUND_ORDER에 'R3' 삽입 (R2와 QF 사이):**

```ts
// BEFORE
export const ROUND_ORDER: TournamentRoundKey[] = ['R1', 'R2', 'QF', 'SF', 'LF', 'RF', 'F3', 'F1'];

// AFTER
export const ROUND_ORDER: TournamentRoundKey[] = ['R1', 'R2', 'R3', 'QF', 'SF', 'LF', 'RF', 'F3', 'F1'];
```

**변경 3 — ROUND_LABEL에 'R3' 매핑 추가:**

```ts
// BEFORE
export const ROUND_LABEL: Record<TournamentRoundKey, string> = {
  R1: '1회전',
  R2: '2회전',
  QF: '8강',
  ...
};

// AFTER
export const ROUND_LABEL: Record<TournamentRoundKey, string> = {
  R1: '1회전',
  R2: '2회전',
  R3: '16강',
  QF: '8강',
  SF: '4강',
  LF: '좌측블록 결승',
  RF: '우측블록 결승',
  F3: '3·4위전',
  F1: '결승',
};
```

**변경 4 — TournamentBracket.tsx의 ROUND_TABS에 R3 탭 추가:**

```ts
// BEFORE
const ROUND_TABS: { key: TournamentRoundKey | 'all' | 'sedaily'; label: string }[] = [
  { key: 'sedaily', label: '서경' },
  { key: 'all',     label: '전체' },
  { key: 'R1',  label: '1R' },
  { key: 'R2',  label: '2R' },
  { key: 'QF',  label: '8강' },
  { key: 'SF',  label: '4강' },
  { key: 'F3',  label: '3결' },
  { key: 'F1',  label: '결승' },
];

// AFTER
const ROUND_TABS: { key: TournamentRoundKey | 'all' | 'sedaily'; label: string }[] = [
  { key: 'sedaily', label: '서경' },
  { key: 'all',     label: '전체' },
  { key: 'R1',  label: '1R' },
  { key: 'R2',  label: '2R' },
  { key: 'R3',  label: '16강' },
  { key: 'QF',  label: '8강' },
  { key: 'SF',  label: '4강' },
  { key: 'F3',  label: '3결' },
  { key: 'F1',  label: '결승' },
];
```

**주의:** 51회 데이터에는 R3 라운드가 없으므로, 51회를 볼 때 R3 탭은 빈 화면이 된다.
이건 문제 없음 — 이미 "해당 라운드 경기 없음" 처리가 있다.

또한 52회에서는 `'LF'`와 `'RF'` (블록 결승)를 사용하지 않는다.
52회의 4강(56, 57조)은 `'SF'`를 사용한다. 이 탭들은 51회 호환을 위해 유지.

### Step 1: 파일 교체
1. 첨부된 `kja-tournament-52.ts`를 프로젝트에 추가
2. 위 수정사항 A~H를 모두 반영
3. 기존 `kja-tournament-51.ts`는 삭제하지 말고 유지 (과거 대회 기록)

### Step 2: import 경로 변경
기존에 `kja51`을 import하는 모든 곳을 찾아서 `kja52`로 변경:

```ts
// BEFORE
import { kja51 } from '@/data/kja-tournament-51';
// AFTER
import { kja52 } from '@/data/kja-tournament-52';
```

### Step 3: SEDAILY_PATH_MATCHES 업데이트
`TournamentBracket.tsx`의 하드코딩된 경로를 52회에 맞게 변경:

```ts
// BEFORE (51회)
const SEDAILY_PATH_MATCHES = [38, 48, 53, 55, 56];

// AFTER (52회)
const SEDAILY_PATH_MATCHES = [9, 33, 46, 53, 56, 59];
```

서울경제 경기 경로 (52회):
- 9조: 뉴스핌 vs **서울경제** (1회전)
- 33조: 8조 승자 vs **9조 승자** (2회전)
- 46조: 32조 승자 vs **33조 승자** (16강)
- 53조: **46조 승자** vs 47조 승자 (8강)
- 56조: 52조 승자 vs **53조 승자** (4강)
- 59조: 결승

### Step 4: edition/year 참조 업데이트
앱 내에서 `edition: 51` 또는 `year: 2025`로 필터링하는 곳이 있으면 52/2026으로 변경.

### Step 5: 선수단 로스터 업데이트
첨부 파일의 roster는 51회 것을 임시로 복사해둔 상태.
52회 선수단이 확정되면 `roster` 배열을 업데이트해야 함.
현재는 TODO 주석이 있으므로 그대로 두어도 됨.

---

## 4. 검증 체크리스트

교체 후 아래 항목을 확인:

- [ ] 대진표 화면에서 좌측 블록에 1~13조, 28~35조, 44~47조, 52~53조, 56조가 표시되는지
- [ ] 우측 블록에 14~27조, 36~43조, 48~51조, 54~55조, 57조가 표시되는지
- [ ] 결승(59조)과 3·4위전(58조)이 중앙에 표시되는지
- [ ] 서경 경기 탭에서 9→33→46→53→56→59 경로가 올바르게 표시되는지
- [ ] YTN이 28조 home(시드1), 동아일보가 36조 home(시드2)으로 표시되는지
- [ ] 직행팀(쿠키뉴스 30조, 채널A 32조, 국민일보 40조)이 2회전에 직접 표시되는지
- [ ] 각 라운드 헤더가 '1회전', '2회전', '16강', '8강', '4강', '결승'으로 올바르게 표시되는지
  (이 항목은 TOURNAMENT_FIX_GUIDE.md의 버그 #9 수정이 함께 적용되어야 함)

---

## 5. 참고: 51회 vs 52회 주요 차이

| 항목 | 51회 | 52회 |
|------|------|------|
| 총 경기 | 57 | 59 |
| 서울경제 시드 | 4시드 (38조 home) | 시드 없음 (1회전 9조) |
| 시드팀 | YTN, 동아, 뉴스1, 서울경제 | YTN, 동아 (2팀만) |
| 직행팀 | 대한경제, 일요신문, 연합뉴스, 국민일보 등 | 쿠키뉴스, 채널A, 국민일보 등 |
| 1회전 좌측 | 12경기 | 13경기 (9+4 from 10~13) |
| 1회전 우측 | 13경기 | 14경기 |
| 2회전 좌측 | 8경기 | 8경기 |
| 2회전 우측 | 8경기 | 8경기 |
| 16강 구분 | 좌8 + 우8 | 좌4 + 우4 = 8경기 |
| 블록결승 | 54조(좌), 55조(우) | 없음 (4강이 바로 56, 57) |
| 4강 | 56조, 57조 → 결승 | 56조, 57조 → 결승 |
| round 코드 | LF, RF (블록결승) | 블록결승 없음 |
| 서경 경로 | 38→48→53→55→결승 | 9→33→46→53→56→결승 |
