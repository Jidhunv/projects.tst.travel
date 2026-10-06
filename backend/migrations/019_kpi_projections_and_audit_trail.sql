-- ============================================================================
-- Monthly projections + KPI audit trail
-- ============================================================================
--   kpi_projections  - a staff member's projected figure for a month and metric
--                      (won_value | opportunity_value). One current row per
--                      (user, month, metric); every revision is kept in the trail.
--   kpi_audit_trail  - append-only before/after history of KPI entries and
--                      projections: who changed what, when. Deliberately has no
--                      foreign keys so history outlives deleted entries/KPIs.
-- Safe to run multiple times.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS kpi_projections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    month DATE NOT NULL,                       -- first day of the month
    metric VARCHAR(32) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    note TEXT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", month, metric)
);
CREATE INDEX IF NOT EXISTS idx_kpi_projections_month ON kpi_projections(month);

CREATE TABLE IF NOT EXISTS kpi_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "entityType" VARCHAR(32) NOT NULL,         -- kpi_entry | projection
    "entityId" UUID NOT NULL,
    "subjectUserId" UUID NOT NULL,             -- whose figure it is
    "actorId" UUID NULL,                       -- who made the change
    action VARCHAR(16) NOT NULL,               -- created | updated | deleted
    "before" JSONB NULL,
    "after" JSONB NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kpi_audit_subject ON kpi_audit_trail("subjectUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_audit_entity ON kpi_audit_trail("entityType", "entityId");
