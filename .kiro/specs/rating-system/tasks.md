# Implementation Plan: 등급/티어 시스템

## Overview

기존 playground-auth Lambda와 Next.js 프론트엔드를 확장하여 대전형/동아리형 스포츠 등급 시스템을 구현한다. 점수/등급 순수 함수를 먼저 구현하고, 매치/활동 API를 추가한 뒤, 프론트엔드 UI를 연동한다.

## Tasks

- [x] 1. 점수/등급 엔진 순수 함수 구현 (scoring.mjs)
  - [x] 1.1 `backend/auth/scoring.mjs` 파일 생성 및 순수 함수 구현
    - `calculateMatchPoints(result, winStreak)` — 참여 3점 + 승리 4 / 무승부 1 / 패배 0 + 연승 보너스
    - `calculateGoalPoints(goalCount)` — 골당 2점
    - `calculateActivityPoints()` — 고정 5점
    - `determinePlayerTier(points)` — B/S/A/SP/P 등급 결정
    - `determineTeamTier(tp)` — Rookie/Club/Crew/Elite/Legend 등급 결정
    - _Requirements: 1.1–1.7, 2.1, 3.1–3.5, 4.1–4.5, 8.5–8.7_

  - [ ]* 1.2 Property 1 테스트: 대전형 스포츠 기본 점수 산정
    - **Property 1: 연승 0일 때 승리→7, 무승부→4, 패배→3**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [ ]* 1.3 Property 2 테스트: 연승 보너스 및 초기화
    - **Property 2: 승리 시 연승 보너스 추가, 무승부/패배 시 연승 0 초기화**
    - **Validates: Requirements 1.5, 1.6, 1.7**

  - [ ]* 1.4 Property 3 테스트: 골 기록 점수 산정
    - **Property 3: goalCount * 2 반환**
    - **Validates: Requirements 2.1, 7.3**

  - [ ]* 1.5 Property 5 테스트: 개인 등급 결정
    - **Property 5: 포인트 구간별 올바른 등급 반환**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [ ]* 1.6 Property 6 테스트: 팀 등급 결정
    - **Property 6: TP 구간별 올바른 팀 등급 반환**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [ ]* 1.7 Property 10, 11, 12 테스트: 결정론, 하한, 단조 증가
    - **Property 10: 동일 입력 → 동일 결과**
    - **Property 11: 모든 경기 결과 ≥ 3점**
    - **Property 12: 포인트 증가 시 등급 하락 없음 (개인 + 팀)**
    - **Validates: Requirements 14.1, 14.2, 14.3**

- [ ] 2. Checkpoint — 점수/등급 엔진 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. 매치 서비스 API 구현 (backend/auth/index.mjs 확장)
  - [x] 3.1 DynamoDB 테이블 상수 및 import 추가
    - `MATCHES_TABLE`, `ACTIVITIES_TABLE` 상수 추가
    - `GetCommand`, `UpdateCommand`, `DeleteCommand` import 추가
    - _Requirements: 13.3, 13.4_

  - [x] 3.2 주장 권한 검증 함수 `verifyCaptain` 구현
    - clubs 테이블에서 captainEmail 비교, 불일치 시 403 반환
    - _Requirements: 6.6, 6.7, 7.4_

  - [x] 3.3 `POST /matches` — 경기 제안 생성
    - matchId(UUID), homeClubId, awayClubId, sport, date, venue, status="proposed", createdAt 저장
    - 자기 팀 제안 방지 검증
    - _Requirements: 5.1, 5.6, 13.5, 13.6_

  - [x] 3.4 `GET /matches?clubId={id}` — 팀별 매치 목록 조회
    - homeClubId-status-index, awayClubId-status-index GSI 활용
    - _Requirements: 9.1, 11.1_

  - [x] 3.5 `PUT /matches/{matchId}/accept` 및 `PUT /matches/{matchId}/decline`
    - proposed → scheduled / declined 상태 전이
    - _Requirements: 5.3, 5.5_

  - [x] 3.6 `PUT /matches/{matchId}/score` — 스코어 입력 및 확정 로직
    - 주장 검증 → 홈/어웨이 스코어 저장 → 양쪽 입력 시 일치 확인 → confirmed/disputed
    - confirmed 시 scoring.mjs 함수로 양쪽 팀 멤버 + 팀 포인트 반영 및 등급 재계산
    - ConditionExpression으로 동시 입력 방지
    - _Requirements: 6.1–6.7, 1.1–1.7, 3.6, 4.6_

  - [x] 3.7 `PUT /matches/{matchId}/goals` — 골 기록 추가
    - 주장 검증 → goals 배열에 추가 → 골 선수 개인 포인트 반영 (팀 TP 미반영)
    - _Requirements: 7.1–7.4, 2.1–2.3_

  - [ ]* 3.8 Property 7 테스트: 매치 상태 전이 정합성
    - **Property 7: 유효한 상태+액션 조합만 허용**
    - **Validates: Requirements 5.1, 5.3, 5.5, 6.1, 6.2, 6.3, 6.5**

  - [ ]* 3.9 Property 8 테스트: 주장 전용 권한 검증
    - **Property 8: captainEmail 불일치 시 거부**
    - **Validates: Requirements 6.6, 6.7, 7.4**

  - [ ]* 3.10 Property 4 테스트: 골 포인트 팀 TP 미반영
    - **Property 4: 골 포인트는 개인만, 팀 TP 불변**
    - **Validates: Requirements 2.2, 2.3**

