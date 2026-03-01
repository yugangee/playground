# Playground 프로젝트 마일스톤

> **최초 작성**: 2026-02-27
> **최종 업데이트**: 2026-02-27
> **비교 기반**: Playground-Reference.md (기획), Playground-Convo.md (의사결정), soccer-go-benchmark.md (경쟁사 벤치마크)
> **진행 현황 상세**: docs/PROGRESS.md 참고

---

## 타겟 페르소나 — 첫 번째 실사용 고객

> **맥락**: 제51회 한국기자협회 서울지역 축구대회(2025.9)에 참가한 서울경제신문 '어벤져스' 팀이 Playground의 첫 데모 케이스다. 50개 이상 언론사 팀, 55개 매치 슬롯의 토너먼트 운영이 배경이다.

### 페르소나 A — 총무 이건율 (서울경제신문 어벤져스, 산업부 기자 #3)

| 항목 | 내용 |
|------|------|
| 역할 | 팀 총무 겸 선수 |
| 핵심 고통 | 20명 선수단 출석 확인, 대회 참가비 30만원 정산, 경고 누적 추적, 매 경기 신분 검인 조율, 일정 카톡 공유 |
| 몰수패 리스크 | 경기 개시까지 **7명 미만** 시 몰수패 → 출석 확인이 최우선 과제 |
| 킬러 워크플로우 | "매 경기 당일 7명+ 출석 확인 → 신분증 지참 알림 → 경기 5분 전 정렬 완료" |
| Playground 기대값 | 알림 자동화로 카톡 메시지 일일이 보내는 시간 제거, 회비 납부 현황 한눈에 파악 |

### 페르소나 B — 주장 박호현 (서울경제신문 어벤져스, 사회부 기자 #5)

| 항목 | 내용 |
|------|------|
| 역할 | 주장 |
| 핵심 고통 | 라인업 결정·공유, PK 순서 사전 조율, 판정 이의 제기 (주장만 가능), 경기 중 교체 추적 |
| 경고 관리 | 본인 + 팀원 경고 누적 현황 실시간 파악 필요 (2장 = 1경기 정지, 레드 = 2경기 정지) |
| 킬러 워크플로우 | "경기 전 라인업 확정·공유 → 경기 중 교체 기록 → 경기 후 POTM 투표 → 다음 라운드 출장 가능 선수 확인" |
| 특이사항 | 8강까지 경고 1장만 받고 4강 진출 시 경고 초기화 — 이 규칙을 앱이 자동 반영해야 함 |

### 페르소나 C — 대회 운영진 (한국기자협회 총무)

| 항목 | 내용 |
|------|------|
| 역할 | 55개 매치 대진 관리, 스코어 집계, 경고·퇴장 관리 |
| 현재 운영 방식 | 종이 대진표 + 수작업 경고 누적 관리 |
| 고통점 | 스코어 입력 오류, 경고 누적 실수, 팀별 이의 제기 처리 |
| Playground 기대값 | 디지털 대진표 + 스코어 자동 반영 + 경고 누적 자동 계산 |

### KJA 대회 특수 규칙 (앱이 반드시 지원해야 할 로직)

| 규칙 | 내용 | 우선순위 |
|------|------|:---:|
| 최소 출전 인원 | 7명 미만 시 몰수패 → 출석 카운트 실시간 표시 | 🔴 |
| 경고 누적 | 경고 2장 = 다음 1경기 출전정지, 레드카드 = 다음 2경기 정지 | 🔴 |
| 경고 초기화 | 8강까지 경고 1장 보유 + 4강 진출 시 초기화 | 🟡 |
| 미등록 선수 | 사전 등록된 선수만 출전 가능 → 용병 임시 등록 UI 필요 | 🟡 |
| PK 특수 규칙 | 후반 종료 시점 출전 중인 선수로만 PK 순서 작성 가능 | 🟡 |
| 신분 검인 | 매 경기 본부석 검인 → 체크인 플로우 필수 | 🟡 |

---

## 기획 vs 현재 구현 갭 분석

### 기획 Phase 1 대비 현황

