# FIXLIST.md — 버그 / 기술부채 / 개선 계획서

> 기능 로드맵 → `docs/MILESTONES.md`
> 이 파일은 **버그·결함·기술부채·UX 개선**에만 집중한다.

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

## 작업 순서 (실행 계획)

### Phase 1 — 프론트엔드 데이터 연결 (백엔드 변경 없음) ✅ 완료

| 순서 | # | 작업 | 예상 난이도 |
|------|---|------|------------|
| 1 | ✅ F-1/G-2 | `league/page.tsx` mock 데이터 → `manageFetch('/league')` 실제 API 연결 | 낮음 |
| 2 | ✅ G-3 | `finance/page.tsx` mock 데이터 → `manageFetch('/finance/...')` 실제 API 연결 | 낮음 |
| 3 | ✅ F-4 | `generateRoundRobin` 라운드 번호 로직 수정 | 낮음 |
| 4 | ✅ F-5 | `generateTournamentPairs` Fisher-Yates 셔플로 교체 | 낮음 |
| 5 | ✅ F-6 | `manageFetch` HTML 에러 메시지 필터링 | 낮음 |

### Phase 2 — 백엔드 데이터 정합성 ✅ 완료

| 순서 | # | 작업 | 예상 난이도 |
|------|---|------|------------|
| 6 | ✅ F-2 | `POST /league/:id/teams` ConditionExpression으로 중복 방지 | 낮음 |
| 7 | ✅ F-3 | 리그/팀/경기 생성 시 필수 필드 검증 추가 | 낮음 |
| 8 | ✅ F-7 | `league/index.ts` JSON.parse try-catch 추가 | 낮음 |
| 9 | ✅ B-3 | `team/index.ts` DynamoDB 에러 처리 보강 | 낮음 |

### Phase 3 — 팀 시스템 통합 (G-1, 핵심 아키텍처) ✅ 완료

> **결정**: 옵션 (a) 선택 — `team/page.tsx`를 Manage API `/team`으로 마이그레이션
> Auth API `/clubs`는 레이팅/매치 기록 전용으로 축소

| 순서 | # | 작업 | 예상 난이도 |
|------|---|------|------------|
| 10 | ✅ G-1a | `team/page.tsx` 팀 조회/생성/멤버 관리 → Manage API `/team` 전환 | 높음 |
| 11 | ✅ G-1b | `team/page.tsx` 매치/활동은 Auth API 유지 (레이팅 시스템 의존성) | 중간 |
| 12 | ✅ G-1c | Manage API `/team`에서 가져온 팀 ID로 리그 참가 연동 확인 | 중간 |

### Phase 4 — 인프라 / DB ✅ 완료

| 순서 | # | 작업 | 예상 난이도 |
|------|---|------|------------|
| 13 | ✅ F-8 | `pg-league-teams`에 `teamId-index` GSI 추가 (CDK 배포 완료) | 낮음 |
| 14 | ✅ D-2 | Auth Lambda CDK 관리 여부 결정 → 현행 유지 (수동 배포) | 논의 필요 |

### Phase 5 — 낮은 우선순위 ✅ 완료

| 순서 | # | 작업 |
|------|---|------|
| 15 | ✅ C-2 | 로그인 전 manageFetch 호출 에러 처리 일관화 |
| 16 | ✅ C-3 | 홈 스포츠 필터 URL 쿼리 파라미터 지원 |
| 17 | ✅ E-2 | `sw.js` CACHE_VERSION 빌드 해시 자동화 |
| 18 | ✅ E-3 | DynamoDB scan 개선 (미사용 import 제거, discover Limit 페이지네이션) |
| 19 | ✅ E-4 | Lambda cold start 최소화 (arm64 Graviton2 아키텍처 적용) |

---

## 미해결 이슈 상세

### G-1 — 팀 시스템 이원화 (Phase 3에서 해결)

**근본 원인**: DynamoDB 테이블이 두 세트로 분리됨
- Auth API → `playground-clubs`, `playground-club-members`, `playground-matches`, `playground-activities`
- Manage API → `pg-teams`, `pg-team-members`, `pg-finance`, `pg-leagues`, ...

| 페이지 쌍 | 일반 페이지 | 관리자 페이지 | 연동 여부 |
|-----------|------------|--------------|----------|
| 팀 | Auth API `/clubs` | Manage API `/team` | ❌ 다른 테이블 (Phase 3에서 해결) |
| 리그 | Manage API `/league` | Manage API `/league` | ✅ Phase 1에서 수정 완료 |
| 재무 | Manage API `/finance` | Manage API `/finance` | ✅ Phase 1에서 수정 완료 |
| 일정 | Manage API `/schedule` | Manage API `/schedule` | ✅ 정상 |

---

## 완료된 수정 내역

