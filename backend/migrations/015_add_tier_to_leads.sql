-- Add tier field to leads table (client tier from account: Premium, Standard, Basic, etc.)
ALTER TABLE leads ADD COLUMN tier VARCHAR(100) NULL;

-- Create index for tier filtering
CREATE INDEX idx_leads_tier ON leads(tier);
