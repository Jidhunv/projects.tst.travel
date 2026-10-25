-- ============================================================================
-- KPI weightage per staff assignment
-- ============================================================================
-- Each KPI assigned to a person can carry a weightage (percent). The weights of a
-- person's active KPIs should total 100; the KPI report shows the total and a
-- weighted score. Null means the KPI has no weight (it is not counted).
-- Safe to run multiple times.
-- ============================================================================

ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS weightage NUMERIC(5,2) NULL;

SELECT '✅ KPI weightage column ready' as status;
