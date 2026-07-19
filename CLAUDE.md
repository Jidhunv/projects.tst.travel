# CLAUDE.md

Guidance for AI agents working in this repository. Human-facing docs live in [`docs/`](docs/).

## What this is

A CRM for a travel business. Two separately-built apps in one repo:

| | Stack | Port | Dir |
|---|---|---|---|
| Backend | Express + TypeORM + PostgreSQL, JWT auth | 3001 | `backend/` |
| Frontend | React 18 + Vite + MUI (Material-UI) v5 | 3000 | `frontend/` |

Domain flow: **Lead → Opportunity → Account → Contract → Project → Invoice**, plus Tickets, Expenses, Suppliers, Sales Visits, and master data (Products, Product Categories, Countries).

## Commands

```bash
# Backend (cwd: backend/)
npm run build     # tsc -> dist/
npm start         # node dist/app.js   <- runs the BUILD, not src
npm run dev       # ts-node src/app.ts (reloads from src)
npm run seed      # idempotent: create-if-missing
npm test          # jest

# Frontend (cwd: frontend/)
npm run dev       # vite, HMR
npm run build     # tsc && vite build
```

Prefer the Browser pane's `preview_start` (`backend` / `frontend` are defined in `.claude/launch.json`) over running servers via Bash.

## Gotchas that will cost you an hour

**`npm start` serves compiled `dist/`.** Editing `backend/src` changes nothing until you `npm run build` **and restart the process**. A running server does not pick up a rebuild. This is the single most common way to "fix" something and see no change.

**Schema is not auto-synced.** `synchronize` is on only when `DB_SYNC=true` *and* `NODE_ENV=development`; `DB_SYNC` is unset, so **it is off**. Changing a model does *not* change the database. Add a numbered `.sql` file to `backend/migrations/` and apply it. The `migrations` glob in `src/config/database.ts` only matches `.ts`/`.js`, so the `.sql` files are **not** run by TypeORM — they are applied manually. A model/schema mismatch surfaces as a 500 on that resource, not as a startup error.

**`req.user.role` is a `string`, not an object.** The JWT is signed `{ id, email, role }` where `role` is the role *name*. Writing `req.user.role?.name` yields `undefined` and silently rejects everyone — this exact bug made Country Master unusable. Compare the string: `req.user.role !== 'Admin'`.
On a `User` **entity** loaded from the DB with its relation, `user.role` *is* an object, so `user.role?.name` is correct there. Know which one you have.

**TypeORM prefers a loaded relation over its FK column.** If you load an entity with its relation and then assign only the FK (`Object.assign(user, { roleId })`), `save()` writes the *stale* relation back and your change silently vanishes. Use `repository.update(id, data)` for column-level writes.

**Express rewrites `req.url`/`req.path` inside mounted routers.** Middleware registered with `app.use` that reads `req.path` *lazily* (e.g. inside a `res.send` wrapper) sees the path **relative to the mount point** — `PATCH /api/users/<id>` reads as `/<id>`. Use `req.originalUrl`, which is never rewritten. This broke audit-log module names.

**Do not hardcode colours in pages.** The theme (`frontend/src/theme/theme.ts`) defines light and dark, including `MuiTableCell.head`. Pages that hardcoded `#f5f5f5`/`#fafafa` forced light surfaces in dark mode and made text unreadable (1.18:1 contrast). Use theme tokens: `action.hover`, `action.selected`, `divider`, `color="primary"`.

**Admin bypasses all permission checks** (`resolvePermission` in `middleware/auth.ts`) as an anti-lockout net. Testing RBAC as Admin proves nothing — use a non-admin role.

## RBAC

Permissions are `module:action:scope`, scope is `all` or `self`. See [docs/RBAC.md](docs/RBAC.md).

Enforcement is **per-controller and opt-in** — it is not automatic. A route with only `verifyToken` is open to every logged-in user, regardless of what Role Management shows. `activities` is still in that state; see [docs/SECURITY.md](docs/SECURITY.md).

Only `account` and `user` whitelist updatable fields. The other controllers pass `req.body` straight to the service, so clients can set system-managed columns (`resolvedAt`, `createdAt`, …). Whitelist when you touch one.

Invoices, contracts, projects and tickets have **no owner column** — `self` scope derives from the account plus the natural personal link (creator / project manager / ticket assignee). Their services take a `scopeUserId` filter. Only Admin currently holds permissions for these four.

Pattern:
```ts
if (!canPerformAction(req.user, 'invoices', 'read')) throw new AppError(403, '...');
const ownerId = getOwnerScope(req.user, 'invoices'); // undefined = "all", else the user's id
```

Adding a module means all four: seed the permissions, enforce in the controller, gate the menu in `Layout.tsx`, add the route in `App.tsx`. Miss the second and the toggle is decorative.

## Conventions

- Controllers validate and authorise; services hold data access. Keep queries in services.
- Whitelist updatable fields — do not pass `req.body` to `save()`.
- Errors: `throw new AppError(status, msg)` and let `errorHandler` format; don't hand-roll error responses.
- Frontend calls go through `services/api.ts`, never bare `fetch`.
- Never swallow errors (`.catch(() => {})`). Surface loading / error / empty states distinctly — an empty dropdown must say *why*.
- A global response sanitizer strips password fields. Don't remove it.

## Verifying

Login is required for UI work and the seeded passwords have been changed, so a browser click-through may not be available. The API can be exercised directly; for auth in a **local dev** script, sign a short-lived JWT with `JWT_SECRET` from `backend/.env`. Do not inject tokens into the browser to bypass login.

Prove behaviour changed — a green `tsc` is not verification. State plainly what you did and did not verify.

There is a test suite (`backend/tests/`). Integration tests run against `crm_test`, never `crm_db` — two guards enforce that. Add a regression test for any bug you fix, and **confirm it fails without the fix**; a test that passes either way protects nothing. The update paths and permission scoping are covered; controllers and the frontend are not.
