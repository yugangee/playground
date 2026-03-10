# DB 연결 정리 — 클럽탐색 / 팀관리 / 마이페이지

> **API 구분**
> - **Auth API** (`ayeyr9vgsc`) — 수동 배포 Lambda (`backend/auth/index.mjs`)
> - **Manage API** (`91iv3etr0h`) — CDK 관리 Lambda (`backend/functions/`)
>
> **토큰 구분**
> - Auth API → `accessToken` (Cognito `GetUserCommand`)
> - Manage API → `idToken` (CognitoUserPoolsAuthorizer)

---

## 클럽탐색 (`/clubs`)

**API:** Auth API 전용

| 기능 | 엔드포인트 | DynamoDB 테이블 |
|------|-----------|----------------|
| 클럽 목록 조회 | `GET /clubs` | `playground-clubs` |
| 클럽 생성 | `POST /clubs` | `playground-clubs`, `playground-club-members`, `playground-users` |
| 클럽 정보 수정 | `PUT /clubs` | `playground-clubs` |
| 멤버 등록 | `POST /club-members` | `playground-club-members` |
| 가입 신청 | `POST /join-requests` | `playground-join-requests` |
| 가입 신청 현황 조회 | `GET /join-requests/user?clubId=` | `playground-join-requests` |
| 경기 제안 | `POST /matches` | `playground-matches` |
| 이미지 업로드 | `POST /upload-url` | S3 (presigned URL) |

### 테이블 필드

**`playground-clubs`** (PK: `clubId`)
- name, sport, areas[], members, styles[], image, creatorEmail, record, winRate, captainEmail, recruiting, createdAt

**`playground-club-members`** (PK: `clubId` + `email`)
- name, position, role (member/manager/leader), joinedAt

**`playground-join-requests`** (PK: `requestId`, GSI: `clubId-index`)
- clubId, email, name, position, status (pending/approved/rejected), createdAt

---

## 팀관리 (`/team`)

**API:** Auth API + Manage API 혼용

### Auth API 부분 (경기·활동·레이팅)

| 기능 | 엔드포인트 | DynamoDB 테이블 |
|------|-----------|----------------|
| 경기 목록 | `GET /matches?clubId=` | `playground-matches` |
| 경기 수락/거절 | `PUT /matches/{id}/accept,decline` | `playground-matches` |
| 스코어 제출 | `PUT /matches/{id}/score` | `playground-matches` |
| 골 기록 추가 | `PUT /matches/{id}/goals` | `playground-matches` |
| 활동 목록 | `GET /activities?clubId=` | `playground-activities` |
| 활동 생성 | `POST /activities` | `playground-activities` |
| 활동 참가/완료 | `PUT /activities/{id}/join,complete` | `playground-activities` |
| 클럽명 조회 | `GET /clubs` | `playground-clubs` |
| 멤버 목록 | `GET /club-members/{teamId}` | `playground-club-members` |

### Manage API 부분 (팀 관리·일정·참석)

| 기능 | 엔드포인트 | DynamoDB 테이블 |
|------|-----------|----------------|
| 멤버 수정 | `PATCH /team/{id}/members/{userId}` | `pg-team-members` |
| 멤버 삭제 | `DELETE /team/{id}/members/{userId}` | `pg-team-members` |
| 초대 링크 생성 | `POST /team/{id}/invite` | `pg-team-invites` |
| 일정 목록 | `GET /schedule/matches?teamId=` | `pg-schedule-matches`, `pg-attendance` |
| 일정 등록 | `POST /schedule/matches` | `pg-schedule-matches` |
| 일정 수정/취소/완료 | `PATCH /schedule/matches/{id}` | `pg-schedule-matches`, `playground-users` (골·도움 기록) |
| 참석/불참 응답 | `PUT /schedule/matches/{id}/attendance` | `pg-attendance` |

### 테이블 필드

