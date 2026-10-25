-- ============================================================================
-- PRODUCTION: rename the stage "Qualification" to "Customer engagement"
-- ============================================================================
-- Changes only the stage NAME, in three places:
--   1. opportunities.stage                       (existing deals in Qualification)
--   2. opportunity_stage_history.fromStage/toStage (the stage history keeps the same story)
--   3. questions.stage                           (the Qualification questions in the bank)
-- Answers (opportunity_answers), deals' other fields, leads and accounts are NOT touched.
-- Run this together with the new application code (the code expects the new name).
-- Runs in one transaction: all of it applies, or none of it does.
-- Safe to run more than once: after the first run the counts are zero.
-- ============================================================================

BEGIN;

-- Before: how many rows will change
SELECT 'deals in Qualification (to rename)' AS item, COUNT(*)::text AS value
  FROM opportunities WHERE stage = 'Qualification'
UNION ALL
SELECT 'stage history rows (from/to Qualification)', COUNT(*)::text
  FROM opportunity_stage_history WHERE "fromStage" = 'Qualification' OR "toStage" = 'Qualification'
UNION ALL
SELECT 'question bank rows in Qualification (to rename)', COUNT(*)::text
  FROM questions WHERE stage = 'Qualification';

-- 1. Existing deals
UPDATE opportunities SET stage = 'Customer engagement' WHERE stage = 'Qualification';

-- 2. Stage history
UPDATE opportunity_stage_history SET "fromStage" = 'Customer engagement' WHERE "fromStage" = 'Qualification';
UPDATE opportunity_stage_history SET "toStage" = 'Customer engagement' WHERE "toStage" = 'Qualification';

-- 3. Question bank (the QUAL questions keep their keys and answers)
UPDATE questions SET stage = 'Customer engagement' WHERE stage = 'Qualification';

-- After: nothing should still say Qualification (all three should be 0)
SELECT 'deals still in Qualification (should be 0)' AS item, COUNT(*)::text AS value
  FROM opportunities WHERE stage = 'Qualification'
UNION ALL
SELECT 'stage history still Qualification (should be 0)', COUNT(*)::text
  FROM opportunity_stage_history WHERE "fromStage" = 'Qualification' OR "toStage" = 'Qualification'
UNION ALL
SELECT 'question bank still Qualification (should be 0)', COUNT(*)::text
  FROM questions WHERE stage = 'Qualification';

COMMIT;

SELECT 'rename to Customer engagement complete' AS status;
