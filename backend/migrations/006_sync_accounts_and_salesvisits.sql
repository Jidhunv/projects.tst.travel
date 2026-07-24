-- 006: Reconcile production schema with the entity models.
--
-- Symptom this fixes: 500 Internal Server Error on account creation and on
-- GET /api/sales-visits?showPendingOnly=true. Root cause is schema drift --
-- columns present in the TypeORM entities were never added to the production
-- database (which is built from manual SQL migrations, not `synchronize`).
--
-- This script is IDEMPOTENT and additive-only. It is safe to run repeatedly and
-- on any environment: it never drops data, only adds missing columns and fixes
-- three mis-cased sales_visits columns.

-- ---------------------------------------------------------------------------
-- accounts: add every column the Account entity expects, if missing.
-- camelCase identifiers MUST be double-quoted or Postgres folds them lowercase.
-- ---------------------------------------------------------------------------
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS industry                 character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS size                     character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS website                  character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "phoneNumber"            character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "alternatePhoneNumber"   character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email                    character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS remark                   character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS type                     character varying NOT NULL DEFAULT 'Prospect';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status                   character varying NOT NULL DEFAULT 'Prospect';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "billingStreet"          character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "billingCity"            character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "billingState"           character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "billingZip"             character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "billingCountry"         character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "shippingStreet"         character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "shippingCity"           character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "shippingState"          character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "shippingZip"            character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "shippingCountry"        character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tags                     character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "onboardingStatus"       character varying NOT NULL DEFAULT 'Not Started';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "onboardingDate"         timestamp without time zone;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "onboardingCompletedDate" timestamp without time zone;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "onboardingNotes"        character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "contractSignedDate"     timestamp without time zone;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "goLiveDate"             timestamp without time zone;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "accountManager"         character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "billingContact"         character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "technicalContact"       character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "contactPerson"          character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS city                     character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS region                   character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS country                  character varying;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "assigneeIds"            text;

-- Unique constraint on email (multiple NULLs are allowed, so this is safe as
-- long as no two existing rows share a non-null email). Guarded so re-runs pass.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UQ_accounts_email'
  ) AND NOT EXISTS (
    -- skip if a differently-named unique already covers email
    SELECT 1 FROM pg_indexes WHERE tablename = 'accounts' AND indexdef ILIKE '%(email)%' AND indexdef ILIKE '%UNIQUE%'
  ) THEN
    BEGIN
      ALTER TABLE accounts ADD CONSTRAINT "UQ_accounts_email" UNIQUE (email);
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'Skipping UQ_accounts_email: duplicate emails exist; clean them first.';
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- sales_visits: fix mis-cased followup columns (lowercase -> camelCase) and
-- add any that are missing entirely. Handles all three states per column:
-- correct already / mis-cased / absent.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- followupDate
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_visits' AND column_name='followupdate')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_visits' AND column_name='followupDate') THEN
    ALTER TABLE sales_visits RENAME COLUMN followupdate TO "followupDate";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_visits' AND column_name='followupDate') THEN
    ALTER TABLE sales_visits ADD COLUMN "followupDate" timestamp without time zone;
  END IF;

  -- followupCompleted
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_visits' AND column_name='followupcompleted')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_visits' AND column_name='followupCompleted') THEN
    ALTER TABLE sales_visits RENAME COLUMN followupcompleted TO "followupCompleted";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_visits' AND column_name='followupCompleted') THEN
    ALTER TABLE sales_visits ADD COLUMN "followupCompleted" boolean NOT NULL DEFAULT false;
  END IF;

  -- followupNotes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_visits' AND column_name='followupnotes')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_visits' AND column_name='followupNotes') THEN
    ALTER TABLE sales_visits RENAME COLUMN followupnotes TO "followupNotes";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_visits' AND column_name='followupNotes') THEN
    ALTER TABLE sales_visits ADD COLUMN "followupNotes" text;
  END IF;
END $$;