| 기능 | 기획 우선순위 | 현재 상태 | 비고 |
|------|:---:|:---:|------|
| 팀·회원 관리 | Phase 1 필수 | ✅ 완료 | 생성·초대·권한·모집중 토글 |
| 소통 (채팅/커뮤니티) | Phase 1 필수 | ✅ 완료 | WebSocket 실시간 채팅 포함 |
| 일정·참석 (캘린더) | Phase 1 필수 ★ | ✅ 완료 | `app/schedule/page.tsx` — 월간 캘린더, 참석응답, 경기등록 |
| 회비 관리 | Phase 1 필수 ★ | ❌ 미구현 | 총무 고통점 2위 — 이건율 케이스 직결 |
| 카카오 알림톡 브릿지 | Phase 1 킬러피처 ★★ | ❌ 미구현 | Phase 1 최우선 과제 |
| 자동 리마인드 (48h/24h/12h) | Phase 1 | ❌ 미구현 | 알림톡 의존 |
| 구장 정보 DB + 즐겨찾기 | Phase 1 검토 | ❌ 미구현 | |
| 원클릭 초대 링크 | Phase 1 검토 | ❌ 미구현 | |
| PWA 설정 | Phase 1 필수 | ❓ 미확인 | manifest, service worker 여부 |

### 기획 Phase 2 대비 현황

| 기능 | 기획 우선순위 | 현재 상태 | 비고 |
|------|:---:|:---:|------|
| 등급/티어 시스템 | Phase 2 | ✅ **선행 완료** | scoring.mjs, RatingBadge 완성 |
| 경기 기록 기본 API | Phase 2 | ✅ **선행 완료** | 매치 제안/수락/스코어/골 기록 |
| AI 영상 분석 | Phase 2 | ✅ **선행 완료** | EC2 FastAPI + YOLO + 비동기 폴링 |
| AI 챗봇/RAG | Phase 2 | ✅ **선행 완료** | LangGraph AI chatbot (main 브랜치) |
| MVP/POTM 투표 UI | Phase 2 | ❌ 미구현 | 백엔드 구조는 있음 |
| 경기 통계 대시보드 | Phase 2 | ❌ 미구현 | API는 있지만 UI 없음 |
| 미디어 아카이브 | Phase 2 | ❌ 미구현 | |
| GPS 히트맵 | Phase 2 (확장) | ❌ 미구현 | soccer-go 벤치마크 참조 |

### 기획 없이 구현된 것 (보너스)

| 기능 | 상태 | 비고 |
|------|:---:|------|
| manage/ 백오피스 | ✅ 완료 | CDK 인프라 — finance, league, schedule, social, discover, team |
| league/ 리그 페이지 | ✅ 구현 | 기획 Phase 3 외부생태계 선행 |
| players/ 선수 탐색 | ✅ 구현 | 기획 Phase 3 선행 |
| market/ 마켓 | ✅ 기본 구현 | 기획 Phase 3 선행 |
| report/ 리포트 | ✅ 구현 | |
| payment/ 결제 | ✅ 기본 구현 | |

### soccer-go 벤치마크에서 추가 검토할 기능

| 기능 | 우선순위 | 난이도 | 비고 |
|------|:---:|:---:|------|
| **경기 당일 체크인 플로우** (QR/빠른 체크인) | 높음 | 중 | KJA 신분 검인 플로우 직결 |
| **쿼터별 포메이션/라인업 배치** | 높음 | 중 | 드래그앤드롭, 스타팅 멤버 시각화 |
| **POTM 투표 팝업** | 중 | 낮 | 경기 종료 후 자동 모달, 백엔드 준비됨 |
| **팀 리더보드** (기간별 득점왕/어시스트왕/출석왕) | 중 | 낮 | 현재 데이터 쌓이는 중 |
| **경기 중 실시간 스코어보드 UI** | 중 | 중 | PUT /matches/{id}/score API 있음 |
| **GPS 히트맵** | 낮음 (Phase 2+) | 높음 | 스마트폰 위치 추적, 개인 활동 범위 시각화 |
| **속도 구간별 분석** | 낮음 (Phase 3) | 높음 | 스마트워치 연동 필요 |

---

## 마일스톤 로드맵

---

### ✅ M0: 기반 인프라 완성 (완료)

**완료 시점**: 2026-02-23

#### 완료된 작업
- [x] AWS 인프라 풀 구축 (Cognito, DynamoDB 6개 테이블, Lambda, API Gateway, WebSocket, CloudFront)
- [x] 인증 시스템 (회원가입, 로그인, 토큰 갱신)
- [x] 팀·회원 관리 (생성, 초대, 권한 분리, 모집중 토글)
- [x] 클럽 탐색 (모집중 필터, AI 라이벌 매칭)
- [x] 실시간 채팅 WebSocket (팀 채팅, 주장 매치 채팅, 1:1 DM)
- [x] 등급/티어 시스템 (scoring.mjs, 개인 B→P, 팀 Rookie→Legend)
- [x] 경기 기록 기본 API (제안/수락/거절/스코어/골 기록)
- [x] 활동 일정 API (제안/참가/완료)
- [x] AI 영상 분석 (EC2 FastAPI + YOLO)
- [x] 다크/라이트 테마 토글
- [x] S3 + CloudFront 배포 자동화
- [x] manage/ 백오피스 (CDK 스택 — finance, league, schedule, social, discover) ※ `functions/notifications/index.ts`가 실제로 social/discover 라우트 담당 (파일명 오해 주의)
- [x] LangGraph AI 챗봇 (RAG + 분석 컨텍스트)
- [x] 로그인/API URL 버그 수정 (11건), CDK Cognito 기존 풀 연동