**`playground-matches`** (PK: `matchId`, GSI: `homeClubId-index`, `awayClubId-index`)
- homeClubId, awayClubId, sport, status, homeScore, awayScore, goals[], confirmedAt

**`playground-activities`** (PK: `activityId`, GSI: `clubId-index`)
- clubId, sport, date, venue, createdBy, participants[], completedParticipants[], status

**`pg-schedule-matches`** (PK: `id`, GSI: `homeTeamId-index`, `awayTeamId-index`)
- homeTeamId, awayTeamId, type (경기/훈련/기타), status, scheduledAt, venue
- ourScore, theirScore, result (win/draw/loss), scorers[], attendees[]
- scorers 구조: `{ userId, name, goals, assists }`
- attendees 구조: `{ userId, userName }` (경기 완료 시 참석자 스냅샷)

**`pg-attendance`** (PK: `matchId` + `userId`)
- userName, status (accepted/declined), updatedAt

**`pg-team-members`** (PK: `teamId` + `userId`, GSI: `userId-index`)
- role, position, number, joinedAt

**`pg-team-invites`** (PK: `token`)
- teamId, createdBy, expiresAt (7일)

### 유저 기록 자동 업데이트

경기 완료(`status: completed`) 시 `playground-users` 테이블의 `record` 맵 자동 갱신:
```
record.goals   += scorer.goals
record.assists += scorer.assists
record.games   += 1
```

---

## 마이페이지 (`/mypage`)

**API:** Auth API + Manage API 혼용

| 기능 | 엔드포인트 | DynamoDB 테이블 |
|------|-----------|----------------|
| 프로필 조회 | `GET /auth/me` (AuthContext 자동) | `playground-users` |
| 프로필 수정 | `PUT /auth/profile` | `playground-users` |
| 내 클럽 목록 | `GET /clubs` | `playground-clubs` |
| 아바타 업로드 | `POST /upload-url` | S3 (presigned URL) |
| 소속팀 등번호 저장 | `PUT /auth/profile` (`teamNumbers` 필드) | `playground-users` |

### 테이블 필드

**`playground-users`** (PK: `email`)
- username, name, email, gender, birthdate
- regionSido, regionSigungu, activeAreas[] (최대 3개)
- sports[], position
- teamId, teamIds[], teamNumbers `{ clubId: number }` (팀별 등번호)
- avatar (S3 URL)
- record `{ games, goals, assists }` (경기·득점·도움 누적)
- role, createdAt

### 소속팀 표시 로직
- `playground-clubs` → 클럽명, 멤버수, 티어
- `playground-club-members` → 포지션, 역할
- `playground-users.teamNumbers[clubId]` → 등번호 (팀별 개별 저장)

---

## Auth Lambda 전체 테이블 목록

| 테이블 | PK | 용도 |
|--------|-----|-----|
| `playground-users` | email | 유저 프로필, 레이팅, 기록 |
| `playground-clubs` | clubId | 클럽 정보 |
| `playground-club-members` | clubId+email | 클럽 멤버십 |
| `playground-matches` | matchId | 경기 제안·진행·결과 |
| `playground-activities` | activityId | 팀 활동 |
| `playground-join-requests` | requestId | 클럽 가입 신청 |
| `playground-chat-messages` | messageId | 채팅 메시지 |
| `playground-ws-connections` | connectionId | WebSocket 연결 |

## Manage API (CDK) 주요 테이블 목록

| 테이블 | PK | 용도 |
|--------|-----|-----|
| `pg-teams` | id | 팀 기본 정보 |
| `pg-team-members` | teamId+userId | 팀 로스터 |
| `pg-team-invites` | token | 초대 링크 |
| `pg-schedule-matches` | id | 팀 일정 (경기/훈련/기타) |
| `pg-attendance` | matchId+userId | 참석 응답 |
| `pg-leagues` | id | 리그·토너먼트 |
| `pg-finance` | id | 팀 재정 |
| `pg-dues` | id | 회비 |
| `pg-fines` | id | 벌금 |
