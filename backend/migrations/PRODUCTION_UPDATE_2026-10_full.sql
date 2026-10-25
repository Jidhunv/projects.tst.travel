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
--                  kpi_projections, kpi_audit_trail, ticket_issues, ticket_issue_history,
--                  opportunity_answers, opportunity_answer_history
--   NEW COLUMNS    roles.departments, users.departments
--   PERMISSIONS    modules targets, kpis, kpi_setup, issue_log (granted to Admin)
--   OPTIONAL DATA  section 9: Sales Rep KPI access + the standard daily KPI set
--   CHECK          section 10 lists anything still missing (it should return no rows)
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
             ('issue_log', 'client issues'),
             ('questionnaire', 'opportunity stage questions')) AS m(module, label)
CROSS JOIN (VALUES ('read'), ('create'), ('update'), ('delete')) AS a(action)
CROSS JOIN (VALUES ('all'), ('self')) AS s(scope)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.module = m.module AND p.action = a.action AND p.scope = s.scope);

-- The Admin role always holds every permission.
INSERT INTO role_permissions ("roleId", "permissionId", module, action, scope)
SELECT r.id, p.id, p.module, p.action, p.scope
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Admin' AND p.module IN ('targets', 'kpis', 'kpi_setup', 'issue_log', 'questionnaire')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp."roleId" = r.id AND rp."permissionId" = p.id);

-- Keep the copied module/action/scope columns filled for any rows that were added without them.
UPDATE role_permissions rp SET module = p.module, action = p.action, scope = p.scope
FROM permissions p
WHERE rp."permissionId" = p.id AND p.module IN ('targets', 'kpis', 'kpi_setup', 'issue_log', 'questionnaire') AND rp.module IS NULL;

-- ----------------------------------------------------------------------------
-- 8. Opportunity questionnaire (answers per stage, with full change history)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunity_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "opportunityId" UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    "questionKey" VARCHAR(32) NOT NULL,
    value TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'answered',     -- answered | unknown
    "updatedById" UUID NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("opportunityId", "questionKey")
);
CREATE INDEX IF NOT EXISTS idx_opportunity_answers_opp ON opportunity_answers("opportunityId");

CREATE TABLE IF NOT EXISTS opportunity_answer_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "opportunityId" UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    "questionKey" VARCHAR(32) NOT NULL,
    "oldValue" TEXT NULL,
    "newValue" TEXT NULL,
    "oldStatus" VARCHAR(16) NULL,
    "newStatus" VARCHAR(16) NULL,
    note TEXT NULL,
    "actorId" UUID NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_opportunity_answer_history_opp ON opportunity_answer_history("opportunityId", "questionKey", "createdAt");

-- ----------------------------------------------------------------------------
-- 8b. Question master (editable stage questions; who may edit = `questionnaire` privilege)
--     The backend also creates this table and seeds the starting questions at startup,
--     and never overwrites a question that has been edited since.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "questionKey" VARCHAR(32) NOT NULL UNIQUE,
    stage VARCHAR(40) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    text TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'text',
    mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    options JSONB NULL,
    help TEXT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_questions_stage ON questions(stage, position);

-- ----------------------------------------------------------------------------
-- 8c. Opportunity stage history (timeline of every stage a deal has been in)
--     Existing deals get one backfilled entry for their current stage, dated from creation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunity_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "opportunityId" UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    "fromStage" VARCHAR(40) NULL,
    "toStage" VARCHAR(40) NOT NULL,
    "actorId" UUID NULL,
    note TEXT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_opportunity_stage_history_opp ON opportunity_stage_history("opportunityId", "createdAt");

INSERT INTO opportunity_stage_history ("opportunityId", "fromStage", "toStage", "actorId", note, "createdAt")
SELECT o.id, NULL, o.stage, o."ownerId",
       'Recorded before stage history started - earlier moves are unknown', o."createdAt"
FROM opportunities o
WHERE NOT EXISTS (SELECT 1 FROM opportunity_stage_history h WHERE h."opportunityId" = o.id);

-- ----------------------------------------------------------------------------
-- 8d. Lead status history (when a lead was qualified, converted or disqualified)
--     Existing leads get backfilled entries from their own fields (dates approximate).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "leadId" UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    "fromStatus" VARCHAR(20) NULL,
    "toStatus" VARCHAR(20) NOT NULL,
    "actorId" UUID NULL,
    note TEXT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON lead_status_history("leadId", "createdAt");

