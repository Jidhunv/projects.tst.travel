-- ============================================================================
-- Prospecting questionnaire answers on accounts (Prospects > Prospecting)
-- ============================================================================
-- Answers are stored as one JSON object keyed q1..q10. Highlighting in the list
-- uses the same rules as src/utils/prospecting.ts.
-- Safe to run multiple times.
-- ============================================================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "prospectingAnswers" JSONB NULL;

SELECT 'Prospecting answers column ready' as status;
