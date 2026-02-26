# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PLAYGROUND** — Amateur sports platform (아마추어 스포츠의 프로 경험). Features team/club management, match tracking, a rating/tier system, real-time chat (WebSocket), AI video analysis, and an equipment marketplace.

## Repository Structure

```
sedaily-playground/
├── frontend/playground-web/   # Next.js 16 web app (main work area)
├── backend/
│   ├── auth/                  # Auth Lambda (index.mjs, scoring.mjs)
│   ├── chat/                  # WebSocket chat Lambda
│   ├── functions/             # CDK-generated Lambdas (team, finance, league, etc.)
│   └── infra/                 # AWS CDK stack definition
└── docs: README.md, PROGRESS.md, DEPLOY.md, CHAT-PIPELINE.md, RATING-SYSTEM.md, VIDEO-ANALYSIS.md
```

## Frontend Commands

```bash
cd frontend/playground-web

npm run dev      # Dev server → http://127.0.0.1:3000
npm run build    # Static export → ./out/
npm run lint     # ESLint check
npm run deploy   # Build + sync to S3 + invalidate CloudFront (Linux)
npm run deploy:win  # Same for Windows
```

## Backend Commands

```bash
cd backend

npm run build    # TypeScript → dist/
npm run deploy   # Deploy CDK stack to AWS
npm run destroy  # Tear down AWS stack
```

## Frontend Architecture

- **Framework:** Next.js 16 with App Router, configured for **static export** (`output: 'export'`). No server-side rendering — all pages are pre-rendered HTML.
- **Styling:** Tailwind CSS 4 + Radix UI primitives (shadcn-style, configured in `components.json`)
- **State:** React Context providers in `context/` — `AuthContext`, `ChatContext`, `ClubContext`, `TeamContext`, `ThemeContext`
- **API calls:** `lib/manageFetch.ts` wraps fetch with auth headers; `lib/useWebSocket.ts` manages WebSocket lifecycle
- **Path alias:** `@/` maps to the `frontend/playground-web/` root

## Backend Architecture

- **Compute:** AWS Lambda (Node.js, `.mjs` files) + one EC2 FastAPI server for video analysis
- **Auth:** AWS Cognito + custom Lambda (`backend/auth/index.mjs`, 807 lines) — handles signup, login, profile, ratings
- **Database:** DynamoDB with tables: `playground-users`, `playground-clubs`, `playground-matches`, `playground-activities`, `playground-chat-messages`, `playground-ws-connections`
- **Real-time chat:** API Gateway WebSocket → `backend/chat/index.mjs`; three room types: Team, Match Captain, 1:1 DM
- **Infrastructure as Code:** AWS CDK in `backend/infra/` — `playground-stack.ts` defines all resources
- **Video Analysis:** EC2 FastAPI (`backend/ec2-api.py`) with YOLO-based detection; async job processing polled by frontend; results stored in S3

## Production Endpoints

| Resource | Value |
|---|---|
| REST API | `https://ayeyr9vgsc.execute-api.us-east-1.amazonaws.com/prod` |
| WebSocket | `wss://s2b7iclwcj.execute-api.us-east-1.amazonaws.com/prod` |
| Frontend | `fun.sedaily.ai` → S3 bucket `playground-web-sedaily-us` via CloudFront |

## Key Domain Logic

**Rating/Tier System** (`backend/auth/scoring.mjs`):
- Player tiers: B → S → A → SP → P
- Team tiers: Rookie → Club → Crew → Elite → Legend
- Points: win +4, draw +1, loss +0, base per match +3, goal +2, activity +5
- Win streaks add bonus points (+1/+2/+3 for 2x/3x/4x)

**Deployment Note:** When syncing to S3, always use `--exclude "uploads/*"` to preserve user-uploaded files (see `DEPLOY.md`).

## TypeScript Config Notes

- Frontend: `strict: true`, path alias `@/*`, targets ES2017
- Backend: `strict: true`, outputs to `dist/`, targets ES2020
- Next.js build ignores TypeScript and ESLint errors (`ignoreBuildErrors: true` in `next.config.ts`) — don't rely on build failures to catch errors; run `npm run lint` explicitly
