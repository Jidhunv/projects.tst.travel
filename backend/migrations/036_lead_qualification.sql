-- ============================================================================
-- Lead qualification answers on accounts (asked before a prospect becomes a lead)
-- ============================================================================
-- Stored as one JSON object keyed lq1..lq10. Safe to run multiple times.
-- ============================================================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "leadQualification" JSONB NULL;

SELECT 'Lead qualification column ready' as status;
