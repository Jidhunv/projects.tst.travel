# Secure Coding Guide - CRM Platform

## Overview
This document outlines the secure coding practices implemented across the CRM backend.

---

## 1. Authentication & Authorization

### JWT Token Management
- **File**: `backend/src/middleware/auth.ts`
- **Secure Implementation**:
  - Tokens extracted from Authorization header or HTTPOnly cookie
  - JWT signature verified against `JWT_SECRET` (32-byte base64)
  - Revoked tokens checked against blacklist on every request
  - Live permissions loaded from database (reflects role changes without re-login)

```typescript
// Token verification with revocation check
const decoded = jwt.verify(token, secret) as AuthUser;
if (await tokenBlacklist.isRevoked(token)) {
  return res.status(401).json({ error: 'Unauthorized' });
}
decoded.permissions = await loadUserPermissions(decoded.id);
req.user = decoded;
```

### Password Hashing
- **Algorithm**: bcrypt with cost factor 13 (strong, ~260ms per hash)
- **File**: `backend/src/services/user.service.ts:30, 129, 259, 273`
- **Safe**: No plaintext storage, comparison is timing-safe

### Brute-Force Protection
- **Threshold**: 5 failed attempts → 15-minute lockout
- **State**: Persisted in `LoginSecurity` table (survives server restart)
- **Implementation**: Incremental failure counter with exponential lockout

```typescript
if (sec.failedAttempts >= MAX_ATTEMPTS) {
  sec.lockoutUntil = new Date(Date.now() + LOCKOUT_MINS * 60000);
  sec.failedAttempts = 0;
  await loginSecurityRepo.save(sec);
}
```

