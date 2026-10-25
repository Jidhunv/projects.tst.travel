-- ============================================================================
-- Account onboarding profile + company type master
-- ============================================================================
-- Questions asked when onboarding a customer:
--   companyTypeId   - what kind of company it is (from the Company Type master)
--   isB2B           - is it B2B?
--   isRetail        - is it retail or not?
--   primaryBusiness - their prominent business
--   employeeCount   - how many employees they have
--   branchLocations - where their branches are (one entry per branch)
-- The closing-stage dates (onboardingCompletedDate, contractSignedDate, goLiveDate)
-- are no longer asked on onboarding. Their columns are left in place; the app just
-- stops reading and writing them.
-- Safe to run multiple times.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- Company Type master (editable by admins through the Company Type Master page)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_company_types_name ON company_types(name);

INSERT INTO company_types (name) VALUES
    ('Corporate'), ('Government'), ('Non-profit'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Onboarding profile columns on accounts
-- ----------------------------------------------------------------------------
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "companyTypeId" UUID REFERENCES company_types(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "isB2B" BOOLEAN;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "isRetail" BOOLEAN;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "primaryBusiness" VARCHAR(255);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "employeeCount" INTEGER;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "branchLocations" TEXT[];

SELECT '✅ Account onboarding profile and company type master ready' as status;
