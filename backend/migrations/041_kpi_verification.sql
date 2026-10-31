-- Daily KPI verification: each KPI has a target, a weight (the weights add up to 1.0) and an
-- achieved value calculated from the CRM. The supervisor enters a value and remarks beside it,
-- and approves the day. Idempotent.
-- Also included in ALL_TABLES_create_if_not_exists.sql.

CREATE TABLE IF NOT EXISTS public.kpi_metric_weights (
    "metricKey" character varying(40) NOT NULL,
    label character varying(80) NOT NULL,
    target numeric(12,2) DEFAULT 1 NOT NULL,
    weight numeric(8,4) DEFAULT 0 NOT NULL,
    "updatedById" uuid,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_kpi_metric_weights" PRIMARY KEY ("metricKey"),
    CONSTRAINT "CHK_kpi_metric_weights_target" CHECK (target > 0),
    CONSTRAINT "CHK_kpi_metric_weights_weight" CHECK (weight >= 0)
);

INSERT INTO public.kpi_metric_weights ("metricKey", label, target, weight) VALUES
  ('newLeads', 'New Leads', 1, 0.2),
  ('prospects', 'Prospects', 1, 0.2),
  ('existingOpportunities', 'Existing Opportunities', 1, 0.3),
  ('demosConducted', 'Demo', 1, 0.05),
  ('statusChanges', 'Change in Status', 1, 0.05),
  ('attendance', 'Attendance', 1, 0.1),
  ('tasksAssigned', 'Tasks Assigned', 1, 0.1)
ON CONFLICT ("metricKey") DO NOTHING;

CREATE TABLE IF NOT EXISTS public.kpi_daily_verifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    day date NOT NULL,
    "metricKey" character varying(40) NOT NULL,
    "supervisorValue" numeric(12,2),
    note text,
    "updatedById" uuid,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_kpi_daily_verifications_id" PRIMARY KEY (id),
    CONSTRAINT "UQ_kpi_daily_verifications_person_day_metric" UNIQUE ("userId", day, "metricKey"),
    CONSTRAINT "CHK_kpi_daily_verifications_nonnegative" CHECK ("supervisorValue" IS NULL OR "supervisorValue" >= 0)
);

CREATE TABLE IF NOT EXISTS public.kpi_daily_approvals (
    "userId" uuid NOT NULL,
    day date NOT NULL,
    "approvedById" uuid NOT NULL,
    "approvedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_kpi_daily_approvals" PRIMARY KEY ("userId", day)
);
