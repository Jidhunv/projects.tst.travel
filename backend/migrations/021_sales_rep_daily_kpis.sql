-- ============================================================================
-- Daily KPIs for the Sales Rep role (run after 020_kpi_master.sql)
-- ============================================================================
-- 1. Grants the Sales Rep role the `kpis` privilege at "self" scope
--    (read / create / update - not delete, so entries can be corrected but the
--    audit trail stays meaningful). Requires the permission rows, which the
--    backend creates on startup (ensurePermissions) - restart it first.
-- 2. Gives every current Sales Rep user the standard daily KPI set below.
--    Skips KPIs a user already has (matched on name), so it is safe to re-run
--    after hiring: new Sales Rep users get the set the next time it runs.
-- ============================================================================
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
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
-- The standard questions go into the KPI master first.
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
