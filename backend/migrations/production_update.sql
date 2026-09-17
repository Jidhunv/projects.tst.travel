-- Production-Safe Schema Update
-- This script adds new columns and indexes only if they don't already exist
-- Safe to run multiple times without errors

-- ============================================================================
-- OPPORTUNITIES TABLE UPDATES
-- ============================================================================

-- Add expectedCloseMonth column if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'expectedCloseMonth'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN "expectedCloseMonth" VARCHAR(7) NULL;

    -- Backfill expectedCloseMonth from forecastedCloseDate for existing records
    UPDATE opportunities
    SET "expectedCloseMonth" = TO_CHAR("forecastedCloseDate", 'YYYY-MM')
    WHERE "forecastedCloseDate" IS NOT NULL AND "expectedCloseMonth" IS NULL;
  END IF;
END $$;

-- Create index for expectedCloseMonth if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_name = 'opportunities' AND index_name = 'idx_opportunities_expected_close_month'
  ) THEN
    CREATE INDEX idx_opportunities_expected_close_month ON opportunities("expectedCloseMonth");
  END IF;
END $$;

-- Add city column if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'city'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN city VARCHAR(255) NULL;
  END IF;
END $$;

-- Create index for city if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_name = 'opportunities' AND index_name = 'idx_opportunities_city'
  ) THEN
    CREATE INDEX idx_opportunities_city ON opportunities(city);
  END IF;
END $$;

-- Add tier column to opportunities if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'tier'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN tier VARCHAR(100) NULL;
  END IF;
END $$;

-- Create index for tier on opportunities if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_name = 'opportunities' AND index_name = 'idx_opportunities_tier'
  ) THEN
    CREATE INDEX idx_opportunities_tier ON opportunities(tier);
  END IF;
END $$;

-- ============================================================================
-- ACCOUNTS TABLE UPDATES
-- ============================================================================

-- Add tier column to accounts if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'tier'
  ) THEN
    ALTER TABLE accounts ADD COLUMN tier VARCHAR(100) NULL;
  END IF;
END $$;

-- Create index for tier on accounts if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_name = 'accounts' AND index_name = 'idx_accounts_tier'
  ) THEN
    CREATE INDEX idx_accounts_tier ON accounts(tier);
  END IF;
END $$;

-- ============================================================================
-- LEADS TABLE UPDATES
-- ============================================================================

-- Add tier column to leads if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'tier'
  ) THEN
    ALTER TABLE leads ADD COLUMN tier VARCHAR(100) NULL;
  END IF;
END $$;

-- Create index for tier on leads if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_name = 'leads' AND index_name = 'idx_leads_tier'
  ) THEN
    CREATE INDEX idx_leads_tier ON leads(tier);
  END IF;
END $$;

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Log completion
SELECT 'Production schema update completed successfully' as status;
