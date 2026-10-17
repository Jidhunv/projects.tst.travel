-- ============================================================================
-- FULL SCHEMA UPDATE  (migrations 018 - 023 in one safe, repeatable script)
-- ============================================================================
-- Run in pgAdmin against the production database (Query Tool -> paste -> Run).
-- Every statement is "create if not exists / add column if not exists", so it is
-- safe to run more than once and safe on a database that already has some of it.
-- It never drops or rewrites existing data.
--
-- What it adds
--   NEW TABLES     sales_targets, kpi_master, kpi_definitions, kpi_entries,
--                  kpi_projections, kpi_audit_trail, ticket_issues, ticket_issue_history
--   NEW COLUMNS    roles.departments, users.departments
--   PERMISSIONS    modules targets, kpis, kpi_setup, issue_log (granted to Admin)
--   OPTIONAL DATA  section 8: Sales Rep KPI access + the standard daily KPI set
--   CHECK          section 9 lists anything still missing (it should return no rows)
--
-- Run it BEFORE starting the new backend, then restart the backend.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Sales targets (Targets & Performance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    metric VARCHAR(32) NOT NULL DEFAULT 'won_value',      -- won_value | opportunity_value
    "ownerId" UUID NULL,                                  -- NULL = whole team
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "targetValue" NUMERIC(15,2) NOT NULL,
    "createdById" UUID NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_targets_owner ON sales_targets("ownerId");
CREATE INDEX IF NOT EXISTS idx_sales_targets_range ON sales_targets("startDate", "endDate");

-- ----------------------------------------------------------------------------
-- 2. KPI master: the approved list of KPI questions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kpi_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    type VARCHAR(16) NOT NULL DEFAULT 'number',           -- number | yes_no | text | choice
    unit VARCHAR(32) NULL,
    "defaultFrequency" VARCHAR(16) NOT NULL DEFAULT 'daily',
    "defaultTarget" NUMERIC(15,2) NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE kpi_master ADD COLUMN IF NOT EXISTS "answerOptions" JSONB NULL;   -- allowed answers for 'choice' questions
CREATE UNIQUE INDEX IF NOT EXISTS uq_kpi_master_name ON kpi_master (LOWER(name));

-- ----------------------------------------------------------------------------
-- 3. KPI definitions: a master question assigned to one staff member
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kpi_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    type VARCHAR(16) NOT NULL DEFAULT 'number',
    unit VARCHAR(32) NULL,
    "userId" UUID NOT NULL,
    frequency VARCHAR(16) NOT NULL DEFAULT 'weekly',      -- daily | weekly | monthly
    "targetValue" NUMERIC(15,2) NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdById" UUID NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS "masterId" UUID NULL;
ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS "startDate" DATE NOT NULL DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_user ON kpi_definitions("userId");
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_master ON kpi_definitions("masterId");

-- Existing assignments start on the day they were created (only touches rows still on the default).
UPDATE kpi_definitions SET "startDate" = "createdAt"::date
WHERE "startDate" = CURRENT_DATE AND "createdAt"::date < CURRENT_DATE;

-- Turn any existing free-text KPIs into master questions and link them.
INSERT INTO kpi_master (name, description, type, unit, "defaultFrequency", "defaultTarget")
SELECT DISTINCT ON (LOWER(d.name)) d.name, d.description, d.type, d.unit, d.frequency, d."targetValue"
FROM kpi_definitions d
WHERE NOT EXISTS (SELECT 1 FROM kpi_master m WHERE LOWER(m.name) = LOWER(d.name))
ORDER BY LOWER(d.name), d."createdAt";

UPDATE kpi_definitions d SET "masterId" = m.id
FROM kpi_master m
WHERE d."masterId" IS NULL AND LOWER(m.name) = LOWER(d.name);

-- ----------------------------------------------------------------------------
-- 4. KPI entries (daily answers), projections (monthly), and the audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kpi_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "kpiId" UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL,
    "entryDate" DATE NOT NULL,
    "numberValue" NUMERIC(15,2) NULL,
    "textValue" TEXT NULL,
    "accountId" UUID NULL,                                -- the prospect it was about
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kpi_entries_kpi_date ON kpi_entries("kpiId", "entryDate");
CREATE INDEX IF NOT EXISTS idx_kpi_entries_user_date ON kpi_entries("userId", "entryDate");

CREATE TABLE IF NOT EXISTS kpi_projections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    month DATE NOT NULL,                                  -- first day of the month
    metric VARCHAR(32) NOT NULL,                          -- won_value | opportunity_value
    amount NUMERIC(15,2) NOT NULL,
    note TEXT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", month, metric)
);
CREATE INDEX IF NOT EXISTS idx_kpi_projections_month ON kpi_projections(month);

