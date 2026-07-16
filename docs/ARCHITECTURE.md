# Architecture

## Shape

Two independently-built applications in one repository. There is no root `package.json`; install and build each separately.

```
backend/    Express + TypeORM + PostgreSQL   :3001   ~11,800 lines
frontend/   React 18 + Vite + MUI v5         :3000   ~10,900 lines
```

The frontend talks to the backend over `/api`, configured by `VITE_API_URL` (default `http://127.0.0.1:3001/api`). There is no server-side rendering and no shared code between the two.

## Backend layering

```
routes/         mount paths, attach verifyToken (and occasionally requireRole)
  └── controllers/   validate input, authorise, shape the HTTP response
        └── services/    data access; TypeORM repositories and query builders
              └── models/    TypeORM entities (the schema, in code)
```

Rules that hold across the codebase:

- **Controllers authorise, services don't.** Permission checks live in controllers; a service will happily return anything you ask it for.
- **Queries belong in services.** Controllers should not build query builders.
- **Errors** are thrown as `AppError(status, message)` and formatted centrally by `middleware/errorHandler`.

### Middleware order (`app.ts`)

`helmet` → `cors` → body parsing → CSRF → **tracing** → **audit** → routes → `sanitizeResponse` → `errorHandler`

- `tracing` assigns a trace id and records spans to `backend/traces/*.json`.
- `audit` wraps `res.send` and writes an `audit_logs` row for successful `POST`/`PATCH`/`DELETE`. Because it runs inside that wrapper, it must read `req.originalUrl` — `req.path` is rewritten by mounted routers by then.
- `sanitizeResponse` strips password fields from every response as a backstop. Do not remove it.

### Data model

Core flow: **Lead → Opportunity → Account → Contract → Project → Invoice → Payment**

- `Account` is the hub; it carries `ownerId`, which drives `self`-scoped access for itself and for records that hang off it.
- `Invoice` has **no owner column** — it inherits ownership through `accountId → Account.ownerId`. Any `self` scoping for invoices must join the account.
- `User` → `Role` → `Permission` is many-to-one then many-to-many.
- Master data: `Product` → `ProductCategory` (FK), `Supplier`, `Country`.

### Schema management

`synchronize` is enabled only when `DB_SYNC=true` **and** `NODE_ENV=development`. `DB_SYNC` is unset, so **the schema is never auto-created**. Editing a model does not touch the database.

Migrations are plain `.sql` files in `backend/migrations/`, applied **manually**. The `migrations` glob in `src/config/database.ts` matches only `.ts`/`.js`, so TypeORM does not run them and `npm run migration:run` will not pick them up.

A model/schema mismatch shows up as a **500 on that resource** — there is no startup check. This is exactly how `GET /api/products` broke: the model moved to `categoryId` + `product_categories` while the database still had a `category` string column.

## Frontend

```
pages/        one component per screen; data fetching lives here
components/   Layout (app shell + nav), shared widgets
services/api.ts   the single axios client — all HTTP goes through it
hooks/useAuth.ts  zustand store: user, permissions, login/logout
theme/theme.ts    lightTheme + darkTheme, incl. MuiTableCell.head
context/ThemeContext   light/dark toggle
```

- **Auth**: JWT in an HttpOnly cookie (never in `localStorage`); the user object and flattened permissions are cached in `localStorage` for gating. `apiClient` sends cookies and the CSRF token.
- **Routing**: `App.tsx`, wrapped in `ProtectedRoute`, which takes an optional `module` to gate on read permission.
- **Navigation**: `Layout.tsx` builds a collapsible grouped menu; each item's `show` is a permission call.
- **Theming**: both modes are defined centrally. Pages must not hardcode colours — use `action.hover`, `action.selected`, `divider`, `color="primary"`. Hardcoded surfaces previously forced light panels in dark mode and made text unreadable.

Pages are deliberately self-contained and repetitive (list + filters + create/edit dialog). There is a `components/DataTable.tsx`, but most pages do not use it.

## Cross-cutting

| Concern | Where |
|---|---|
| AuthN | `middleware/auth.ts` — `verifyToken`, JWT from `Authorization` header or `authToken` cookie |
| AuthZ | `middleware/auth.ts` — `canPerformAction`, `getOwnerScope`, `canAccessRecord`, `requireRole` |
| CSRF | `middleware/csrf.ts` — `XSRF-TOKEN` cookie, `X-CSRF-Token` header on writes |
| Audit | `middleware/audit.ts` → `audit_logs` |
| Tracing | `middleware/tracing.ts` → `backend/traces/` |
| Rate limiting | `middleware/rateLimit.ts` — applied to auth routes only |
| Brute force | `login_security` table — 5 failures then a 15-minute lockout |
| Token revocation | `revoked_tokens` table — logout blacklists until natural expiry |

See [RBAC.md](RBAC.md) for the permission model and [SECURITY.md](SECURITY.md) for its current gaps.
