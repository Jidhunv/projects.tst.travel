# Role-Based Access Control (RBAC) Implementation Summary

## What's Been Implemented ✅

### 1. **Self-Profile Endpoint** (NEW)
**File:** `backend/src/routes/users.ts` & `backend/src/controllers/user.controller.ts`

```typescript
// Available to ALL authenticated users
GET /api/users/me

// Returns:
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "sales@crm.local",
    "firstName": "John",
    "lastName": "Smith",
    "phoneNumber": "...",
    "role": {
      "id": "role-uuid",
      "name": "Sales Rep",
      "description": "..."
    },
    "isActive": true
  }
}
```

### 2. **Admin-Only Role Management**
**File:** `backend/src/routes/roles.ts`

```typescript
// Protected with requireRole('Admin') middleware
POST   /api/roles                  // Create role
GET    /api/roles                  // List roles
GET    /api/roles/:id              // Get role detail
PATCH  /api/roles/:id              // Update role
DELETE /api/roles/:id              // Delete role
PATCH  /api/roles/:id/permissions // Assign permissions
```

**Access Control:**
- ✅ Admin: Full access
- ❌ Manager: Denied (403)
- ❌ Sales Rep: Denied (403)
- ❌ Deal Stage Manager: Denied (403)

### 3. **Admin/Manager-Only User Management**
**File:** `backend/src/routes/users.ts`

```typescript
// Protected with requireRole(...ROLES_CAN_MANAGE_USERS) middleware
POST   /api/users                      // Create user
GET    /api/users                      // List users
GET    /api/users/:id                  // Get user detail
PATCH  /api/users/:id                  // Update user
PATCH  /api/users/:id/activate         // Activate user
PATCH  /api/users/:id/deactivate       // Deactivate user
PATCH  /api/users/:id/change-password  // Change password
DELETE /api/users/:id                  // Delete user
```

**Access Control:**
- ✅ Admin: Full access
- ✅ Manager: Full access
- ❌ Sales Rep: Denied (403)
- ❌ Deal Stage Manager: Denied (403)

### 4. **Data Access Control (View/Add/Edit/Delete)**
**Files:** `backend/src/middleware/auth.ts` & All controllers

#### List Endpoints - `getOwnerScope()`
- **Admin/Manager**: See ALL records
- **Sales Rep**: See ONLY their own records (filtered by `ownerId`)
- **Deal Stage Manager**: See ALL records (read-only)

#### Detail/Edit/Delete Endpoints - `canAccessRecord()`
- **Admin/Manager**: Can access ANY record
- **Sales Rep**: Can ONLY access records they created
- **Deal Stage Manager**: Read-only (cannot edit/delete)

---

## How It Works - Technical Details

### Middleware Chain
```
Request → verifyToken → [optional: requireRole] → Controller
           ↓              ↓                         ↓
       Extract JWT      Check role              Execute action
       from cookie      permission              with access control
```

### Access Control Functions

#### 1. `getOwnerScope(user?: AuthUser): string | undefined`
Used in **LIST endpoints** to filter records:

```typescript
export const getOwnerScope = (user?: AuthUser): string | undefined => {
  if (!user) return undefined;
  if (ROLES_WITH_FULL_VISIBILITY.includes(user.role)) {
    return undefined;  // Admin/Manager see all
  }
  return user.id;  // Sales Rep sees only their own (ownerId === user.id)
};
```

#### 2. `canAccessRecord(user: AuthUser | undefined, ownerId: string): boolean`
Used in **DETAIL/EDIT/DELETE endpoints** to check record ownership:

```typescript
export const canAccessRecord = (user: AuthUser | undefined, ownerId: string): boolean => {
  if (!user) return false;
  if (ROLES_WITH_FULL_VISIBILITY.includes(user.role)) {
    return true;  // Admin/Manager can access any
  }
  return user.id === ownerId;  // Sales Rep can only access own
};
```

#### 3. `requireRole(...allowedRoles: string[])`
Used on **ADMIN endpoints** to restrict access:

```typescript
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to perform this action' 
      });
    }
    next();
  };
};
```

---

## Example: Lead Management Access Control

### Scenario 1: Sales Rep viewing leads

**Request:**
```bash
GET /api/leads?page=1&limit=20
Authorization: Bearer <jwt_token>
```