CREATE TABLE IF NOT EXISTS kpi_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "entityType" VARCHAR(32) NOT NULL,                    -- kpi_entry | projection
    "entityId" UUID NOT NULL,
    "subjectUserId" UUID NOT NULL,
    "actorId" UUID NULL,
    action VARCHAR(16) NOT NULL,                          -- created | updated | deleted
    "before" JSONB NULL,
    "after" JSONB NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kpi_audit_subject ON kpi_audit_trail("subjectUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_audit_entity ON kpi_audit_trail("entityType", "entityId");

-- ----------------------------------------------------------------------------
-- 5. Client issue log (items inside a ticket)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketId" UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    "issueNumber" INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'Medium',
    stage VARCHAR(40) NOT NULL DEFAULT 'Logged',          -- Logged | Under development | Testing | User acceptance | Deployed | On hold | Cancelled
    "assigneeId" UUID NULL,
    "createdById" UUID NULL,
    "closedAt" TIMESTAMP NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("ticketId", "issueNumber")
);
CREATE INDEX IF NOT EXISTS idx_ticket_issues_ticket ON ticket_issues("ticketId");
CREATE INDEX IF NOT EXISTS idx_ticket_issues_stage ON ticket_issues(stage);
CREATE INDEX IF NOT EXISTS idx_ticket_issues_assignee ON ticket_issues("assigneeId");

CREATE TABLE IF NOT EXISTS ticket_issue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "issueId" UUID NOT NULL REFERENCES ticket_issues(id) ON DELETE CASCADE,
    "fromStage" VARCHAR(40) NULL,
    "toStage" VARCHAR(40) NOT NULL,
    note TEXT NULL,
    "customerContact" VARCHAR(255) NULL,                  -- the customer who approved deployment
    "actorId" UUID NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_issue_history_issue ON ticket_issue_history("issueId", "createdAt");

-- ----------------------------------------------------------------------------
-- 6. Departments on roles and users (decides who can be assigned issues)
-- ----------------------------------------------------------------------------
ALTER TABLE roles ADD COLUMN IF NOT EXISTS departments TEXT NULL;   -- comma separated: Sales,Operations,Development,Finance,Support
ALTER TABLE users ADD COLUMN IF NOT EXISTS departments TEXT NULL;   -- optional per-person override
UPDATE roles SET departments = 'Sales' WHERE name = 'Sales Rep' AND (departments IS NULL OR departments = '');

-- ----------------------------------------------------------------------------
-- 7. Permissions for the new modules (the backend also adds these at startup)
-- ----------------------------------------------------------------------------
INSERT INTO permissions (module, action, scope, description)
SELECT m.module, a.action, s.scope,
       a.action || CASE WHEN s.scope = 'self' THEN ' own ' ELSE ' ' END || m.label
FROM (VALUES ('targets', 'sales targets'),
             ('kpis', 'staff KPI entries and projections'),
             ('kpi_setup', 'KPI definitions'),
             ('issue_log', 'client issues')) AS m(module, label)
CROSS JOIN (VALUES ('read'), ('create'), ('update'), ('delete')) AS a(action)
CROSS JOIN (VALUES ('all'), ('self')) AS s(scope)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.module = m.module AND p.action = a.action AND p.scope = s.scope);

