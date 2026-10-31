-- Daily KPI targets set by the supervisor for each person. A person without a target for a KPI
-- uses the default target in kpi_metric_weights. Idempotent.
-- Also included in ALL_TABLES_create_if_not_exists.sql.

CREATE TABLE IF NOT EXISTS public.kpi_person_targets (
    "userId" uuid NOT NULL,
    "metricKey" character varying(40) NOT NULL,
    target numeric(12,2) NOT NULL,
    "updatedById" uuid,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_kpi_person_targets" PRIMARY KEY ("userId", "metricKey"),
    CONSTRAINT "CHK_kpi_person_targets_target" CHECK (target > 0)
);
