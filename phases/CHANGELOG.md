# Playground 변경 기록

변경사항은 날짜 역순으로 기록한다.

---

## 2025-07-14 — 코드 품질 개선 (버그 수정 + 리팩토링)

### 버그 수정

#### `backend/functions/league/index.ts`
- **GET `/league/:id/matches` — `IndexName` 누락으로 런타임 오류**
  - `pg-league-matches` 테이블의 PK는 `id`이고 `leagueId`는 GSI인데, `IndexName: 'leagueId-index'` 없이 쿼리하고 있었음
  - `IndexName: 'leagueId-index'` 추가

#### `backend/functions/schedule/index.ts`
- **GET `/schedule/matches` — 전체 테이블 Scan으로 비효율**
  - `homeTeamId`/`awayTeamId` 기반 GSI가 없어 `ScanCommand` + `FilterExpression` 사용 중이었음
  - CDK에 `homeTeamId-index`, `awayTeamId-index` GSI 추가
  - Lambda에서 두 GSI를 `Promise.all`로 병렬 Query 후 중복 제거로 교체

#### `backend/infra/lib/playground-stack.ts`
- `pg-matches` 테이블에 `homeTeamId-index`, `awayTeamId-index` GSI 추가 (위 수정의 인프라 반영)

### 미사용 코드 제거

#### `backend/functions/schedule/index.ts`
- 미사용 `GetCommand`, `ScanCommand` import 제거
- 미사용 `TEAMS` 환경변수 상수 제거

#### `backend/functions/league/index.ts`
- 미사용 `MATCHES` 환경변수 상수 제거

### 타입 중복 제거

#### `apps/web/app/(main)/team/page.tsx`
- 로컬에서 재정의하던 `PlayerStat`, `Uniform`, `Equipment`, `RecruitPost` 인터페이스 제거
- `@playground/shared`의 `PlayerStats`, `Uniform`, `Equipment`, `Recruitment` 타입으로 교체
- `type PlayerStat = PlayerStats`, `type RecruitPost = Recruitment` 별칭으로 하위 호환 유지

### 안정성 개선

#### `apps/web/contexts/TeamContext.tsx`
- `useEffect` dependency를 `user` 객체에서 `user?.userId` (string primitive)로 교체
- 객체 참조 변경으로 인한 불필요한 재실행 방지

### 문서화

#### `backend/functions/notifications/index.ts`
- 파일명(`notifications`)과 실제 역할(social + discover 라우팅) 불일치를 상단 주석으로 명시
