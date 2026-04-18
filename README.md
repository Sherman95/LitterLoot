# LitterLoot

LitterLoot is an AI + Web3 clean-to-earn platform where users document real-world cleanup work, get it verified by an AI auditor, and receive micro-rewards on Solana Devnet.

This MVP turns environmental action into a fast, measurable, and motivating feedback loop.

## Earth Day Post Draft

### LitterLoot: Healing the Earth, One Micro-Bounty at a Time (AI + Web3)

#### The Philosophy: Why We Need a Paradigm Shift

Look out your window. Walk down your street. Despite decades of Earth Day campaigns and awareness programs, the tragedy of the commons persists. We say we care, yet we still step over litter in our own neighborhoods.

Why? Because human psychology is stubborn. Guilt does not scale. Awareness does not clean streets. Incentives do.

Our current environmental relationship is broken because the feedback loop is missing. Pollute, and the consequence is delayed and invisible. Clean, and the reward is usually zero.

LitterLoot asks a different question: what if every citizen could become a motivated local guardian, and what if picking up trash felt as rewarding as finding loot in a game?

#### What I Built: LitterLoot

LitterLoot is an AI-powered clean-to-earn protocol that transforms cleanup work into a gamified, economically rewarding experience.

1. Spot: Find trash in your community.
2. Snap: Take a before photo.
3. Clean: Remove the waste and take an after photo.
4. Earn: The AI auditor verifies impact. If approved, the app sends a Solana reward.

LitterLoot bridges digital incentives and physical ecological action. It is not just an app, it is a blueprint for actionable smart-city behavior.

#### Demo

Add your GIF or YouTube demo link here.

- Live Demo: <ADD_LINK>
- GitHub: <ADD_LINK>

#### Prize Categories Addressed

##### 1) Best Use of Google Gemini: The Auditor

Fraud prevention is the hardest part of clean-to-earn. How do we stop fake uploads?

LitterLoot uses Gemini as a strict ecological auditor. The backend receives before/after images (Base64), builds a restrictive prompt, and expects strict JSON output:

`{"verified": true|false, "reasoning": "..."}`

This creates a consistent, fast, and unbiased verification layer.

##### 2) Best Use of Solana: The Reward Engine

Micro-bounties only work if payouts are immediate and cheap.

When verification is positive, the backend uses `@solana/web3.js` to submit a reward transaction on Solana Devnet. Low fees and fast finality make small environmental rewards viable.

##### 3) Best Use of Auth0: The Identity Layer

Any app that sends tokens must defend against Sybil behavior.

LitterLoot uses `@auth0/nextjs-auth0` for authentication and route protection so each cleanup flow is tied to an authenticated identity.

#### Technical Execution

- Framework: Next.js 14 (App Router) + TypeScript.
- Styling: Tailwind CSS with a mission-console visual language.
- State: React hooks for multi-step mobile flow.
- Persistence: SQLite with better-sqlite3.
- Wallets: Phantom and Solflare adapters.

#### The Future

- Brand accountability (EPR): detect recurring branded litter patterns and route sponsorship pressure to local cleanup pools.
- Corporate ESG liquidity: enable sponsored, verifiable, neighborhood-level cleanup campaigns with cryptographic proof trails.

The planet does not need more awareness alone. It needs incentive-aligned action.

---

## Table of Contents

1. Product Overview
2. Tech Stack
3. User Flow
4. Project Architecture
5. Prerequisites
6. Local Setup
7. Environment Variables
8. Available Scripts
9. API Endpoints
10. Security Features
11. Folder Structure
12. Deployment
13. Troubleshooting
14. Recommended Roadmap
15. Author

## Product Overview

LitterLoot allows users to:

- Sign in with Auth0.
- Connect a Solana wallet (Phantom or Solflare).
- Submit before/after cleanup photos.
- Run AI-based verification.
- Receive SOL rewards on Devnet when verified.
- Review verification history and achievements.
- Claim bonus rewards for milestones.

## Tech Stack

- Frontend: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS.
- Auth: Auth0 via `@auth0/nextjs-auth0`.
- AI: Google Gemini via `@google/generative-ai`.
- Blockchain: Solana Devnet via `@solana/web3.js` and wallet adapters.
- Database: Neon Postgres in cloud (`@neondatabase/serverless`) with SQLite fallback for local development.
- UI Motion: framer-motion.

## User Flow

1. User logs in with Auth0.
2. User connects wallet and signs a challenge.
3. User uploads before/after images from dashboard.
4. Backend validates request, rate-limits, and sends data to Gemini.
5. If Gemini verifies cleanup:
	 - SOL reward is sent.
	 - Verification history is persisted.
6. User tracks progress and claims achievement bonuses.

## Project Architecture

### Frontend

- Conversion landing page: `app/page.tsx`.
- Authenticated sections: dashboard, history, profile, achievements.
- Key components:
	- `components/CameraUploader.tsx`
	- `components/LiveZoneMap.tsx`
	- `components/profile/WalletPreferences.tsx`
	- `components/achievements/AchievementsBoard.tsx`

### Backend Route Handlers

- `app/api/verify/route.ts`
	- Payload/image validation
	- Per-user rate limiting
	- Gemini timeout handling
	- Verification persistence
	- SOL reward dispatch

