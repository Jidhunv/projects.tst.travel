-- ============================================================================
-- Sales targets + staff KPI tracking
-- ============================================================================
--   sales_targets   - a target value over a date range, for one owner or (ownerId
--                     NULL) the whole team. metric: won_value | opportunity_value
--   kpi_definitions - a question/figure an admin asks one staff member to report
--   kpi_entries     - the answers staff submit, dated, optionally against a prospect
-- Safe to run multiple times.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sales_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    metric VARCHAR(32) NOT NULL DEFAULT 'won_value',
    "ownerId" UUID NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "targetValue" NUMERIC(15,2) NOT NULL,
    "createdById" UUID NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_targets_owner ON sales_targets("ownerId");
CREATE INDEX IF NOT EXISTS idx_sales_targets_range ON sales_targets("startDate", "endDate");

CREATE TABLE IF NOT EXISTS kpi_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    type VARCHAR(16) NOT NULL DEFAULT 'number',
    unit VARCHAR(32) NULL,
    "userId" UUID NOT NULL,
    frequency VARCHAR(16) NOT NULL DEFAULT 'weekly',
    "targetValue" NUMERIC(15,2) NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdById" UUID NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_user ON kpi_definitions("userId");

CREATE TABLE IF NOT EXISTS kpi_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "kpiId" UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL,
    "entryDate" DATE NOT NULL,
    "numberValue" NUMERIC(15,2) NULL,
    "textValue" TEXT NULL,
    "accountId" UUID NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kpi_entries_kpi_date ON kpi_entries("kpiId", "entryDate");
CREATE INDEX IF NOT EXISTS idx_kpi_entries_user_date ON kpi_entries("userId", "entryDate");
