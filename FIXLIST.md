# FIXLIST.md — 버그 / 기술부채 / 개선 계획서

> 기능 로드맵 → `docs/MILESTONES.md`
> 이 파일은 **버그·결함·기술부채·UX 개선**에만 집중한다.
> 각 항목에 우선순위와 상태를 표시하고, 상의가 필요한 항목은 💬 태그를 단다.

---

## 우선순위 기준

| 기호 | 의미 |
|------|------|
| 🔴 | 즉시 수정 — 실사용 불가 수준 |
| 🟠 | 높음 — 자주 마주치는 오류 |
| 🟡 | 중간 — 불편하지만 우회 가능 |
| 🟢 | 낮음 — 코드 품질·미래 안전성 |
| ✅ | 완료 |

---

## 1. 최근 완료된 수정 (2026-03-03, `fix/bugs-and-errors` → `main`)

| 항목 | 분류 |
|------|------|
| ✅ CORS: Manage API `GatewayResponse` 401/403에 `Access-Control-Allow-Origin` 추가 | 인프라 |
| ✅ CORS: `defaultCorsPreflightOptions`에 `allowHeaders: Authorization` 추가 | 인프라 |
| ✅ `manageFetch`: `idToken` 우선 사용 (Cognito REST Authorizer는 ID Token claims만 전달) | 인증 |
| ✅ `team/page.tsx`: Auth API 경로(`/clubs`, `/matches`, `/activities`, `/club-members`)를 `authFetch`로 교체 | 라우팅 |
| ✅ `sw.js`: `res.clone()` race condition 수정 (비동기 콜백 밖에서 동기 호출) | PWA |
| ✅ Lambda: `team`, `schedule`, `notifications` — `userId` undefined 시 401 반환 | 백엔드 |
| ✅ `reminder/index.ts`: `isNaN(matchTime)` 체크 추가 | 백엔드 |
| ✅ `video/page.tsx`: 비디오 MIME 타입 검증 추가 | 프론트엔드 |
| ✅ `mypage/page.tsx`: `closeTeamEdit` 시 `editingTeamId` / `teamDraft` 초기화 | 프론트엔드 |
| ✅ `useWebSocket.ts`: `connect`를 `useEffect` deps에 추가 | 프론트엔드 |
| ✅ `manageFetch.ts`: BASE URL null 체크 + 명확한 에러 메시지 | 프론트엔드 |

---

## 2. 확인된 미해결 이슈

### 🔴 인증 / 토큰

| # | 문제 | 원인 | 수정 방향 | 상태 |
|---|------|------|-----------|------|
| A-1 | Cognito Access Token 만료 시 자동 갱신 없음 | `refreshToken`은 localStorage에 저장되어 있으나 만료 감지·갱신 로직 없음 | `AuthContext`에 `refreshToken` 자동 갱신 플로우 추가 | 💬 상의 필요 |
| A-2 | ID Token 만료 시 `manageFetch` 실패 (무한 에러) | 갱신 없이 만료된 토큰 사용 | A-1과 동일 — 토큰 갱신 후 재시도 | 💬 상의 필요 |

### 🟠 백엔드 Lambda

| # | 문제 | 파일 | 상태 |
|---|------|------|------|
| B-1 | `finance/index.ts` — `userId` 없을 때 401 반환 미구현 | `backend/functions/finance/index.ts` | 🟠 미수정 |
| B-2 | `league/index.ts` — `userId` 없을 때 401 반환 미구현 | `backend/functions/league/index.ts` | 🟠 미수정 |
| B-3 | `team/index.ts` — DynamoDB 응답 에러 시 catch 없이 500 노출 | `backend/functions/team/index.ts` | 🟡 미수정 |
| B-4 | Lambda 환경변수 assert (비어있을 경우 런타임 크래시) | 공통 | 🟡 미수정 |

### 🟠 프론트엔드 런타임

| # | 문제 | 파일 | 상태 |
|---|------|------|------|
| C-1 | Recharts `-1` 크기 경고 (컨테이너 width/height 0) | `schedule/page.tsx` 등 RadarChart | 🟡 미수정 |
| C-2 | 로그인 전 `manageFetch` 호출 시 에러 catch 없음 (팀/일정 페이지) | 다수 페이지 | 🟡 확인 필요 |
| C-3 | `page.tsx` (홈) — 스포츠 필터 URL 쿼리로 공유 불가 (현재 localStorage) | `app/page.tsx` | 🟢 낮음 |

### 🟡 인프라 / 배포

| # | 문제 | 상태 |
|---|------|------|
| D-1 | `NEXT_PUBLIC_WS_URL` 등 일부 env var `.env.local`에만 존재 — `.env.example` 없음 | 🟡 문서화 필요 |
| D-2 | `backend/auth/index.mjs` — 수동 배포 (CDK 관리 밖), 버전 추적 어려움 | 💬 상의 필요 |
| D-3 | CloudFront SSL 인증서 경고 (`InsecureRequestWarning`) — 배포 스크립트 | 🟢 낮음 |

---

## 3. 💬 상의 필요한 항목

### S-1. 토큰 자동 갱신 구현 여부

**현황**: Access Token / ID Token 모두 만료(기본 1시간)되면 로그아웃 없이 모든 API가 401 반환.
`refreshToken`은 localStorage에 저장되어 있음.

**옵션**:
- (a) `AuthContext`에 `useEffect`로 만료 감지 → `InitiateAuth` 갱신 콜 자동화
- (b) `manageFetch` / `authFetch` 에서 401 받으면 갱신 후 1회 재시도
- (c) 지금은 단순히 "세션 만료 시 로그인 페이지로 리다이렉트"만 구현

> 어떤 방향으로 갈까요?

---

### S-2. Auth API Lambda 배포 방식

**현황**: `backend/auth/index.mjs` (807줄)는 AWS 콘솔에서 수동 배포. CDK 관리 밖이라 변경 추적이 어려움.

**옵션**:
- (a) CDK에 별도 `AuthStack` 또는 `AuthFunction` 추가해서 코드 관리
- (b) 현 상태 유지 (수동 배포, 변경 시 직접 업로드)

> CDK로 옮길 의향 있으신가요?

---

### S-3. Finance / League Lambda userId 체크

**현황**: `team`, `schedule`, `notifications` Lambda에는 userId 401 체크를 추가했지만, `finance`와 `league`는 미처 수정하지 못함.

> 지금 바로 수정할까요? (30분 이내 작업)

---

## 4. 향후 개선 아이디어 (낮은 우선순위)

| # | 아이디어 | 분류 |
|---|---------|------|
| E-1 | `manage/team/page.tsx` — CDK Manage API 쪽 팀 관리 페이지 `manageFetch`로 `idToken` 확인 필요 | 확인 필요 |
| E-2 | `sw.js` CACHE_VERSION 수동 관리 대신 빌드 해시 자동 삽입 | PWA |
| E-3 | DynamoDB scan → query 전환 (비용·성능) | 성능 |
| E-4 | Lambda cold start 최소화 (provisioned concurrency 또는 warming) | 성능 |

---

*최종 업데이트: 2026-03-03*
