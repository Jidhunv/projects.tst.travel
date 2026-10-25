-- ============================================================================
-- Opportunity stage history: one row each time a deal enters a stage
-- ============================================================================
-- fromStage is NULL for the first entry. The time spent in a stage is the gap between one entry and
-- the next (or until today / the close date for the current stage).
-- Deals that existed before this table have a single backfilled entry for their current stage, dated
-- from when the deal was created, and marked as backfilled. Earlier moves for those deals are unknown.
-- Safe to run multiple times.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
