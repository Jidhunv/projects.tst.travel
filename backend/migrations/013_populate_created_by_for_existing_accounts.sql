-- Populate createdBy for existing accounts by distributing among User A, User B, User C
-- This assigns them round-robin style to accounts that don't have a creator yet

WITH user_list AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) as user_seq
  FROM users
  WHERE "lastName" IN ('A', 'B', 'C')
  ORDER BY "lastName"
),
accounts_to_update AS (
  SELECT
    a.id,
    a."createdAt",
    ROW_NUMBER() OVER (ORDER BY a."createdAt") as account_seq
  FROM accounts a
  WHERE a."createdBy" IS NULL
)
UPDATE accounts
SET "createdBy" = (
  SELECT u.id
  FROM user_list u
  WHERE u.user_seq = ((atu.account_seq - 1) % 3) + 1
)
FROM accounts_to_update atu
WHERE accounts.id = atu.id;