**Backend Processing:**
1. `verifyToken` → Extracts user from JWT
2. `LeadController.getLeads()` → Calls `getOwnerScope(user)`
3. Returns: `user.id` (e.g., "2a85b84b-7de4-...")
4. **Query:** `WHERE ownerId = '2a85b84b-7de4-...'`
5. **Result:** Only leads owned by this Sales Rep

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "lead-1", "firstName": "John", ..., "ownerId": "2a85b84b-7de4-..." },
    { "id": "lead-2", "firstName": "Jane", ..., "ownerId": "2a85b84b-7de4-..." }
  ],
  "meta": { "total": 2, "page": 1 }
}
```

### Scenario 2: Sales Rep trying to edit another user's lead

**Request:**
```bash
PATCH /api/leads/{other_user_lead_id}
Authorization: Bearer <jwt_token>
```

**Backend Processing:**
1. `verifyToken` → Extracts user
2. `LeadController.updateLead()` → Calls `canAccessRecord(user, lead.ownerId)`
3. Checks: `user.id === lead.ownerId` → **FALSE**
4. **Result:** 403 Forbidden

**Response:**
```json
{
  "success": false,
  "error": "You can only update your own leads"
}
```

### Scenario 3: Manager viewing leads

**Request:**
```bash
GET /api/leads?page=1&limit=20
Authorization: Bearer <manager_jwt_token>
```

**Backend Processing:**
1. `verifyToken` → Extracts user (role: "Manager")
2. `LeadController.getLeads()` → Calls `getOwnerScope(user)`
3. Returns: `undefined` (no restriction for Manager)
4. **Query:** `WHERE 1=1` (no owner filter)
5. **Result:** ALL leads in system

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "lead-1", "firstName": "John", ..., "ownerId": "2a85b84b-..." },
    { "id": "lead-2", "firstName": "Jane", ..., "ownerId": "9c7f1a2b-..." },
    { "id": "lead-3", "firstName": "Bob", ..., "ownerId": "5d3e8c9b-..." }
  ],
  "meta": { "total": 150, "page": 1 }
}
```

### Scenario 4: Non-Admin trying to manage roles

**Request:**
```bash
GET /api/roles
Authorization: Bearer <salesperson_jwt_token>
```

**Backend Processing:**
1. `verifyToken` → Extracts user (role: "Sales Rep")
2. `requireRole('Admin')` middleware → Checks role
3. "Sales Rep" NOT in ["Admin"] → **Denied**
4. **Result:** 403 Forbidden

**Response:**
```json
{
  "success": false,
  "error": "You do not have permission to perform this action"
}
```

---

## Test Cases to Verify

### Test 1: Sales Rep views own profile
```bash
# Login as Sales Rep
POST /api/auth/login
Body: { "email": "sales@crm.local", "password": "sales123" }

# View own profile (should succeed)
GET /api/users/me

# Expected: 200 OK with user details
```

### Test 2: Sales Rep sees only own leads
```bash
# As Sales Rep
GET /api/leads?page=1&limit=20

# Expected: 200 OK with only leads where ownerId = logged-in user
```

### Test 3: Sales Rep denied access to roles
```bash
# As Sales Rep
GET /api/roles

# Expected: 403 Forbidden with message "You do not have permission..."
```

### Test 4: Manager sees all leads
```bash
# Login as Manager
POST /api/auth/login
Body: { "email": "manager@crm.local", "password": "..." }

# View all leads
GET /api/leads?page=1&limit=20

# Expected: 200 OK with ALL leads (no owner filter)
```

### Test 5: Admin manages roles
```bash
# Login as Admin
POST /api/auth/login
Body: { "email": "admin@crm.local", "password": "SecureAdmin@2026!" }

# List all roles (should succeed)
GET /api/roles

# Expected: 200 OK with all roles
```

### Test 6: Sales Rep cannot edit another user's lead
```bash
# As Sales Rep, try to edit someone else's lead
PATCH /api/leads/{other_user_lead_id}
Body: { "firstName": "Updated" }

# Expected: 403 Forbidden with message "You can only update your own leads"
```

---

## Current Status

| Feature | Status | Location |
|---------|--------|----------|
| JWT Authentication | ✅ Complete | `auth.ts` middleware |
| HTTPOnly Cookies | ✅ Complete | `auth.controller.ts` |
| CSRF Protection | ✅ Complete | `csrf.ts` middleware |
| Rate Limiting | ✅ Complete | `rateLimit.ts` middleware |
| Input Validation | ✅ Complete | `validation.ts` middleware |
| Role-Based Access (Admin/Manager/Rep) | ✅ Complete | `auth.ts` + all controllers |
| Self-Profile Endpoint | ✅ Complete | `/api/users/me` |
| Admin-Only Role Management | ✅ Complete | `/api/roles/*` |
| Admin/Manager User Management | ✅ Complete | `/api/users/*` |
| Lead Access Control | ✅ Complete | `lead.controller.ts` |
| Account Access Control | ✅ Complete | `account.controller.ts` |
| Opportunity Access Control | ✅ Complete | `opportunity.controller.ts` |
| Audit Logging | ✅ Complete | `audit.ts` middleware |

---

## Next Steps

1. **Test via Browser**: Login as different roles and verify:
   - Sales Rep sees only own leads
   - Manager sees all leads
   - Admin can access settings/roles
   - Deal Stage Manager can view but not edit

2. **Test via API**: Run the curl commands above to verify responses

3. **Verify Database**: Check audit log to see all access attempts

