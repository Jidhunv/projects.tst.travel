# CRM Role-Based Access Control (RBAC) Matrix

## Permission Legend
- ✅ **Allowed** - User can perform this action
- ❌ **Denied** - User cannot perform this action
- 👤 **Own Only** - User can only perform on their own items
- 🔍 **View Only** - User can view but not modify

---

## LEADS MODULE

### View (List & Detail)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ All Leads | Can view all leads in system |
| Manager | ✅ All Leads | Can view all leads in system |
| Sales Rep | 👤 Own Leads | Can only view leads they created |
| Deal Stage Manager | 🔍 View All | Can view but not edit |

### Add (Create)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Create Any | Can create leads for any user |
| Manager | ✅ Create Any | Can create leads for any user |
| Sales Rep | ✅ Create Own | Can only create leads assigned to self |
| Deal Stage Manager | ❌ Cannot Create | No creation permission |

### Edit (Update)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Edit Any | Can edit any lead |
| Manager | ✅ Edit Any | Can edit any lead |
| Sales Rep | 👤 Edit Own | Can only edit leads they created |
| Deal Stage Manager | 👤 Update Status Only | Can change status but not other fields |

### Delete
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Delete Any | Can delete any lead |
| Manager | ✅ Delete Any | Can delete any lead |
| Sales Rep | 👤 Delete Own | Can only delete leads they created |
| Deal Stage Manager | ❌ Cannot Delete | No deletion permission |

---

## ACCOUNTS MODULE

### View (List & Detail)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ All Accounts | Can view all accounts |
| Manager | ✅ All Accounts | Can view all accounts |
| Sales Rep | 👤 Own Accounts | Can only view accounts they own |
| Deal Stage Manager | 🔍 View All | Read-only access |

### Add (Create)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Create Any | Can create accounts |
| Manager | ✅ Create Any | Can create accounts |
| Sales Rep | ✅ Create Own | Creates account owned by self |
| Deal Stage Manager | ❌ Cannot Create | No creation permission |

### Edit (Update)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Edit Any | Can edit any account |
| Manager | ✅ Edit Any | Can edit any account |
| Sales Rep | 👤 Edit Own | Can only edit accounts they own |
| Deal Stage Manager | ❌ Cannot Edit | Read-only |

### Delete
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Delete Any | Can delete any account |
| Manager | ✅ Delete Any | Can delete any account |
| Sales Rep | 👤 Delete Own | Can only delete accounts they own |
| Deal Stage Manager | ❌ Cannot Delete | No deletion permission |

---

## OPPORTUNITIES MODULE

### View (List & Detail)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ All Opportunities | Can view all opportunities |
| Manager | ✅ All Opportunities | Can view all opportunities |
| Sales Rep | 👤 Own Opportunities | Can only view opportunities they own |
| Deal Stage Manager | 🔍 View All | Read-only access |

### Add (Create)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Create Any | Can create opportunities |
| Manager | ✅ Create Any | Can create opportunities |
| Sales Rep | ✅ Create Own | Creates opportunity owned by self |
| Deal Stage Manager | ❌ Cannot Create | No creation permission |

### Edit (Update)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Edit Any | Can edit any opportunity |
| Manager | ✅ Edit Any | Can edit any opportunity |
| Sales Rep | 👤 Edit Own | Can only edit opportunities they own |
| Deal Stage Manager | 👤 Update Stage/Probability | Limited to stage and probability changes |

### Delete
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Delete Any | Can delete any opportunity |
| Manager | ✅ Delete Any | Can delete any opportunity |
| Sales Rep | 👤 Delete Own | Can only delete opportunities they own |
| Deal Stage Manager | ❌ Cannot Delete | No deletion permission |

---

## CONTRACTS MODULE

### View (List & Detail)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ All Contracts | Can view all contracts |
| Manager | ✅ All Contracts | Can view all contracts |
| Sales Rep | 👤 Own Contracts | Can only view contracts for their accounts |
| Deal Stage Manager | 🔍 View All | Read-only access |

### Add (Create)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Create Any | Can create contracts |
| Manager | ✅ Create Any | Can create contracts |
| Sales Rep | ✅ Create Own | Creates contract for own accounts |
| Deal Stage Manager | ❌ Cannot Create | No creation permission |

### Edit (Update)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Edit Any | Can edit any contract |
| Manager | ✅ Edit Any | Can edit any contract |
| Sales Rep | 👤 Edit Own | Can only edit contracts for own accounts |
| Deal Stage Manager | ❌ Cannot Edit | Read-only |

### Delete
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Delete Any | Can delete any contract |
| Manager | ✅ Delete Any | Can delete any contract |
| Sales Rep | 👤 Delete Own | Can only delete own contracts |
| Deal Stage Manager | ❌ Cannot Delete | No deletion permission |

---

## PROJECTS MODULE

