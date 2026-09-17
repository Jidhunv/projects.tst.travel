-- Add tier field to opportunities table (client tier: Premium, Standard, Basic, etc.)
ALTER TABLE opportunities ADD COLUMN tier VARCHAR(100) NULL;

-- Create index for tier filtering
CREATE INDEX idx_opportunities_tier ON opportunities(tier);
