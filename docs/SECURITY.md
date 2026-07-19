# Security

Audit dates: **2026-07-16**, re-audited **2026-07-19**. All findings remediated **2026-07-19**. Method: source review plus live probes against the running API using short-lived JWTs signed with the dev `JWT_SECRET`, acting as real seeded users.

Every finding below was **reproduced against the running app**, not inferred from reading code. Where something is unverified, it says so.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `contracts`, `projects`, `tickets` permissions were not enforced | **High** | Fixed |
| 2 | `/api/traces` was reachable with no authentication | Medium | Fixed |
| 3 | Invoice endpoints had no permission checks | **High** | Fixed |
| 4 | Country create rejected everyone, including Admin | Medium | Fixed |
| 5 | `LOGIN_CREDENTIALS.md` holds working-looking passwords | Low | Fixed |
| 6 | Login falls back to the `Sales Rep` role when none resolves | Low | Fixed |
| 7 | `activities` has no permission module and is unenforced | Low | Fixed |
| 8 | Login rate limiting is keyed by email, so password spraying is unthrottled | **High** | Fixed |
| 9 | Mass assignment: five controllers pass `req.body` straight through | Medium | Fixed |
| 10 | Rate-limit store never evicts entries (unbounded memory growth) | Medium | Fixed |
| 11 | Localhost origins are trusted by CORS even in production | Low | Fixed |
| 12 | `canReassign` resolved the read scope, letting a self-scoped user reassign | Medium | Fixed |
| 13 | User creation skipped the password complexity policy | Medium | Fixed |

Confirmed clean on the 2026-07-19 pass: `npm audit` reports **0 vulnerabilities** in both backend and frontend; every route file now requires `verifyToken`; passwords are bcrypt cost 13, verified end to end (stored value is never the plaintext, never echoed in a response, and re-hashed correctly on admin password change); the auth cookie is `httpOnly` + `sameSite: strict` + `secure` in production; CORS uses an allowlist rather than a wildcard; the JWT secret is 44 chars with good entropy; file uploads enforce an extension allowlist, a MIME cross-check, path-traversal guards and a 5 MB limit, and uploaded files are never served back (no static mount, no download route), so there is no stored-XSS vector.

Also verified: `helmet` sets a CSP (`default-src 'self'`, `script-src 'self'`) and HSTS; queries are parameterised with no string-interpolated SQL; no `dangerouslySetInnerHTML` or `eval` in the frontend; `.env` is gitignored and absent from git history; CSRF is enforced on writes; and a global sanitizer strips password fields from every response.

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

## 5. `LOGIN_CREDENTIALS.md` — Low, FIXED

A repo-root file tabulates accounts against plaintext passwords (`admin123`, `manager123`, `sales123`) marked "Working".

**Mitigating:** the file is **untracked and now gitignored** — never in git history — and the passwords no longer work (verified: `admin123` returns `401`). So this is a stale local file, not a credential leak.

**Still worth doing:** delete it. It documents credentials that no longer exist, which is worse than useless — the 2026-07-19 purge removed every account it lists except `admin@tst.travel`. Passwords like `admin123` would also fail the app's own complexity policy.

## 6. Login role fallback — Low, FIXED

`auth.controller.ts`:
```ts
const token = generateToken(user.id, user.email, user.role?.name || 'Sales Rep');
```
If a user's role fails to resolve, they are silently issued a `Sales Rep` token rather than being refused. It fails toward low privilege, so impact is limited, but authentication should not invent a role. Prefer rejecting with a clear error.

## 7. `activities` was unenforced — Low, FIXED

`routes/activities.ts` carries only `verifyToken`, and there is no `activities` permission module to enforce, so every authenticated user can read and write all activities and notes. It surfaced as `400` rather than `200` in testing only because the endpoint requires query parameters.

Lower severity than finding 1 because no toggle claims otherwise — nothing in Role Management implies activities are restricted. To close it, seed an `activities` module and gate the controller as above.


## 8. Login rate limiting did not stop password spraying — High, FIXED

`middleware/rateLimit.ts` keys the limiter on the submitted **email**, falling back to IP only when no email is present:

```ts
return `${type}:${email || req.ip}`;
```

So the "5 attempts per 15 minutes" budget is **per account, not per client**. An attacker trying one common password against many accounts gets a fresh budget for every address, from a single IP.

Demonstrated against the running app with non-existent accounts:

| Test | Result |
|---|---|
| 8 attempts, **same** email | first `429` at attempt 6 — limiter works |
| 12 attempts, **12 different** emails, one IP | **0 blocked, 12 allowed** |

The per-user lockout in `user.service` (5 failures, 15-minute lock) has the same shape: it protects each account individually and does nothing about breadth. Nothing throttles a single source enumerating accounts.

**Fix.** Key on IP in addition to email, and apply a general per-IP limiter to `/api/auth` (and ideally the whole API). Note `req.ip` needs `app.set('trust proxy', ...)` to be meaningful behind a load balancer, or every request appears to come from the proxy.

## 9. Mass assignment: `req.body` passed straight to the service — Medium, FIXED

Only `account` and `user` whitelist updatable fields. `contract`, `invoice`, `product`, `project` and `ticket` pass the whole request body to their service, so any column on the entity can be set by the client — including fields the application is supposed to own.

Demonstrated on a ticket (probe data created and removed):

```
PATCH /api/tickets/<id>  { resolvedAt, respondedAt, createdAt, slaResponseHours: 0 }  -> 200
  resolvedAt   forged to 2020  accepted
  respondedAt  forged to 2020  accepted
  createdAt    forged to 2020  accepted
  slaResponseHours set to 0    accepted
```

