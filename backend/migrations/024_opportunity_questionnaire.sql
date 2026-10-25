-- ============================================================================
-- Opportunity questionnaire: answers per stage, with full change history
-- ============================================================================
--   opportunity_answers        - the current answer to each question of one opportunity
--   opportunity_answer_history - every change: old and new value, who, when, and any override reason
-- Answers are kept when a deal moves back to an earlier stage (re-entry), so nothing is lost.
-- Safe to run multiple times.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    note TEXT NULL,                                     -- e.g. "OVERRIDE: customer agreed by phone"
    "actorId" UUID NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_opportunity_answer_history_opp ON opportunity_answer_history("opportunityId", "questionKey", "createdAt");
