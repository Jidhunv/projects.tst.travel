-- Migration: alternate phone number on accounts
-- Date: 2026-07-19
-- Purpose: The Accounts form has an "Alternate Phone Number" input, but no such
--          column existed on the model or in the database, so anything typed
--          there was silently discarded on both create and update.
-- Note: idempotent — safe to re-run.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "alternatePhoneNumber" varchar NULL;
