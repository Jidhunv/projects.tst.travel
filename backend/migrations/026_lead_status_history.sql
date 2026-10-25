-- ============================================================================
-- Lead status history: when a lead was qualified, converted or disqualified
-- ============================================================================
-- One row per status change, written by the lead service from now on.
-- Leads that existed before this table get backfilled entries from their own fields:
--   created as Open on their creation date; if now Qualified / Converted / Disqualified, that
--   status is dated from the last update. Those dates are approximate (marked in the note).
-- Safe to run multiple times.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
