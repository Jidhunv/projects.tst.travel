-- 010: Explicit assignment of an account to one or more teams (groups).
-- Combined with the existing accounts.assigneeIds (assigned users) and the
-- owner-co-membership rule, an account is visible to a user when ANY holds:
--   * they own it (accounts.ownerId), or
--   * they are an assigned user (accounts.assigneeIds), or
--   * they belong to a team the account is assigned to (this table), or
--   * the owner shares a group with them (user_teams co-membership).
-- Idempotent and additive.

CREATE TABLE IF NOT EXISTS account_teams (
  "accountId" uuid NOT NULL,
  "teamId"    uuid NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"account_teams"'::regclass AND contype='p') THEN
    ALTER TABLE account_teams ADD PRIMARY KEY ("accountId", "teamId");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_account_teams_account') THEN
    ALTER TABLE account_teams ADD CONSTRAINT "FK_account_teams_account"
      FOREIGN KEY ("accountId") REFERENCES accounts(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_account_teams_team') THEN
    ALTER TABLE account_teams ADD CONSTRAINT "FK_account_teams_team"
      FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_account_teams_account ON account_teams("accountId");
CREATE INDEX IF NOT EXISTS idx_account_teams_team ON account_teams("teamId");
