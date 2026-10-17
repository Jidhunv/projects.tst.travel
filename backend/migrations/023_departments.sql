-- ============================================================================
-- Departments: which function a role / person works in
-- ============================================================================
-- roles.departments  - the departments a role belongs to (e.g. Development)
-- users.departments  - optional per-person override; empty = use the role's
-- Stored as comma-separated text (TypeORM "simple-array"). Used first to decide who
-- can be assigned issues (Development). Safe to run multiple times.
-- ============================================================================
ALTER TABLE roles ADD COLUMN IF NOT EXISTS departments TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS departments TEXT NULL;

-- The built-in Sales Rep role is a sales function.
UPDATE roles SET departments = 'Sales' WHERE name = 'Sales Rep' AND (departments IS NULL OR departments = '');
