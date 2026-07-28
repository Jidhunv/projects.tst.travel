-- Add createdBy column to accounts table to track who created each account
ALTER TABLE accounts ADD COLUMN "createdBy" uuid;
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_created_by FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE SET NULL;
