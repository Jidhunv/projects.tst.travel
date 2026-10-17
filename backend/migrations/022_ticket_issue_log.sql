-- ============================================================================
-- Issue log: the individual issues inside a client ticket, each with a stage
-- ============================================================================
--   ticket_issues         - one row per issue; a ticket closes automatically once
--                           every one of its issues is Closed or Cancelled
--   ticket_issue_history  - append-only record of every stage change (who, when,
--                           note, and the customer contact for approvals)
-- Safe to run multiple times.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS ticket_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketId" UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    "issueNumber" INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'Medium',
    stage VARCHAR(40) NOT NULL DEFAULT 'Logged',
    "assigneeId" UUID NULL,
    "createdById" UUID NULL,
    "closedAt" TIMESTAMP NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("ticketId", "issueNumber")
);
CREATE INDEX IF NOT EXISTS idx_ticket_issues_ticket ON ticket_issues("ticketId");
CREATE INDEX IF NOT EXISTS idx_ticket_issues_stage ON ticket_issues(stage);
CREATE INDEX IF NOT EXISTS idx_ticket_issues_assignee ON ticket_issues("assigneeId");

CREATE TABLE IF NOT EXISTS ticket_issue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "issueId" UUID NOT NULL REFERENCES ticket_issues(id) ON DELETE CASCADE,
    "fromStage" VARCHAR(40) NULL,
    "toStage" VARCHAR(40) NOT NULL,
    note TEXT NULL,
    "customerContact" VARCHAR(255) NULL,
    "actorId" UUID NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_issue_history_issue ON ticket_issue_history("issueId", "createdAt");
