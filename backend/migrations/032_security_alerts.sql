-- ============================================================================
-- Security alerts: suspicious login activity, raised for admins
-- ============================================================================
-- Each alert is a row here and an in-app notification (type SecurityAlert) for
-- every active Admin. Repeats of the same rule for the same subject are
-- suppressed for an hour.
-- Safe to run multiple times.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

SELECT '✅ Security alerts ready' as status;
