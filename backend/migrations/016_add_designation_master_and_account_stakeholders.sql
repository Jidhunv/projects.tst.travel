-- ============================================================================
-- Designation Master + Account Stakeholders (buying-committee onboarding)
-- ============================================================================
-- Adds:
--   designations           - master list of job designations
--   account_stakeholders   - one row per (account, role) mapping a person's
--                             name + designation to one of the 8 fixed
--                             buying-committee roles (Champion, Coach,
--                             Blocker, Decision Maker, Influencer, Economic
--                             Buyer, End User, Gatekeeper). An account's
--                             "onboarding" is complete once all 8 roles have
--                             a name + designation filled in.
-- Safe to run multiple times.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DESIGNATIONS TABLE (Master data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_designations_name ON designations(name);

-- ============================================================================
-- ACCOUNT STAKEHOLDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS account_stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    "designationId" UUID REFERENCES designations(id),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("accountId", role)
);

CREATE INDEX IF NOT EXISTS idx_account_stakeholders_accountId ON account_stakeholders("accountId");
CREATE INDEX IF NOT EXISTS idx_account_stakeholders_designationId ON account_stakeholders("designationId");

-- ============================================================================
-- Seed a starter set of common designations (skipped if already present)
-- ============================================================================
INSERT INTO designations (name) VALUES
    ('CEO'), ('CFO'), ('COO'), ('CTO'),
    ('VP Sales'), ('VP Operations'), ('VP Finance'),
    ('Procurement Manager'), ('IT Manager'), ('Operations Manager'),
    ('Finance Manager'), ('Travel Manager'), ('Executive Assistant'),
    ('Team Lead'), ('Analyst'), ('Other')
ON CONFLICT (name) DO NOTHING;

SELECT '✅ Designation Master and Account Stakeholders tables ready' as status;
