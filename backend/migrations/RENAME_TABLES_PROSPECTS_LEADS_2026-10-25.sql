-- ============================================================================
-- Rename database tables to match the screens
--   leads                 -> prospects                 (Prospects page)
--   accounts              -> leads                     (Leads page)
--   lead_status_history   -> prospect_status_history   (Prospect status history)
--   prospect_status_history."leadId" -> "prospectId"
-- Data is not changed. Foreign keys, indexes and triggers follow their tables.
-- The constraint, index and trigger NAMES keep their old text (cosmetic only).
--
-- RUN ONLY TOGETHER WITH THE MATCHING APPLICATION CODE. The old code reads
-- "leads" as the Prospects table, so it will return the wrong rows after this.
-- Stop the backend, run this script, deploy the new code, start the backend.
--
-- Runs in one transaction: it applies completely or not at all.
-- Refuses to run twice (the guard below checks the names before renaming).
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.leads') IS NULL OR to_regclass('public.accounts') IS NULL
     OR to_regclass('public.lead_status_history') IS NULL THEN
    RAISE EXCEPTION 'Expected tables leads, accounts and lead_status_history. Is this script already applied?';
  END IF;
  IF to_regclass('public.prospects') IS NOT NULL OR to_regclass('public.prospect_status_history') IS NOT NULL THEN
    RAISE EXCEPTION 'prospects or prospect_status_history already exists. Script already applied; nothing changed.';
  END IF;
END $$;

-- Before: row counts (kept to compare after the rename)
SELECT 'leads (to become prospects)' AS item, COUNT(*)::text AS value FROM leads
UNION ALL SELECT 'accounts (to become leads)', COUNT(*)::text FROM accounts
UNION ALL SELECT 'lead_status_history (to become prospect_status_history)', COUNT(*)::text FROM lead_status_history;

ALTER TABLE leads RENAME TO prospects;
ALTER TABLE accounts RENAME TO leads;
ALTER TABLE lead_status_history RENAME TO prospect_status_history;
ALTER TABLE prospect_status_history RENAME COLUMN "leadId" TO "prospectId";

-- After: the same counts, under the new names
SELECT 'prospects' AS item, COUNT(*)::text AS value FROM prospects
UNION ALL SELECT 'leads (was accounts)', COUNT(*)::text FROM leads
UNION ALL SELECT 'prospect_status_history', COUNT(*)::text FROM prospect_status_history;

COMMIT;

SELECT 'table rename complete' AS status;
