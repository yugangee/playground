# 1:1 실시간 채팅 구현 파이프라인

## 아키텍처

```
[Next.js 프론트] ←→ [API Gateway WebSocket] ←→ [Lambda] ←→ [DynamoDB]
```

## AWS 리소스

| 리소스 | 용도 |
|--------|------|
| API Gateway WebSocket API | 실시간 양방향 통신 |
| Lambda: `playground-chat-connect` | $connect 핸들러 (connectionId 저장) |
| Lambda: `playground-chat-disconnect` | $disconnect 핸들러 (connectionId 삭제) |
| Lambda: `playground-chat-send` | sendMessage 핸들러 (메시지 저장 + 상대방에게 전송) |
| Lambda: `playground-chat-history` | REST API로 채팅 히스토리 조회 |
| DynamoDB: `playground-connections` | WebSocket connectionId ↔ email 매핑 |
| DynamoDB: `playground-messages` | 채팅 메시지 저장 |

## DynamoDB 테이블 설계

### playground-connections
| Key | Type | 설명 |
|-----|------|------|
| connectionId (PK) | String | WebSocket connection ID |
| email | String | 로그인한 유저 이메일 |
| connectedAt | String | 접속 시간 |

- GSI: `email-index` (email → connectionId 조회용)

### playground-messages
| Key | Type | 설명 |
|-----|------|------|
| roomId (PK) | String | 채팅방 ID (두 이메일 정렬 후 합침) |
| timestamp (SK) | String | ISO 타임스탬프 |
| senderEmail | String | 보낸 사람 |
| receiverEmail | String | 받는 사람 |
| message | String | 메시지 내용 |
| read | Boolean | 읽음 여부 |

- roomId 생성 규칙: `[emailA, emailB].sort().join('#')`
- 이렇게 하면 A→B, B→A 모두 같은 roomId

## Lambda 핸들러 흐름

### $connect
1. query string에서 token 받기 (`?token=xxx`)
2. Cognito GetUser로 email 확인
3. `playground-connections`에 `{ connectionId, email }` 저장

### $disconnect
1. `playground-connections`에서 connectionId 삭제

### sendMessage (action: "sendMessage")
1. body에서 `{ receiverEmail, message }` 파싱
2. connectionId로 senderEmail 조회
3. roomId 생성
4. `playground-messages`에 메시지 저장
5. receiverEmail의 connectionId를 GSI로 조회
6. 상대방이 접속 중이면 `ApiGatewayManagementApi.postToConnection()`으로 실시간 전송
7. 발신자에게도 확인 메시지 전송

### 채팅 히스토리 (REST API)
- `GET /chat/history?with=상대이메일`
- roomId 계산 후 `playground-messages` Query (SK 내림차순, limit 50)

## 프론트엔드 구현

### WebSocket 연결
```typescript
// context/ChatSocketContext.tsx
const ws = new WebSocket(`wss://{websocket-api-id}.execute-api.us-east-1.amazonaws.com/prod?token=${accessToken}`);
ws.onmessage = (event) => { /* 수신 메시지 처리 */ };
```

### 메시지 전송
```typescript
ws.send(JSON.stringify({
  action: "sendMessage",
  receiverEmail: "상대방@email.com",
  message: "안녕하세요"
}));
```

### 채팅 페이지 (`/chat`)
- 좌측: 채팅 목록 (최근 대화 상대)
- 우측: 채팅창 (메시지 목록 + 입력)
- 페이지 진입 시 REST로 히스토리 로드
- WebSocket으로 실시간 수신

## 구현 순서

### Phase 1: 백엔드 (15~20분)
1. DynamoDB 테이블 2개 생성 (connections, messages)
2. Lambda 함수 3개 작성 (connect, disconnect, send)
3. API Gateway WebSocket API 생성 + 라우트 연결
4. REST API에 `/chat/history` 엔드포인트 추가
5. 배포 + 테스트

### Phase 2: 프론트엔드 (15~20분)
1. `ChatSocketContext` 생성 (WebSocket 연결 관리)
2. `/chat` 페이지 리뉴얼 (실제 데이터 연동)
3. 채팅 목록 + 채팅창 UI
4. 메시지 전송/수신 연동
5. 읽음 표시, 알림 뱃지 등

### Phase 3: 부가 기능 (선택)
- 읽음 처리 (상대방이 읽으면 체크 표시)
- 안 읽은 메시지 카운트 (사이드바 뱃지)
- 이미지 전송 (S3 presigned URL 활용)
- 팀 관리 페이지 경기 제안 → 채팅 연동

## 비용
- API Gateway WebSocket: 100만 메시지당 $1
- Lambda: 기존과 동일 (프리티어 범위)
- DynamoDB: 기존과 동일 (온디맨드)
- 소규모 사용 시 거의 무료
