# PLAYGROUND

**모든 축구인들을 하나로**

## 서비스 소개

Playground는 축구 동호회 대표가 팀을 쉽게 관리하고, 선수들은 팀 상황을 한눈에 파악할 수 있는 축구 동호회 전용 매니징 서비스입니다.

대학교 동아리, 직장인 팀, 초·중·고 팀, 아마추어 클럽 등 수준에 관계없이 축구를 즐기는 모든 동호회를 위해 만들었습니다.

종이 장부, 네이버 카페, 카카오톡 단체방으로 흩어져 있던 모든 관리 업무를 하나의 서비스에서 해결합니다.

## 주요 기능

### 1. 팀 관리

- **팀 생성**: 팀 이름, 로고, 소개, 지역, 활동 요일/시간, 연령대, 공개/비공개 설정
- **선수 관리**: 등번호, 포지션, 스탯, 회비 납부 여부
- **유니폼 관리**: 번호, 사이즈, 지급 여부
- **팀 용품 재고**: 공, 조끼 등 용품 현황 관리
- **팀원 모집**: 공개 모집 공고 등록
- **역할 구분**: 대표(팀 관리 권한) / 선수(팀 현황 조회)

### 2. 재정 관리

- **장부**: 팀 수입·지출 기록 및 내역 조회
- **회비 관리**: 납부 현황, 미납 알림 및 독촉
- **벌금 관리**: 지각, 노쇼 등 규칙 설정 및 벌금 부과
- **구장 비용 분담**: 경기별 구장 비용 자동 계산 및 정산

### 3. 경기 일정 관리

- **공지사항**: 대표가 팀 전체에 공지 등록
- **투표**: 경기 날짜 조율, 팀 내 의사결정
- **경기 제안**: 상대 팀 대표에게 친선전 제안
- **자동 일정 반영**: 수락 시 양 팀 선수 전체 일정표에 자동 등록
- **구장 정보**: 경기별 구장 이름, 위치 포함
- **출석 관리**: 경기별 참가 여부 응답 및 현황 확인

### 4. 리그 & 토너먼트

- **생성**: 대표가 직접 만들고 여러 팀 초대
- **대진표 자동 생성**: 참가 팀 확정 시 일정 및 대진표 자동 구성
- **결과 기록**: 경기 결과 입력 및 순위 자동 업데이트
- **전적 관리**: 팀 및 선수별 승/무/패, 득점, 어시스트 누적 기록

### 5. 소셜

- **친구 추가**: 선수 간 친구 연결
- **팀 즐겨찾기**: 관심 팀 별표 등록

### 6. 탐색 피드

- **팀/리그/토너먼트 탐색**: 지역, 활동 요일, 연령대, 팀 규모로 필터링
- **경기 기회 창출**: 공개 등록된 팀·리그·토너먼트에 참가 신청

## 기술 스택

### Mobile (메인)
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Platform**: iOS & Android

