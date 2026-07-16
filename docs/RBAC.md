# Roles & permissions

## The model

A permission is a triple, flattened to a string as `module:action:scope`:

- **module** — `leads`, `accounts`, `opportunities`, `contacts`, `contracts`, `invoices`, `projects`, `tickets`, `expenses`, `suppliers`, `sales_visits`, `products`, `users`, `reports`, `audit_log`, `admin`
- **action** — usually `read`, `create`, `update`, `delete`; plus `bulk_action` (leads/accounts/opportunities), `approve` (expenses), and the `admin` module's `manage_users`, `manage_roles`, `manage_settings`, `view_audit_log`
- **scope** — `all` (every record) or `self` (only your own)

A `User` has one `Role`; a `Role` has many `Permission`s. On every authenticated request, `verifyToken` reloads the user's permissions from the database and flattens them onto `req.user.permissions`, so **permission changes take effect immediately without re-login**.

## Resolution

`resolvePermission(user, module, action)` in `middleware/auth.ts`:

1. If `user.role === 'Admin'` → allowed, scope `all`. **Admin bypasses everything**, an anti-lockout safety net.
2. Else if permissions contain `module:action:all` → allowed, scope `all`.
3. Else if they contain `module:action:self` → allowed, scope `self`.
4. Else → denied.

> Testing RBAC as Admin proves nothing, because of step 1. Always test with a non-admin role.

## Enforcing it

Enforcement is **opt-in, per controller**. Nothing is automatic: a route with only `verifyToken` is open to every logged-in user no matter what Role Management displays.

```ts
import { canPerformAction, getOwnerScope, canAccessRecord } from '../middleware/auth';

// 1. Can they do this at all?
if (!canPerformAction(req.user, 'invoices', 'read')) {
  throw new AppError(403, 'You do not have permission to view invoices');
}

// 2. Which records? undefined = "all"; otherwise the user's own id.
const ownerId = getOwnerScope(req.user, 'invoices');
const { data } = await invoiceService.getInvoices({ accountOwnerId: ownerId });

// 3. For a single record, check the owner.
if (!canAccessRecord(req.user, 'leads', lead.ownerId, 'update', lead.assigneeIds)) {
  throw new AppError(403, 'You can only update your own leads');
}
```

`getOwnerScope` returns the user's own id when they have **no** read permission at all — the most restrictive fallback — so an unpermitted user sees their own records rather than everything.

### Ownership is not always a column

Most records carry `ownerId`. **Invoices do not** — an invoice inherits ownership through `accountId → Account.ownerId`, so `self` means *invoices for accounts you own*, and scoping joins the account. Check the model before assuming an owner column exists.

## Adding a module

All four steps, or the feature is broken in a way that looks fine:

1. **Seed the permissions** — add to the array in `backend/src/seeds/seed.ts` (create-if-missing, so re-running is safe). They then appear in Role Management automatically, which groups by module.
2. **Enforce in the controller** — as above. *Skip this and the toggle is decorative:* it renders, saves, and changes nothing.
3. **Gate the menu** — `show: canViewModule('yourmodule')` in `frontend/src/components/Layout.tsx`.
4. **Add the route** — `<ProtectedRoute module="yourmodule">` in `frontend/src/App.tsx`.

Grant the new permissions to roles that should keep working. Existing roles get nothing by default, so strict enforcement locks out every non-admin until granted.

## Frontend gating

`useAuth` mirrors the backend, including the Admin bypass:

```ts
hasPermission('leads', 'update')   // either scope
canViewModule('leads')             // read at either scope
canReassign('leads')               // update at "all" scope
```

This is **cosmetic only** — it hides UI. The backend check is the real control. Never rely on the frontend for access.

## Seeded roles

| Role | Intent |
|---|---|
| **Admin** | Everything, plus the hardcoded bypass |
| **Manager** | Broad `all`-scope access |
| **Sales Rep** | Mostly `self` scope |
| **Deal Stage Manager** | Custom, created via the UI |

Roles are editable at runtime in Role Management (`/roles`), so these are only starting points. `Admin`, `Manager` and `Sales Rep` cannot be deleted.

## Known gaps

`contracts`, `projects`, `tickets` and `activities` have permissions defined and displayed **but not enforced** — any authenticated user has full access. See [SECURITY.md](SECURITY.md#1-contracts-projects-tickets-are-not-enforced--high-open).
