-- ============================================================================
-- Login activity log: successful and failed logins, lockouts and logouts
-- ============================================================================
-- Kept for 365 days (LOGIN_ACTIVITY_RETENTION_DAYS, default 365); older rows are
-- deleted by the app. Location columns are filled only when MAXMIND_DB_PATH points
-- at a GeoLite2-City database. MAC addresses cannot be read by a web server, so
-- they are not stored.
-- Safe to run multiple times.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

SELECT '✅ Login activity log ready' as status;
