# 개발 진행 현황

> 이 파일은 매 작업 세션 후 업데이트한다.
> 과거 전체 진행 내역은 `PAST-PROGRESS.md` 참고.
> 마일스톤 전체 로드맵은 `MILESTONES.md` 참고.

---

## 현재 브랜치

| 브랜치 | 목적 | 상태 |
|--------|------|------|
| `main` | 프로덕션 | 최신 (2026-02-27 기준) |
| `feature/schedule-calendar` | M1-A 일정·참석 캘린더 | 진행 중 |

---

## ✅ 최근 완료 작업

### 2026-02-27 — 버그 수정 및 인프라 (브랜치: `fix/backend-bug` → `main` PR #3 머지)

- 로그인 불가 버그 수정: `next.config.ts`에 `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_MANAGE_API_URL` 하드코딩 (빌드 시 env 미설정 문제)
- `manageFetch.ts`: `NEXT_PUBLIC_MANAGE_API_URL` 별도 변수 사용으로 분리
- `deploy.sh`: 배포 후 `next.config.ts`를 망가뜨리던 `sed` 명령 제거
- CDK `playground-stack.ts`: 신규 Cognito UserPool 생성 → 기존 pool `us-east-1_dolZhFZDJ` import로 전환 (실사용자 7명 보존)
- CDK MatchesTable GSI 동시 추가 오류 수정 (DynamoDB 1회 1개 제한)
- `backend/package-lock.json` 생성 (CDK NodejsFunction 번들링 요구)
- CDK 배포 성공: Cognito 인증자 manage API 전 라우트 적용
- 프론트엔드 S3 + CloudFront 재배포
- `docs/MILESTONES.md` 신규 생성 (기획 vs 현재 갭 분석 + 전체 로드맵)

### 2026-02-27 — M1-A 일정·참석 캘린더 (브랜치: `feature/schedule-calendar`)

- `frontend/playground-web/app/schedule/page.tsx` 신규 생성
  - 월간 캘린더 뷰 (상태별 컬러 dot)
  - 다가오는 경기 카드 (D-DAY 카운트다운, 참가/불참 원클릭)
  - 경기 등록 모달 (리더 전용)
  - 날짜 선택 시 상세 펼침 + 출석 응답
  - 최근 공지 3개 미리보기
  - 다크/라이트 테마 CSS 변수 완전 대응
- `Sidebar.tsx`: generalNavItems에 `/schedule` (일정·참석, Calendar 아이콘) 추가

---

## 🚧 진행 중 작업

### M1-A 잔여 (브랜치: `feature/schedule-calendar`)

| 항목 | 상태 | 비고 |
|------|:---:|------|
| 참석 현황 집계 (참가 N명 / 불참 N명 표시) | 🔲 미착수 | `/schedule/matches/{id}/attendance/me` API 존재 여부 확인 필요 |
| 최소 인원 미달 경고 | 🔲 미착수 | Match 타입에 `minPlayers` 필드 추가 필요 |
| .ics 캘린더 내보내기 | 🔲 미착수 | 구글/아이폰 캘린더 동기화 |

---

## 📋 다음 예정 작업 (우선순위 순)

| # | 작업 | 마일스톤 | 예상 난이도 |
|---|------|---------|:---:|
| 1 | M1-B 회비 관리 페이지 | M1 | 중 |
| 2 | M1-A 잔여 (출석 집계, 미달 경고) | M1 | 낮 |
| 3 | M2 경기 당일 체크인 + POTM 투표 팝업 | M2 | 중 |
| 4 | M1-C 알림톡 브릿지 | M1 | 중 (카카오 채널 등록 선행) |
| 5 | MatchesTable GSI 재추가 CDK 배포 | 기술부채 | 낮 |

---

## 🔑 인프라 현황 (2026-02-27 기준)

| 항목 | 값 |
|------|-----|
| Auth API (`NEXT_PUBLIC_API_URL`) | `https://ayeyr9vgsc.execute-api.us-east-1.amazonaws.com/prod` |
| Manage API (`NEXT_PUBLIC_MANAGE_API_URL`) | `https://91iv3etr0h.execute-api.us-east-1.amazonaws.com/prod` |
| WebSocket | `wss://s2b7iclwcj.execute-api.us-east-1.amazonaws.com/prod` |
| Cognito UserPool | `us-east-1_dolZhFZDJ` (기존 pool, 실사용자 보존) |
| Cognito Client | `2m16g04t6prj9p79m7h12adn11` |
| S3 버킷 | `playground-web-sedaily-us` |
| CloudFront (사이트) | `E1U8HJ0871GR0O` → `fun.sedaily.ai` |
| CloudFront (비디오) | `E2AQ982ZLLWYM9` → `d2e8khynpnbcpl.cloudfront.net` |

---

## ⚠️ 알려진 이슈 / 기술 부채

| 항목 | 우선순위 | 상태 |
|------|:---:|:---:|
| MatchesTable GSI 누락 (`homeTeamId-index`, `awayTeamId-index`) | 중 | CDK에서 제거됨, 별도 배포 필요 |
| 다크모드 date input colorScheme | 낮 | 미완 |
| 팀 승급 조건 검증 (20승, 팀원 평균 등급) | 중 | 미구현 |
| 알림 시스템 (경기 제안 시 상대팀 알림) | 중 | DB 저장만, 발송 미구현 |
| 주장 채팅방 자동 생성 (매치 confirmed 시) | 중 | WebSocket 인프라는 완성, 로직 미구현 |
