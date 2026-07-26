-- 008: Teams/Groups with hierarchy, and team assignment for users + accounts.
-- Idempotent and additive. Run against the backend's database.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS teams (
  id            uuid DEFAULT uuid_generate_v4() NOT NULL,
  name          character varying NOT NULL,
  description   character varying,
  "parentTeamId" uuid,
  "createdAt"   timestamp without time zone DEFAULT now() NOT NULL,
  "updatedAt"   timestamp without time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"teams"'::regclass AND contype='p') THEN
    ALTER TABLE teams ADD PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- Self-referencing FK for the hierarchy (nullable = top-level team).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_teams_parent') THEN
    ALTER TABLE teams ADD CONSTRAINT "FK_teams_parent"
      FOREIGN KEY ("parentTeamId") REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- Assignment columns
ALTER TABLE users    ADD COLUMN IF NOT EXISTS "teamId" uuid;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "teamId" uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_team') THEN
    ALTER TABLE users ADD CONSTRAINT "FK_users_team"
      FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_accounts_team') THEN
    ALTER TABLE accounts ADD CONSTRAINT "FK_accounts_team"
      FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_users_team ON users("teamId");
CREATE INDEX IF NOT EXISTS idx_accounts_team ON accounts("teamId");
CREATE INDEX IF NOT EXISTS idx_teams_parent ON teams("parentTeamId");
