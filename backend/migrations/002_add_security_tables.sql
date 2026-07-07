-- Migration: Security hardening tables
-- Date: 2026-07-07
-- Purpose: JWT revocation (logout) + brute-force account lockout
-- Note: owned by the application DB role (crm_user), independent of the
--       postgres-owned users table.

-- 1. JWT blacklist — logout revokes a token until its natural expiry.
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tokenHash" varchar NOT NULL,          -- sha256 hex of the raw JWT
  "userId" varchar NULL,
  "expiresAt" timestamp NOT NULL,        -- when the JWT would expire anyway
  "revokedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revoked_tokens_hash ON revoked_tokens("tokenHash");
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens("expiresAt");

-- 2. Brute-force protection — consecutive failed logins + lockout window.
CREATE TABLE IF NOT EXISTS login_security (
  "userId" varchar PRIMARY KEY,
  "failedAttempts" integer NOT NULL DEFAULT 0,
  "lockoutUntil" timestamp NULL,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
