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
- Tailwind CSS 4, Radix UI, Recharts

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
