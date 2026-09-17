-- Add expectedCloseMonth field to opportunities table for better month-level filtering
ALTER TABLE opportunities ADD COLUMN "expectedCloseMonth" VARCHAR(7) NULL;

-- Create an index for efficient month-based queries
CREATE INDEX idx_opportunities_expected_close_month ON opportunities("expectedCloseMonth");

-- Backfill expectedCloseMonth from forecastedCloseDate for existing opportunities
UPDATE opportunities
SET "expectedCloseMonth" = TO_CHAR("forecastedCloseDate", 'YYYY-MM')
WHERE "forecastedCloseDate" IS NOT NULL AND "expectedCloseMonth" IS NULL;