### Web
- **Framework**: Next.js (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4

### Backend (AWS Serverless)
- **Auth**: AWS Cognito (이메일/비밀번호, Google, Apple)
- **API**: AWS API Gateway + Lambda (Node.js/TypeScript)
- **Database**: Amazon DynamoDB (on-demand)
- **Storage**: Amazon S3 (이미지, 파일)
- **Push Notifications**: Amazon SNS → FCM (Android) / APNS (iOS)
- **Infra as Code**: AWS CDK (TypeScript)

### 배포
- **Web**: AWS Amplify (CloudFront)
- **Mobile**: EAS Build (Expo Application Services)
- **AWS Region**: us-east-1

## 프로젝트 구조

```
playground/
├── apps/
│   ├── mobile/                   # Expo 앱
│   │   ├── app/                  # 화면 (파일 기반 라우팅)
│   │   │   ├── (auth)/           # 로그인, 회원가입
│   │   │   ├── (tabs)/           # 메인 탭
│   │   │   │   ├── team/         # 팀 관리
│   │   │   │   ├── schedule/     # 경기 일정
│   │   │   │   ├── league/       # 리그 & 토너먼트
│   │   │   │   ├── discover/     # 탐색 피드
│   │   │   │   └── mypage/       # 마이페이지
│   │   │   ├── finance/          # 재정 관리
│   │   │   └── social/           # 친구, 즐겨찾기
│   │   └── components/           # 재사용 컴포넌트
│   │
│   └── web/                      # Next.js 앱
│       ├── app/
│       │   ├── (auth)/           # 로그인, 회원가입
│       │   ├── (main)/           # team, finance, schedule, league, social, discover, mypage
│       │   └── join/             # 초대 링크 랜딩
│       ├── components/
│       ├── contexts/             # AuthContext, TeamContext
│       └── lib/                  # api.ts, auth.ts
│
├── packages/
│   └── shared/                   # 공통 타입, 유틸리티
│
└── backend/
    ├── functions/                # Lambda 함수
    │   ├── auth/
    │   ├── team/
    │   ├── finance/
    │   ├── schedule/
    │   ├── league/
    │   └── notifications/
    └── infra/                    # AWS CDK
```

## 시작하기

### 모바일 앱

```bash
cd apps/mobile
npm install
npx expo start
```

### 웹

```bash
cd apps/web
npm install
npm run dev
```

브라우저에서 http://127.0.0.1:3000 접속

### 백엔드

```bash
cd backend
npm install
npx cdk deploy
```

## 개발 환경

- Node.js 20+
- npm
- AWS CLI (configured)
- Expo CLI

## 라이선스

Private

# CLAUDE.md

이 문서는 Claude Code가 프로젝트 컨텍스트를 이해하기 위한 파일입니다.

## 서비스 개요

**Playground** - 축구 동호회 전용 매니징 서비스

종이 장부, 네이버 카페, 카카오톡 단체방으로 흩어진 관리 업무를 하나로 통합한다.
대표(클랜장)가 팀을 관리하고, 선수(클랜원)들이 팀 상황을 파악하는 구조.
대학교 동아리, 직장인 팀, 초·중·고 팀, 아마추어 클럽 모두 타겟.

## 핵심 기능

1. **팀 관리** - 선수(등번호, 포지션, 스탯, 회비), 유니폼, 용품 재고, 팀원 모집
2. **재정 관리** - 장부, 회비 납부/미납 알림, 벌금, 구장 비용 분담
3. **경기 일정** - 공지사항, 투표, 경기 제안/수락(→ 양팀 일정 자동 반영), 출석
4. **리그 & 토너먼트** - 생성, 팀 초대, 대진표 자동 생성, 전적 관리
5. **소셜** - 친구 추가, 팀 즐겨찾기
6. **탐색 피드** - 팀/리그/토너먼트 탐색 (지역, 요일, 연령대, 팀 규모 필터)

## 기술 스택

### Mobile (메인 플랫폼)
- Expo (React Native) + TypeScript
- iOS & Android 동시 지원

### Web (보조)
- Next.js (React 19) + TypeScript
- Tailwind CSS 4

### Backend (AWS Serverless)
- **Auth**: AWS Cognito (이메일/비밀번호, Google, Apple 소셜 로그인)
- **API**: API Gateway + Lambda (Node.js/TypeScript)
- **DB**: DynamoDB (on-demand, 가장 저렴한 옵션 우선)
- **Storage**: S3 (이미지, 파일)
- **Push**: SNS → FCM (Android) / APNS (iOS)
- **IaC**: AWS CDK (TypeScript)

### 배포
- Web: AWS Amplify (CloudFront)
- Mobile: EAS Build
- AWS Region: us-east-1
- AWS Account ID: 887078546492

## 아키텍처 결정 배경

- **서버리스**: 초기 단계 - 트래픽이 적을 때 비용 최소화
- **DynamoDB**: RDS 대비 유휴 비용 없음, on-demand 과금
- **Cognito**: AWS 네이티브 인증, 소셜 로그인 내장 (카카오는 제외)
- **모노레포**: mobile/web이 타입과 유틸리티를 공유하기 위해
- **카카오 로그인**: 현재 미포함, 추후 추가 가능

## 프로젝트 구조

```
playground/
├── apps/
│   ├── mobile/          # Expo 앱 (메인)
│   └── web/             # Next.js 앱
├── packages/
│   └── shared/          # 공통 타입, 유틸리티
└── backend/
    ├── functions/        # Lambda 함수 (auth, team, finance, schedule, league, notifications)
    └── infra/            # AWS CDK
```

## 개발 명령어

```bash
# 모바일
cd apps/mobile && npm install && npx expo start

# 웹
cd apps/web && npm install && npm run dev

# 백엔드 배포
cd backend && npm install && npx cdk deploy
```

## 코딩 컨벤션

- 언어: TypeScript 전체 (strict mode)
- 패키지 매니저: npm
- 공통 타입은 `packages/shared`에 정의
- Lambda 함수는 도메인별로 분리 (하나의 함수에 너무 많은 책임 X)
- 환경변수는 `.env` 파일, AWS Secrets Manager 활용

## 주의사항

- AWS 비용 최소화가 현재 우선순위 (스케일업은 나중에)
- 기능 추가 전 README.md 업데이트
- 백엔드 API는 mobile/web 둘 다 사용하므로 공통 설계
