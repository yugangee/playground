# PLAYGROUND

**누구나 즐기는 스포츠, 데이터로 더 재미있게 - 아마추어 스포츠의 프로 경험**

> Live: [fun.sedaily.ai](https://fun.sedaily.ai)

## 핵심 가치

Playground는 전문 선수가 아닌 일반인도 프로처럼 팀을 운영하고, 경기를 분석하며, 데이터 기반으로 성장할 수 있는 스포츠 통합 플랫폼입니다.

## 주요 기능

### 1. 팀 & 클럽 관리
- **팀 운영**: 팀 생성, 멤버 초대, 포지션·등번호 관리, 장비 관리
- **클럽 탐색 & 매칭**: 지역·종목·실력별 상대 팀 검색, AI 기반 매칭 추천
- **선수 탐색**: 이름·지역·포지션·종목별 선수 검색 및 스카우트
- **팀/선수 비교**: 레이더 차트 기반 능력치 비교, 상대전적 분석

### 2. 대회 & 리그 시스템
- **리그/토너먼트 생성**: 라운드 로빈(리그) 또는 토너먼트(엘리미네이션) 방식 선택
- **대진표 자동 생성**: 참가팀 기반 라운드별 매치 자동 배정
- **토너먼트 자동 진출**: 라운드 완료 시 다음 라운드 매치 자동 생성 (16강→8강→준결승→결승)
- **경기 상세 기록**: 골(득점자/어시스트/시간), 카드(옐로/레드), 용병 등록, 라인업
- **통계 대시보드**: 득점 순위, 카드 현황, 팀 순위표 (득실차, 폼 가이드)
- **대회 탐색**: 공개 대회 검색, 타입/상태/지역별 필터, 참가 신청

### 3. 경기 & 일정
- **월별 캘린더**: 경기 일정 시각화, 출석 체크인
- **매치 기록**: 경기별 상세 결과, 골/어시스트/카드 기록
- **출석 관리**: 참석/불참 투표, 실시간 현황
- **알림**: Kakao AlimTalk D-2/D-1/당일 자동 알림

### 4. 레이팅 & 티어 시스템
- **선수 티어**: B → S → A → SP → P (승리·득점·활동 기반 포인트)
- **팀 티어**: Rookie → Club → Crew → Elite → Legend
- **시즌 리셋**: 매년 1월 1일 50% 포인트 감쇠 + 티어 재산정

### 5. 실시간 소통
- **팀 채팅**: WebSocket 기반 실시간 메시징
- **일정 조율**: 채팅 내 날짜/장소 선택
- **AI 챗봇**: 운영 도우미

### 6. AI 영상 분석
- **경기 영상 업로드**: 실시간 분석 진행률 표시
- **자동 분석**: 선수 움직임, 공 흐름, 점유율 등 주요 지표
- **코칭 인사이트**: AI 기반 전술 제안 및 개인 리포트

### 7. 재정 관리
- **수입/지출 장부**: 팀 재정 투명 관리
- **회비 관리**: 멤버별 회비 납부 추적
- **벌금 관리**: 지각/불참 벌금 기록

### 8. 부가 기능
- **장비 마켓**: 스포츠 용품 중고거래 및 공동구매
- **GPS 트래킹**: 훈련 시 움직임·거리 기록
- **PWA**: 모바일 앱 설치 지원
- **웹 푸시 알림**: 경기/팀 알림

## 기술 스택

### Frontend
- **Framework**: Next.js 16 (React 19) — Static Export (SSG)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + CSS Custom Properties (다크/라이트 모드)
- **UI Components**: Radix UI (shadcn-style), Lucide React icons
- **Charts**: Recharts
- **State**: React Context API (Auth, Team, Chat, Club, Theme)
- **Compiler**: React Compiler enabled (ESLint rules enforced)

### Backend
- **Runtime**: Node.js 20 (ARM64/Graviton2)
- **Infrastructure**: AWS CDK (TypeScript)
- **Compute**: AWS Lambda (7 functions)
- **Database**: Amazon DynamoDB (28 tables)
- **Auth**: Amazon Cognito (email/password + Kakao OAuth)
- **API**: API Gateway REST (2 APIs) + WebSocket
- **Scheduling**: Amazon EventBridge (match reminders, season reset)
- **Storage**: S3 + CloudFront (frontend, video CDN)
- **Video Analysis**: EC2 (auto-start via Lambda)

### Dual API Architecture
| | Auth API | Manage API |
|---|---|---|
| 배포 | 수동 (zip + AWS CLI) | CDK (`npx cdk deploy`) |
| 인증 | accessToken | idToken (CognitoUserPoolsAuthorizer) |
| 엔드포인트 | `/auth/*`, `/clubs`, `/matches`, `/users` | `/team`, `/finance`, `/league`, `/schedule`, `/social`, `/notifications` |

## 프로젝트 구조

```
sedaily-playground/
├── frontend/playground-web/
│   ├── app/                    # Next.js App Router pages
│   │   ├── login/, signup/     # 인증
│   │   ├── clubs/              # 클럽 탐색
│   │   ├── league/             # 대회 탐색 & KJA 대회
│   │   ├── players/            # 선수 탐색
│   │   ├── team/               # 팀 관리 & 매치 기록 & 비교
│   │   ├── schedule/           # 일정 & 출석
│   │   ├── chat/               # 실시간 채팅
│   │   ├── finance/            # 재정 대시보드
│   │   ├── report/             # AI 퍼포먼스 리포트
│   │   ├── video/              # AI 영상분석
│   │   ├── manage/             # 관리 (팀, 리그, 일정, 재정, 소셜, 탐색)
│   │   ├── market/             # 장비 마켓
│   │   └── m/                  # 모바일 전용
│   ├── components/             # 공통 컴포넌트 (layout, tournament, UI)
│   ├── context/                # React Context (Auth, Team, Chat, Club, Theme)
│   ├── lib/                    # API fetch, token refresh, WebSocket, utils
│   └── types/                  # TypeScript 타입 정의
├── backend/
│   ├── auth/                   # Auth Lambda (수동 배포)
│   ├── chat/                   # WebSocket Lambda
│   ├── chatbot/                # AI 챗봇 (Python)
│   ├── functions/              # CDK Lambda (team, finance, league, schedule, notifications, reminder, seasonReset, ec2)
│   └── infra/                  # AWS CDK 스택 정의
└── docs/                       # 문서 (진행 현황, 마일스톤, 작업 로그, DB, 레이팅 등)
```

## 시작하기

### 설치

```bash
cd frontend/playground-web
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://127.0.0.1:3000 접속

### 빌드 & 배포

```bash
# 프론트엔드 빌드
npm run build

# 프론트엔드 배포 (S3 + CloudFront)
npm run deploy

# 백엔드 배포 (CDK)
cd backend/infra
npx cdk deploy
```

## 개발 환경

- Node.js 20+
- npm
- AWS CLI (배포 시)
- AWS CDK CLI (백엔드 배포 시)

## 라이선스

Private
