-- Add tier field to accounts table (client tier imported from MIDT: Premium, Standard, Basic, etc.)
ALTER TABLE accounts ADD COLUMN tier VARCHAR(100) NULL;

-- Create index for tier filtering
CREATE INDEX idx_accounts_tier ON accounts(tier);