- `app/api/wallet/challenge/route.ts`
	- Generates wallet-linking challenge (5 min expiration)

- `app/api/wallet/route.ts`
	- Verifies signature and links wallet

- `app/api/history/route.ts`
	- Returns history and stats

- `app/api/achievements/route.ts`
	- Computes unlocks and claims
	- Uses concurrency-safe claim reservation to prevent double payouts

### Persistence

Storage strategy:

- Production (Vercel): Neon Postgres via `POSTGRES_URL` or `DATABASE_URL`.
- Local fallback: SQLite at `data/litterloot.db`.

Tables:

- `wallet_links`
- `wallet_challenges`
- `verification_history`
- `achievement_claims`

## Prerequisites

- Node.js 18.18+ (Node.js 20 LTS recommended)
- npm 9+
- Auth0 tenant/app configuration
- Gemini API key
- Funded Solana Devnet reward wallet

## Local Setup

1. Clone repository.
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` from `.env.example`.
4. Start development server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Environment Variables

Reference file: `.env.example`.

### Auth0

- `AUTH0_SECRET`
- `AUTH0_BASE_URL`
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

### Gemini

- `GOOGLE_GEMINI_API_KEY`
- `GOOGLE_GEMINI_MODEL`

### Solana

- `SOLANA_REWARD_SECRET_KEY`
- `SOLANA_RPC_URL`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `DEFAULT_REWARD_WALLET` (optional)

### Database

- `POSTGRES_URL` (recommended in Vercel)
- `DATABASE_URL` (fallback supported)
- `SUPABASE_DB_URL` (alias supported for Supabase direct connection strings)

### Supabase Public Client (Optional)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Note: the current backend storage layer requires `POSTGRES_URL`, `DATABASE_URL`, or `SUPABASE_DB_URL` for server-side queries.
The two `NEXT_PUBLIC_*` variables are only needed if you later add Supabase client SDK usage in frontend code.

### Optional Flags

- `DEMO_MODE`
	- If `true` and Gemini quota fails, API returns fallback response without payout.

## Available Scripts

```bash
npm run dev     # local development
npm run lint    # static analysis
npm run build   # production build
npm run start   # run production server
```

## API Endpoints

### Auth

- `GET /api/auth/[auth0]`

### Wallet

- `GET /api/wallet`
	- Returns linked wallet for authenticated user.

- `POST /api/wallet`
	- Links wallet using challenge + signature verification.

- `GET /api/wallet/challenge`
	- Issues time-limited signing challenge.

### Verification

- `POST /api/verify`
	- Accepts `beforeImage` and `afterImage` (Base64 data URLs)
	- Validates MIME and size
	- Runs Gemini verification
	- Sends reward when approved

### History

- `GET /api/history?limit=30&includeStats=true`
	- Returns verification history and optional stats.

### Achievements

- `GET /api/achievements`
	- Returns progress and claim states.

- `POST /api/achievements`
	- Claims unlocked achievement bonus.

## Security Features

- Auth0 session checks on protected pages and APIs.
- Middleware protection for:
	- `/dashboard`
	- `/achievements`
	- `/profile`
	- `/history`
- Wallet ownership proof through challenge + signature (`tweetnacl`).
- Wallet input sanitization.
- Image validation (allowed MIME + max 5MB).
- Server-side verification rate limiting.
- Gemini timeout protection.
- Concurrency-safe achievement claims to avoid double payouts.
- Sanitized `.env.example` placeholders (no real secrets).

## Folder Structure

```text
app/
	api/
		achievements/
		auth/[auth0]/
		history/
		verify/
		wallet/
	achievements/
	dashboard/
	history/
	profile/
	globals.css
	layout.tsx
	page.tsx

components/
	achievements/
	dashboard/
	history/
	layout/
	profile/

utils/
	solanaReward.ts
	userWalletStore.ts

data/
	litterloot.db
```

## Deployment

Recommended: Vercel.

Pre-deploy checklist:

1. Set all required environment variables.
2. Ensure `DEMO_MODE` is disabled in production.
3. Ensure Postgres is configured (`POSTGRES_URL` or `DATABASE_URL`) so production does not rely on local SQLite.
4. Run:

```bash
npm run lint
npm run build
```

5. Confirm reward wallet has enough Devnet SOL for testing.

## Troubleshooting

### Missing GOOGLE_GEMINI_API_KEY

Set `GOOGLE_GEMINI_API_KEY` in `.env.local` and restart the app.

### Missing SOLANA_REWARD_SECRET_KEY

Set `SOLANA_REWARD_SECRET_KEY` as a JSON array of 64 bytes.

### Invalid Solana wallet address

Make sure user provides a Base58 public key, not a private key array.

### Gemini quota exceeded

API returns `429` with `retryAfterSeconds`; wait and retry.

### Wallet not connecting

Confirm Phantom/Solflare is installed and unlocked in browser.

## Recommended Roadmap

1. Migrate persistence to PostgreSQL + Prisma.
2. Add complete test suite (unit, integration, e2e).
3. Add structured logging + observability.
4. Add CSRF/origin checks for sensitive POST routes.
5. Add stricter anti-fraud geospatial validation.

## Author

Ronald Azuero Maldonado

Hackathon MVP: Web3 + AI for verifiable environmental action.
