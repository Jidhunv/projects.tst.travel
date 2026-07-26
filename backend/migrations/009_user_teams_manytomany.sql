-- 009: Many-to-many user<->team (group) membership.
-- Visibility model: a user sees their own records plus records owned by anyone
-- who shares at least one group with them. No group => own records only.
-- Idempotent and additive.

CREATE TABLE IF NOT EXISTS user_teams (
  "userId" uuid NOT NULL,
  "teamId" uuid NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"user_teams"'::regclass AND contype='p') THEN
    ALTER TABLE user_teams ADD PRIMARY KEY ("userId", "teamId");
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_teams_user') THEN
    ALTER TABLE user_teams ADD CONSTRAINT "FK_user_teams_user"
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_teams_team') THEN
    ALTER TABLE user_teams ADD CONSTRAINT "FK_user_teams_team"
      FOREIGN KEY ("teamId") REFERENCES teams(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams("userId");
CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams("teamId");

-- Carry over any existing single-team assignment from users.teamId.
INSERT INTO user_teams ("userId", "teamId")
SELECT id, "teamId" FROM users WHERE "teamId" IS NOT NULL
ON CONFLICT DO NOTHING;
