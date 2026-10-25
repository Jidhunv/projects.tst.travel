-- ============================================================================
-- PRODUCTION FIX, safe to run on the live database (2026-10-25)
-- ============================================================================
-- What this script does:
--   1. Adds any column or table that is still missing for the lead, prospect and
--      demonstration changes (every statement is IF NOT EXISTS).
--   2. Adds the two new Demonstration questions to the question bank:
--        DEMO-0 (who will attend the demo) and DEMO-6 (who actually attended, with comments).
--      Rows that already exist are left alone.
--   3. Reports, read-only, what still needs a person to act.
--
-- What this script does NOT do (so existing work is untouched):
--   - It does not change any answer, status, stage, account, lead or deal.
--   - It does not mark any question as answered.
--   - It does not move anything back. Section 4 shows an optional reset, commented out.
--
-- Safe to run more than once.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Schema: lead, prospect and demonstration changes
-- ----------------------------------------------------------------------------
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "prospectingAnswers" JSONB NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "prospectedAt" TIMESTAMPTZ NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "prospectingUpdatedAt" TIMESTAMPTZ NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "leadQualification" JSONB NULL;

CREATE TABLE IF NOT EXISTS prospect_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_prospect_option UNIQUE (category, name)
);

INSERT INTO prospect_options (category, name) VALUES
    ('businessType', 'Retail'),
    ('businessType', 'B2B'),
    ('businessType', 'Corporate'),
    ('employeeBand', '1-10'),
    ('employeeBand', '11-50'),
    ('employeeBand', '51-200'),
    ('employeeBand', '201-500'),
    ('employeeBand', '501-1000'),
    ('employeeBand', '1000+')
ON CONFLICT (category, name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Question bank: the two demonstration attendance questions
-- ----------------------------------------------------------------------------
INSERT INTO questions ("questionKey", stage, position, text, type, mandatory, options, help, "isActive")
VALUES
  ('DEMO-0', 'Demonstration',
     COALESCE((SELECT MAX(position) FROM questions WHERE stage = 'Demonstration'), 0) + 1,
     'Who will attend the demo?', 'attendees', TRUE, NULL, 'Asked when the prospect is converted, before the demo', TRUE),
  ('DEMO-6', 'Demonstration',
     COALESCE((SELECT MAX(position) FROM questions WHERE stage = 'Demonstration'), 0) + 2,
     'Who actually attended the demo, and what did each person say?', 'attendance', TRUE, NULL, 'Recorded after the demo, before moving to Proposal', TRUE)
ON CONFLICT ("questionKey") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Report only: what still needs a person to act (no changes made)
-- ----------------------------------------------------------------------------
-- 3a. Deals per stage
SELECT 'deals in stage ' || stage AS item, COUNT(*)::text AS value
FROM opportunities GROUP BY stage ORDER BY 1;

-- 3b. Deals in Demonstration that still have no attendee list (DEMO-0)
SELECT 'demonstration deals without the attendee list (DEMO-0)' AS item, COUNT(*)::text AS value
FROM opportunities o
WHERE o.stage = 'Demonstration'
  AND NOT EXISTS (SELECT 1 FROM opportunity_answers a
                  WHERE a."opportunityId" = o.id AND a."questionKey" = 'DEMO-0' AND a.value IS NOT NULL AND a.value <> '');

-- 3c. Deals in Qualification (existing deals): they answer the Qualification questions before moving on
SELECT 'existing deals still in Qualification (answer its questions before moving on)' AS item, COUNT(*)::text AS value
FROM opportunities WHERE stage = 'Qualification';

-- 3d. Leads marked Qualified whose account does not yet have the nine qualification answers
SELECT 'qualified leads whose account is missing qualification answers' AS item, COUNT(*)::text AS value
FROM leads l JOIN accounts a ON a.id = l."accountId"
WHERE l.status = 'Qualified'
  AND NOT (COALESCE(a."leadQualification", '{}'::jsonb) ?& ARRAY['lq1','lq2','lq3','lq4','lq5','lq6','lq7','lq8','lq9']);

-- 3e. Open leads whose account does not yet have the lead questionnaire (13 questions, prospecting answers)
SELECT 'open leads whose account lacks the lead questionnaire' AS item, COUNT(*)::text AS value
FROM leads l JOIN accounts a ON a.id = l."accountId"
WHERE l.status = 'Open'
  AND (a."prospectingAnswers" IS NULL OR a."prospectingAnswers"->>'source' IS NULL OR a."prospectingAnswers"->>'duplicates' IS NULL);

-- 3f. Questions in the bank for the Demonstration stage (should now include DEMO-0 and DEMO-6)
SELECT 'demonstration questions in the bank' AS item, COUNT(*)::text AS value
FROM questions WHERE stage = 'Demonstration' AND "isActive" = TRUE;

-- ----------------------------------------------------------------------------
-- 4. Optional reset, NOT run. Only use it if you decide that a lead should go back to Open.
--    It changes data, so it stays commented out until you choose to run it.
-- ----------------------------------------------------------------------------
-- UPDATE leads SET status = 'Open', "updatedAt" = now()
--  WHERE id IN (/* the ids from report 3d */);
-- INSERT INTO lead_status_history ("leadId", "fromStatus", "toStatus", note, "createdAt")
--  SELECT id, 'Qualified', 'Open', 'Reset: qualification questionnaire incomplete', now()
--    FROM leads WHERE id IN (/* the same ids */);

SELECT 'production fix applied (no answers, statuses or stages were changed)' AS status;
