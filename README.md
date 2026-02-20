# PLAYGROUND

스포츠 클럽 매칭, 팀 관리, AI 분석을 제공하는 통합 플랫폼

## 주요 기능

- **클럽 탐색**: 주변 스포츠 클럽 검색 및 경기 제안
- **장비 마켓**: 스포츠 용품 중고거래
- **팀 관리**: 일정, 전적, 라이벌 매칭 관리
- **AI 리포트**: 경기 영상 AI 분석 및 선수 개인 분석
- **채팅**: 클럽 간 실시간 소통 및 경기 일정 조율
- **팀 매니지먼트**: 스마트 팀 운영 도구

## 요금제

- **베이직** (무료): 기본 기능 제공
- **플러스** (₩9,900/월): 무제한 경기 제안, 스마트 팀 관리
- **프로** (₩19,900/월): AI 영상 분석, 선수 개인 리포트

## 기술 스택

### Frontend
- **Framework**: Next.js 16.1.6 (React 19.2.3)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI, Lucide React
- **Charts**: Recharts
- **Utilities**: clsx, class-variance-authority, tailwind-merge

### Backend
- 구현 예정

## 프로젝트 구조

```
Playground/
├── frontend/
│   └── playground-web/
│       ├── app/              # Next.js 페이지
│       │   ├── chat/         # 채팅
│       │   ├── clubs/        # 클럽 탐색
│       │   ├── finance/      # 팀 매니지먼트
│       │   ├── login/        # 로그인
│       │   ├── market/       # 장비 마켓
│       │   ├── mypage/       # 마이페이지
│       │   ├── payment/      # 결제
│       │   ├── report/       # AI 리포트
│       │   ├── signup/       # 회원가입
│       │   ├── team/         # 팀 관리
│       │   └── video/        # AI 영상분석
│       ├── components/       # 재사용 컴포넌트
│       │   └── layout/
│       ├── context/          # React Context
│       ├── lib/              # 유틸리티
│       └── public/           # 정적 파일
└── backend/                  # 백엔드 (구현 예정)
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

### 빌드

```bash
npm run build
npm start
```

## 개발 환경

- Node.js 20+
- npm

## 라이선스

Private