-- The Admin role always holds every permission.
INSERT INTO role_permissions ("roleId", "permissionId", module, action, scope)
SELECT r.id, p.id, p.module, p.action, p.scope
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Admin' AND p.module IN ('targets', 'kpis', 'kpi_setup', 'issue_log')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp."roleId" = r.id AND rp."permissionId" = p.id);

-- Keep the copied module/action/scope columns filled for any rows that were added without them.
UPDATE role_permissions rp SET module = p.module, action = p.action, scope = p.scope
FROM permissions p
WHERE rp."permissionId" = p.id AND p.module IN ('targets', 'kpis', 'kpi_setup', 'issue_log') AND rp.module IS NULL;

-- ----------------------------------------------------------------------------
-- 8. OPTIONAL DATA: Sales Rep KPI access and the standard daily KPI set
--    Skip this section (delete it) if you do not want Sales Reps to have KPIs yet.
--    Safe to re-run: it only adds what is missing, so new Sales Rep users get the set
--    the next time the script is run.
-- ----------------------------------------------------------------------------
INSERT INTO role_permissions ("roleId", "permissionId", module, action, scope)
SELECT r.id, p.id, p.module, p.action, p.scope
FROM roles r
JOIN permissions p ON p.module = 'kpis' AND p.scope = 'self' AND p.action IN ('read', 'create', 'update')
WHERE r.name = 'Sales Rep'
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp."roleId" = r.id AND rp."permissionId" = p.id);

DROP TABLE IF EXISTS kpi_tpl;
CREATE TEMP TABLE kpi_tpl (name, type, unit, "targetValue", description) AS (
  VALUES
    ('New Prospect Calls (3-5)', 'number', 'calls', 3, 'Target is the daily minimum of 3; aim for 5.'),
    ('Demo Scheduled', 'number', 'demos', NULL, NULL),
    ('Proposal Sent', 'number', 'proposals', NULL, NULL),
    ('Previous day''s client calls and key outcomes', 'text', NULL, NULL, NULL),
    ('Clients and meetings planned for the day', 'text', NULL, NULL, NULL),
    ('New opportunities / important developments / Market Insights', 'text', NULL, NULL, NULL),
    ('Escalations and immediate concerns', 'text', NULL, NULL, NULL),
    ('Pending priority actions', 'text', NULL, NULL, NULL),
    ('Any support or decision required from management', 'text', NULL, NULL, NULL),
    ('Additional Support For Staff', 'text', NULL, NULL, NULL)
);

INSERT INTO kpi_master (name, description, type, unit, "defaultFrequency", "defaultTarget")
SELECT t.name, t.description, t.type, t.unit, 'daily', t."targetValue" FROM kpi_tpl t
WHERE NOT EXISTS (SELECT 1 FROM kpi_master m WHERE LOWER(m.name) = LOWER(t.name));

INSERT INTO kpi_definitions (name, description, type, unit, "userId", frequency, "targetValue", "isActive", "masterId")
SELECT m.name, m.description, m.type, m.unit, u.id, 'daily', m."defaultTarget", TRUE, m.id
FROM users u
JOIN roles r ON r.id = u."roleId" AND r.name = 'Sales Rep'
JOIN kpi_tpl t ON TRUE
JOIN kpi_master m ON LOWER(m.name) = LOWER(t.name)
WHERE NOT EXISTS (SELECT 1 FROM kpi_definitions d WHERE d."userId" = u.id AND LOWER(d.name) = LOWER(t.name));

DROP TABLE IF EXISTS kpi_tpl;

