# 프로젝트 진행 현황

## ✅ 완료된 작업

### 1. 다크/라이트 테마 토글
- 기본값: 라이트 모드
- CSS 변수 기반 `:root`(라이트) / `.dark`(다크) 전환
- ThemeContext + localStorage 저장
- 사이드바 Sun/Moon 토글 버튼
- 대부분 페이지 CSS 변수 적용 완료
- **파일**: `globals.css`, `ThemeContext.tsx`, `layout.tsx`, `Sidebar.tsx`
- **남은 것**: signup/mypage date input의 `colorScheme` 라이트 모드 대응, 일부 페이지 하드코딩 인라인 스타일 점검

### 2. 클럽 생성 (프론트엔드 + 백엔드)
- 로그인 필수 체크
- 생성 후 자동 멤버 등록 + 주장 설정 + 프로필 팀 연결
- **파일**: `clubs/page.tsx`, `backend/auth/index.mjs`
- ✅ 백엔드 Lambda 배포 완료 (2026-02-23)

### 3. 팀 관리 - 멤버 수정/삭제 + 모집중 토글 (프론트엔드 + 백엔드)
- Pencil/Trash2 아이콘, 수정 모달, 삭제 confirm
- recruiting 토글 버튼
- **파일**: `team/page.tsx`, `backend/auth/index.mjs`
- ✅ 백엔드 Lambda 배포 완료 (2026-02-23)

### 4. 클럽 탐색 - 모집중 필터 (프론트엔드 + 백엔드)
- **파일**: `clubs/page.tsx`
- ✅ 백엔드 Lambda 배포 완료 (2026-02-23)

### 5. 커뮤니티 페이지 + 사이드바
- **완료**
- **파일**: `Sidebar.tsx`, `community/page.tsx`

### 6. 채팅 - 개인/팀 채팅 섹션
- **완료**
- **파일**: `chat/page.tsx`, `ChatContext.tsx`

### 7. 실시간 채팅 WebSocket ✅ (코드 + 인프라 + 배포 완료)
- 백엔드 Lambda: `backend/chat/index.mjs`
- 프론트엔드 훅: `useWebSocket.ts`
- 팀 채팅, 주장 매치 채팅, 1:1 멤버 채팅 타입
- **파일**: `backend/chat/index.mjs`, `useWebSocket.ts`, `CHAT-PIPELINE.md`
- ✅ AWS 인프라 구축 완료 (API Gateway WebSocket, DynamoDB chat 테이블, Lambda 배포)

### 8. 비디오 API - 비동기 폴링 + CloudFront CORS
- **완료**
- **파일**: `video/page.tsx`, `ec2-api.py`

### 9. 배포 스크립트 - uploads 제외
- **완료**
- **파일**: `deploy.bat`, `deploy.sh`

### 10. 등급/티어 시스템 ✅ (코드 + 배포 완료)
- **스펙 문서**: `RATING-SYSTEM.md`, `.kiro/specs/rating-system/` (requirements.md, design.md, tasks.md)
- **백엔드 구현 완료**:
  - `backend/auth/scoring.mjs` — 점수/등급 순수 함수 5개
    - `calculateMatchPoints(result, winStreak)` — 참여3 + 승4/무1/패0 + 연승보너스
    - `calculateGoalPoints(goalCount)` — 골당 2점
    - `calculateActivityPoints()` — 고정 5점
    - `determinePlayerTier(points)` — B/S/A/SP/P
    - `determineTeamTier(tp)` — Rookie/Club/Crew/Elite/Legend
  - `backend/auth/index.mjs` — 매치/활동 API 10개 라우트 추가
    - `POST /matches` — 경기 제안
    - `GET /matches?clubId=` — 매치 목록
    - `PUT /matches/{id}/accept` — 수락
    - `PUT /matches/{id}/decline` — 거절
    - `PUT /matches/{id}/score` — 스코어 입력 + 자동 확정 + 포인트 반영
    - `PUT /matches/{id}/goals` — 골 기록 추가 (개인 포인트만)
    - `POST /activities` — 활동 제안
    - `GET /activities?clubId=` — 활동 목록
    - `PUT /activities/{id}/join` — 참가
    - `PUT /activities/{id}/complete` — 완료 + 포인트 반영
  - 주장 권한 검증 (`verifyCaptain`)
  - 포인트/등급 자동 반영 헬퍼 (`applyMatchPoints`)
