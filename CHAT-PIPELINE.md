# 실시간 채팅 AWS 세팅 가이드

## 1. DynamoDB 테이블 생성

### playground-ws-connections
- Partition Key: `connectionId` (String)
- GSI: `roomId-index` → Partition Key: `roomId` (String)

### playground-chat-messages
- Partition Key: `roomId` (String)
- Sort Key: `messageId` (String)

## 2. Lambda 함수 생성

함수명: `playground-chat-ws`
- Runtime: Node.js 22.x
- Handler: index.handler
- 코드: `backend/chat/` 폴더를 zip으로 업로드
- IAM 역할에 추가 권한:
  - `dynamodb:PutItem`, `DeleteItem`, `Query` (두 테이블)
  - `execute-api:ManageConnections` (WebSocket API)

```bash
cd backend/chat
npm install
zip -r chat-ws.zip index.mjs node_modules package.json
aws lambda create-function \
  --function-name playground-chat-ws \
  --runtime nodejs22.x \
  --handler index.handler \
  --zip-file fileb://chat-ws.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/YOUR_LAMBDA_ROLE \
  --region us-east-1
```

## 3. API Gateway WebSocket API 생성

AWS 콘솔 > API Gateway > WebSocket API 생성:
- API 이름: `playground-chat`
- Route selection expression: `$request.body.action`
- Routes:
  - `$connect` → Lambda: playground-chat-ws
  - `$disconnect` → Lambda: playground-chat-ws
  - `sendMessage` → Lambda: playground-chat-ws
  - `getHistory` → Lambda: playground-chat-ws
- Deploy → Stage: `prod`

결과 URL: `wss://XXXXXX.execute-api.us-east-1.amazonaws.com/prod`

## 4. 프론트엔드 .env.local에 추가

```
NEXT_PUBLIC_WS_URL=wss://XXXXXX.execute-api.us-east-1.amazonaws.com/prod
```
