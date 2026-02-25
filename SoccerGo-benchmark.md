```markdown
# 📱 Chukgu-Go (축구고) App UI & Feature Benchmark

## 1. Overview
- **App Name:** 축구고 (Chukgu-Go)
- **Target Audience:** 아마추어 축구/풋살 팀 관리자(주장/총무) 및 일반 팀원
- **Core Value Proposition:** 
  1) 경기 전-중-후로 이어지는 **끊김 없는(Seamless) 팀 관리 로직**
  2) 스마트폰/스마트워치 GPS를 활용한 **프로 수준의 개인 퍼포먼스 분석 (게이미피케이션)**

---

## 2. Information Architecture (IA) & UI Structure

AI 개발 툴이 화면(Screen)을 스캐폴딩(Scaffolding)할 때 참고할 핵심 탭/스크린 구조.

### 📍 Tab 1: 홈 / 캘린더 (Home & Schedule)
- **UI Components:**
  - 월간/주간 캘린더 뷰 (내 경기 및 팀 경기 통합 노출)
  - 다가오는 경기 카드 (D-Day, 장소, 시간, 상대팀)
  - **경기 투표 현황 위젯:** [참석 / 불참 / 미정] 프로그레스 바 및 미투표자 리스트
- **Actions:**
  - `CreateMatchButton`: 경기 일정 등록 (팀 내 청백전 / 외부 상대팀 경기)
  - `VoteButton`: 터치 한 번으로 참석/불참 상태 변경

### 📍 Tab 2: 라이브 매치 / 출석 (Live Match)
- **UI Components:**
  - **QR/빠른 체크인 패널:** 경기장 도착 시 출석 체크용 UI (도착 순서대로 등번호/임시번호 부여)
  - **전술 보드 (Tactics Board):** 쿼터별(1Q~4Q) 포메이션 드래그 앤 드롭 배치 (스타팅 멤버, 교체 멤버 시각화)
  - **실시간 스코어보드 & 기록 컨트롤러:** - `+ Goal` 버튼 ➔ 득점자 선택 모달 ➔ 어시스트 선택 모달
- **Actions:**
  - GPS 트래킹 시작/종료 토글 (스마트워치 연동)
  - 용병(Guest) 임시 출석 및 명단 추가

### 📍 Tab 3: 분석 및 기록 (Analytics & Stats)
- **UI Components:**
  - **GPS 히트맵 뷰어:** 2D 축구장 그래픽 위에 유저의 활동 반경을 컬러 히트맵으로 렌더링
  - **개인 퍼포먼스 대시보드:** - 속도 구간별 파이 차트 (걷기/조깅/달리기/스프린트)
    - 수치 데이터 텍스트 (총 이동 거리, 최고 속도, 스프린트 횟수)
  - **2D 필드 리플레이어:** 경기 중 움직임 궤적을 애니메이션으로 재생
  - **POTM (Player Of The Match) 투표 UI:** 경기 종료 후 팝업되는 팀원 투표 화면

### 📍 Tab 4: 팀 및 개인 관리 (Team & Profile)
- **UI Components:**
  - **팀 리더보드 (랭킹):** 기간별 득점왕, 어시스트왕, 출석왕, POTM 순위표 (List/Card UI)
  - 초대 코드 및 QR 생성기 (팀원 영입용)
  - 멤버 권한 관리 리스트 (관리자, 일반, 대기 상태 등)

---

## 3. Core User Flows (서비스 기능 흐름)

`PLAYGROUND`의 로직 구현 시 참고할 3단계 시간 흐름별 유저 시나리오.

### Flow A: 경기 전 (Pre-Match)
1. **관리자:** 경기 생성 (시간, 구장, 상대팀 입력) ➔ 팀 전체 Push Notification 발송.
2. **팀원:** 푸시 클릭 ➔ 홈 탭에서 참석/불참 버튼 탭.
3. **관리자:** 미투표자 목록 확인 ➔ 독촉 알림 발송.

### Flow B: 경기 당일 (Match Day) - **Key Differentiation**
1. **출석:** 구장 도착 ➔ 앱 열고 '빠른 체크인' ➔ 도착 순서 기반으로 번호표 자동 발급 (출석 인증).
2. **라인업:** 관리자가 쿼터별 포지션 배정 ➔ 팀원 앱에 실시간 동기화.
3. **플레이 (GPS):** 팀원이 '활동 기록 시작' 탭 ➔ 백그라운드 위치 추적 시작.
4. **스코어링:** 골 발생 시 관리자가 앱에서 득점자/도움자 즉시 태깅 ➔ 실시간 스코어보드 업데이트.

### Flow C: 경기 후 (Post-Match)
1. **투표:** 경기 종료 처리 ➔ 전 팀원에게 '오늘의 MVP(POTM)를 뽑아주세요' 모달 노출.
2. **결과:** 실시간 투표 집계 후 1위에게 POTM 뱃지 부여.
3. **데이터 동기화:** GPS 데이터가 서버로 전송되어 개별 히트맵 생성, 팀 랭킹 자동 업데이트.

---

## 4. AI 개발 툴을 위한 Database Schema & Data Model 아이디어

(참고: AWS DynamoDB 또는 NoSQL 환경에서 '축구고' 기능을 구현하기 위한 JSON 형태의 엔티티 구조 제안)

### Match Entity (경기)
```json
{
  "matchId": "string",
  "teamId": "string",
  "matchDate": "timestamp",
  "location": "string",
  "status": "SCHEDULED | LIVE | COMPLETED",
  "attendance": {
    "votedAttend": ["userId1", "userId2"],
    "votedAbsent": ["userId3"],
    "checkedIn": [
      { "userId": "userId1", "checkInTime": "timestamp", "order": 1 }
    ]
  },
  "quarters": [
    {
      "quarterNumber": 1,
      "lineup": [{ "userId": "string", "position": "FW", "x_coord": 50, "y_coord": 80 }]
    }
  ],
  "events": [
    {
      "eventId": "string",
      "type": "GOAL",
      "quarter": 1,
      "scorerId": "userId1",
      "assistId": "userId2",
      "timestamp": "timestamp"
    }
  ]
}

