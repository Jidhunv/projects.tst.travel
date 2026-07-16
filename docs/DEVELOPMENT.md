# Development

## Prerequisites

Node 18+, PostgreSQL 14+. Windows-friendly: the repo is developed on Windows with both PowerShell and Git Bash.

## Setup

There is **no root `package.json`** — install each app separately.

```bash
cd backend  && npm install
cd frontend && npm install
```

Create `backend/.env` from `backend/.env.example`. It is gitignored — never commit it.

```ini
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=crm_user
DB_PASSWORD=...
DB_NAME=crm_db
JWT_SECRET=...          # required; the server refuses to sign tokens without it
JWT_EXPIRATION=3600     # seconds, or a duration string like "1h"
NODE_ENV=development
```

### Database

Create the database, then apply the migrations in `backend/migrations/` **in numeric order**, manually:

```bash
psql -U crm_user -d crm_db -f backend/migrations/001_add_followup_fields_to_sales_visits.sql
psql -U crm_user -d crm_db -f backend/migrations/002_add_security_tables.sql
psql -U crm_user -d crm_db -f backend/migrations/003_product_categories.sql
```

These are **not** run by `npm run migration:run` — see [Schema changes](#schema-changes).

Then seed:

```bash
cd backend && npm run seed
```

The seed is idempotent (create-if-missing), so re-running it is safe and is how new permissions get added. It creates demo users whose default passwords come from `ADMIN_DEFAULT_PASSWORD` / `SALES_DEFAULT_PASSWORD` / `MANAGER_DEFAULT_PASSWORD`, falling back to `ChangeMe@<Role>2026!`. Because it only creates users that don't exist, **it will not reset a password that has since been changed**.

## Running

```bash
cd backend  && npm run build && npm start   # :3001
cd frontend && npm run dev                  # :3000
```

Or use the Browser pane: `.claude/launch.json` defines `backend` and `frontend`.

> **`npm start` runs `dist/`, not `src/`.** After editing backend source you must `npm run build` **and restart the process** — a running server will not pick up a rebuild. `npm run dev` (ts-node) reads `src` directly, at the cost of slower startup.

The frontend has HMR, so frontend edits apply immediately.

## Schema changes

`synchronize` is on only when `DB_SYNC=true` **and** `NODE_ENV=development`. `DB_SYNC` is unset, so **it is off and models do not shape the database**.

To change the schema:

1. Edit the entity in `backend/src/models/`.
2. Add `backend/migrations/00N_description.sql`, written to be **idempotent** (`IF NOT EXISTS`, guarded `DO $$` blocks) so it is safe to re-run.
3. Apply it with `psql`.
4. Rebuild and restart the backend.

Skipping step 2 is silent: nothing errors until a request hits the mismatch and returns **500**. That is how `GET /api/products` broke — the model moved to `categoryId` while the table still had `category`.

## Checks

```bash
cd backend  && npm run build && npm test && npm run lint
cd frontend && npm run build && npm run lint    # build = tsc && vite build
```

A green `tsc` is not verification — it proves types, not behaviour.

## Verifying a change

Exercise the real path and observe the result.

**API.** For a local dev script, sign a short-lived JWT with `JWT_SECRET` and call the endpoint. This is the practical way to test as a **non-admin** role, which RBAC work requires (Admin bypasses every check):

```js
const token = jwt.sign({ id, email, role: 'Sales Rep' }, process.env.JWT_SECRET, { expiresIn: 120 });
```

Writes also need CSRF: `GET` something first to pick up the `XSRF-TOKEN` cookie, then send it back as `X-CSRF-Token`.

**Database.** Assert the row actually changed — several bugs here looked fixed at the API layer while nothing persisted.

**Cleanup.** If a probe writes data, delete it afterwards and confirm the table is back to its prior state.

**Browser.** Log in and drive it. Do not inject tokens into the browser to bypass login.

## Gotchas

Collected in [../CLAUDE.md](../CLAUDE.md#gotchas-that-will-cost-you-an-hour). The ones that have actually cost time:

- `npm start` serves stale `dist/` until you rebuild **and restart**.
- Models don't touch the schema; a mismatch is a 500, not a startup error.
- `req.user.role` is a **string**; `user.role` on a DB entity is an **object**.
- TypeORM's `save()` prefers a loaded relation over its FK column, silently discarding FK-only changes — use `repository.update()`.
- `req.path` is rewritten inside mounted routers; use `req.originalUrl`.
- Don't hardcode colours; use theme tokens or dark mode breaks.
- Admin bypasses all permission checks — never verify RBAC as Admin.

## Layout

```
backend/
  src/{routes,controllers,services,models,middleware,utils,seeds}/
  migrations/*.sql        applied manually, in order
  traces/                 request traces written at runtime (gitignore candidates)
  dist/                   build output — what `npm start` runs
frontend/
  src/{pages,components,services,hooks,theme,context,utils}/
docs/                     these documents
.claude/launch.json       dev server definitions
```
