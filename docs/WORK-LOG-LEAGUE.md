# 리그 기능 연동 개선 작업 기록

**브랜치:** `fix/league-integration`
**작업일:** 2026-03-11

---

## 문제 진단 (6건)

| # | 문제 | 심각도 |
|---|---|---|
| 1 | `/league`에서 참가한 리그를 확인할 수 없음 | Critical |
| 2 | 참가 상태가 로컬 `useState`로만 관리 → 새로고침 시 유실 | Critical |
| 3 | "진행 현황 보기" 링크가 `/manage/league`로만 이동 (특정 리그 X) | High |
| 4 | `/manage/league`에 "공개 리그 탐색" 탭이 `/league`와 중복 | Medium |
| 5 | `/manage/league` 페이지가 다크모드 미지원 (하드코딩 Tailwind 컬러) | Medium |
| 6 | `isLeader`(팀 리더)로 리그 CRUD 권한 체크 → 실제 주최자가 아닌 사람도 수정 가능 | High |

---

## 변경 사항

### 1. Backend — `GET /league?participantTeamId=` 추가

**파일:** `backend/functions/league/index.ts`

- 기존 `teamId-index` GSI 활용 (CDK에 정의되어 있었으나 미사용 상태)
- `participantTeamId` 쿼리 파라미터로 해당 팀이 참가한 모든 리그 조회
- 기존 `organizerTeamId`, public 쿼리는 변경 없음

### 2. AuthContext — `User.sub` 추가

**파일:** `frontend/.../context/AuthContext.tsx`

- `User` 인터페이스에 `sub?: string` 필드 추가
- 백엔드 `league.organizerId`는 Cognito `sub` (UUID)를 저장하므로, `user.username` (이메일)으로는 비교 불가
- `user.sub`으로 주최자 여부 판별

### 3. `/league` 페이지 개편

**파일:** `frontend/.../app/league/page.tsx`

- "참가 중인 리그" 섹션 추가 (페이지 상단)
- 로컬 `joinedIds` Set → 서버 동기화 `participatedIds` (API 응답 기반)
- `joinLeague` 성공 후 참가 리그 목록 재조회 (새로고침해도 유지)
- "진행 현황 보기" 링크에 `?leagueId={id}` 딥링크 적용
- 이미 참가한 리그에 "참가 완료" 뱃지 표시

### 4. `/manage/league` 페이지 전면 개편

**파일:** `frontend/.../app/manage/league/page.tsx`

| 항목 | Before | After |
|---|---|---|
| 탭 구조 | "내 리그" / "공개 리그 탐색" | "주최한 리그" / "참가 중인 리그" |
| 권한 체크 | `isLeader` (팀 리더) | `isOrganizer` (`user.sub === league.organizerId`) |
| 다크모드 | Tailwind 하드코딩 | CSS 변수 (`var(--card-bg)` 등) |
| 딥링크 | 미지원 | `?leagueId=xxx` → 자동 상세 화면 |
| 공개 리그 탐색 | 중복 탭 | 제거 → `/league` 링크로 대체 |

**세부 변경:**
- `Suspense` 래핑 추가 (`useSearchParams` 호환)
- 참가 리그 카드 클릭 → 읽기 전용 상세보기 (수정/삭제 UI 숨김)
- 폼 입력 스타일: `inp`/`lbl` 상수를 class + `style` 객체로 분리
- TypeBadge/StatusBadge 시맨틱 컬러(blue, purple, amber, emerald)는 유지

---

## 핵심 아키텍처 결정

1. **`sub` vs `username`**: Cognito `Username`은 이메일, `sub`는 UUID. 백엔드는 `sub`를 `organizerId`로 저장하므로 프론트에서 `user.sub` 사용 필수.
2. **서버 동기화**: 로컬 상태 대신 `GET /league?participantTeamId=`로 참가 현황을 서버에서 조회. 새로고침/재방문 시에도 정확한 상태 유지.
3. **권한 분리**: "만들기" 버튼은 `isLeader` (팀 리더만 리그 생성 가능), LeagueDetail 내 CRUD는 `isOrganizer` (실제 주최자만 수정/삭제 가능).

---

## Phase 2: 리그 기능 종합 디벨롭

**작업일:** 2026-03-11

### 1. 타입 확장 (`types/manage.ts`)

- `LeagueMatch.winner?: string` 추가 — 토너먼트 PK/동점 시 수동 지정용
- `LeaguePlayerStats` 인터페이스 추가 — 프론트 통계 표시용 (playerId, name, teamId, goals, assists, yellowCards, redCards, gamesPlayed)

### 2. 백엔드 — 토너먼트 진출 + 통계 API (`league/index.ts`)

**토너먼트 자동 진출 로직:**
- `ROUND_ORDER`: 1라운드 → 16강 → 8강 → 준결승 → 결승
- `PATCH /league/:id/matches/:matchId`에서 `status='completed'` 감지 시:
  - 같은 라운드 전체 경기 조회
  - 모두 완료 시 winners 추출 → 다음 라운드 매치 자동 생성
- `getWinner()`: homeScore vs awayScore 비교, 동점 시 `winner` 필드 사용

**통계 API (신규):**
- `GET /league/:id/stats` — 모든 completed 매치의 goals[]/cards[]를 서버에서 집계
- 반환: `{ scorers[], cards[], teamStats[] }` (득점 순위, 카드 현황, 팀 순위)

### 3. 프론트엔드 — `/manage/league` 대규모 개편

#### 3-A: MatchDetailModal (경기 상세 모달)
- MatchCard 클릭 → 모달 열림
- 골 기록: scorer/assist 드롭다운 (팀 멤버 자동 로드), minute 입력, 추가/삭제
- 카드 기록: player 드롭다운, type (yellow/red), minute 입력
- 용병(Guest) 등록: comma-separated 텍스트 입력
- 스코어 입력 + "임시 저장" / "결과 확정" 버튼
- 비주최자: 읽기 전용 모드

#### 3-B: BracketView (토너먼트 대진표)
- matches를 round별로 그룹핑 → 수평 레이아웃
- 각 매치: 두 팀명 + 스코어, 승리팀 하이라이트 (볼드)
- 클릭 → MatchDetailModal 연동
- tournament 타입일 때만 탭 표시

#### 3-C: StatsTab (통계 대시보드)
- 득점 순위 테이블: 순위, 선수명, 골, 도움 (상위 10명)
- 카드 현황 테이블: 선수명, 옐로카드(노랑), 레드카드(빨강) 아이콘
- 팀 멤버 이름 자동 로드 (memberNames 캐싱)
- 프론트 집계 방식 (추가 API 호출 없이 기존 매치 데이터로 계산)

#### 3-D: StandingsTable 개선 (순위표)
- 추가 컬럼: 경기 수, 득점(GF), 실점(GA), 득실차(GD, +/- 색상), 폼 가이드
- 폼 가이드: 최근 5경기 W/D/L 원형 표시 (emerald/yellow/red)
- 상위 3위 메달 배경색 (다크모드 호환)
- 정렬: 승점 → 득실차 → 다득점

#### 3-E: MatchCard 개선
- 인라인 스코어 입력 제거 → 카드 클릭으로 모달 열기
- completed 매치: 골/카드 아이콘 + 카운트 배지
- 토너먼트: winner 팀명 볼드 처리
- 주최자용 "클릭하여 결과 입력 →" 힌트

#### 3-F: 동적 탭 시스템
- `['teams', 'matches', 'standings', 'bracket', 'stats']`
- standings: league 타입에만 표시
- bracket: tournament 타입 + 경기 존재 시만 표시
- stats: completed 경기 존재 시만 표시
