-- Add city field to opportunities table
ALTER TABLE opportunities ADD COLUMN city VARCHAR(255) NULL;

-- Create index for city filtering
CREATE INDEX idx_opportunities_city ON opportunities(city);
