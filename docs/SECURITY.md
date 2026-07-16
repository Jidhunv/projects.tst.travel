# Security

Audit date: **2026-07-16**. Method: source review plus live probes against the running API using short-lived JWTs signed with the dev `JWT_SECRET`, acting as real seeded users.

Every finding below was **reproduced against the running app**, not inferred from reading code. Where something is unverified, it says so.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `contracts`, `projects`, `tickets` permissions were not enforced | **High** | Fixed |
| 2 | `/api/traces` was reachable with no authentication | Medium | Fixed |
| 3 | Invoice endpoints had no permission checks | **High** | Fixed |
| 4 | Country create rejected everyone, including Admin | Medium | Fixed |
| 5 | `LOGIN_CREDENTIALS.md` holds working-looking passwords | Low | **Open** |
| 6 | Login falls back to the `Sales Rep` role when none resolves | Low | **Open** |
| 7 | `activities` has no permission module and is unenforced | Low | **Open** |

Baseline hardening is sound: `helmet` and `cors` are configured, login and password-reset have rate limiters, queries are parameterised (no string-interpolated SQL found), no `dangerouslySetInnerHTML` or `eval` in the frontend, `.env` is gitignored and absent from git history, passwords are bcrypt-hashed (cost 13), JWTs live in an HttpOnly cookie, CSRF tokens are enforced on writes, and a global sanitizer strips password fields from responses.

---

## 1. `contracts`, `projects`, `tickets` were not enforced — High, FIXED

Permissions for these modules existed in the database and rendered as toggles in Role Management, but **no controller checked them**. Any authenticated user had full access regardless of role.

Originally reproduced as `sales@tst.travel` (Sales Rep), whose role grants permissions for `accounts, contacts, expenses, leads, opportunities, reports, sales_visits, suppliers, users` — and nothing else:

| Module | Has permission? | before | after |
|---|---|---|---|
| contracts | **no** | `200` — not enforced | `403` |
| projects | **no** | `200` — not enforced | `403` |
| tickets | **no** | `200` — not enforced | `403` |

**Impact.** The Role Management UI misrepresented actual access: an administrator could revoke `contracts` and the user kept full read/write. Worse than having no toggle, because it invited false confidence.

**Fixed** by enforcing all four actions in each controller with `canPerformAction`, matching the `expenses`/`invoices` pattern. State-changing sub-actions require `update`: contract approve, milestone add/approve, ticket assign/resolve/close/attach.

None of the three has an owner column, so `self` scope derives from the account plus the natural personal link:

| Module | `self` means |
|---|---|
| contracts | account you own, **or** `createdById` is you |
| projects | account you own, **or** you are the `projectManagerId` |
| tickets | account you own, **or** you are the reporter/assignee (incl. multi-assign) |

Verified end to end: Admin gets `200` on all four modules; a Sales Rep with no permissions gets `403` on all four; granting `contracts:read:self` returns `200`. Scoping was checked in both directions — with the Sales Rep temporarily owning an account holding 3 of the 5 contracts, they saw exactly those 3 and not the other 2 (test state reverted afterwards).

**Access as it now stands:** only **Admin** holds `contracts`/`projects`/`tickets`/`invoices` permissions. Every other role is blocked until granted in Role Management — deliberate, pending configuration.

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

## 7. `activities` is unenforced — Low, OPEN

`routes/activities.ts` carries only `verifyToken`, and there is no `activities` permission module to enforce, so every authenticated user can read and write all activities and notes. It surfaced as `400` rather than `200` in testing only because the endpoint requires query parameters.

Lower severity than finding 1 because no toggle claims otherwise — nothing in Role Management implies activities are restricted. To close it, seed an `activities` module and gate the controller as above.

---

## Notes for reviewers

- **Admin bypasses every permission check** (`resolvePermission`, `middleware/auth.ts`) as an anti-lockout safety net. Testing RBAC as Admin proves nothing — always test with a non-admin role.
- Enforcement is opt-in per controller, so **a new route defaults to open**. Finding 1 is what that default produces over time. A default-deny wrapper would prevent the whole class.

## Not assessed

Dependency CVEs (`npm audit`), deployment/TLS/infrastructure, email deliverability and template injection, file-upload handling (`multer` is a dependency), and any authenticated browser-driven testing (login was unavailable during this audit).
