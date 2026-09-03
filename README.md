# Beediyo Kall 🎥

**Random Video Chat — Worldcoin Mini App**

A premium random video calling platform (like Azar) built as a World App Mini App, monetized via WLD utility tokens with tiered subscription passes.

---

## Architecture

```
beediyo-kall/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout + WorldcoinProvider
│   │   ├── page.tsx            # Main orchestrator page
│   │   ├── globals.css         # Tailwind + glassmorphism theme
│   │   └── api/
│   │       ├── subscription/   # Subscription CRUD
│   │       ├── bkl-balance/    # BKL token balance query
│   │       ├── leaderboard/    # Top BKL holders ranking
│   │       └── report/         # User reporting
│   ├── components/
│   │   ├── GlassCard.tsx       # Reusable glassmorphism card
│   │   ├── OnboardingModal.tsx # One-time country/age/gender lock
│   │   ├── HomeDashboard.tsx   # Home screen with pass status + countdown
│   │   ├── SubscriptionPlans.tsx # 3-tier WLD payment UI
│   │   ├── BklTokenBalance.tsx # Animated BKL token balance display
│   │   ├── Leaderboard.tsx    # Top BKL token holders ranking
│   │   ├── VideoCallRoom.tsx   # WebRTC video call with filters
│   │   └── BottomNav.tsx       # Mobile bottom navigation (4 tabs)
│   └── lib/
│       ├── supabase.ts         # Supabase client + admin
│       ├── types.ts            # Shared TypeScript types
│       ├── worldcoin-context.tsx # World App SDK provider
│       ├── hooks.ts            # useProfile, useSubscription, useCountdown
│       ├── matching.ts         # Match finder
│       └── useWebRTC.ts        # WebRTC peer connection hook
├── server/
│   └── signaling.js            # Socket.IO WebRTC signaling server
├── supabase/
│   └── schema.sql              # Database schema + RLS policies
└── public/
    └── manifest.json           # World App manifest
```

## Subscription Tiers

| Tier | Price | Duration | Features |
|------|-------|----------|----------|
| **Basic** | 2 WLD | 7 days | Unlimited random video calls + **2 BKL tokens** |
| **Gender Filter** | 5 WLD | 7 days | + Filter by gender + **5 BKL tokens** |
| **Advanced** | 10 WLD | 7 days | + Country, region, and age filters + **10 BKL tokens** |

### BKL Token Rewards

When a user purchases any pass, they earn **BKL tokens equal to the WLD spent**:
- 2 WLD → 2 BKL | 5 WLD → 5 BKL | 10 WLD → 10 BKL

**Key:** BKL tokens are **permanent** — they never expire even if the subscription lapses. This builds trust and ensures users always retain their earned tokens.

### Leaderboard

The app features a real-time leaderboard showing top BKL token holders:
- **Top 3 podium** — Gold, Silver, Bronze styled cards with trophy icons
- **Animated rankings** — Staggered entry animations for each row
- **Your rank card** — Always shows where you stand
- **Glassmorphism cards** — Premium dark UI with subtle glows

Access via the **Rank** tab in the bottom navigation.

## Setup Guide

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))
- (Optional) World App developer account for production deployment

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and keys

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run the development servers

In separate terminals:

```bash
# Next.js app
npm run dev

# WebRTC signaling server (optional, for real peer connections)
node server/signaling.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Deploy to World App

1. Build the app: `npm run build`
2. Deploy to Vercel/Netlify or your preferred hosting
3. Register your Mini App URL in the Worldcoin Developer Portal
4. Submit for review (see `DEPLOY.md`)

> The MiniKit v2 SDK (`@worldcoin/minikit-js@^2.0.3`) is fully integrated:
> **sign-in** = `MiniKit.walletAuth()` (SIWE, verified server-side → signed session cookie),
> **payments** = `MiniKit.pay()` (verified against Worldcoin's Developer API server-side).
> All data access flows through `/api/*` routes with the Supabase service role — the
> browser never talks to Supabase directly.

## Design System

- **Theme:** Premium glassmorphism — deep midnight blues, slate grays, purple/indigo accents
- **No neon** — clean, sophisticated dark UI
- **Animations:** Framer Motion throughout (page transitions, micro-interactions)
- **Mobile-first** — optimized for World App browser viewport

## 🚀 Deployment

See **[DEPLOY.md](DEPLOY.md)** for the complete step-by-step guide to launch on World App.

### Quick Start

1. Create account at [developer.worldcoin.org](https://developer.worldcoin.org/)
2. Create app → Get `APP_ID` and `DEV_PORTAL_API_KEY`
3. Set up Supabase with `supabase/schema.sql`
4. Copy `.env.example` → `.env.local` and fill in keys
5. Deploy to Vercel
6. Set App URL in Developer Portal
7. Submit for review

### Production Checklist

- [x] MiniKit SDK integration (latest API)
- [x] Server-side payment verification via Worldcoin API
- [x] Nonce-based transaction tracking
- [x] App manifest for World App
- [x] CSP security headers
- [x] Rate limiting on all API routes
- [ ] Deploy signaling server with Redis for horizontal scaling
- [ ] Add WebRTC TURN servers for NAT traversal
- [ ] Set up Supabase Realtime for presence tracking
- [ ] Add error tracking (Sentry, etc.)
- [ ] Load test the signaling server

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + custom glassmorphism palette
- **Animation:** Framer Motion
- **Database:** Supabase (PostgreSQL)
- **Video:** WebRTC + Socket.IO signaling
- **Payments:** WLD via MiniKit.pay (verified server-side via Worldcoin API)
- **Auth:** MiniKit.walletAuth (SIWE) + signed session cookie
