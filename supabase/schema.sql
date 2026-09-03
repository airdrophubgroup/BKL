-- =============================================================
-- Beediyo Kall — Supabase Schema (bk_ prefixed)
--
-- Tables are prefixed with bk_ so this can be installed safely in a
-- Supabase project that already contains other apps' tables (e.g. a
-- generic "profiles" table). Nothing here touches other tables.
--
-- Run this in the Supabase SQL Editor to bootstrap the database.
-- =============================================================

-- 1. bk_profiles — one row per Beediyo Kall user, locked after onboarding
CREATE TABLE IF NOT EXISTS bk_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worldcoin_id  TEXT UNIQUE NOT NULL,          -- unique per-user id (keyed to wallet)
  wallet        TEXT UNIQUE NOT NULL,           -- EOA address (private, never exposed to peers)
  username      TEXT NOT NULL,                  -- Display name from World App session
  country       TEXT NOT NULL DEFAULT 'ZZ',     -- ISO 3166-1 alpha-2, locked after onboarding
  age           INT  NOT NULL DEFAULT 18,       -- Locked after onboarding
  gender        TEXT NOT NULL DEFAULT 'any',    -- 'male','female','other','any'
  avatar_url    TEXT,
  onboarded     BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. bk_subscriptions — tracks active passes per user
CREATE TABLE IF NOT EXISTS bk_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES bk_profiles(id) ON DELETE CASCADE,
  tier          INT  NOT NULL CHECK (tier IN (1, 2, 3)),   -- 1=Basic, 2=Gender, 3=Advanced
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  tx_hash       TEXT,                                       -- payment transaction id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bk_subscriptions_user_active
  ON bk_subscriptions (user_id, expires_at DESC);

-- 3. bk_payments — immutable ledger of every WLD payment attempt
CREATE TABLE IF NOT EXISTS bk_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES bk_profiles(id) ON DELETE CASCADE,
  tier          INT  NOT NULL CHECK (tier IN (1, 2, 3)),
  amount_wld    NUMERIC(10, 4) NOT NULL,
  tx_hash       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. bk_reports — for moderation
CREATE TABLE IF NOT EXISTS bk_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES bk_profiles(id),
  reported_id   UUID NOT NULL REFERENCES bk_profiles(id),
  reason        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. bk_bkl_tokens — permanent reward tokens (never expire)
CREATE TABLE IF NOT EXISTS bk_bkl_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES bk_profiles(id) ON DELETE CASCADE,
  amount        INT  NOT NULL CHECK (amount > 0),       -- tokens earned
  source        TEXT NOT NULL DEFAULT 'subscription',   -- 'subscription','gift','bonus','airdrop'
  tx_hash       TEXT,                                   -- linked payment tx
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bk_bkl_tokens_user ON bk_bkl_tokens (user_id);

-- Helper: total BKL balance for a user (permanent, never expires)
CREATE OR REPLACE FUNCTION bk_balance(p_user_id UUID)
RETURNS INT AS $$
  SELECT COALESCE(SUM(amount), 0) FROM bk_bkl_tokens
  WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- 6. bk_daily_usage — tracks free tier usage (1 min/day for non-premium)
CREATE TABLE IF NOT EXISTS bk_daily_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES bk_profiles(id) ON DELETE CASCADE,
  usage_date    DATE NOT NULL DEFAULT CURRENT_DATE,      -- one row per day
  seconds_used  INT  NOT NULL DEFAULT 0,                  -- seconds consumed today
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)                            -- one row per user per day
);

CREATE INDEX idx_bk_daily_usage_user_date ON bk_daily_usage (user_id, usage_date DESC);

-- Helper: get remaining free seconds for today
CREATE OR REPLACE FUNCTION bk_free_seconds_remaining(p_user_id UUID)
RETURNS INT AS $$
  SELECT GREATEST(0, 60 - COALESCE(
    (SELECT seconds_used FROM bk_daily_usage
     WHERE user_id = p_user_id AND usage_date = CURRENT_DATE),
    0
  ));
$$ LANGUAGE sql STABLE;

-- 7. Helper: check if user has an active subscription of at least `min_tier`
CREATE OR REPLACE FUNCTION bk_active_subscription(p_user_id UUID, p_min_tier INT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bk_subscriptions
    WHERE user_id = p_user_id
      AND tier >= p_min_tier
      AND expires_at > now()
  );
$$ LANGUAGE sql STABLE;

-- Helper: get highest active tier
CREATE OR REPLACE FUNCTION bk_highest_active_tier(p_user_id UUID)
RETURNS INT AS $$
  SELECT COALESCE(MAX(tier), 0) FROM bk_subscriptions
  WHERE user_id = p_user_id
    AND expires_at > now();
$$ LANGUAGE sql STABLE;

-- Leaderboard: top BKL holders (used by /api/leaderboard)
CREATE OR REPLACE FUNCTION bk_leaderboard_ranked(p_limit INT DEFAULT 50)
RETURNS TABLE(rank INT, username TEXT, avatar_url TEXT, country TEXT, balance BIGINT)
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(t.amount) DESC)::INT AS rank,
    p.username,
    p.avatar_url,
    p.country,
    SUM(t.amount)::BIGINT AS balance
  FROM bk_bkl_tokens t
  JOIN bk_profiles p ON p.id = t.user_id
  GROUP BY p.id
  ORDER BY balance DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- 8. Row-Level Security (defense-in-depth only)
-- NOTE: The app never uses the anon key on these tables — every request
-- flows through our API routes with the service role (which bypasses RLS).
-- RLS is enabled only on OUR tables; nothing in this file touches tables
-- that other apps may share in this project.
ALTER TABLE bk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_bkl_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bk_profiles_update_own" ON bk_profiles
  FOR UPDATE USING (id = auth.uid()::uuid);

CREATE POLICY "bk_subscriptions_select_own" ON bk_subscriptions
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "bk_payments_select_own" ON bk_payments
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "bk_bkl_tokens_select_own" ON bk_bkl_tokens
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "bk_daily_usage_select_own" ON bk_daily_usage
  FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "bk_daily_usage_update_own" ON bk_daily_usage
  FOR UPDATE USING (user_id = auth.uid()::uuid);