- **프론트엔드 구현 완료**:
  - `components/RatingBadge.tsx` — 개인/팀 등급 뱃지 공통 컴포넌트
  - `team/page.tsx` 확장:
    - 팀 등급 뱃지 (팀 이름 옆)
    - 멤버 등급 뱃지 (멤버 카드)
    - 멤버 1:1 채팅 버튼 (MessageCircle 아이콘 → /chat 이동)
    - 경기 제안 섹션 (실제 API: 수락/거절)
    - 진행중 경기 섹션 (스코어 입력 모달, 주장만)
    - 최근 경기 기록 섹션 (상대팀, 스코어, 결과, 골 기록 표시)
    - 골 기록 추가 모달 (멤버 선택 + 골 수)
    - 활동 일정 섹션 (동아리형: 제안/참가/완료)
  - `clubs/page.tsx` 확장:
    - 클럽 카드에 팀 등급 뱃지
    - 경기 제안 버튼 → 실제 `POST /matches` API 호출
    - AI 라이벌 매칭도 실제 API 연동
  - `mypage/page.tsx` 확장:
    - 종목별 개인 등급 뱃지 섹션 (포인트, 경기수, 승수 표시)
  - `context/AuthContext.tsx` — User 타입에 ratings 필드 추가

### 11. 프론트엔드 S3 + CloudFront 배포 ✅ (2026-02-23)
- S3 버킷 `playground-web-sedaily-us`에 정적 빌드 업로드
- CloudFront 캐시 무효화 완료 (ID: `I8NYZ86IS68EPPW70HCIYWC2EC`)
- **배포 URL**: `https://d1t0vkbh1b2z3x.cloudfront.net/` / `https://fun.sedaily.ai/`

---

## ✅ 배포 완료 (AWS) — 2026-02-23

### A. DynamoDB 테이블 생성 ✅
- `playground-matches` (GSI: `homeClubId-status-index`, `awayClubId-status-index`)
- `playground-activities` (GSI: `clubId-status-index`)

### B. Lambda 코드 업데이트 ✅
- `playground-auth` 함수에 `index.mjs`, `scoring.mjs`, `package.json`, `node_modules/` 배포 완료
- CodeSha256: `G1+JiQ5iAO012IlUSBzduq52EZN5jHkCt0MAFSLzanU=`

### C. API Gateway 라우트 추가 ✅
- 모든 매치/활동 라우트 + OPTIONS (CORS) + Lambda 프록시 통합 완료
- `prod` 스테이지 재배포 완료 (deployment ID: `t0gtvg`)

| 리소스 | 메서드 | 상태 |
|--------|--------|------|
| `/matches` | POST, GET, OPTIONS | ✅ |
| `/matches/{matchId}/accept` | PUT, OPTIONS | ✅ |
| `/matches/{matchId}/decline` | PUT, OPTIONS | ✅ |
| `/matches/{matchId}/score` | PUT, OPTIONS | ✅ |
| `/matches/{matchId}/goals` | PUT, OPTIONS | ✅ |
| `/activities` | POST, GET, OPTIONS | ✅ |
| `/activities/{activityId}/join` | PUT, OPTIONS | ✅ |
| `/activities/{activityId}/complete` | PUT, OPTIONS | ✅ |

### D. 프론트엔드 빌드 & 배포

```powershell
cd frontend/playground-web
npm run build
aws s3 sync out/ s3://playground-web-sedaily-us/ --delete --exclude "uploads/*"
aws cloudfront create-invalidation --distribution-id E1U8HJ0871GR0O --paths "/*"
```

### E. WebSocket 채팅 인프라 ✅ (2026-02-23)
- DynamoDB 테이블 생성 완료:
  - `playground-ws-connections` (GSI: `roomId-index`)
  - `playground-chat-messages` (PK: `roomId`, SK: `messageId`)
- Lambda 함수 `playground-chat-ws` 생성 완료 (nodejs22.x)
- API Gateway WebSocket API `playground-chat` (ID: `s2b7iclwcj`) 생성 완료
  - 라우트: `$connect`, `$disconnect`, `sendMessage`, `getHistory`
  - `prod` 스테이지 배포 완료
