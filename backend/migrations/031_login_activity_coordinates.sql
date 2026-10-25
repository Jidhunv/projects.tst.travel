-- ============================================================================
-- Login activity: latitude and longitude of the IP location
-- ============================================================================
-- Filled from the same lookup as country, region and city (ip-api.com when
-- GEO_LOOKUP=ipapi, or a local GeoLite2-City database).
-- Safe to run multiple times.
-- ============================================================================

ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6) NULL;
ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6) NULL;

SELECT '✅ Login activity coordinates ready' as status;