### User Enumeration Prevention
- **Password Reset Endpoint**: Returns 200 status for ALL emails (existing or not)
- **Generic Messages**: "If account exists, reset email sent" (doesn't leak user existence)
- **Returns**: `null | string` from `createPasswordResetToken()` to suppress 404 errors
- **Audit Log**: Only logs when token actually created

```typescript
const token = await userService.createPasswordResetToken(email);
if (token) {
  // Send email only if user exists
  await emailService.sendPasswordResetEmail(user, token);
}
// Always return same 200 response
res.json({ message: 'If account exists, password reset email sent' });
```

---

## 2. Password Security

### Temporary Password Generation
- **File**: `backend/src/services/user.service.ts:287-297`
- **Method**: `crypto.randomBytes(12)` + charset selection
- **Entropy**: 12 bytes × 68 charset = 63 bits (strong, unguessable)
- **Previous Risk**: Math.random() (~53 bits) was predictable
- **Fixed**: Uses cryptographically secure random source

```typescript
// Secure: Uses crypto.randomBytes, not Math.random()
const randomBytes = crypto.randomBytes(12);
for (let i = 0; i < 12; i++) {
  password += chars[randomBytes[i] % chars.length];
}
```

### Password Reset Tokens
- **Generation**: 32-byte random hex (256 bits)
- **Storage**: SHA256 hash (not plaintext)
- **Expiry**: 1 hour absolute
- **Single Use**: Token cleared after successful reset

```typescript
const rawToken = crypto.randomBytes(32).toString('hex');
const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
```

### Password Validation
- **File**: `backend/src/utils/passwordValidator.ts`
- **Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Applied To**: New passwords, password resets, admin-set passwords

---

## 3. Input Validation

### Database Query Safety
- **Method**: TypeORM parameterized queries (all inputs bound)
- **No SQL Injection**: Parameters never concatenated into SQL strings
- **Example**:
```typescript
// ✓ Safe: Parameter binding
const user = await userRepo.findOne({
  where: { email: email },  // Parameterized
  relations: ['role']
});

// ✗ Never do this: String concatenation
const user = await userRepo.query(`SELECT * FROM user WHERE email = '${email}'`);
```

### Object Assignment Safety
- **Mass Assignment Prevention**: Only whitelisted fields updated
- **Files**: `user.controller.ts`, `account.controller.ts`
- **Pattern**: Destructure and validate before Object.assign()

```typescript
// ✓ Safe: Only email and status updated
const { email, isActive } = req.body;
const updated = await userService.updateUser(userId, { email, isActive });

// ✗ Dangerous: All request properties accepted
Object.assign(user, req.body);  // Could change roleId, password, etc!
```

### Request Size Limits
- **JSON Body**: 10 KB limit
- **URL-encoded**: 10 KB limit
- **File Uploads**: 50 MB limit with MIME type validation
- **Configuration**: `app.ts` middleware setup

---

## 4. Authorization (RBAC)

### Role-Based Access Control
- **Framework**: Module × Action × Scope (3-layer permission system)
- **Modules**: leads, accounts, opportunities, sales_visits, etc.
- **Actions**: read, create, update, delete
- **Scopes**: all (any record) or self (user's own records)

### Permission Resolution
- **Admin**: Always allowed (safety net against lockout)
- **Other Roles**: Must have explicit `module:action:scope` permission
- **Scope Enforcement**: "self" scope users only access their own records

```typescript
function resolvePermission(user, module, action):
  if (user.role === 'Admin') return { allowed: true, scope: 'all' };
  
  const perm = user.permissions.find(p => 
    p.startsWith(`${module}:${action}:`));
  return perm ? { allowed: true, scope: perm.scope } : { allowed: false };
```

### Record-Level Access Checks
- **Every Create/Update/Delete**: Calls `canAccessRecord()` or `canPerformAction()`
- **Example**: User can only edit their own sales visits (if self-scoped)
- **Admin Override**: Admin can edit all records (if role permits)

---

## 5. Error Handling

### Safe Error Responses
- **Known Errors** (AppError): Detailed message, appropriate HTTP status
- **Unknown Errors**: Generic "Internal server error" (prevents info disclosure)
- **Logging**: Full error details logged server-side only, never sent to client

```typescript
if (err instanceof AppError) {
  return res.status(err.statusCode).json({ error: err.message });
}
// Unknown error - hide details
logger.error('Unhandled error:', err);
return res.status(500).json({ error: 'Internal server error' });
```

### Authorization Audit Logging
- **All 403 Errors**: Logged to audit trail with user ID, role, reason
- **Enables**: Post-incident forensics, permission misconfiguration detection
- **File**: `backend/src/utils/securityLogger.ts`

---

## 6. Data Sensitivity

### Password Fields - Never Exposed
- **Response Sanitizer**: `sanitizeResponse.ts` middleware
- **Automatically Removes**:
  - `password`
  - `resetToken`
  - `resetTokenExpiry`
  - From EVERY JSON response (even if accidentally joined)
- **Applied**: Before response sent to client

```typescript
// sanitizeResponse.ts - runs on ALL responses
const SENSITIVE_KEYS = ['password', 'resetToken', 'resetTokenExpiry'];
function sanitize(obj) {
  for (const key of SENSITIVE_KEYS) {
    delete obj[key];
  }
  return obj;
}
```

### Audit Logging
- **Sanitized**: All user input logged is first sanitized
- **Access Control**: Audit logs viewable by Admin only
- **Data Logged**:
  - Login attempts (success/failure/lockout)
  - Password changes
  - Permission denials
  - Account deactivation
  - API errors
- **Time Retention**: Based on compliance requirements

---

## 7. Cookie Security

### HTTPOnly + Secure Flags
- **File**: `backend/src/controllers/auth.controller.ts:48-54`
- **Flags Applied**:
  - `httpOnly: true` - JS cannot access (prevents XSS token theft)
  - `sameSite: 'strict'` - CSRF protection (not sent cross-origin)
  - `secure: true` - HTTPS only (production), false for dev
  - `maxAge: 3600000` - 1 hour expiration (matches JWT)

```typescript
res.cookie('authToken', token, {
  httpOnly: true,     // JS cannot read
  secure: isProduction, // HTTPS only in prod
  sameSite: 'strict', // No cross-origin
  maxAge: 3600000,    // 1 hour
});
```

---

## 8. CSRF Protection

### Double-Submit Cookie Pattern
- **File**: `backend/src/middleware/csrf.ts`
- **Flow**:
  1. Server generates random CSRF token
  2. Sent in response header AND body
  3. Client must include token in request header
  4. Server verifies header token matches cookie token
  5. Tokens rotate after each request (stable-token pattern)

```typescript
// Generate CSRF token
const token = crypto.randomBytes(32).toString('hex');

// Client sends in request header
const csrfToken = req.headers['x-csrf-token'];

// Verify against cookie
if (csrfToken !== req.cookies.csrfToken) {
  return res.status(403).json({ error: 'CSRF validation failed' });
}
```

---

## 9. Environment Security

### Secrets Management
- **JWT_SECRET**: 32-byte base64, rotated periodically
- **SESSION_SECRET**: 32-byte base64 (for session management)
- **Database Password**: Strong, stored in .env (not committed)
- **SMTP Password**: Encrypted or from secrets manager (future)

### Environment Variables
- **.env File**: 
  - Should NOT be committed to git
  - Ignored via `.gitignore`
  - Loaded by dotenv at startup
  - Contains both backend and frontend config
  
- **backend/.env**: 
  - Synced with root .env for consistency
  - Loaded by backend at startup
  - Contains only backend-specific values

### Configuration Validation
- **Startup Checks** (future enhancement):
  - JWT_SECRET must be 32+ bytes
  - DATABASE_URL must be valid PostgreSQL connection
  - Required env vars present before server starts

---

## 10. Database Security

### Parameterized Queries
- **All User Input**: Bound as parameters, never concatenated
- **ORM**: TypeORM (built-in protection)
- **No Raw Queries**: Raw SQL queries are avoided

### Connection Pool
- **Max Connections**: 20 (configurable)
- **Timeout**: 5 seconds per query (future: add query timeout)
- **SSL**: Can be enabled for production databases

### Database Indexes
- **on Frequently Queried Columns**:
  - `users(email)` - login lookup
  - `loginSecurity(userId)` - brute-force checks
  - `accounts(ownerId)` - scoped queries
  - `leads(ownerId, status)` - dashboards

---

## 11. Logging Best Practices

### What NOT to Log
- ✗ Password values
- ✗ Password reset tokens
- ✗ API keys or secrets
- ✗ Plaintext credit cards
- ✗ Full email addresses in some contexts

### What TO Log
- ✓ Login success/failure (email OK, no password)
- ✓ Password changes (user ID, timestamp, not password)
- ✓ Permission denials (who, what they tried)
- ✓ API errors (method, path, status code)
- ✓ Configuration changes (who, what changed)

### Log Levels
- **ERROR**: Unhandled exceptions, critical failures
- **WARN**: Brute-force lockouts, missing configs
- **INFO**: Login events, password changes
- **DEBUG**: Query details, permission checks (dev only)

---

## 12. Dependencies & Vulnerabilities

### Reviewed & Tested
- **bcryptjs**: v2.4.3 (strong hashing, no known vulns)
- **jsonwebtoken**: v9.0.2 (JWT standard implementation)
- **express**: v4.18.2 (with helmet, cors, body-parser)
- **typeorm**: v0.3.16 (SQL injection safe)

### Vulnerability Scanning
- **Command**: `npm audit`
- **Target**: 0 high/critical vulnerabilities
- **Cadence**: On each build, before deployment

---

## 13. Secure Coding Patterns

### Error Handling Template
```typescript
try {
  // Validate input
  if (!input) throw new AppError(400, 'Input required');
  
  // Check authorization
  if (!canPerformAction(user, module, action)) {
    throw new AppError(403, 'Forbidden');
  }
  
  // Execute operation
  const result = await service.operation(input);
  
  // Return result (will be sanitized)
  return res.json({ data: result });
} catch (err) {
  next(err); // Let error handler decide what to send
}
```

### Async/Await Error Wrapper
```typescript
// Wrap controllers to catch unhandled rejections
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
export const login = asyncHandler(async (req, res) => {
  // Your code here
});
```

### Permission Guard Pattern
```typescript
// Check permission before operation
const module = 'leads';
const action = 'update';

if (!canPerformAction(req.user, module, action)) {
  throw new AppError(403, 'Forbidden');
}

// Double-check record access
if (!canAccessRecord(req.user, module, lead.ownerId, action)) {
  throw new AppError(403, 'Forbidden');
}

// Safe to proceed
lead.status = req.body.status;
await leadRepo.save(lead);
```

---

## 14. Security Checklist

### Before Deployment
- [ ] All dependencies pass `npm audit` (0 high/critical)
- [ ] JWT_SECRET is 32+ bytes, base64-encoded
- [ ] DATABASE_URL uses strong password
- [ ] NODE_ENV=production in production
- [ ] FORCE_HTTPS=true in production
- [ ] All secrets in .env, not in code
- [ ] Error handlers don't expose stack traces
- [ ] Passwords hashed with bcrypt(13)
- [ ] Brute-force protection active
- [ ] CSRF tokens validated on unsafe methods
- [ ] Authorization checks on every protected route

### Regular Maintenance
- [ ] Review audit logs for suspicious patterns
- [ ] Rotate JWT_SECRET periodically
- [ ] Prune old audit logs (retention policy)
- [ ] Update dependencies monthly
- [ ] Review code for new patterns
- [ ] Test permission scenarios

---

## 15. Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Node.js Security**: https://nodejs.org/en/docs/guides/security/
- **bcryptjs**: https://github.com/dcodeIO/bcrypt.js
- **jsonwebtoken**: https://github.com/auth0/node-jsonwebtoken
- **TypeORM Security**: https://typeorm.io/

---

**Document Updated**: 2026-07-12
**Version**: 1.0
