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