---

### 🎯 M-DEMO: 기자협회 대회 데모 (최우선 — 실제 고객 확보)

**목표**: 서울경제 어벤져스 총무/주장이 "이거 우리 팀에 바로 쓸 수 있다"고 느끼는 데모 완성
**핵심 가치 증명**: 종이 대진표 + 카톡 운영 → Playground 한 곳으로 통합
**참고 문서**: `target-audience.md` (구현 상세 계획)

#### DEMO-1. 토너먼트 데이터 레이어
- [x] `types/tournament.ts` — TournamentTeam, TournamentMatch, TournamentRound, PlayerRoster 타입 정의
- [x] `data/kja-tournament-51.ts` — 51회 대회 전체 데이터 (52개 팀, 57개 매치 슬롯, 서경 어벤져스 선수단 20명)
- [x] `data/kja-tournament-50.ts` — 50회 결과 (YTN 우승, 동아일보 준우승, 뉴스1 3위, 서울경제 4위)

#### DEMO-2. 대진표 브래킷 시각화
- [x] `TournamentBracket.tsx` — 좌측(54조)·우측(55조) 블록이 결승으로 수렴하는 레이아웃 (라운드 탭 + 서경 경로 탭)
- [x] `MatchCard.tsx` — 팀명·스코어·상태별 스타일 (예정/진행중/완료/PK)
- [x] 서경 어벤져스 경기 경로 하이라이트 (38조부터, 글로우 효과)
- [x] 가로 스크롤 지원 (서경 경로 플로우 뷰 모바일 대응)
- [x] `TeamRoster.tsx` — 등번호·이름·부서·역할 테이블 + 부서별 분포

#### DEMO-3. `/league/kja-51` 대회 전용 페이지
- [x] 히어로 섹션 (대회명, 참가 팀 수, 대회 방식, 시드 배너)
- [x] 탭 구조: 대진표 / 경기 일정 / 서경 어벤져스 / 이전 대회 / 대회 규정
- [x] 서경 어벤져스 탭: 선수단 20명 + 부서별 분포 + 7명 경고 배지
- [x] 대회 규정 탭: 경고 누적·몰수패·PK 규칙 아코디언 UI

#### DEMO-4. 네비게이션 & 랜딩 연동
- [x] 사이드바에 "🏆 기자협회 축구대회" 바로가기 추가 (핑크 하이라이트)
- [x] 랜딩 페이지 히어로/배너에 제51회 대회 소개 + CTA → `/league/kja-51`

#### DEMO-5. 스코어 입력 (데모용 로컬 상태)
- [x] 총무용 스코어 입력 모달 (홈/어웨이 스코어, 승부차기 여부)
- [x] 입력 결과가 브래킷에 자동 반영 (로컬 상태로 즉시 반영)
- [x] PK 승부차기 기록 지원 (동점 시 PK 토글 자동 노출)

#### DEMO 성공 기준
- 서경 어벤져스 팀원이 데모를 보고 "우리 팀 Playground 쓰자"는 반응
- 총무(이건율) NPS ≥ 8/10
- 데모 후 1팀 이상 실제 가입 전환

---

### 🚧 M1: Phase 1 완성 — 총무 행정 자동화

**목표**: 총무 주당 행정시간 230분 → 115분 (50%↓)
**페르소나 연결**: 이건율(총무) 고통점 직접 해소
**핵심 지표**: 참석 응답률 85%, 회비 납부율 90%

#### 1-A. 일정·참석 캘린더 ★ (완료 2026-02-27)

