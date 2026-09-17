-- Production-Safe Schema Update (PostgreSQL Compatible)
-- This script adds new columns and indexes only if they don't already exist
-- Safe to run multiple times without errors

-- ============================================================================
-- OPPORTUNITIES TABLE UPDATES
-- ============================================================================

-- Add expectedCloseMonth column if not exists
ALTER TABLE IF EXISTS opportunities
ADD COLUMN IF NOT EXISTS "expectedCloseMonth" VARCHAR(7) NULL;

-- Backfill expectedCloseMonth from forecastedCloseDate for existing records
UPDATE opportunities
SET "expectedCloseMonth" = TO_CHAR("forecastedCloseDate", 'YYYY-MM')
WHERE "forecastedCloseDate" IS NOT NULL AND "expectedCloseMonth" IS NULL;

-- Create index for expectedCloseMonth if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'opportunities' AND indexname = 'idx_opportunities_expected_close_month'
  ) THEN
    CREATE INDEX idx_opportunities_expected_close_month ON opportunities("expectedCloseMonth");
  END IF;
END $$;

-- Add city column to opportunities if not exists
ALTER TABLE IF EXISTS opportunities
ADD COLUMN IF NOT EXISTS city VARCHAR(255) NULL;

-- Create index for city if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'opportunities' AND indexname = 'idx_opportunities_city'
  ) THEN
    CREATE INDEX idx_opportunities_city ON opportunities(city);
  END IF;
END $$;

-- Add tier column to opportunities if not exists
ALTER TABLE IF EXISTS opportunities
ADD COLUMN IF NOT EXISTS tier VARCHAR(100) NULL;

-- Create index for tier on opportunities if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'opportunities' AND indexname = 'idx_opportunities_tier'
  ) THEN
    CREATE INDEX idx_opportunities_tier ON opportunities(tier);
  END IF;
END $$;

-- ============================================================================
-- ACCOUNTS TABLE UPDATES
-- ============================================================================

-- Add tier column to accounts if not exists
ALTER TABLE IF EXISTS accounts
ADD COLUMN IF NOT EXISTS tier VARCHAR(100) NULL;

-- Create index for tier on accounts if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'accounts' AND indexname = 'idx_accounts_tier'
  ) THEN
    CREATE INDEX idx_accounts_tier ON accounts(tier);
  END IF;
END $$;

-- ============================================================================
-- LEADS TABLE UPDATES
-- ============================================================================

-- Add tier column to leads if not exists
ALTER TABLE IF EXISTS leads
ADD COLUMN IF NOT EXISTS tier VARCHAR(100) NULL;

-- Create index for tier on leads if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'leads' AND indexname = 'idx_leads_tier'
  ) THEN
    CREATE INDEX idx_leads_tier ON leads(tier);
  END IF;
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Log completion
SELECT 'Production schema update completed successfully - all new columns and indexes are in place' as status;
