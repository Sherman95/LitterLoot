-- LitterLoot initial schema for Supabase (Postgres)
-- Run this in Supabase SQL Editor.

-- 1) Wallet links
CREATE TABLE IF NOT EXISTS wallet_links (
  user_sub TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL
);

-- 2) Wallet challenges (for signature verification)
CREATE TABLE IF NOT EXISTS wallet_challenges (
  user_sub TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);

-- 2b) Mobile wallet link attempts (one-time)
CREATE TABLE IF NOT EXISTS wallet_link_attempts (
  attempt_id TEXT PRIMARY KEY,
  user_sub TEXT NOT NULL,
  challenge TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  used_at TIMESTAMPTZ,
  return_to TEXT
);

-- 3) Verification history
CREATE TABLE IF NOT EXISTS verification_history (
  id TEXT PRIMARY KEY,
  user_sub TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL,
  reasoning TEXT NOT NULL,
  reward_sent BOOLEAN NOT NULL,
  signature TEXT,
  rewarded_wallet TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION
);

-- 4) Achievement claims
CREATE TABLE IF NOT EXISTS achievement_claims (
  user_sub TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL,
  signature TEXT,
  bonus_sol DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (user_sub, achievement_id)
);

-- Helpful indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_verification_history_user_created
  ON verification_history (user_sub, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_achievement_claims_user_created
  ON achievement_claims (user_sub, claimed_at DESC);

-- Optional integrity helpers
CREATE INDEX IF NOT EXISTS idx_wallet_links_wallet_address
  ON wallet_links (wallet_address);

-- Notes:
-- - expires_at is stored as epoch milliseconds to match current app logic.
-- - If you later add RLS, start in permissive mode or update API calls with service role usage.
