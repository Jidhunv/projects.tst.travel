# VAPT report - CRM (backend and frontend)

Date: 2026-10-25
Scope: code review, dependency audit, and live probes against the local backend (127.0.0.1:3001, database crm_dbpsam). No external hosts were tested. The probes were read requests, plus write requests that were blocked before any work (no token, or a bad CSRF token). No data was changed.

## Summary

| Severity | Count | Items |
|---|---|---|
| High | 1 | Frontend `xlsx` dependency (no fix available) |
| Medium | 3 | `react-router` open redirect advisory; demo passwords in seed source; unvalidated id parameters return 500 |
| Low | 4 | `exceljs` -> `uuid` advisory (not reachable); CSP allows inline styles; trace id not validated; duplicate seed file |
| Info | 2 | Committed `node_modules` size; large frontend bundles |

No critical issues. The authentication, CSRF, cookie, login-throttling and error-handling controls all held up under test.

## Findings

### F1 - High: frontend `xlsx` dependency (dependency, no fix)
- Evidence: `npm audit` reports prototype pollution and ReDoS in `xlsx` (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9), with no fixed version.
- Where: `frontend/src/pages/ImportPage.tsx` parses uploaded `.xlsx` files in the browser with `XLSX.read`.
- Risk: a crafted spreadsheet uploaded by an admin can exploit the parser in that admin's browser.
- Fix: stop parsing in the browser. The server already has `POST /api/accounts/import/preview` (exceljs). Send the file there and remove the `xlsx` package. This also removes about 370 KB from the bundle.

### F2 - Medium: `react-router` open redirect advisory (dependency)
- Evidence: `react-router` 6.0.0 - 7.17.0, GHSA-wrjc-x8rr-h8h6 (open redirect via backslash in `<Link>` and `useNavigate`) and GHSA-337j-9hxr-rhxg (SSR hydration; not used by this SPA).
- Risk: exploitable only if a redirect target is taken from user input. The app's `?redirect=` handling should be checked.
- Fix: upgrade `react-router-dom` to 7.18.x (a breaking upgrade; test routes after). Until then, do not build redirect targets from untrusted input.

### F3 - Medium: default passwords in source, with fallbacks
- Evidence: `backend/src/seed.ts` and `backend/src/seeds/seed.ts` contain `ChangeMe@Admin2026!`, `ChangeMe@Manager2026!`, `ChangeMe@Sales2026!` as fallbacks when the environment variables are not set.
- Mitigation verified: the default admin password is rejected by the running system (probe B05).
- Risk: if the seed is ever run against a production database, the passwords are public in the repository.
- Fix: make the seed refuse to run when `NODE_ENV=production`, remove the literal fallbacks, and require the environment variables. Keep one seed file (see F8).

### F4 - Medium: unvalidated id parameters return 500
- Evidence: `GET /api/accounts/not-a-uuid` (valid admin token) returns HTTP 500 `Internal server error` (probe B01). The error text does not leak anything.
- Risk: noisy errors and a small denial-of-service vector if repeated. No data exposure.
- Fix: validate `:id` parameters as UUIDs in a shared middleware and return 400 for malformed ids.

### F5 - Low: `exceljs` pulls in vulnerable `uuid` (dependency)
- Evidence: `npm audit` GHSA-w5hq-g745-h8pq (uuid v3/v5/v6 with a `buf` argument). The only fix offered is downgrading `exceljs` to 3.4.0, which is not recommended.
- Mitigation: the backend only calls `uuid` v4 (`backend/src/utils/tracer.ts`), so the advisory is not reachable.
- Action: accept the risk, and revisit when `exceljs` publishes a fix.

### F6 - Low: CSP allows inline styles
- Evidence: `helmet` CSP sets `styleSrc: ['self', 'unsafe-inline']` (`backend/src/app.ts`). Scripts are restricted to `'self'`.
- Risk: limited (styles only). Typical for MUI. Action: keep, or move to nonces when convenient.

### F7 - Low: trace id not validated
- Evidence: `GET /api/traces/:traceId` builds a file path from the id. Path traversal attempts (`..%2F`, `..%5C`) returned 404 (probe set), and the route is admin-only (non-admins get 403).
- Fix: validate the id as a UUID before building the path.

### F8 - Low: duplicate seed files
- Evidence: `backend/src/seed.ts` and `backend/src/seeds/seed.ts` both seed users with the same defaults. The npm script uses `src/seeds/seed.ts`.
- Fix: remove the unused file once F3 is fixed.

### F9 - Info: committed `backend/node_modules`
- Evidence: 17,651 `node_modules` files are tracked by git. The repository says this is intentional (production runs without `npm install`).
- Impact: a large clone and noisy diffs. Consider a build step on the server instead, once the deployment process allows it.

### F10 - Info: large frontend bundles
- Evidence (`frontend/dist/assets`): `index` 452 KB, `PerformancePage` 364 KB (charting), `ImportPage` 372 KB (mostly `xlsx`).
- Fix: F1 removes the `xlsx` weight. Lazy-load the charting library only on the pages that use it.

## What was tested and held up

| Probe | Result |
|---|---|
| Every protected API prefix refuses unauthenticated GET (30 prefixes checked) | Pass (the only "failure" was `/api/auth/me`, which does not exist, so there is nothing to protect) |
| Security headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy | Pass |
| No `X-Powered-By` disclosure | Pass |
| Unauthenticated POST refused | Pass (403) |
| JWT `alg: none` rejected; forged HS256 signature rejected | Pass (401 both) |
| Cookie session POST without CSRF token refused; mismatched CSRF token refused | Pass (403 both) |
| Login throttled after repeated failures | Pass (429) |
| Login answer identical for unknown and known email (no user enumeration) | Pass |
| Default admin password not accepted | Pass |
| Errors (authenticated and unauthenticated) do not leak stack traces or SQL text | Pass |
| Injection probes on search, sortBy, country, date and summary filters | Pass (no DB error text, no 5xx, data intact) |
| Traces endpoint admin-only; path traversal blocked in practice | Pass |
| Code: SQL built from user input | None found. All user values are bound parameters; sort keys come from fixed whitelists; the one `LIMIT`/`OFFSET` interpolation uses parsed integers |
| Code: `eval`, `exec`, `child_process`, raw HTML rendering | None found |
| Code: cookies | `authToken` is HttpOnly, SameSite=Strict, Secure in production |
| Code: passwords | bcrypt, cost 13 |
| Code: uploads | Extension and MIME allow-list, 5 MB cap, file count limit |
| Code: CORS | Allow-list with credentials; localhost origins only outside production |
| Code: request body size | 10 KB default, 5 MB only for the import save route |
| Code: browser storage | Only the user profile is kept in localStorage; the token stays in the HttpOnly cookie |

## Recommended order

1. F1 - remove client-side `xlsx`; use the server import.
2. F3 and F8 - seed hygiene.
3. F4 and F7 - validate ids as UUIDs in one shared middleware.
4. F2 - plan the `react-router-dom` upgrade and test routing.
5. F9 and F10 - repository and bundle weight, when the deployment process allows.

## Method and limits

- `npm audit --omit=dev` for backend and frontend.
- Static review of `app.ts`, auth, CSRF, cookies, uploads, traces, KPI audit, lifecycle and issue SQL, and the frontend storage and rendering code.
- Live probes with a short script against 127.0.0.1 (read requests and blocked writes only).
- Not covered: an external penetration test, business-logic abuse across roles beyond the scoping checks already in the code, infrastructure (TLS, server hardening, backups), and a full dynamic scan with a web scanner.