- IAM: `execute-api:ManageConnections` 인라인 정책 추가
- WebSocket URL: `wss://s2b7iclwcj.execute-api.us-east-1.amazonaws.com/prod`
- 프론트엔드 `.env`에 `NEXT_PUBLIC_WS_URL` 추가

### F. 프론트엔드 재배포 ✅ (2026-02-23)
- WebSocket URL 포함 빌드 → S3 업로드 → CloudFront 캐시 무효화 완료
- Invalidation ID: `I5JQBCUNL8JJ3SKNZN2IHVW3QT`

---

## 📋 추후 작업

1. **다크/라이트 테마 마무리** — date input colorScheme 토글, 남은 하드코딩 스타일 점검
2. **동아리형 종목별 등급 커트라인** — 러닝크루/스노보드/배드민턴 등급표 미정
3. **다른 대전형 종목 등급 커트라인** — 농구/야구/배구/아이스하키 (현재 축구/풋살만 설정됨)
4. **알림 시스템** — 경기 제안 시 상대팀 전원 알림 (현재 미구현, DB에만 저장)
5. **주장 채팅방 자동 생성** — 매치 scheduled 시 양쪽 주장 채팅방 (WebSocket 인프라 완료, 로직 구현 필요)
6. **스코어 불일치(disputed) 처리 UI** — 현재 재입력 안내만, 상세 UI 미구현
7. **팀 승급 조건 검증** — 현재 TP 커트라인만 적용, 추가 조건(누적 20승, 팀원 평균 등급 등) 미구현
8. **속성 기반 테스트** — fast-check 라이브러리로 scoring.mjs 테스트 (선택사항)

---

## 🗂 주요 파일 목록

| 구분 | 파일 |
|------|------|
| 백엔드 메인 | `backend/auth/index.mjs` |
| 점수/등급 엔진 | `backend/auth/scoring.mjs` |
| 채팅 백엔드 | `backend/chat/index.mjs` |
| 비디오 API | `backend/ec2-api.py` |
| 프론트 팀관리 | `frontend/playground-web/app/team/page.tsx` |
| 프론트 클럽탐색 | `frontend/playground-web/app/clubs/page.tsx` |
| 프론트 마이페이지 | `frontend/playground-web/app/mypage/page.tsx` |
| 프론트 채팅 | `frontend/playground-web/app/chat/page.tsx` |
| 등급 뱃지 | `frontend/playground-web/components/RatingBadge.tsx` |
| 인증 컨텍스트 | `frontend/playground-web/context/AuthContext.tsx` |
| 테마 컨텍스트 | `frontend/playground-web/context/ThemeContext.tsx` |
| 사이드바 | `frontend/playground-web/components/layout/Sidebar.tsx` |
| 글로벌 CSS | `frontend/playground-web/app/globals.css` |
| 등급 시스템 문서 | `RATING-SYSTEM.md` |
| 채팅 파이프라인 | `CHAT-PIPELINE.md` |
| 배포 스크립트 | `frontend/playground-web/deploy.bat`, `deploy.sh` |
| 스펙 문서 | `.kiro/specs/rating-system/` |

---

## 🔑 인프라 정보

| 항목 | 값 |
|------|-----|
| API URL | `https://ayeyr9vgsc.execute-api.us-east-1.amazonaws.com/prod` |
| Lambda 함수명 | `playground-auth` |
| S3 버킷 | `playground-web-sedaily-us` |
| 사이트 도메인 | `fun.sedaily.ai` |
| CloudFront (사이트) | `d1t0vkbh1b2z3x.cloudfront.net` (ID: `E1U8HJ0871GR0O`) |
| CloudFront (비디오) | `d2e8khynpnbcpl.cloudfront.net` (ID: `E2AQ982ZLLWYM9`) |
| GitHub | `https://github.com/yugangee/playground.git` (main) |
| WebSocket API | `wss://s2b7iclwcj.execute-api.us-east-1.amazonaws.com/prod` (ID: `s2b7iclwcj`) |
| Chat Lambda | `playground-chat-ws` |
