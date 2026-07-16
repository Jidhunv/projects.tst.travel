# CRM

A CRM for a travel business: **Lead → Opportunity → Account → Contract → Project → Invoice**, plus tickets, expenses, suppliers, sales visits, reporting, and role-based access control.

| | Stack | Port |
|---|---|---|
| `backend/` | Express · TypeORM · PostgreSQL · JWT | 3001 |
| `frontend/` | React 18 · Vite · MUI v5 | 3000 |

## Quick start

No root `package.json` — each app installs and runs on its own.

```bash
# 1. Install
cd backend  && npm install
cd frontend && npm install

# 2. Configure — copy backend/.env.example to backend/.env and set
#    DB_* and JWT_SECRET. (.env is gitignored; never commit it.)

# 3. Database — create it, apply backend/migrations/*.sql in numeric order
#    with psql, then:
cd backend && npm run seed

# 4. Run
cd backend  && npm run build && npm start   # :3001
cd frontend && npm run dev                  # :3000
```

Open http://localhost:3000.

Seeded logins are `admin@tst.travel`, `manager@tst.travel` and `sales@tst.travel`, with passwords from `ADMIN_DEFAULT_PASSWORD` / `MANAGER_DEFAULT_PASSWORD` / `SALES_DEFAULT_PASSWORD`, defaulting to `ChangeMe@<Role>2026!`. The seed only creates users that don't already exist, so **it will not reset a password that has since been changed**.

> `npm start` runs the compiled `dist/`. After editing backend source, `npm run build` **and restart** — otherwise you are still running the old code. Full list of traps: [CLAUDE.md](CLAUDE.md#gotchas-that-will-cost-you-an-hour).

## Documentation

| | |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it fits together: layering, data model, middleware, schema management |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, running, migrations, verifying a change |
| [docs/RBAC.md](docs/RBAC.md) | The permission model and how to enforce it |
| [docs/API.md](docs/API.md) | Endpoints, conventions, auth, CSRF |
| [docs/SECURITY.md](docs/SECURITY.md) | Audit findings and current posture |
| [CLAUDE.md](CLAUDE.md) | Orientation for AI agents |

## Status

Open items worth knowing before building on this:

- **`contracts`, `projects` and `tickets` permissions are not enforced.** They appear in Role Management and can be toggled, but no controller checks them, so any authenticated user has full access. See [docs/SECURITY.md](docs/SECURITY.md).
- **Migrations are applied by hand.** The `.sql` files in `backend/migrations/` are not run by TypeORM, and models do not shape the database (`DB_SYNC` is off). A model/schema mismatch surfaces as a 500 on that resource.
- **`LOGIN_CREDENTIALS.md`** (untracked, if present locally) lists stale passwords that no longer work — delete it.
