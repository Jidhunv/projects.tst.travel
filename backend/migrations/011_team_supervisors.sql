-- 011: Supervisor relationship (asymmetric team visibility).
-- A supervisor of a team sees the accounts owned by that team's MEMBERS
-- (members are in user_teams). Membership alone grants no visibility; only a
-- supervisor sees the team, and only one direction (supervisor -> members).
-- A user can supervise several teams; a team can have several supervisors.
-- Idempotent and additive.

CREATE TABLE IF NOT EXISTS team_supervisors (
  "userId" uuid NOT NULL,
  "teamId" uuid NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"team_supervisors"'::regclass AND contype='p') THEN
    ALTER TABLE team_supervisors ADD PRIMARY KEY ("userId", "teamId");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_team_supervisors_user') THEN
    ALTER TABLE team_supervisors ADD CONSTRAINT "FK_team_supervisors_user"
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_team_supervisors_team') THEN
    ALTER TABLE team_supervisors ADD CONSTRAINT "FK_team_supervisors_team"
      FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_team_supervisors_user ON team_supervisors("userId");
CREATE INDEX IF NOT EXISTS idx_team_supervisors_team ON team_supervisors("teamId");
