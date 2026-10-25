#!/usr/bin/env bash
# One-step production deploy for the CRM.
#
# Usage (on the server, from the repository root, after `git pull`):
#   ./scripts/deploy-production.sh
#
# What it does, in order, stopping at the first error:
#   1. Reads backend/.env for the database settings (DB_HOST, DB_PORT, DB_USERNAME,
#      DB_PASSWORD, DB_NAME). Any value already in the environment wins.
#   2. Takes a backup of the database to backups/ (pg_dump, custom format).
#   3. Database:
#        - If the old table names are present (table "accounts"), it runs the
#          production data scripts and then the table rename, in that order.
#        - Then it runs the create-if-not-exists schema. This only adds what is
#          missing; it never drops or changes existing data.
#   4. Checks that the expected tables exist.
#   5. Builds the backend and the frontend.
#   6. Restarts the backend with RESTART_CMD (default: pm2 restart crm-backend).
#   7. Checks the health endpoint.
#
# Environment options:
#   DRY_RUN=1        print each step without changing anything
#   RESTART_CMD      command that restarts the backend (default: pm2 restart crm-backend)
#   SKIP_BACKUP=1    skip step 2 (not recommended)
#   PORT             backend port for the health check (default 3001)

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
DRY_RUN="${DRY_RUN:-0}"
PORT="${PORT:-3001}"
RESTART_CMD="${RESTART_CMD:-pm2 restart crm-backend}"

say() { printf '\n== %s\n' "$*"; }
run() {
  if [ "$DRY_RUN" = "1" ]; then echo "[dry-run] $*"; else eval "$@"; fi
}

# 1. Settings
if [ -f backend/.env ]; then
  # Keep values already set in the environment; fill the rest from backend/.env.
  SAVED_DB=()
  for v in DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME; do SAVED_DB+=("$v=${!v-}"); done
  set -a
  # shellcheck disable=SC1091
  . backend/.env
  set +a
  for kv in "${SAVED_DB[@]}"; do
    name="${kv%%=*}"
    value="${kv#*=}"
    if [ -n "$value" ]; then export "$name=$value"; fi
  done
fi
: "${DB_HOST:?DB_HOST is not set}"
: "${DB_PORT:?DB_PORT is not set}"
: "${DB_USERNAME:?DB_USERNAME is not set}"
: "${DB_PASSWORD:?DB_PASSWORD is not set}"
: "${DB_NAME:?DB_NAME is not set}"
export PGPASSWORD="$DB_PASSWORD"
PSQL=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q)
say "Deploying to database '$DB_NAME' on $DB_HOST:$DB_PORT (DRY_RUN=$DRY_RUN)"

# 2. Backup
if [ "${SKIP_BACKUP:-0}" != "1" ]; then
  say "Backup"
  STAMP="$(date +%Y%m%d-%H%M%S)"
  run "mkdir -p backups && pg_dump -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USERNAME' -d '$DB_NAME' -Fc -f backups/${DB_NAME}-${STAMP}.dump"
fi

# 3. Database
table_exists() {
  local n
  n="$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -At -c "select count(*) from information_schema.tables where table_schema='public' and table_name='$1';")"
  [ "$n" = "1" ]
}

say "Database state"
if [ "$DRY_RUN" = "1" ]; then
  echo "[dry-run] would check for the old table name 'accounts'"
  OLD_STATE=0
else
  if table_exists accounts; then OLD_STATE=1; else OLD_STATE=0; fi
fi

# Order matters:
#   - Old table names: the fix script uses them, so it runs first, then the table rename.
#   - Then the schema script (create if not exists) adds anything missing.
#   - Then the stage, question and handover scripts, which run on every deploy. They
#     use only the opportunities and questions tables and are safe to run again.
if [ "$OLD_STATE" = "1" ]; then
  echo "Old table names found: running the fix script, then the table rename."
  run "\"\${PSQL[@]}\" -f backend/migrations/PRODUCTION_FIX_2026-10-25_safe.sql"
  run "\"\${PSQL[@]}\" -f backend/migrations/RENAME_TABLES_PROSPECTS_LEADS_2026-10-25.sql"
else
  echo "New table names (or a new database): no table rename needed."
fi

say "Schema (create if not exists)"
run "\"\${PSQL[@]}\" -f backend/migrations/FULL_SCHEMA_2026-10_create_if_not_exists.sql"

say "Production data scripts (safe to run again)"
run "\"\${PSQL[@]}\" -f backend/migrations/PRODUCTION_RENAME_QUALIFICATION_TO_CUSTOMER_ENGAGEMENT.sql"
run "\"\${PSQL[@]}\" -f backend/migrations/PRODUCTION_QUESTIONS_REPLACE_2026-10-25.sql"
run "\"\${PSQL[@]}\" -f backend/migrations/PRODUCTION_HANDOVER_2026-10-25.sql"

# 4. Check
say "Checking required tables"
REQUIRED="prospects leads prospect_status_history opportunities users sales_visits"
if [ "$DRY_RUN" != "1" ]; then
  for t in $REQUIRED; do
    table_exists "$t" || { echo "Missing table: $t" >&2; exit 1; }
  done
  echo "All required tables are present."
else
  echo "[dry-run] would check: $REQUIRED"
fi

# 5. Build
say "Build backend"
run "(cd '$ROOT/backend' && npm run build)"
say "Build frontend (production: API at /api)"
run "(cd '$ROOT/frontend' && npm run build)"

# 6. Restart
say "Restart backend"
run "(cd '$ROOT' && NODE_ENV=production $RESTART_CMD)"

# 7. Health
say "Health check"
if [ "$DRY_RUN" = "1" ]; then
  echo "[dry-run] would check http://127.0.0.1:$PORT/api/health"
else
  for i in $(seq 1 90); do
    code="$(curl -s -m 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health" || true)"
    [ "$code" = "200" ] && break
    sleep 2
  done
  [ "$code" = "200" ] || { echo "Backend did not become healthy (last status $code)" >&2; exit 1; }
  echo "Backend healthy on port $PORT."
fi

say "Done"
