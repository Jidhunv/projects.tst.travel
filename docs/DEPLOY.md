# Production deploy

One command on the server, from the repository root, after `git pull`:

```bash
./scripts/deploy-production.sh
```

The script stops at the first error. In order it:

1. Reads `backend/.env` for the database settings. Values already set in the environment win.
2. Backs up the database to `backups/` (custom-format dump).
3. Database:
   - If the old table name `accounts` exists, it runs the `PRODUCTION_*` data scripts and then `RENAME_TABLES_PROSPECTS_LEADS_2026-10-25.sql`.
   - Then it runs `FULL_SCHEMA_2026-10_create_if_not_exists.sql`, which only adds what is missing.
4. Checks that the required tables exist.
5. Builds the backend and the frontend (the frontend uses `/api` from `frontend/.env.production`).
6. Restarts the backend with `RESTART_CMD` (default `pm2 restart crm-backend`).
7. Checks `/api/health` on `PORT` (default 3001).

Options:

- `DRY_RUN=1` prints the plan without changing anything.
- `RESTART_CMD="..."` sets the restart command if the server doesn't use pm2.
- `SKIP_BACKUP=1` skips the backup (not recommended).

Serve the built `frontend/dist` folder as static files. Do not expose the Vite dev server.
