# Security

Audit date: **2026-07-16**. Method: source review plus live probes against the running API using short-lived JWTs signed with the dev `JWT_SECRET`, acting as real seeded users.

Every finding below was **reproduced against the running app**, not inferred from reading code. Where something is unverified, it says so.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `contracts`, `projects`, `tickets` permissions are not enforced | **High** | **Open** |
| 2 | `/api/traces` was reachable with no authentication | Medium | Fixed |
| 3 | Invoice endpoints had no permission checks | **High** | Fixed |
| 4 | Country create rejected everyone, including Admin | Medium | Fixed |
| 5 | `LOGIN_CREDENTIALS.md` holds working-looking passwords | Low | **Open** |
| 6 | Login falls back to the `Sales Rep` role when none resolves | Low | **Open** |

Baseline hardening is sound: `helmet` and `cors` are configured, login and password-reset have rate limiters, queries are parameterised (no string-interpolated SQL found), no `dangerouslySetInnerHTML` or `eval` in the frontend, `.env` is gitignored and absent from git history, passwords are bcrypt-hashed (cost 13), JWTs live in an HttpOnly cookie, CSRF tokens are enforced on writes, and a global sanitizer strips password fields from responses.

---

## 1. `contracts`, `projects`, `tickets` are not enforced — High, OPEN

Permissions for these modules exist in the database and render as toggles in Role Management, but **no controller checks them**. Any authenticated user has full access regardless of role.

Reproduced as `sales@tst.travel` (Sales Rep), whose role grants permissions for `accounts, contacts, expenses, leads, opportunities, reports, sales_visits, suppliers, users` — and nothing else:

| Module | Has permission? | `GET` result | |
|---|---|---|---|
| contracts | **no** | `200` | not enforced |
| projects | **no** | `200` | not enforced |
| tickets | **no** | `200` | not enforced |
| invoices | no | `403` | correctly blocked |

**Impact.** The Role Management UI misrepresents actual access for three modules: an administrator can revoke `contracts` and the user keeps full read/write. This is worse than having no toggle, because it invites false confidence.

**Why.** Enforcement is opt-in per controller. `routes/contracts.ts`, `routes/projects.ts` and `routes/tickets.ts` apply only `verifyToken`, and their controllers never call `canPerformAction`.

**Fix.** Apply the pattern already used by `expense.controller.ts` and `invoice.controller.ts`. Note this **changes access for real users** — every non-admin role currently has permissions for none of these, so strict enforcement locks them out until granted. Decide between granting existing roles their current access first, or enforcing strictly. Same trade-off as invoices (finding 3).

`activities` is likewise unenforced; it returned `400` only because the endpoint requires query parameters.

## 2. `/api/traces` unauthenticated — Medium, FIXED

`routes/traces.ts` mounted no `verifyToken`, carrying the comment *"Tracing endpoints don't require auth (for debugging)"*. `GET /api/traces` returned `200` with a full trace list to an anonymous caller.

**Impact.** Information disclosure, not credential leakage. Traces contain method, path, query string, status and timings — no request bodies, headers or tokens (checked: no stored trace contains `password`, `authorization`, `cookie` or `authToken` keys). It still hands an attacker an inventory of every endpoint exercised, plus anything carried in query strings.

**Fixed** by requiring `verifyToken` + `requireRole('Admin')`. Verified: anonymous `GET /api/traces` and `/api/traces/<id>` now return `401`; both Admin accounts still get `200`.

## 3. Invoice endpoints had no permission checks — High, FIXED

`routes/invoices.ts` carried only `verifyToken` and no `invoices` permission module existed, so **any authenticated user could create, read, update and delete any invoice**, and the sidebar item was hardcoded visible.

**Fixed.** Added `invoices` read/create/update/delete at `all`/`self` scope, enforced via `canPerformAction` in the controller, and gated the menu. An Invoice has no owner column, so `self` derives from its account: invoices belonging to an account you own. Recording a payment requires `update` (it mutates the invoice).

Verified: Sales Rep without the permission gets `403`; after granting `invoices:read:self` the same call returns `200`; Admin `200` throughout.

**Note:** only Admin currently holds invoice permissions. Other roles need an explicit grant in Role Management.

## 4. Country create rejected everyone — Medium, FIXED

`country.controller.ts` guarded with `req.user.role?.name !== 'Admin'`, but `req.user.role` is the role **name string** from the JWT. `.name` was always `undefined`, so the guard rejected every caller including Admins — nobody could add a country at all.

**Fixed** to compare the string, matching `requireRole`. Verified: an Admin now gets `201`.

Fails closed, so it was a availability bug rather than an access-control hole — but the same mistake written the other way round (`===`) would let *everyone* through. Worth grepping for on new guards.

## 5. `LOGIN_CREDENTIALS.md` — Low, OPEN

A repo-root file tabulates accounts against plaintext passwords (`admin123`, `manager123`, `sales123`) marked "Working".

**Mitigating:** the file is **untracked** — not in git history — and the passwords no longer work (verified: `admin123` returns `401`). So this is a stale local file, not a credential leak.

**Still worth doing:** delete it, or add it to `.gitignore` so it is never committed. Passwords like `admin123` would fail the app's own complexity policy; if any environment still uses them, rotate.

## 6. Login role fallback — Low, OPEN

`auth.controller.ts`:
```ts
const token = generateToken(user.id, user.email, user.role?.name || 'Sales Rep');
```
If a user's role fails to resolve, they are silently issued a `Sales Rep` token rather than being refused. It fails toward low privilege, so impact is limited, but authentication should not invent a role. Prefer rejecting with a clear error.

---

## Notes for reviewers

- **Admin bypasses every permission check** (`resolvePermission`, `middleware/auth.ts`) as an anti-lockout safety net. Testing RBAC as Admin proves nothing — always test with a non-admin role.
- Enforcement is opt-in per controller, so **a new route defaults to open**. Finding 1 is what that default produces over time. A default-deny wrapper would prevent the whole class.

## Not assessed

Dependency CVEs (`npm audit`), deployment/TLS/infrastructure, email deliverability and template injection, file-upload handling (`multer` is a dependency), and any authenticated browser-driven testing (login was unavailable during this audit).