| 항목 | 완료일 | 분류 |
|------|--------|------|
| ✅ CORS: Manage API `GatewayResponse` 401/403에 `Access-Control-Allow-Origin` 추가 | 03-03 | 인프라 |
| ✅ CORS: `defaultCorsPreflightOptions`에 `allowHeaders: Authorization` 추가 | 03-03 | 인프라 |
| ✅ `manageFetch`: `idToken` 우선 사용 (Cognito REST Authorizer는 ID Token claims만 전달) | 03-03 | 인증 |
| ✅ `manageFetch`: 401 수신 시 토큰 갱신 후 1회 재시도, 실패 시 `/login` 리다이렉트 | 03-03 | 인증 |
| ✅ `lib/tokenRefresh.ts` 생성 — `tryRefreshTokens` (singleton), `clearTokens`, `isTokenExpiredOrNearExpiry` | 03-03 | 인증 |
| ✅ `AuthContext`: 마운트 시 토큰 만료 확인 + 30분 인터벌 자동 갱신 | 03-03 | 인증 |
| ✅ `team/page.tsx`: Auth API 경로를 `authFetch`로 교체, 401 갱신 재시도 포함 | 03-03 | 라우팅 |
| ✅ `backend/auth/index.mjs`: `/auth/refresh` 엔드포인트 추가 (Cognito REFRESH_TOKEN_AUTH) | 03-03 | 백엔드 |
| ✅ `finance/index.ts`: POST transactions/dues/fines, PATCH dues\|fines/pay에 userId 401 체크 추가 | 03-03 | 백엔드 |
| ✅ `league/index.ts`: POST league, PATCH league/:id, POST teams/matches, PATCH matches에 userId 401 체크 추가 | 03-03 | 백엔드 |
| ✅ `sw.js`: `res.clone()` race condition 수정 | 03-03 | PWA |
| ✅ Recharts `-1` 경고: `ResponsiveContainer width="99%"` 변경 (3개 파일) | 03-03 | 프론트엔드 |
| ✅ Lambda: `team`, `schedule`, `notifications` — userId 없을 때 401 반환 | 03-03 | 백엔드 |
| ✅ `reminder/index.ts`: `isNaN(matchTime)` 체크 추가 | 03-03 | 백엔드 |
| ✅ `video/page.tsx`: 비디오 MIME 타입 검증 추가 | 03-03 | 프론트엔드 |
| ✅ `mypage/page.tsx`: `closeTeamEdit` 시 상태 초기화 | 03-03 | 프론트엔드 |
| ✅ `useWebSocket.ts`: `connect`를 `useEffect` deps에 추가 | 03-03 | 프론트엔드 |
| ✅ `.env.example` 문서화 | 03-03 | 문서 |
| ✅ F-1/G-2: `league/page.tsx` mock → Manage API `/league` 실제 연결 | 03-03 | 프론트엔드 |
| ✅ G-3: `finance/page.tsx` mock → Manage API `/finance` 실제 연결 (팀 조회 → 회비/지출 fetch) | 03-03 | 프론트엔드 |
| ✅ F-4: `generateRoundRobin` circle 알고리즘으로 교체 (4팀 → 3라운드 정확히) | 03-03 | 프론트엔드 |
| ✅ F-5: `generateTournamentPairs` Fisher-Yates 셔플 적용 | 03-03 | 프론트엔드 |
| ✅ F-6: `manageFetch` HTML 에러 응답을 `서버 오류 (status)` 메시지로 변환 | 03-03 | 프론트엔드 |
| ✅ F-2: `POST /league/:id/teams` `ConditionExpression: attribute_not_exists` 중복 방지, 409 반환 | 03-03 | 백엔드 |
| ✅ F-3: `league/index.ts` 필수 필드 검증 (name, organizerTeamId, teamId, homeTeamId, awayTeamId) | 03-03 | 백엔드 |
| ✅ F-7: `league/index.ts` 모든 JSON.parse → `parseBody()` try-catch 래퍼 적용 | 03-03 | 백엔드 |
| ✅ B-3: `team/index.ts` 모든 JSON.parse → `parseBody()` + POST members auth/validation 추가 | 03-03 | 백엔드 |
| ✅ G-1a: `team/page.tsx` 팀 조회 → `useTeam()` context (Manage API), 멤버 → `manageFetch('/team/:id/members')` | 03-03 | 프론트엔드 |
| ✅ G-1b: `team/page.tsx` 매치/활동 → Auth API `user.teamId` (auth club ID) 유지 | 03-03 | 프론트엔드 |
| ✅ G-1c: 초대 링크 → `manageFetch('/team/:id/invite')` API 호출 방식으로 전환 | 03-03 | 프론트엔드 |
| ✅ F-8: `pg-league-teams` `teamId-index` GSI 추가 + CDK 배포 완료 | 03-03 | 인프라 |
| ✅ D-2: Auth Lambda (`backend/auth/index.mjs`) 수동 배포 현행 유지 결정 | 03-03 | 인프라 |
| ✅ C-2: `manageFetch` 401 — 토큰 없을 때 `/login` 리다이렉트 제거, 에러만 throw | 03-03 | 프론트엔드 |
| ✅ C-3: `page.tsx` `LoggedInHome` — 스포츠 필터 URL `?sport=` 쿼리 파라미터 읽기/쓰기 (history.replaceState) | 03-03 | 프론트엔드 |
| ✅ E-2: `deploy.sh` — 빌드 후 `out/sw.js`에 git 커밋 해시 주입 (`playground-<hash>`) | 03-03 | 인프라 |
| ✅ E-3: `finance/index.ts` 미사용 `ScanCommand` import 제거, `notifications/index.ts` discover scan Limit 추가 | 03-03 | 백엔드 |
| ✅ E-4: `playground-stack.ts` `lambdaDefaults`에 `arm64` 추가 — 전체 Lambda Graviton2 전환 | 03-03 | 인프라 |

---

*최종 업데이트: 2026-03-03*
