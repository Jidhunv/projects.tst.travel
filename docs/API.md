# API reference

Base URL `http://127.0.0.1:3001/api` (`VITE_API_URL` on the frontend).

## Conventions

Every response is wrapped:

```jsonc
// success
{ "success": true, "data": <object|array>, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
// error
{ "success": false, "error": "Human-readable message" }
```

`meta` appears only on paginated list endpoints. Errors are produced centrally by `errorHandler` from a thrown `AppError`.

**Status codes:** `200` ok · `201` created · `400` validation · `401` unauthenticated · `403` no permission · `404` not found · `409` conflict (duplicate) · `423` account locked (brute force) · `500` server error.

> A `500` on a whole resource usually means the entity and the database schema disagree — see [DEVELOPMENT.md](DEVELOPMENT.md#schema-changes).

## Auth

JWT in an **HttpOnly** `authToken` cookie, also accepted as `Authorization: Bearer <token>`. Permissions are reloaded from the database on every request, so role changes apply immediately without re-login.

**Writes require CSRF.** Read the `XSRF-TOKEN` cookie and send it back as the `X-CSRF-Token` header; omitting it gives `403 CSRF token mismatch`.

`POST /api/auth/login` locks an account for 15 minutes after 5 consecutive failures (`423`). Logout blacklists the token until its natural expiry.

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | rate-limited |
| POST | `/auth/logout` | revokes the token |
| POST | `/auth/password-reset` | rate-limited; does not reveal whether the email exists |
| POST | `/auth/password-reset-confirm` | |
| POST | `/auth/change-password`, `/auth/change-password-first-login` | |
| GET | `/users/me` | current user + flattened permissions |

## Authorisation

Enforcement is **per controller and opt-in** — see [RBAC.md](RBAC.md). Coverage is uneven:

| Enforced | Not enforced (any authenticated user has full access) |
|---|---|
| accounts, leads, opportunities, expenses, invoices, suppliers, sales_visits, reports | **contracts, projects, tickets, activities** |

`users`, `roles`, `audit-logs`, `email-settings` and `traces` are gated at the route with `requireRole('Admin')`. Admin bypasses all checks.

## Endpoints

List endpoints take `?page` & `?limit` plus per-module filters (commonly `search`, `status`, `region`, `country`, date ranges).

### Core

| Resource | Endpoints |
|---|---|
| **Leads** `/leads` | `POST /` · `GET /` · `GET /:id` · `PATCH /:id` · `DELETE /:id` · `PATCH /:id/status` · `PATCH /:id/assign` · `POST /:id/convert-to-account` · `POST /:id/convert-to-opportunity` · `PATCH /:id/lost` · `POST /bulk-import` |
| **Accounts** `/accounts` | `POST /` · `GET /` · `GET /:id` · `PATCH /:id` · `PATCH /:id/assign` · `DELETE /:id`<br>Contacts: `POST|GET /:accountId/contacts` · `PATCH|DELETE /:accountId/contacts/:contactId` · `PATCH /:accountId/contacts/:contactId/set-primary` |
| **Opportunities** `/opportunities` | `POST /` · `GET /` · `GET /:id` · `PATCH /:id` · `DELETE /:id` · `PATCH /:id/stage` · `PATCH /:id/assign` · `POST /:id/close`<br>Line items: `POST /:opportunityId/line-items` · `PATCH|DELETE /:opportunityId/line-items/:lineItemId`<br>`GET /pipeline/view` · `GET /pipeline/forecast` · `GET /meta/rejection-reasons` |
| **Contracts** `/contracts` | `POST /` · `GET /` · `GET /:id` · `PATCH /:id` · `PATCH /:id/approve` · `DELETE /:id` — **unenforced** |
| **Projects** `/projects` | CRUD — **unenforced** |
| **Invoices** `/invoices` | `POST /` · `GET /` · `GET /:id` · `PATCH /:id` · `DELETE /:id` · `POST|GET /:id/payments` · `GET /contract/:contractId/summary` |
| **Tickets** `/tickets` | CRUD — **unenforced** |

**Invoice scoping:** an invoice has no owner column; `self` scope means *invoices whose account you own*. Recording a payment needs `invoices:update`, since it mutates the invoice.

### Operations

| Resource | Endpoints |
|---|---|
| **Expenses** `/expenses` | `GET /` · `POST /` · `PATCH /:id` · `POST /:id/decision` (approve/reject, needs `expenses:approve`) · `DELETE /:id` |
| **Sales visits** `/sales-visits` | CRUD + follow-ups |
| **Activities** `/activities` | `POST|GET /` · `GET /my-followups` · `PATCH /:id/complete` · `DELETE /:id` · notes: `POST|GET /notes` · `DELETE /notes/:id` — **unenforced** |
| **Notifications** `/notifications` | `GET /` · `GET /count/unread` · `PATCH /:id/read` · `PATCH /mark-all/read` · `DELETE /:id` |
| **Reports** `/reports` | read-only aggregates |

### Master data

| Resource | Endpoints |
|---|---|
| **Products** `/products` | CRUD; delete deactivates rather than removes, so historical line items stay valid |
| **Product categories** `/product-categories` | `GET /` (`?isActive`) · `POST /` · `PATCH /:id` · `DELETE /:id`<br>Name and code are unique. Deleting a category still referenced by products **deactivates** it instead, and says so in `data.message`. |
| **Suppliers** `/suppliers` | CRUD |
| **Countries** `/countries` | `GET /` (`?search`) · `POST /` (**Admin only**) |

### Administration

| Resource | Endpoints |
|---|---|
| **Users** `/users` | CRUD · `GET /me` · `PATCH /:id/activate`, `/:id/deactivate` · `POST /:id/reset-password`, `/:id/send-invite`<br>Only Admin may change `roleId` (prevents privilege escalation). |
| **Roles** `/roles` | CRUD · `GET /permissions/list` · `PATCH /:id/permissions`<br>`Admin`, `Manager`, `Sales Rep` cannot be deleted. |
| **Audit logs** `/audit-logs` | `GET /` · `GET /:entityType/:entityId` — **Admin only** |
| **Email settings** `/email-settings` | `GET /` · `PATCH /` · `POST /test-connection` · `POST /send-test-email` |
| **Traces** `/traces` | `GET /` · `GET /:traceId` · `/:traceId/view` · `/:traceId/dot` — **Admin only** |

## Auditing

Successful `POST`/`PATCH`/`DELETE` requests are recorded to `audit_logs` with the module, record id, action, new values (password fields redacted), user, IP and user agent.

The module is derived from the first path segment after `/api` of `req.originalUrl`. Rows written before 2026-07-16 hold record UUIDs, sub-action names or `unknown` in that column — a historical bug, not a current one.
