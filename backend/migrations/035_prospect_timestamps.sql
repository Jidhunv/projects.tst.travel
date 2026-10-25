-- ============================================================================
-- Prospect timestamps on accounts (UTC, timezone-aware)
-- ============================================================================
-- prospectedAt: when the account first became a complete prospect (set once).
-- prospectingUpdatedAt: when the Prospecting answers were last saved.
-- Stored as timestamptz, so they can be converted to any time zone later.
-- Safe to run multiple times.
-- ============================================================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "prospectedAt" TIMESTAMPTZ NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "prospectingUpdatedAt" TIMESTAMPTZ NULL;

SELECT 'Prospect timestamps ready' as status;