- [x] 월간 캘린더 뷰 (상태별 컬러 dot: 대기/확정/완료/거절)
- [x] 일정 등록 모달 (대표/리더만 노출, 구장명·일시·주소 입력)
- [x] 참석/불참 원클릭 버튼 (다가오는 경기 카드 + 캘린더 날짜 상세)
- [x] D-DAY 카운트다운 배지
- [x] 카카오맵 지도 보기 링크 (venueAddress 있을 때)
- [x] 최근 공지 3개 미리보기
- [x] 다크/라이트 테마 CSS 변수 완전 대응
- [x] Sidebar 일반모드에 `/schedule` 메뉴 추가
- [x] **참석 현황 집계 표시 (참가 N명 / 불참 N명)** — `GET /schedule/matches/:id/attendance` 활용, 7개 게이지 도트 시각화
- [x] **7명 미달 경고 배지** — 출석 7명 미만 시 빨간 경고 배너 + 카드 border 빨간색 전환
- [x] 최소 인원 미달 경고
- [x] .ics 캘린더 내보내기 (구글/아이폰) — 헤더 버튼, 클라이언트 사이드 생성, 90분 이벤트

#### 1-B. 회비 관리 ★ (핵심 UI 완료, 알림 미구현)

- [x] 월별 납부 현황 대시보드 — transactions, dues, fines 탭 (`manage/finance/page.tsx`, Manage API 연동)
- [x] 지출 내역 공개 (구장비, 음료비 등 거래 내역 목록)
- [x] 경기별 1/N 더치페이 자동 계산 (`perPerson = Math.ceil(total / count)` 구현됨)
- [x] 백엔드: CDK finance Lambda — `/finance/transactions`, `/finance/dues`, `/finance/fines` 완비
- [x] **미납자 리마인드 복사** — 미납자 목록 + 금액 + 기한을 카톡 붙여넣기용 텍스트로 클립보드 복사 (📤 버튼, 복사됨! 피드백)
- [ ] 미납자 자동 알림 발송 (1-C 알림톡 브릿지 의존)
- [x] **대회 참가비 분담** — KJA 30만원 ÷ 인원수 자동 계산, 전체 선택 preset 버튼 (`manage/finance` 정산 탭)

#### 1-C. 카카오 알림톡 브릿지 ★★ (킬러피처)

- [ ] 카카오 비즈니스 채널 등록 (운영팀 선행 필요)
- [ ] 알림톡 중계사 선정 (솔라피/알리고/바로빌)
- [ ] 알림톡 메시지 템플릿 설계 및 심사 (경기 안내 + 참석 버튼)
- [ ] **신분증 지참 리마인드 템플릿** — KJA 검인 필수 규정 반영 ("본부석 신분 확인 필수")
- [x] **백엔드 알림톡 Lambda 스텁** — `POST /notifications/kakao/send` Solapi REST API 연동, 환경변수 미설정 시 503 stub 반환 (`functions/notifications/index.ts`)
- [ ] SMS fallback 설정 (알림톡 실패 시 자동)
- [x] **공유 링크 카드 생성** — Web Share API(모바일) / 클립보드 복사(데스크톱) 분기, 경기 정보 + 체크인 링크 포함 텍스트 카드, 📤 버튼 (복사됨! 피드백)
- [ ] 자동 리마인드 스케줄러 (D-2/D-1/D-0.5 각 3단계)

#### 1-D. PWA 설정