```

### PlayerPerformance Entity (개인 활동 분석)

```json
{
  "performanceId": "string",
  "matchId": "string",
  "userId": "string",
  "gpsData": [
    { "lat": 37.5665, "lng": 126.9780, "timestamp": "timestamp", "speed": 15.2 }
  ],
  "metrics": {
    "totalDistanceKm": 6.5,
    "topSpeedKmh": 28.4,
    "sprintCount": 12,
    "speedZones": {
      "walkTimeSec": 1200,
      "jogTimeSec": 1800,
      "runTimeSec": 600,
      "sprintTimeSec": 100
    }
  },
  "potmVotesReceived": 4
}

```

## 5. UI/UX 벤치마크 적용 시 주의사항 (PLAYGROUND 개발팀)

* **권한 분리 (RBAC):** '관리자' 화면(라인업 배치, 스코어 기록, 출석 관리)과 '선수' 화면(투표, 내 통계, 히트맵)의 UI 복잡도를 완벽히 분리할 것. 일반 선수는 보는 뷰(View) 위주로 심플하게 구성해야 함.
* **오프라인/캐싱 대응:** 경기장(구장)은 네트워크가 불안정할 수 있으므로, 라인업 저장이나 스코어 기록 시 React Native(Expo)의 Local Storage / AsyncStorage를 활용한 Optimistic UI 업데이트가 필수적임.

```
***

이 마크다운 파일은 Cursor, GitHub Copilot Chat, 혹은 ChatGPT 등에 **"이 벤치마킹 문서를 기반으로 React Native Expo 화면을 만들어줘"** 혹은 **"이 흐름에 맞춰서 DynamoDB 테이블 스키마를 구성해 줘"**라고 요청할 때 완벽한 가이드라인 역할을 할 것입니다!

```