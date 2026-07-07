-- Get count of leads with NULL accountId
SELECT COUNT(*) FROM leads WHERE "accountId" IS NULL;

-- Option 1: Delete leads with NULL accountId (safest for testing)
DELETE FROM leads WHERE "accountId" IS NULL;

-- Option 2: If there are accounts, assign to first account
-- UPDATE leads SET "accountId" = (SELECT id FROM accounts LIMIT 1) WHERE "accountId" IS NULL;