- [x] 4. 활동 서비스 API 구현 (backend/auth/index.mjs 확장)
  - [x] 4.1 `POST /activities` — 활동 일정 제안
    - activityId(UUID), clubId, sport, date, venue, createdBy, participants=[], status="open", createdAt 저장
    - _Requirements: 8.1, 8.2_

  - [x] 4.2 `GET /activities?clubId={id}` — 팀별 활동 목록 조회
    - clubId-status-index GSI 활용
    - _Requirements: 8.1_

  - [x] 4.3 `PUT /activities/{activityId}/join` — 활동 참가
    - participants 배열에 이메일 추가, 중복 참가 방지
    - _Requirements: 8.3_

  - [x] 4.4 `PUT /activities/{activityId}/complete` — 활동 완료
    - 제안자 검증 → status="completed" → 참가자 전원 개인 5점 + 팀 TP 5점 반영 → 등급 재계산
    - 연승 보너스 미적용
    - _Requirements: 8.4–8.7_

  - [ ]* 4.5 Property 9 테스트: 동아리형 활동 완료 점수
    - **Property 9: 참가자 개인 5점, 팀 TP 5점, 연승 보너스 없음**
    - **Validates: Requirements 8.5, 8.6, 8.7**

  - [ ]* 4.6 Property 13, 14 테스트: 매치/활동 레코드 필수 필드 완전성
    - **Property 13: 매치 레코드 필수 필드 존재**
    - **Property 14: 활동 레코드 필수 필드 존재**
    - **Validates: Requirements 5.6, 8.2**

- [ ] 5. Checkpoint — 백엔드 API 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. RatingBadge 공통 컴포넌트 구현
  - [x] 6.1 `frontend/playground-web/components/RatingBadge.tsx` 생성
    - 개인 등급(B/S/A/SP/P) 및 팀 등급(Rookie/Club/Crew/Elite/Legend) 뱃지 렌더링
    - type="player" | "team", size="sm" | "md" | "lg" props
    - 등급별 색상 매핑 (설계 문서 참조)
    - _Requirements: 10.1–10.5_

- [x] 7. 팀 관리 페이지 (/team) 확장
  - [x] 7.1 팀 등급 뱃지 및 멤버 등급 뱃지 표시
    - 팀 정보 영역에 RatingBadge(type="team") 추가
    - 멤버 목록에 각 멤버의 RatingBadge(type="player") 추가
    - _Requirements: 10.2, 10.3_

  - [x] 7.2 경기 제안 섹션 구현
    - 해당 팀이 awayClubId인 proposed 매치 목록 조회 및 표시
    - 수락/거절 버튼 → `PUT /matches/{id}/accept` 또는 `/decline` 호출
    - _Requirements: 11.1–11.4_

  - [x] 7.3 최근 경기 기록 섹션 구현
    - confirmed 매치 목록 최신순 조회 및 표시 (상대팀, 스코어, 결과, 날짜)
    - 골 기록 존재 시 골 선수 목록 표시
    - "골 기록 추가" 버튼 → 팀 멤버 선택 모달 → `PUT /matches/{id}/goals` 호출
    - _Requirements: 9.1–9.4, 7.1, 7.2_

  - [x] 7.4 활동 일정 섹션 구현 (동아리형 스포츠)
    - 동아리형 스포츠일 때만 표시
    - 활동 제안 폼 → `POST /activities`
    - 활동 목록 조회 → 참가 버튼 → `PUT /activities/{id}/join`
    - 완료 버튼 (제안자만) → `PUT /activities/{id}/complete`
    - _Requirements: 8.1–8.6_

  - [x] 7.5 멤버 1:1 채팅 버튼 추가
    - 멤버 목록에 채팅 아이콘 버튼 → `/chat` 페이지로 이동
    - _Requirements: 12.1, 12.2_

- [x] 8. 클럽 탐색 페이지 (/clubs) 확장
  - [x] 8.1 클럽 카드에 팀 등급 뱃지 추가
    - 기존 클럽 카드 UI에 RatingBadge(type="team") 오버레이
    - _Requirements: 10.4_

  - [x] 8.2 경기 제안 버튼을 실제 매치 API 연동
    - 기존 더미 제안 로직을 `POST /matches` API 호출로 교체
    - _Requirements: 5.1, 5.2_

- [x] 9. 마이페이지 (/mypage) 확장
  - [x] 9.1 종목별 개인 등급 뱃지 섹션 추가
    - user.ratings 데이터 기반 종목별 RatingBadge(type="player") 표시
    - 포인트, 경기 수, 승률 등 부가 정보 표시
    - _Requirements: 10.1, 10.5_

- [ ] 10. Final checkpoint — 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있음
- 각 태스크는 추적을 위해 특정 요구사항을 참조함
- 체크포인트에서 점진적 검증 수행
- 속성 테스트는 fast-check 라이브러리 사용 (backend/auth/package.json에 devDependencies 추가 필요)
- 점수/등급 순수 함수는 `backend/auth/scoring.mjs`에 분리하여 테스트 용이성 확보
