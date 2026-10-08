-- ============================================================================
-- KPI Master: the approved list of KPI questions
-- ============================================================================
-- Staff KPIs (kpi_definitions) are now assigned FROM this master instead of
-- being typed free-hand. The master owns the question wording, answer type and
-- unit; each assignment keeps its own frequency, target and active flag.
-- Existing definitions are backfilled into the master (one row per distinct
-- question) and linked. Safe to run multiple times.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS kpi_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    type VARCHAR(16) NOT NULL DEFAULT 'number',
    unit VARCHAR(32) NULL,
    "defaultFrequency" VARCHAR(16) NOT NULL DEFAULT 'daily',
    "defaultTarget" NUMERIC(15,2) NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_kpi_master_name ON kpi_master (LOWER(name));

ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS "masterId" UUID NULL;
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_master ON kpi_definitions("masterId");

-- Backfill: one master row per distinct existing question (first wins on clashes).
INSERT INTO kpi_master (name, description, type, unit, "defaultFrequency", "defaultTarget")
SELECT DISTINCT ON (LOWER(d.name)) d.name, d.description, d.type, d.unit, d.frequency, d."targetValue"
FROM kpi_definitions d
WHERE NOT EXISTS (SELECT 1 FROM kpi_master m WHERE LOWER(m.name) = LOWER(d.name))
ORDER BY LOWER(d.name), d."createdAt";

UPDATE kpi_definitions d SET "masterId" = m.id
FROM kpi_master m
WHERE d."masterId" IS NULL AND LOWER(m.name) = LOWER(d.name);

-- Effective start date of each assignment: a KPI only counts (targets, missed
-- reporting days, entries) from this date. Existing rows start on their creation date.
ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS "startDate" DATE NOT NULL DEFAULT CURRENT_DATE;
UPDATE kpi_definitions SET "startDate" = "createdAt"::date WHERE "startDate" = CURRENT_DATE AND "createdAt"::date < CURRENT_DATE;

-- Answer choices for 'choice' questions: the allowed answers staff pick from (JSON array of strings).
ALTER TABLE kpi_master ADD COLUMN IF NOT EXISTS "answerOptions" JSONB NULL;