-- ----------------------------------------------------------------------------
-- 9. CHECK: anything listed here is still missing (no rows = everything is in place)
-- ----------------------------------------------------------------------------
SELECT e.table_name AS "STILL MISSING: table", e.column_name AS "column"
FROM (VALUES
  ('sales_targets','id'),('sales_targets','name'),('sales_targets','metric'),('sales_targets','ownerId'),('sales_targets','startDate'),('sales_targets','endDate'),('sales_targets','targetValue'),('sales_targets','createdById'),('sales_targets','createdAt'),('sales_targets','updatedAt'),
  ('kpi_master','id'),('kpi_master','name'),('kpi_master','description'),('kpi_master','type'),('kpi_master','unit'),('kpi_master','defaultFrequency'),('kpi_master','defaultTarget'),('kpi_master','isActive'),('kpi_master','answerOptions'),('kpi_master','createdAt'),('kpi_master','updatedAt'),
  ('kpi_definitions','id'),('kpi_definitions','name'),('kpi_definitions','description'),('kpi_definitions','type'),('kpi_definitions','unit'),('kpi_definitions','userId'),('kpi_definitions','frequency'),('kpi_definitions','targetValue'),('kpi_definitions','isActive'),('kpi_definitions','masterId'),('kpi_definitions','startDate'),('kpi_definitions','createdById'),('kpi_definitions','createdAt'),('kpi_definitions','updatedAt'),
  ('kpi_entries','id'),('kpi_entries','kpiId'),('kpi_entries','userId'),('kpi_entries','entryDate'),('kpi_entries','numberValue'),('kpi_entries','textValue'),('kpi_entries','accountId'),('kpi_entries','createdAt'),
  ('kpi_projections','id'),('kpi_projections','userId'),('kpi_projections','month'),('kpi_projections','metric'),('kpi_projections','amount'),('kpi_projections','note'),('kpi_projections','createdAt'),('kpi_projections','updatedAt'),
  ('kpi_audit_trail','id'),('kpi_audit_trail','entityType'),('kpi_audit_trail','entityId'),('kpi_audit_trail','subjectUserId'),('kpi_audit_trail','actorId'),('kpi_audit_trail','action'),('kpi_audit_trail','before'),('kpi_audit_trail','after'),('kpi_audit_trail','createdAt'),
  ('ticket_issues','id'),('ticket_issues','ticketId'),('ticket_issues','issueNumber'),('ticket_issues','title'),('ticket_issues','description'),('ticket_issues','priority'),('ticket_issues','stage'),('ticket_issues','assigneeId'),('ticket_issues','createdById'),('ticket_issues','closedAt'),('ticket_issues','createdAt'),('ticket_issues','updatedAt'),
  ('ticket_issue_history','id'),('ticket_issue_history','issueId'),('ticket_issue_history','fromStage'),('ticket_issue_history','toStage'),('ticket_issue_history','note'),('ticket_issue_history','customerContact'),('ticket_issue_history','actorId'),('ticket_issue_history','createdAt'),
  ('roles','departments'),('users','departments')
) AS e(table_name, column_name)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = e.table_name AND c.column_name = e.column_name
);

-- What now exists: row counts for the new tables and permission counts per new module
SELECT 'sales_targets' AS item, COUNT(*)::text AS value FROM sales_targets
UNION ALL SELECT 'kpi_master (questions)', COUNT(*)::text FROM kpi_master
UNION ALL SELECT 'kpi_definitions (assignments)', COUNT(*)::text FROM kpi_definitions
UNION ALL SELECT 'kpi_definitions not linked to a master (should be 0)', COUNT(*)::text FROM kpi_definitions WHERE "masterId" IS NULL
UNION ALL SELECT 'kpi_entries', COUNT(*)::text FROM kpi_entries
UNION ALL SELECT 'kpi_projections', COUNT(*)::text FROM kpi_projections
UNION ALL SELECT 'kpi_audit_trail', COUNT(*)::text FROM kpi_audit_trail
UNION ALL SELECT 'ticket_issues', COUNT(*)::text FROM ticket_issues
UNION ALL SELECT 'ticket_issue_history', COUNT(*)::text FROM ticket_issue_history
UNION ALL SELECT 'permissions: ' || module || ' (should be 8)', COUNT(*)::text FROM permissions WHERE module IN ('targets','kpis','kpi_setup','issue_log') GROUP BY module
UNION ALL SELECT 'roles with a department', COUNT(*)::text FROM roles WHERE COALESCE(departments, '') <> ''
ORDER BY 1;