INSERT INTO lead_status_history ("leadId", "fromStatus", "toStatus", "actorId", note, "createdAt")
SELECT l.id, NULL, 'Open', l."ownerId", 'Backfilled from the lead creation date', l."createdAt"
FROM leads l
WHERE NOT EXISTS (SELECT 1 FROM lead_status_history h WHERE h."leadId" = l.id);

INSERT INTO lead_status_history ("leadId", "fromStatus", "toStatus", "actorId", note, "createdAt")
SELECT l.id, 'Open', l.status, l."ownerId",
       'Backfilled - date approximated from the lead''s last update', l."updatedAt"
FROM leads l
WHERE l.status IN ('Qualified', 'Converted', 'Disqualified')
  AND NOT EXISTS (SELECT 1 FROM lead_status_history h WHERE h."leadId" = l.id AND h."toStatus" = l.status);

-- ----------------------------------------------------------------------------
-- 8e. Designations and buying committee (one row per account and role).
--     Each named member carries an email and a phone number (migration 027).
--     Accounts without a named member are highlighted in lead and opportunity lists.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_designations_name ON designations(name);

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
ALTER TABLE account_stakeholders ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE account_stakeholders ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

INSERT INTO designations (name) VALUES
    ('CEO'), ('CFO'), ('COO'), ('CTO'),
    ('VP Sales'), ('VP Operations'), ('VP Finance'),
    ('Procurement Manager'), ('IT Manager'), ('Operations Manager'),
    ('Finance Manager'), ('Travel Manager'), ('Executive Assistant'),
    ('Team Lead'), ('Analyst'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8f. Company Type master and account onboarding profile (migration 028)
--     Company types are managed in Company Type Master; accounts pick one on onboarding.
--     The closing-stage dates (onboardingCompletedDate, contractSignedDate, goLiveDate)
--     are no longer asked, and their columns are left in place.
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

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "companyTypeId" UUID REFERENCES company_types(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "isB2B" BOOLEAN;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "isRetail" BOOLEAN;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "primaryBusiness" VARCHAR(255);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "employeeCount" INTEGER;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "branchLocations" TEXT[];

-- ----------------------------------------------------------------------------
-- 8g. KPI weightage per staff assignment (migration 029)
--     Each person's active KPI weights should total 100%. Null = not weighted.
-- ----------------------------------------------------------------------------
ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS weightage NUMERIC(5,2) NULL;

-- ----------------------------------------------------------------------------
-- 8h. Login activity log, location coordinates and security alerts
--     (migrations 030, 031, 032). Rows older than 365 days are removed by the app.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    "emailTried" VARCHAR(255) NULL,
    event VARCHAR(30) NOT NULL,
    success BOOLEAN NOT NULL,
    reason VARCHAR(255) NULL,
    "ipAddress" VARCHAR(64) NULL,
    "userAgent" VARCHAR(500) NULL,
    country VARCHAR(100) NULL,
    region VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_activity_user ON login_activity("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_login_activity_created ON login_activity("createdAt");
ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6) NULL;
ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6) NULL;

ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'SecurityAlert';

CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ruleCode" VARCHAR(40) NOT NULL,
    severity VARCHAR(10) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    details JSONB NULL,
    "userId" UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP NULL,
    "acknowledgedById" UUID NULL REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts("createdAt");
CREATE INDEX IF NOT EXISTS idx_security_alerts_rule ON security_alerts("ruleCode", subject, "createdAt");

-- ----------------------------------------------------------------------------
-- 8i. Prospecting answers, Prospect Options master, prospect timestamps and
--     lead qualification answers on accounts (migrations 033, 034, 035, 036).
--     Needed before the current application code runs: the accounts list reads these columns.
-- ----------------------------------------------------------------------------
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "prospectingAnswers" JSONB NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "prospectedAt" TIMESTAMPTZ NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "prospectingUpdatedAt" TIMESTAMPTZ NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "leadQualification" JSONB NULL;

CREATE TABLE IF NOT EXISTS prospect_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_prospect_option UNIQUE (category, name)
);
INSERT INTO prospect_options (category, name) VALUES
    ('businessType', 'Retail'),
    ('businessType', 'B2B'),
    ('businessType', 'Corporate'),
    ('employeeBand', '1-10'),
    ('employeeBand', '11-50'),
    ('employeeBand', '51-200'),
    ('employeeBand', '201-500'),
    ('employeeBand', '501-1000'),
    ('employeeBand', '1000+')
