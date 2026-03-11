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
└── docs/                      # README.md, PROGRESS.md, DEPLOY.md, CHAT-PIPELINE.md, RATING-SYSTEM.md, VIDEO-ANALYSIS.md, DB-CONNECTIONS.md
```

## Frontend Commands

```bash
cd frontend/playground-web

npm run dev      # Dev server → http://127.0.0.1:3000
npm run build    # Static export → ./out/
npm run lint     # ESLint check (React Compiler rules enabled)
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
  - `lib/useWebSocket.ts` — manages WebSocket lifecycle for real-time chat; uses ref-sync pattern (optionsRef/connectRef updated in useEffect, not during render)
  - `app/team/page.tsx` defines a local `authFetch()` — wraps fetch for the **Auth API**; uses accessToken; same 401 → refresh → retry pattern
- **Path alias:** `@/` maps to the `frontend/playground-web/` root
- **React Compiler** is enabled — ESLint enforces `react-hooks/refs` (no ref access during render), `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`

## Dual API System — Critical Architecture

The project uses **two separate APIs** that share one Cognito pool but serve different data:

| | Auth API (`ayeyr9vgsc`) | Manage API (`91iv3etr0h`) |
|---|---|---|
| **Deployment** | Manual (zip + aws cli) | CDK (`npx cdk deploy`) |
| **Token** | `accessToken` | `idToken` (CognitoUserPoolsAuthorizer) |
| **Fetch wrapper** | `authFetch()` in team/page.tsx | `manageFetch()` in lib/manageFetch.ts |
| **Endpoints** | `/auth/*`, `/clubs`, `/matches`, `/activities`, `/join-requests`, `/users` | `/team`, `/finance`, `/league`, `/schedule`, `/social`, `/discover`, `/notifications` |
| **Tables** | `playground-*` (users, clubs, matches, activities, chat-messages, ws-connections) | `pg-*` (~24 tables: teams, leagues, finance, dues, fines, etc.) |

**Club ↔ Team data mapping:** Auth API "clubs" and Manage API "teams" represent the same real-world entity. `TeamContext` converts club data from Auth API into the Team interface. When both APIs return data for the same entity, the frontend merges them (see `team/page.tsx` and `team/matches/page.tsx`).

## Token / Auth Flow

**Critical distinction — two token types:**
- **accessToken**: Used for Auth Lambda calls (`/auth/me`, `/clubs`, etc.) — Lambda reads it via `GetUserCommand`
- **idToken**: Required for Manage API calls — `CognitoUserPoolsAuthorizer` (REST) only propagates claims (including `claims.sub`) from **ID tokens** to Lambda via `event.requestContext.authorizer.claims`. Using an Access token here silently drops claims and causes Lambda to return 401.

**Token refresh flow:**
1. `tokenRefresh.ts` → POST `/auth/refresh` with refreshToken → Cognito `REFRESH_TOKEN_AUTH` → new accessToken + idToken
2. Both `manageFetch` and `authFetch` implement 401 → refresh → retry pattern
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

## Production Endpoints

| Resource | Value |
|---|---|
| Auth API (`NEXT_PUBLIC_API_URL`) | `https://ayeyr9vgsc.execute-api.us-east-1.amazonaws.com/prod` |
| Manage API (`NEXT_PUBLIC_MANAGE_API_URL`) | `https://91iv3etr0h.execute-api.us-east-1.amazonaws.com/prod` |
| WebSocket | `wss://s2b7iclwcj.execute-api.us-east-1.amazonaws.com/prod` |
| Frontend | `fun.sedaily.ai` → S3 bucket `playground-web-sedaily-us` via CloudFront `E1U8HJ0871GR0O` |
| Cognito Pool | `us-east-1_dolZhFZDJ` (both APIs use this pool) |

## Important Gotchas

- **Hooks before early returns:** `TeamPageContent` in `team/page.tsx` has an `if (!club) return` guard. All `useState`/`useEffect` must be declared **before** this guard or React will crash when hook count changes between renders.
- **No ref access during render:** React Compiler enforces this. Use `useEffect` to sync refs (see `useWebSocket.ts` pattern: `optionsRef.current` assigned inside `useEffect`, not in the render body).
- **No impure functions during render:** `Math.random()`, `Date.now()`, etc. in render bodies cause different values on each re-render. Use `useMemo` or deterministic seed-based values.
- **Build ignores errors:** `ignoreBuildErrors: true` in `next.config.ts` means the build will pass even with TypeScript/ESLint errors. Always run `npm run lint` explicitly.
- **CDK GSI limit:** DynamoDB does not allow adding more than one GSI in a single CloudFormation update — deploy GSI additions in separate steps.
- **S3 deploy exclusion:** Always use `--exclude "uploads/*"` when syncing to S3 to preserve user-uploaded files.

## Deployment Notes

- **Frontend:** `npm run deploy` from `frontend/playground-web/` — builds, syncs to S3, invalidates CloudFront
- **CDK stack:** `npx cdk deploy` from `backend/infra/` (not `backend/`)
- **Auth Lambda:** Not in CDK — deploy manually via `aws lambda update-function-code`

## TypeScript Config Notes

- Frontend: `strict: true`, path alias `@/*`, targets ES2017
- Backend: `strict: true`, outputs to `dist/`, targets ES2020
