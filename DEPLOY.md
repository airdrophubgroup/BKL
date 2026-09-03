# 🚀 Beediyo Kall — Worldcoin Deployment Guide

## Step-by-step guide to launch your Mini App on World App

---

## Step 1: Create Worldcoin Developer Account

1. Go to **https://developer.worldcoin.org/**
2. Click **Sign Up** / **Login**
3. Create a **Team** (name it anything, e.g. "Beediyo Kall Team")
4. Inside your team, click **Create App**
   - **App Name:** Beediyo Kall
   - **App Description:** Random Video Chat — Connect with people worldwide
   - **App Mode:** Select **Mini App**
5. Save your app → Note down your **App ID** (looks like `app_abc123xyz`)

---

## Step 2: Get Your API Keys

In the Developer Portal:

1. Go to your **Team Settings → API Keys**
2. Copy your **DEV_PORTAL_API_KEY** (used for server-side payment verification)

> **Sign-in:** The app signs users in with **MiniKit.walletAuth()** (Sign-In with
> Ethereum). The user approves a signature inside World App and we verify it
> server-side — no OAuth Client ID/Secret is required.
>
> **World ID proof (optional):** If you later want to prove each user is a
> unique human (e.g. for an 18+ gate), create an action under **Incognito
> Actions** and integrate `@worldcoin/idkit`. Not required for the current
> build.

---

## Step 3: Set Up Supabase Database

1. Go to **https://supabase.com/** and create a new project
2. Go to **SQL Editor** in your Supabase dashboard
3. Paste and run the contents of `supabase/schema.sql`
4. Go to **Settings → API** and copy:
   - `Project URL` (looks like `https://xxxx.supabase.co`)
   - `anon` key (public)
   - `service_role` key (SECRET — never share this)

---

## Step 4: Create `.env.local`

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-service-role-key

# Worldcoin
NEXT_PUBLIC_WORLDCOIN_APP_ID=app_abc123xyz
NEXT_PUBLIC_WORLDCOIN_ACTION_ID=beediyo-kall-connect
DEV_PORTAL_API_KEY=your-dev-portal-api-key

# Treasury (already set to your wallet)
NEXT_PUBLIC_TREASURY_ADDRESS=0x8c5b20653abcb87f6b3a7cb469d8623e94bfb6a1

# Security (session cookie signing — keep stable once set)
REQUEST_SIGNING_KEY=run-this-command-to-generate
SIGNALING_SECRET=run-this-command-to-generate
ALLOWED_ORIGINS=https://your-domain.vercel.app

# Dev mode (MUST be false in production)
NEXT_PUBLIC_ALLOW_DEV_MODE=false
```

**Generate security keys:**

```bash
# Run these in your terminal:
openssl rand -hex 32   # Use output as REQUEST_SIGNING_KEY
openssl rand -hex 32   # Use output as SIGNALING_SECRET
```

---

## Step 5: Deploy to Vercel (Recommended)

1. Push your code to **GitHub**
2. Go to **https://vercel.com/** and sign up with GitHub
3. Click **New Project** → Import your GitHub repo
4. Vercel auto-detects Next.js — click **Deploy**
5. After deploy, go to **Settings → Environment Variables**
6. Add ALL the variables from your `.env.local`
7. Click **Redeploy** to apply env vars
8. Note your production URL: `https://your-project.vercel.app`

---

## Step 6: Configure in Worldcoin Developer Portal

1. Go back to **Developer Portal** → Your App
2. In **App Settings**, set:
   - **App URL:** `https://your-project.vercel.app`
3. Under **Permissions**, add:
   - `pay` — To accept WLD payments
4. Save changes

---

## Step 7: Test with Ngrok (Local Testing)

For testing before going live:

```bash
# Install ngrok: https://ngrok.com/
ngrok http 3000
```

1. Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)
2. In Developer Portal, set App URL to the ngrok URL
3. Open World App on your phone
4. Go to Discover → Search "Beediyo Kall" (or scan QR from portal)
5. Test the full flow

---

## Step 8: Submit for Review

1. In Developer Portal, go to your app
2. Click **Submit for Review**
3. Fill in:
   - **App Description:** Explain what Beediyo Kall does
   - **Categories:** Social, Entertainment
   - **Screenshots:** Take 2-3 screenshots of your app
4. Submit and wait for approval (usually 1-3 business days)

---

## ⚠️ Important Worldcoin Guidelines

| Rule | Status |
|---|---|
| ✅ No "official" branding | App name is "Beediyo Kall" only |
| ✅ No World logo | Using custom BK icon |
| ✅ Username, not wallet | Only usernames shown |
| ✅ Mobile-first | Bottom tab navigation |
| ✅ No chance-based prizes | Subscription is for features, not gambling |
| ✅ No token pre-sales | BKL tokens are earned, not pre-sold |
| ✅ Server-side verification | Payment verified via Worldcoin API |
| ✅ No yield/returns | Subscriptions are for app features |
| ✅ SIWE sign-in | walletAuth verified server-side, signed session cookie |

---

## 📋 Pre-Launch Checklist

- [ ] Developer account created
- [ ] App created in portal (Mini App mode)
- [ ] Supabase database set up with schema
- [ ] `.env.local` configured with all keys
- [ ] App deployed to Vercel
- [ ] App URL set in Developer Portal
- [ ] Actions created (`beediyo-kall-connect`)
- [ ] Tested locally with ngrok
- [ ] All payments verified server-side
- [ ] App submitted for review

---

## 🔗 Useful Links

| Resource | URL |
|---|---|
| Developer Portal | https://developer.worldcoin.org/ |
| Mini App Docs | https://docs.world.org/mini-apps |
| MiniKit SDK | https://www.npmjs.com/package/@worldcoin/minikit-js |
| UI Kit | https://www.npmjs.com/package/@worldcoin/mini-apps-ui-kit-react |
| Discord Support | https://discord.com/invite/worldnetwork |

---

## 💡 Troubleshooting

**MiniKit commands fail:**
- Ensure you're inside World App (not a regular browser)
- Use `NEXT_PUBLIC_ALLOW_DEV_MODE=true` for local testing only

**Payment not going through:**
- Check treasury address is correct
- Ensure `pay` permission is enabled in Developer Portal
- Verify WLD balance in user's World App wallet

**App not showing in World App:**
- App must be approved first
- Set correct App URL in Developer Portal
- Try restarting World App
