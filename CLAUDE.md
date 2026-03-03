# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PLAYGROUND** — Amateur sports platform (아마추어 스포츠의 프로 경험). Features team/club management, match tracking, a rating/tier system, real-time chat (WebSocket), AI video analysis, and an equipment marketplace.

## Repository Structure

```
sedaily-playground/
├── frontend/playground-web/   # Next.js 16 web app (main work area)
├── backend/
│   ├── auth/                  # Auth Lambda (index.mjs, scoring.mjs) — manually deployed
│   ├── chat/                  # WebSocket chat Lambda
│   ├── functions/             # CDK-managed Lambdas (team, finance, league, schedule, notifications, reminder, seasonReset)
│   └── infra/                 # AWS CDK stack definition (cdk.json lives here)
└── docs: README.md, PROGRESS.md, DEPLOY.md, CHAT-PIPELINE.md, RATING-SYSTEM.md, VIDEO-ANALYSIS.md
```

## Frontend Commands

```bash
cd frontend/playground-web

npm run dev      # Dev server → http://127.0.0.1:3000
npm run build    # Static export → ./out/
npm run lint     # ESLint check
npm run deploy   # Build + sync to S3 + invalidate CloudFront (Linux/Mac)
npm run deploy:win  # Same for Windows
```

## Backend Commands

```bash
# CDK stack (cdk.json is in backend/infra — must run from there)
cd backend/infra
npx cdk deploy   # Deploy CDK PlaygroundStack to AWS
npx cdk destroy  # Tear down AWS stack

# Auth Lambda (manually deployed — NOT managed by CDK)
cd backend/auth
zip -r function.zip .
aws lambda update-function-code --function-name playground-auth --zip-file fileb://function.zip

# Build all TypeScript functions
cd backend
npm run build    # TypeScript → dist/
```

## Frontend Architecture

- **Framework:** Next.js 16 with App Router, configured for **static export** (`output: 'export'`). No SSR — all pages are pre-rendered HTML.
- **Styling:** Tailwind CSS 4 + Radix UI primitives (shadcn-style, configured in `components.json`)
- **State:** React Context providers in `context/` — `AuthContext`, `ChatContext`, `ClubContext`, `TeamContext`, `ThemeContext`
- **API calls:**
  - `lib/manageFetch.ts` — wraps fetch for the **Manage API** (CDK stack); uses idToken; includes 401 auto-refresh + retry
  - `lib/tokenRefresh.ts` — shared token utilities: `tryRefreshTokens()` (singleton pattern), `clearTokens()`, `isTokenExpiredOrNearExpiry()`
  - `lib/useWebSocket.ts` — manages WebSocket lifecycle for real-time chat
- **Path alias:** `@/` maps to the `frontend/playground-web/` root

## Backend Architecture

- **Compute:** AWS Lambda (Node.js) + one EC2 FastAPI server for video analysis
- **Auth:** AWS Cognito + custom Lambda (`backend/auth/index.mjs`) — handles signup, login, profile, ratings, token refresh
- **Database:** DynamoDB — Auth API tables: `playground-users`, `playground-clubs`, `playground-matches`, `playground-activities`, `playground-chat-messages`, `playground-ws-connections`; CDK tables: `pg-teams`, `pg-leagues`, `pg-finance`, `pg-dues`, `pg-fines`, and ~20 others
- **Real-time chat:** API Gateway WebSocket → `backend/chat/index.mjs`; three room types: Team, Match Captain, 1:1 DM
- **Infrastructure as Code:** AWS CDK in `backend/infra/` — `playground-stack.ts` defines all resources (7 Lambda functions, ~24 DynamoDB tables, API Gateway, EventBridge rules)
- **Video Analysis:** EC2 FastAPI (`backend/ec2-api.py`) with YOLO-based detection; async job processing polled by frontend; results stored in S3

## Production Endpoints

| Resource | Value |
|---|---|
| Auth API (`NEXT_PUBLIC_API_URL`) | `https://ayeyr9vgsc.execute-api.us-east-1.amazonaws.com/prod` |
| Manage API (`NEXT_PUBLIC_MANAGE_API_URL`) | `https://91iv3etr0h.execute-api.us-east-1.amazonaws.com/prod` |
| WebSocket | `wss://s2b7iclwcj.execute-api.us-east-1.amazonaws.com/prod` |
| Frontend | `fun.sedaily.ai` → S3 bucket `playground-web-sedaily-us` via CloudFront `E1U8HJ0871GR0O` |

**두 API의 역할 구분:**
- **Auth API** (`ayeyr9vgsc`): `/auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/me`, `/clubs`, `/matches`, `/activities` — 수동 배포된 별도 Lambda
- **Manage API** (`91iv3etr0h`, CDK PlaygroundStack): `/team`, `/finance`, `/league`, `/schedule`, `/social`, `/discover` — CDK로 관리
- **Cognito Pool**: `us-east-1_dolZhFZDJ` — 두 API 모두 이 풀 사용

## Token / Auth Flow

**Critical distinction — two token types:**
- **accessToken**: Used for Auth Lambda calls (`/auth/me`, `/clubs`, etc.) — Lambda reads it via `GetUserCommand`
- **idToken**: Required for Manage API calls — `CognitoUserPoolsAuthorizer` (REST) only propagates claims (including `claims.sub`) from **ID tokens** to Lambda via `event.requestContext.authorizer.claims`. Using an Access token here silently drops claims and causes Lambda to return 401.

**Token refresh flow:**
1. `tokenRefresh.ts` → POST `/auth/refresh` with refreshToken → Cognito `REFRESH_TOKEN_AUTH` → new accessToken + idToken
2. Both `manageFetch` and `authFetch` (in `team/page.tsx`) implement 401 → refresh → retry pattern
3. `AuthContext` checks expiry on mount and every 30 minutes (5-minute buffer before actual expiry)

**localStorage keys:** `accessToken`, `idToken`, `refreshToken`

## Key Domain Logic

**Rating/Tier System** (`backend/auth/scoring.mjs`):
- Player tiers: B → S → A → SP → P
- Team tiers: Rookie → Club → Crew → Elite → Legend
- Points: win +4, draw +1, loss +0, base per match +3, goal +2, activity +5
- Win streaks add bonus points (+1/+2/+3 for 2x/3x/4x)

**Match lifecycle:** `proposed → scheduled → homeSubmitted/awaySubmitted → bothSubmitted/disputed → confirmed`

**Scheduled backend jobs** (EventBridge):
- `playground-reminder` Lambda — hourly check for D-2/D-1/same-day match reminders
- `playground-season-reset` Lambda — Dec 31 15:00 UTC (= Jan 1 KST) with 50% point decay

## Deployment Notes

- **S3 sync**: Always use `--exclude "uploads/*"` to preserve user-uploaded files (see `DEPLOY.md`)
- **CDK deploy**: Run `npx cdk deploy` from `backend/infra/` (not `backend/`). DynamoDB does not allow adding more than one GSI in a single CloudFormation update — if adding multiple GSIs, deploy in separate steps.
- **Auth Lambda**: Not in CDK — deploy manually via `aws lambda update-function-code`

## TypeScript Config Notes

- Frontend: `strict: true`, path alias `@/*`, targets ES2017
- Backend: `strict: true`, outputs to `dist/`, targets ES2020
- Next.js build ignores TypeScript and ESLint errors (`ignoreBuildErrors: true` in `next.config.ts`) — don't rely on build failures; run `npm run lint` explicitly
