-- ============================================================================
-- Buying committee: email and phone per member
-- ============================================================================
-- Each named buying-committee member now carries an email and a phone number.
-- Accounts without a named member are highlighted in lead and opportunity lists.
-- Safe to run multiple times.
-- ============================================================================

ALTER TABLE account_stakeholders ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE account_stakeholders ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

SELECT '✅ Buying committee contact columns ready' as status;
