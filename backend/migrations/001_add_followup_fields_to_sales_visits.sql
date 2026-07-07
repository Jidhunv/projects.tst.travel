-- Migration: Add followup tracking fields to sales_visits table
-- Date: 2026-07-07
-- Purpose: Support followup tracking for sales visits/calls

-- Add followup tracking columns if they don't exist
ALTER TABLE sales_visits
ADD COLUMN IF NOT EXISTS followupDate TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS followupCompleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followupNotes TEXT NULL;

-- Create index for followup queries
CREATE INDEX IF NOT EXISTS idx_sales_visits_followup_date ON sales_visits(followupDate);
CREATE INDEX IF NOT EXISTS idx_sales_visits_followup_completed ON sales_visits(followupCompleted);

-- Verify the columns were created
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'sales_visits' AND column_name LIKE 'followup%';