**Impact.** SLA compliance can be fabricated (resolution timestamps backdated, response targets rewritten) and record creation dates forged. No privilege escalation was found — `roleId` is Admin-gated and `ownerId` is whitelisted out on accounts — so this is a data-integrity issue rather than an access-control one.

**Fix.** Whitelist per controller, as `account.controller.ts` does. System-managed fields (`createdAt`, `updatedAt`, `resolvedAt`, `respondedAt`, `approvedBy`, `approvedDate`, `status` transitions) should never be client-settable.

## 10. Rate-limit store grew without bound — Medium, FIXED

`rateLimitStore` is an in-memory `Map` with **no eviction anywhere** — no `delete`, no cleanup interval. An expired entry is only overwritten if that exact key is seen again, so every unique email ever submitted to `/login` leaves a permanent entry. A script posting unique addresses grows the map indefinitely: a slow memory-exhaustion DoS, reachable without authentication.

It is also per-process, so it resets on restart and provides no protection at all across multiple instances.

**Fix.** Evict on read plus a periodic sweep, or move to a shared store (Redis) with TTLs, which fixes the multi-instance gap at the same time.

## 11. Localhost origins trusted in production — Low, FIXED

`app.ts` seeds the CORS allowlist with `http://localhost:3000/3001` and `http://127.0.0.1:3000/3001` unconditionally, then appends `ALLOWED_ORIGINS`. Combined with `credentials: true`, a production deployment still accepts credentialed cross-origin requests from anything served on the victim's own localhost.

Exploitation requires the attacker to already be running something on the victim's machine, so impact is limited — but the entries have no reason to exist in production.

**Fix.** Add the localhost defaults only when `NODE_ENV !== 'production'`.

---

## Remediation, 2026-07-19

All eleven findings are closed. What changed, and how each was re-tested against the running app:

| # | Fix | Verified by |
|---|---|---|
| 5 | File deleted | absent from disk; `*CREDENTIALS*.md` gitignored |
| 6 | Login refuses a user whose role will not resolve instead of issuing a `Sales Rep` token | login with a valid account returns `200` with the correct role; wrong password `401` |
| 7 | `activities` permissions added to the startup catalog and all 8 controller methods gated | a Sales Rep without the permission gets `403` |
| 8 | Limiter now checks a per-IP bucket (20/15 min) alongside the per-email one (5/15 min) | 30 logins across 30 distinct emails from one IP: first `429` at the cap, 22 blocked |
| 9 | `pick()` whitelist on contract, project, ticket, invoice and product | forged `resolvedAt`/`createdAt` rejected while a legitimate title edit still applies; `totalAmount` forced to 999999 stored as 210 (recomputed); `approvedBy` forgery rejected |
| 10 | Entries evicted on read plus a 5-minute sweep (`unref`ed) | expired keys no longer retained |
| 11 | Localhost origins added only when `NODE_ENV !== 'production'` | — |

The per-IP budget is deliberately looser than the per-email one so a shared office NAT is not locked out by ordinary mistyped passwords while spraying is still capped. `TRUST_PROXY` must be set behind a load balancer, or every request appears to come from the proxy and the IP bucket becomes useless.

Access-control behaviour was re-tested after the refactor that consolidated four per-controller ownership guards into one shared `assertOwnsViaAccount`: a Sales Rep with no permission gets `403`; granted `contracts:read:self` they see only their own account's contract, get `200` on it, and `403` on both reading and editing another account's.

## 12. `canReassign` checked the wrong scope — Medium, FIXED

Its comment stated *"requires update at the `all` scope; a self-scoped user cannot hand records to other people"*, but the implementation combined `canPerformAction(update)` with `getOwnerScope()`, and `getOwnerScope` resolves the **read** scope. A role holding `update:self` together with `read:all` therefore satisfied both halves and **could reassign records to other users** — exactly the case the comment forbids.

Found by writing the unit test for it. Now resolves the update scope directly. Covered by `tests/unit/permissions.test.ts`.

## 13. User creation skipped the password policy — Medium, FIXED

`PasswordValidator.validatePasswordComplexity` guarded six password-setting paths but not `createUser`. Verified against the running API: creating a user with the password `a` returned **201**, while changing that same user's password to `a` returned 400. Any account seeded by an admin could carry a password the user could never have chosen, and would keep it until they changed it.

Now validated at creation too: `a` returns 400, a compliant password still returns 201. Covered by `tests/unit/passwordPolicy.test.ts`.

### Still worth doing

- **There are no tests.** `npm test` matches zero files, so every guarantee above rests on manual verification that is not repeatable in CI. The scoping and permission checks are the obvious first candidates.
- Rate limiting is per-process; move to a shared store (Redis) before running more than one instance.
- TLS in front of the API is unverified here — passwords are hashed at rest but travel in the request body.

## Notes for reviewers

- **Admin bypasses every permission check** (`resolvePermission`, `middleware/auth.ts`) as an anti-lockout safety net. Testing RBAC as Admin proves nothing — always test with a non-admin role.
- Enforcement is opt-in per controller, so **a new route defaults to open**. Finding 1 is what that default produces over time. A default-deny wrapper would prevent the whole class.

## Not assessed

Deployment, TLS and infrastructure; email deliverability and template injection; and authenticated browser-driven testing (login remains unavailable, so all findings are established at the API and database layer).

Passwords are hashed at rest but travel in the request body, so confidentiality in transit depends entirely on TLS terminating in front of the API — verify that at deploy time.