### View (List & Detail)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ All Projects | Can view all projects |
| Manager | ✅ All Projects | Can view all projects |
| Sales Rep | 👤 Own Projects | Can only view projects they created |
| Deal Stage Manager | 🔍 View All | Read-only access |

### Add (Create)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Create Any | Can create projects |
| Manager | ✅ Create Any | Can create projects |
| Sales Rep | ✅ Create Own | Creates project owned by self |
| Deal Stage Manager | ❌ Cannot Create | No creation permission |

### Edit (Update)
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Edit Any | Can edit any project |
| Manager | ✅ Edit Any | Can edit any project |
| Sales Rep | 👤 Edit Own | Can only edit projects they created |
| Deal Stage Manager | ❌ Cannot Edit | Read-only |

### Delete
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Delete Any | Can delete any project |
| Manager | ✅ Delete Any | Can delete any project |
| Sales Rep | 👤 Delete Own | Can only delete projects they created |
| Deal Stage Manager | ❌ Cannot Delete | No deletion permission |

---

## ADMIN FEATURES

### Role Management
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Full Control | Create, read, update, delete roles |
| Manager | ❌ No Access | Cannot manage roles |
| Sales Rep | ❌ No Access | Cannot manage roles |
| Deal Stage Manager | ❌ No Access | Cannot manage roles |

### User Management
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ Full Control | Create, read, update, delete users |
| Manager | ✅ Manage Users | Can manage users (partial) |
| Sales Rep | ❌ No Access | Cannot manage users |
| Deal Stage Manager | ❌ No Access | Cannot manage users |

### View Own Profile
| Role | Permission | Notes |
|------|-----------|-------|
| Admin | ✅ `/api/users/me` | Can view own profile |
| Manager | ✅ `/api/users/me` | Can view own profile |
| Sales Rep | ✅ `/api/users/me` | Can view own profile |
| Deal Stage Manager | ✅ `/api/users/me` | Can view own profile |

---

## ACCESS CONTROL IMPLEMENTATION

### Backend Middleware & Functions

**`getOwnerScope(user)`** - Used in all list endpoints
- Admin/Manager: Returns `undefined` (no restriction, see all)
- Sales Rep: Returns `user.id` (filtered to own items)
- Deal Stage Manager: Returns `undefined` (see all, but read-only)

**`canAccessRecord(user, ownerId)`** - Used in update/delete/view detail
- Admin/Manager: Always returns `true`
- Sales Rep: Returns `true` only if `user.id === ownerId`
- Deal Stage Manager: Returns `true` for read-only operations

**`requireRole(...roles)`** - Applied to sensitive endpoints
- Used on: `/api/roles/*`, `/api/users/*` (except `/me`)
- Ensures only authorized roles can access

---

## Implementation Checklist

- [x] Rate limiting on authentication endpoints
- [x] JWT token with 1-hour expiration
- [x] HTTPOnly cookies for token storage
- [x] Input validation with DTOs
- [x] CSRF protection
- [x] Audit logging with sensitive field redaction
- [x] Access control on Leads (View/Add/Edit/Delete)
- [x] Access control on Opportunities (View/Add/Edit/Delete)
- [x] Admin-only role management
- [x] Self-profile endpoint (`/api/users/me`)
- [x] Access control verification for all modules
- [x] Role-based permission enforcement (Deal Stage Manager restrictions)
- [x] Permission checking middleware and functions

---

## Testing the RBAC System

### Test Case 1: Sales Rep viewing leads
```bash
# Login as Sales Rep
POST /api/auth/login

# Should only see leads owned by this rep
GET /api/leads?page=1&limit=20
# Returns: [lead1, lead2] where all have ownerId = salesRep.id
```

### Test Case 2: Sales Rep trying to edit another user's lead
```bash
# Attempt to edit lead owned by someone else
PATCH /api/leads/{otherUserLeadId}
# Expected: 403 Forbidden - "You can only update your own leads"
```

### Test Case 3: Manager viewing all leads
```bash
# Login as Manager
POST /api/auth/login

# Should see ALL leads
GET /api/leads?page=1&limit=20
# Returns: [lead1, lead2, lead3, lead4, ...] from all users
```

### Test Case 4: Non-Admin trying to manage roles
```bash
# Attempt to get roles as Sales Rep
GET /api/roles
# Expected: 403 Forbidden - "You do not have permission to perform this action"
```

### Test Case 5: Any user viewing own profile
```bash
# Can be called by any authenticated user
GET /api/users/me
# Returns: { id, email, firstName, lastName, role, ... }
```

---

## Notes

- **Ownership**: Determined by `ownerId` field on records
- **Scope Restriction**: Applied at query level using `getOwnerScope()`
- **Record Access**: Checked via `canAccessRecord()` before operations
- **Role-Based**: Checked via `requireRole()` middleware for sensitive endpoints
- **Audit Trail**: All operations logged with user, timestamp, and sanitized data

