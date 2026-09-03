# Beediyo Kall — Load Test Kit

Python-standard-library only (no Node, no k6, no installs).

## What it does

1. **Seeds** `--users` disposable profiles (`test_user_001…`) plus ~50% active
   subscriptions directly into Supabase (service-role REST). They hold **0 BKL**
   tokens, so the real leaderboard stays clean.
2. **Simulates** that many users hitting the **deployed** Next.js API. Each
   user mints a *real* signed `bk_session` cookie (same HMAC scheme as
   `src/lib/session.ts`, key read from `--env`) and walks the real app flow:
   `/api/me` → `/api/match` (with their tier's filters) → `/api/user-tier`,
   free users also log `/api/daily-usage`.
3. **Reports** per-endpoint avg / p95 / p99 latency + error codes.
4. **Always cleans up** its test users afterwards (FK cascades wipe
   subscriptions & daily usage) — even on failure.

## Usage

```bash
# Main app flows — 300 users, 60 concurrent, 2 rounds (~2,000 requests)
python loadtest/loadtest.py \
  --env .env.local \
  --base https://bkl-airdrophubgroups-projects.vercel.app \
  --users 300 --workers 60 --rounds 2

# Leaderboard burst (public endpoint, no auth)
python loadtest/loadtest.py --env .env.local \
  --base https://bkl-airdrophubgroups-projects.vercel.app \
  --mode leaderboard --workers 60 --rounds 6

# Remove any leftover test users (after an aborted run)
python loadtest/loadtest.py --env .env.local \
  --base https://bkl-airdrophubgroups-projects.vercel.app --cleanup-only
```

`--env` needs `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
`REQUEST_SIGNING_KEY` (`.env.local` already has all three). The signing key
must match the one set in the deployed environment, or every request will be
a 401.

> ⚠️ Never run this against an app you don't own, and don't leave test users
> behind — the harness cleans up automatically, but a `--cleanup-only` run is
> the escape hatch.

## Reading the results

- **errors == 0** → no request failed or hung at the HTTP layer.
- **req/s** → sustained throughput under that concurrency.
- **p95/p99 ms** → tail latency; this is what users feel as "hang". For a
  smooth experience aim for p95 < ~800 ms after the warm-up pass.
- The **first** pass includes serverless cold starts; run the same command a
  second time for steady-state numbers.

## Cutting latency further (scale pack)

Each request currently costs 2–4 sequential DB round-trips. The
`SCALE PACK` section at the end of `supabase/schema.sql` adds indexes plus
atomic RPC helpers (`bk_find_match`, `bk_log_usage`, `bk_user_rank`) that
collapse those into a single call. Run that SQL in the Supabase SQL Editor,
then flip the API routes to use the RPCs and re-run this kit — p95 should
drop ~3–4x.