ON CONFLICT (category, name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. OPTIONAL DATA: Sales Rep KPI access and the standard daily KPI set
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
-- 10. CHECK: anything listed here is still missing (no rows = everything is in place)
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
  ('questions','id'),('questions','questionKey'),('questions','stage'),('questions','position'),('questions','text'),('questions','type'),('questions','mandatory'),('questions','options'),('questions','help'),('questions','isActive'),
  ('company_types','id'),('company_types','name'),('company_types','isActive'),
  ('accounts','companyTypeId'),('accounts','isB2B'),('accounts','isRetail'),('accounts','primaryBusiness'),('accounts','employeeCount'),('accounts','branchLocations'),
  ('kpi_definitions','weightage'),
  ('login_activity','id'),('login_activity','userId'),('login_activity','emailTried'),('login_activity','event'),('login_activity','success'),('login_activity','reason'),('login_activity','ipAddress'),('login_activity','userAgent'),('login_activity','country'),('login_activity','region'),('login_activity','city'),('login_activity','latitude'),('login_activity','longitude'),('login_activity','createdAt'),
  ('security_alerts','id'),('security_alerts','ruleCode'),('security_alerts','severity'),('security_alerts','subject'),('security_alerts','summary'),('security_alerts','details'),('security_alerts','userId'),('security_alerts','createdAt'),('security_alerts','acknowledgedAt'),('security_alerts','acknowledgedById'),
  ('accounts','prospectingAnswers'),('accounts','prospectedAt'),('accounts','prospectingUpdatedAt'),('accounts','leadQualification'),
  ('prospect_options','id'),('prospect_options','category'),('prospect_options','name'),('prospect_options','isActive'),
  ('lead_status_history','id'),('lead_status_history','leadId'),('lead_status_history','fromStatus'),('lead_status_history','toStatus'),('lead_status_history','actorId'),('lead_status_history','note'),('lead_status_history','createdAt'),
  ('designations','id'),('designations','name'),('designations','isActive'),
  ('account_stakeholders','id'),('account_stakeholders','accountId'),('account_stakeholders','role'),('account_stakeholders','name'),('account_stakeholders','email'),('account_stakeholders','phone'),('account_stakeholders','designationId'),
  ('opportunity_stage_history','id'),('opportunity_stage_history','opportunityId'),('opportunity_stage_history','fromStage'),('opportunity_stage_history','toStage'),('opportunity_stage_history','actorId'),('opportunity_stage_history','note'),('opportunity_stage_history','createdAt'),
  ('opportunity_answers','id'),('opportunity_answers','opportunityId'),('opportunity_answers','questionKey'),('opportunity_answers','value'),('opportunity_answers','status'),('opportunity_answers','updatedById'),('opportunity_answers','updatedAt'),
  ('opportunity_answer_history','id'),('opportunity_answer_history','opportunityId'),('opportunity_answer_history','questionKey'),('opportunity_answer_history','oldValue'),('opportunity_answer_history','newValue'),('opportunity_answer_history','oldStatus'),('opportunity_answer_history','newStatus'),('opportunity_answer_history','note'),('opportunity_answer_history','actorId'),('opportunity_answer_history','createdAt'),
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
UNION ALL SELECT 'opportunity_answers', COUNT(*)::text FROM opportunity_answers
UNION ALL SELECT 'kpi_entries', COUNT(*)::text FROM kpi_entries
UNION ALL SELECT 'kpi_projections', COUNT(*)::text FROM kpi_projections
UNION ALL SELECT 'kpi_audit_trail', COUNT(*)::text FROM kpi_audit_trail
UNION ALL SELECT 'ticket_issues', COUNT(*)::text FROM ticket_issues
UNION ALL SELECT 'ticket_issue_history', COUNT(*)::text FROM ticket_issue_history
UNION ALL SELECT 'permissions: ' || module || ' (should be 8)', COUNT(*)::text FROM permissions WHERE module IN ('targets','kpis','kpi_setup','issue_log','questionnaire') GROUP BY module
UNION ALL SELECT 'roles with a department', COUNT(*)::text FROM roles WHERE COALESCE(departments, '') <> ''
ORDER BY 1;
