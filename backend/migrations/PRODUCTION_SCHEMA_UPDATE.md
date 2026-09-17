# Production Schema Update Guide

This document provides SQL to update your production database with the new schema changes.

## Summary of Changes

The following changes have been made to support enhanced CRM functionality:

### Opportunities Table
- ✅ `expectedCloseMonth` (VARCHAR(7)) - YYYY-MM format for month-level filtering
- ✅ `city` (VARCHAR(255)) - Geographic filtering
- ✅ `tier` (VARCHAR(100)) - Client tier classification (T1-T5)

### Accounts Table
- ✅ `tier` (VARCHAR(100)) - Client tier (imported from MIDT or set manually)

### Leads Table
- ✅ `tier` (VARCHAR(100)) - Client tier copied from associated account

All columns have corresponding indexes for query performance.

---

## Option 1: PostgreSQL (Recommended - Safe to run multiple times)

Use this script if you're running PostgreSQL. It's safe to run multiple times as it uses `IF NOT EXISTS` checks.

**File:** `production_update_postgres.sql`

```bash
psql -U your_user -d your_database -f production_update_postgres.sql
```

---

## Option 2: Simple Manual SQL (Works with any database)

Run these commands directly in your database client:

### Step 1: Add columns to Opportunities
```sql
-- Add expectedCloseMonth column if it doesn't exist
ALTER TABLE opportunities ADD COLUMN "expectedCloseMonth" VARCHAR(7) NULL;

-- Backfill with data from forecastedCloseDate
UPDATE opportunities
SET "expectedCloseMonth" = TO_CHAR("forecastedCloseDate", 'YYYY-MM')
WHERE "forecastedCloseDate" IS NOT NULL AND "expectedCloseMonth" IS NULL;

-- Add city column
ALTER TABLE opportunities ADD COLUMN city VARCHAR(255) NULL;

-- Add tier column
ALTER TABLE opportunities ADD COLUMN tier VARCHAR(100) NULL;
```

### Step 2: Add columns to Accounts
```sql
-- Add tier column
ALTER TABLE accounts ADD COLUMN tier VARCHAR(100) NULL;
```

### Step 3: Add columns to Leads
```sql
-- Add tier column
ALTER TABLE leads ADD COLUMN tier VARCHAR(100) NULL;
```

### Step 4: Create Indexes for Performance
```sql
-- Opportunities indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close_month ON opportunities("expectedCloseMonth");
CREATE INDEX IF NOT EXISTS idx_opportunities_city ON opportunities(city);
CREATE INDEX IF NOT EXISTS idx_opportunities_tier ON opportunities(tier);

-- Accounts indexes
CREATE INDEX IF NOT EXISTS idx_accounts_tier ON accounts(tier);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);
```

---

## Verification

After running the update, verify the changes:

```sql
-- Check Opportunities table
\d opportunities

-- Check Accounts table
\d accounts

-- Check Leads table
\d leads

-- Verify indexes were created
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('opportunities', 'accounts', 'leads');
```

Expected indexes:
- `idx_opportunities_expected_close_month`
- `idx_opportunities_city`
- `idx_opportunities_tier`
- `idx_accounts_tier`
- `idx_leads_tier`

---

## Rollback (If needed)

If you need to rollback these changes:

```sql
-- Drop columns
ALTER TABLE opportunities DROP COLUMN IF EXISTS "expectedCloseMonth" CASCADE;
ALTER TABLE opportunities DROP COLUMN IF EXISTS city CASCADE;
ALTER TABLE opportunities DROP COLUMN IF EXISTS tier CASCADE;
ALTER TABLE accounts DROP COLUMN IF EXISTS tier CASCADE;
ALTER TABLE leads DROP COLUMN IF EXISTS tier CASCADE;
```

---

## Notes

- ✅ All columns are `NOT NULL: FALSE` (nullable) to maintain backward compatibility
- ✅ All new indexes improve query performance for filtering operations
- ✅ No data loss - existing data is preserved
- ✅ Safe to run multiple times - uses `IF NOT EXISTS` where available
- ✅ No application restart needed - changes take effect immediately
- ⚠️ Test on a staging environment first
- ⚠️ Have a backup before running in production

---

## Support

For any issues during the update:
1. Check that the database user has ALTER TABLE permissions
2. Verify the column names are exactly as specified (case-sensitive)
3. Ensure the database is PostgreSQL 9.5+ (for CREATE INDEX IF NOT EXISTS support)
4. Review the application logs for any migration-related errors