- [x] `manifest.json` 작성 (앱 이름, SVG 아이콘, 테마 색상 #7c3aed)
- [x] **Service Worker 등록** — `public/sw.js` (캐시 우선/네트워크 우선 혼합 전략), `ServiceWorkerRegistration.tsx` 컴포넌트
- [x] iOS 홈 화면 추가 안내 배너 — `PWAInstallBanner.tsx`, 3초 딜레이, localStorage 영구 닫기
- [x] **웹 푸시 알림 설정** — VAPID 키 생성, `sw.js` push/notificationclick 핸들러, `PushNotificationSetup.tsx` 구독 UI (6초 딜레이, localStorage 거절 기억), DynamoDB `pg-push-subscriptions` 테이블, `POST /notifications/push/subscribe` 엔드포인트

#### 1-E. 온보딩 개선

- [x] 원클릭 초대 링크 생성 (초대코드 → URL 공유) — `/team/:id/invite` 백엔드 연동, 복사 버튼
- [x] 30초 온보딩 플로우 (링크 클릭 → 가입 → 팀 합류) — `/join?token=xxx` 페이지, Suspense 포함
- [x] **구장 즐겨찾기** — 경기 등록 시 구장명 자동완성 (localStorage `pg_saved_venues`), ⭐ 토글, 드롭다운 선택 (`MatchForm` 내 `loadSavedVenues/saveVenue`)

---

### 📅 M2: 경기 당일 플로우 강화 (KJA 대회 + soccer-go 벤치마크 반영)

**목표**: 경기 당일 경험을 "출석 → 라인업 → 스코어 → 투표" 원스톱으로 연결
**페르소나 연결**: 총무(이건율) 경기 당일 검인 워크플로우 + 주장(박호현) 라인업·PK 관리
**참고**: soccer-go-benchmark.md Flow B (경기 당일), KJA 대회 특수 규칙

#### 2-A. 경기 당일 체크인 + 신분 검인

- [x] **QR 코드 생성** — 경기별 고유 QR (`qrcode` canvas), 전체 공유 버튼, 링크 복사 (`QRModal` 컴포넌트)
- [x] **QR 체크인 플로우** — QR URL(`?match=ID`) 파라미터 감지, 체크인 배너 자동 노출, "체크인 완료" 버튼 → attendance PUT → 도착 N번째 순서 표시 (`QRCheckInBanner` 컴포넌트)
- [x] **실시간 출석 카운터** — "현재 X/7명 확인" 표시, 7명 도달 시 그린 배지 (경기 당일 배너 + 멤버 체크인 그리드)
- [x] **용병(Guest) 임시 등록** — 리더가 경기 카드 내 "용병" 섹션에서 이름 추가/삭제. `guests` 배열 PATCH 저장, 칩 UI. (`GuestSection` 컴포넌트)
- [x] 출석 현황 실시간 업데이트 — 경기 당일 30초 자동 갱신, 대형 체크인 버튼

#### 2-B. 쿼터별 포메이션/라인업

- [x] **전반/후반 탭 (1H/2H 전환)** — LineupSection 상단 전반·후반 탭, 각각 독립 라인업 저장 (`lineup` / `lineupSecond` 필드), "전반 복사" 버튼으로 후반 초기 설정, 탭 뱃지로 후반 설정 여부 표시
- [x] **2D 포메이션 보드** — SVG 필드 위에 선수 배치 시각화, 포메이션 5종(4-3-3/4-4-2/4-2-3-1/3-5-2/5-3-2) 선택, 리더 편집·전체 공개 (`FormationBoard` 컴포넌트, `LineupSection` 내 토글 패널)
- [x] 스타팅/교체/대기 멤버 분류 — `LineupSection` 컴포넌트, 선발● / 교체△ / 미선발 탭, 최대 11명, PATCH lineup 배열 저장
- [x] **PK 순서 관리** — 라인업 선발 선수 목록 기반, ↑↓ 버튼으로 순서 조정, PATCH pkOrder 배열 저장 (`PKOrderSection`, 라인업 패널 하단)
- [x] 팀원 앱에 라인업 실시간 동기화 — 저장 후 `onRefresh()` 통해 모든 팀원에게 즉시 반영

#### 2-C. 경기 중 실시간 스코어보드

- [x] `+ Goal` 버튼 → 득점자 선택 모달 → 어시스트 선택 모달 (GoalModal — 참가 멤버 필터, PATCH goals 배열)
- [x] 실시간 스코어 표시 (양팀 점수) — 완료된 경기 카드에 홈/어웨이 스코어 표시
- [x] **경기 이벤트 타임라인** — 득점·경고·퇴장을 분단위 시간순 통합 표시 (`EventTimeline` 컴포넌트, 분 미기재 이벤트는 맨 뒤)
- [x] **경고 누적 트래커** — 선수별 경고 수 표시, 2장 시 다음 경기 출전정지 경고 (`CardTrackerSection`, `CardModal`, 경고 주의 배지, PATCH cards 배열)
- [x] **경고 초기화 로직** — KJA 4강 진출 시 리더가 "🔄 KJA 4강 초기화" 버튼으로 초기화. `cardReset { at, by }` 필드를 최근 완료 경기에 PATCH → 초기화 이후 경기분만 집계 (확인 단계 포함)
- [x] 경기 결과 입력 모달 — 리더 전용, 우리팀/상대팀 +/- 스코어, PATCH `/schedule/matches/:id` 활용

#### 2-D. 경기 후 POTM 투표

- [x] 경기 완료 처리 시 POTM 투표 팝업 노출 — 결과 입력 모달 2단계로 자동 전환
- [x] 실시간 투표 집계 — polls 시스템 활용, `PollCard`에 퍼센트 게이지 바 표시
- [x] 투표 결과 영구 저장 — DynamoDB poll_votes 테이블 활용
- [x] **POTM 뱃지 확정** — 주장이 "🏆 POTM 확정하기" 버튼 클릭 → `POST /schedule/polls/:id/finalize` → 최다 득표자 `potmVotesReceived +1` (pg-stats UpdateCommand ADD), PollCard 내 확정 완료 배지 표시

---

### 📊 M3: Phase 2 — 통계·분석·미디어

**목표**: "내 기록이 쌓이는 곳"으로 자발적 재방문 유도

#### 3-A. 개인 통계 대시보드

- [x] 팀 전적 요약 (승/무/패, 승률) + 득점 리더보드 — schedule 페이지 `TeamStatsSection`, `GoalRecord` 누적 집계
- [x] **시즌별 개인 기록 (경기별 G/A 확장)** — 선수 행 클릭 시 ▼ 경기날짜·구장별 득점/어시스트 breakdown 표시 (`TeamStatsSection` expandedPlayer 상태)
- [x] **PIS Spider Chart** — 선수 행 클릭 시 recharts RadarChart (득점/어시스트/공격P/규율/활약도 5축, 팀 내 정규화)
- [x] 팀 내 리더보드 (득점왕 G·어시스트왕 A·경고 🟨🟥) — 선수 기록 테이블 (G/A/🟨/🟥 컬럼)
- [x] **출석왕** — "불러오기" 버튼 트리거, 완료 경기 attendance 병렬 로드, Top5 표시 (`loadAttendanceStats`)
- [x] **POTM 횟수 집계** — ⭐ POTM 접두사 poll 투표 자동 집계, 선수 이름 옆 🏆N 뱃지 표시
- [x] **시즌 필터 (전체/6개월/3개월)** — 팀 통계 기간별 필터링 토글 버튼, 필터 변경 시 전적·G/A·출석 데이터 자동 재계산
- [x] **시즌 리셋 / 감쇠 로직** — EventBridge CRON (매년 12/31 15:00 UTC = 1/1 KST 자정), `functions/seasonReset/index.ts` Lambda: pg-stats·pg-teams 전체 스캔 → 포인트 50% 감쇠·티어 재계산·winStreak 초기화 (페이지네이션 지원)

#### 3-B. 팀 통계 대시보드

- [x] **팀 전체 성적 (평균 득점/실점, 최장 연승)** — 평균 득/실점·최장연승 수치 카드 (`TeamStatsSection` avgGoalsFor/avgGoalsAgainst)
- [x] 팀 등급 승급 진행 바 — `TeamStatsSection`에 TEAM_TIERS 상수 + 진행 바 + pt 표시 (scoring.mjs 동일 룰 적용: base 3 + win 4 + draw 1 + streakBonus)
- [x] **상대 팀별 상대전적** — 완료 경기 상대팀 ID별 W/D/L·승률 집계 (`TeamStatsSection` opponentRecord)
- [x] **홈/원정 성적 분리** — 홈 W/D/L·승률, 원정 W/D/L·승률 2열 카드 (`TeamStatsSection` home/awayWins 분리 집계)
- [x] **토너먼트 전적 통계** — 팀이 주최한 토너먼트 리그 경기 W/D/L 집계, 승률·상태(모집중/진행중/종료) 카드 표시 (`TeamStatsSection` 하단 "🏆 토너먼트 기록" 섹션, `/league?organizerTeamId` + `/league/:id/matches` API 활용)

#### 3-C. 미디어 아카이브

- [x] **경기별 사진/영상 업로드** — S3 presigned URL 업로드, match.media[] PATCH 저장, 라이트박스 뷰 (`MediaSection`)
- [x] **경기별 미디어 갤러리 뷰** — 3열 그리드, 이미지/비디오 분기, 리더 삭제 버튼, 라이트박스
- [ ] AI 하이라이트 클립 자동 생성 (영상 분석 연계)
- [ ] **KT스카이라이프 AI 중계 연동 검토** — 제51회 KJA 대회에서 '포착' 솔루션 도입, 향후 연계 가능성

#### 3-D. 다종목 등급 커트라인 확정

- [x] **동아리형 (러닝크루, 스노보드, 배드민턴) 등급표 설계** — 새내기→동호인→마니아→전문가→마스터, 활동 횟수 기반 (minGames), `CLUB_TIERS` 상수
- [x] **대전형 비축구 (농구, 야구, 배구, 아이스하키) 커트라인 설계** — 농구 전용 `BASKETBALL_TIERS` (빠른 게임 페이스 반영), 나머지는 `COMPETITIVE_TIERS` 동일 적용
- [x] **종목별 PIS 가중치 조정** — `SPORT_PIS_LABELS`: 야구(안타/RBI), 러닝/스노보드(기록/활동P), 배드민턴(득점/서브), 배구(득점/세터) 등 종목별 축 레이블 분기
- [x] **팀 생성 시 종목 선택** — `CreateTeamForm`에 스포츠 종목 select 추가 (대전형/동아리형 optgroup 구분), `Team.sportType` 필드
- [x] **동아리형 승급 조건 UI** — `isClubSport` 분기: 포인트/승수 대신 활동 횟수 조건 표시, 진행 바도 활동 횟수 기준 계산

#### 3-E. 알림 시스템 완성

- [x] **경기 제안 수신 알림 배너** — pending + awayTeamId=우리팀인 경기 감지, 스케줄 페이지 상단 amber 배너 표시
- [x] **주장 채팅방 자동 생성** — 매치 status `accepted` PATCH 시 `captainRoomId = 'captain_match_{matchId}'` 자동 설정, 스케줄 페이지에 "💬 주장채팅" 링크 버튼 노출
- [x] **스코어 불일치 처리 UI** — 최근 경기 결과 섹션 (W/D/L 배지, 스코어), 원정팀 리더 "이의" 버튼 → note 필드 `DISPUTE:` 저장, ⚠️ 이의신청 배지 표시 (`RecentResultsSection`)

---

### 🌍 M4: Phase 2.5 — GPS 및 퍼포먼스 분석 (soccer-go 고도화)

**목표**: 프로 수준의 개인 퍼포먼스 분석 (soccer-go 핵심 차별점)
**선행 조건**: M1, M2 완료 + 충분한 사용자 데이터 축적

- [x] **경기 중 GPS 트래킹 시작/종료** — `watchPosition` 고정밀 모드, 추적 중 실시간 거리·속도 카운터 (`GpsTracker.tsx`, schedule 페이지 우하단 FAB)
- [x] **2D 축구장 GPS 히트맵 렌더링** — 이동 포인트 밀도 그리드(18×18) → amber 열지도 SVG 오버레이, 이동 경로 polyline, 시작/종료 마커 (`FieldHeatmap` 컴포넌트)
- [x] **속도 구간별 분석** — 걷기(<4)/조깅(<8)/달리기(<15)/스프린트(15+) km/h 구분, recharts PieChart 도넛 차트
- [x] **수치 데이터** — 이동 거리(m/km), 최고 속도, 평균 속도, 추적 시간 스탯 카드
- [x] **2D 필드 리플레이어** — 추적 완료 후 재생 버튼으로 궤적 애니메이션 재생, stroke-dashoffset 기법 + requestAnimationFrame 20× 배속, 속도 구간별 컬러 플레이어 도트, 진행 바 (`FieldReplayer` 컴포넌트)
- [x] **PlayerPerformance DynamoDB + 저장 엔드포인트** — `pg-player-performance` 테이블 (PK: userId, SK: sessionId), `POST /schedule/performance` 저장, `GET /schedule/performance` 최근 20세션 조회, GpsTracker "서버에 저장" 버튼 (최대 60포인트 다운샘플)
- [ ] 스마트워치 연동 검토 (Phase 3)

---

### 🏗 M5: Phase 3 — 생태계 확장

**목표**: "경기 없는 날에도 앱을 여는" 플랫폼

#### 5-A. 전술 보드

- [x] **탭투스왑 전술 에디터** — FormationBoard 포지션 탭 → 선택(노란 글로우), 다른 포지션 탭 → 두 선수 위치 교체, 취소 버튼, `onStartersChange` 콜백으로 실시간 반영
- [x] **상대팀 분석 메모** — 경기 노트 섹션 (리더 전용, 토글 패널), 상대팀 분석/전술 메모 textarea, match.note 저장 PATCH
- [x] **훈련 계획 공유** — 경기 등록 버튼 옆 "🏃 훈련" 버튼, TrainingCard(장소·시간·내용·참석RSVP), `matchType: 'training'` + `awayTeamId: 'training'` 필드로 구분, 경기 목록과 별도 섹션 표시

#### 5-B. 외부 리그 연동 (KJA 대회 벡터로 확장)

- [x] **기자협회 축구대회 대진표 자동화** — 라이프사이클 3단계 (모집중→진행중→종료): 대회 시작 시 토너먼트 추첨(`generateTournamentPairs`) 또는 리그 라운드 로빈(`generateRoundRobin`) 자동 생성, PATCH status, `manage/league/page.tsx` 대회 시작·종료 버튼
- [x] **외부 리그 등록/참가 신청** — "공개 리그 탐색" 탭: `GET /league` 전체 공개 리그 조회, 모집중 리그에 "참가 신청" 버튼 (`POST /league/:id/teams`)
- [x] 대진표 브래킷 시각화 (M-DEMO에서 검증된 컴포넌트 활용) — `league/kja-51` 전용 페이지, `TournamentBracket.tsx`
- [ ] **다른 언론사 팀으로 확산** — KJA 50개 팀이 잠재 고객

#### 5-C. 앱스토어 래핑

- [ ] React Native (Expo) 또는 Flutter로 앱 래핑
- [ ] 앱스토어/플레이스토어 심사 및 출시
- [ ] 백그라운드 푸시 알림 안정성 확보
- [ ] **전환 트리거**: 활성 팀 50개 or MAU 1,000명 달성 시

#### 5-D. 마켓 고도화

- [x] **용품 거래 UI 고도화** — 검색 바(클리어 버튼), 카테고리·정렬·가격 범위 필터, 스포츠 칩 필터, 좋아요 기능, 판매자/지역/조회수 표시, 상품 상세 모달, "판매하기" 등록 모달 (`app/market/page.tsx` 전면 재작성)
- [ ] 팀 공동구매 기능
- [ ] 결제 시스템 연동

---

## 현재 잔여 이슈 (버그/기술부채)

| 항목 | 우선순위 | 상태 |
|------|:---:|:---:|
| 다크/라이트 테마 — date input colorScheme 대응 | 낮 | ✅ globals.css `color-scheme: dark/light` |
| 일부 페이지 하드코딩 인라인 스타일 | 낮 | 미완 |
| MatchesTable GSI 재추가 (homeTeamId-index, awayTeamId-index) | 중 | CDK에서 제거됨, 별도 배포 필요 |
| 팀 승급 조건 검증 (승수 조건) | 중 | ✅ 승급 조건 체크리스트 UI (포인트 + 누적 승수 조건 표시, 조건 충족 시 그린 배지) |
| scoring.mjs 속성 기반 테스트 (fast-check) | 낮 | 선택사항 |

---

## 성공 지표

| 단계 | 지표 | 목표 | 측정 |
|------|------|:---:|------|
| **M-DEMO 완료 기준** | 서경 어벤져스 총무 NPS | 8/10+ | 데모 후 설문 |
| **M-DEMO 완료 기준** | 데모 후 실제 가입 전환 | 1팀+ | DB 집계 |
| **M-DEMO 완료 기준** | KJA 팀 중 Playground 도입 관심 | 5팀+ | 인터뷰 |
| M1 완료 기준 | 총무 주당 행정시간 감소 | 50%↓ | 총무 서베이 |
| M1 완료 기준 | 참석 투표 응답률 | 85%+ | 응답수/전체회원 |
| M1 완료 기준 | 회비 납부율 | 90%+ | 납부/전체회원 |
| M1 완료 기준 | 알림톡 도달률 | 95%+ | 발송성공/발송시도 |
| M1 완료 기준 | 총무 NPS | 40+ | 분기 서베이 |
| 앱스토어 래핑 기준 | 활성 팀 수 | 50개+ | DB 집계 |
| 앱스토어 래핑 기준 | MAU | 1,000명+ | 로그인 집계 |

---

## 기획 의사결정 요약 (변경 불가 원칙)

| 결정 | 내용 |
|------|------|
| 카톡 공존 전략 | 카톡 대체 아님. 알림톡으로 연결, 데이터는 Playground에 축적 |
| PWA 우선 | 앱 설치 장벽 원천 제거. 앱스토어는 MAU 1,000명 이후 |
| Phase 순서 불가역 | Phase 1 데이터 없이 Phase 2 불가, Phase 2 없이 Phase 3 불가 |
| 축구 우선 | Phase 1은 축구/풋살만. 멀티스포츠는 sport_type 필드로 확장 준비 |
| **데모 우선** | M-DEMO는 M1 병행 진행. 실제 고객 피드백 없이 기능 개발 우선순위 결정 불가 |

---

*최종 업데이트: 2026-03-01 (M1-C 카카오 알림톡 Lambda 스텁 / M1-D 웹 푸시 VAPID + sw.js + PushNotificationSetup / M2-D POTM 뱃지 확정 버튼 + 백엔드 finalize 엔드포인트 / M3-A 시즌 리셋 Lambda + EventBridge CRON / M3-E 주장 채팅방 자동 생성 + frontend 링크 / M4 PlayerPerformance DynamoDB + GPS 서버 저장 버튼 / M5-D 마켓 고도화 — 검색·필터·판매 모달)*
