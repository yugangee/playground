# WORK-LOG: 기능 버그 수정 작업 기록

## 개요
클럽 탐색, 리그 탐색, 선수 탐색, 일정, 팀 관리 페이지의 기능 버그 수정.
총 19개 버그 (Critical 6, High 13).

## 버그 목록

| ID | 심각도 | 페이지 | 설명 | 상태 |
|----|--------|--------|------|------|
| C1 | Critical | 일정 | "다가오는 일정"이 mock 데이터만 표시 | ✅ 완료 |
| C2 | Critical | 일정 | `user.userId` undefined (user.username 사용해야) | ✅ 완료 |
| C3 | Critical | 일정 | PollCard에서 존재하지 않는 `currentTeam.members` 접근 | ✅ 완료 |
| C4 | Critical | 팀 | 출석 버튼이 로컬 state만 변경, API 미호출 | ✅ 완료 |
| C5 | Critical | 팀 | 멤버 이름이 UUID로 표시 | ✅ 완료 |
| C6 | Critical | 백엔드 | 초대 링크 도메인 `pg.sedaily.ai` → `fun.sedaily.ai` | ✅ 완료 |
| H1 | High | 클럽 탐색 | 지역 필터 3개만 하드코딩 | ✅ 완료 |
| H2 | High | 클럽 탐색 | Manage API 팀 recruiting 항상 false | ✅ 완료 |
| H3 | High | 클럽 탐색 | 클럽 생성 시 recruiting 미설정 | ✅ 완료 |
| H4 | High | 리그 관리 | 팀 ID가 UUID로 표시 | ✅ 완료 |
| H5 | High | 리그 백엔드 | DELETE league가 matches 미삭제 | ✅ 완료 |
| H6 | High | 리그 백엔드 | 팀 제거에 주최자 권한 체크 없음 | ✅ 완료 |
| H7 | High | 팀 관리 | isLeader가 잘못된 팀 기준 | ✅ 완료 |
| H8 | High | 팀 | roles 배열 vs role 문자열 불일치 | ✅ 완료 |
| H9 | High | 팀 | 로그인 유저에게 mock 데이터 표시 | ✅ 완료 |
| H10 | High | 선수 탐색 | 카드 cursor-pointer인데 클릭 불가 | ✅ 완료 |
| H11 | High | 마이페이지 | 이름 변경 후 AuthContext 미갱신 | ✅ 완료 |
| H12 | High | 일정 관리 | 삭제 버튼 없음 | ✅ 완료 |
| H13 | High | 일정 | 필터 버튼 onClick 없음 | ✅ 완료 |

## 작업 기록

### 2026-03-09
- 전체 코드 분석 및 버그 식별 완료
- 작업 계획 수립
- **Phase 1 완료** (C1, C2, C3, H12, H13): 일정 페이지 mock 데이터 제거, userId→username, PollCard isLeader 수정, 삭제 버튼 추가, 죽은 필터 버튼 제거
- **Phase 2 완료** (C4, C5, H8, H9): 출석 API 연동, 멤버 이름 해결(Auth API), role/roles 통일, mock 경기 데이터 제거
- **Phase 3 완료** (H1, H2, H3): 17개 시도 지역 필터, recruiting 상태 정확히 반영, 클럽 생성 시 recruiting:true
- **Phase 4 완료** (H4, H5, H6, H7): 리그 팀명 표시, 리그 삭제 시 매치 cascade 삭제, 팀 제거 권한 체크, 선택 팀 기준 isLeader
- **Phase 5 완료** (H10, C6, H11): 선수 카드 cursor 제거, 초대 링크 도메인 수정, 마이페이지 이름 변경 후 context 갱신
- **빌드 검증 통과** — 43개 페이지 전부 정상 빌드
