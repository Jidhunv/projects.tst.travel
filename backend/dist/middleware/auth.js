"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canReassign = exports.canPerformAction = exports.generateToken = exports.assertOwnsViaAccount = exports.canAccessRecord = exports.getOwnerScope = exports.requireRole = exports.verifyToken = exports.extractToken = exports.getScope = exports.getReadScope = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const securityLogger_1 = require("../utils/securityLogger");
const token_blacklist_service_1 = __importDefault(require("../services/token-blacklist.service"));
const errorHandler_1 = require("./errorHandler");
// Load the user's permissions ("module:action:scope") and current teamId from
// the DB, fresh on each request so permission/team changes apply immediately.
async function loadUserContext(userId) {
    try {
        const user = await database_1.AppDataSource.getRepository(User_1.User).findOne({
            where: { id: userId },
            relations: ['role', 'role.permissions'],
        });
        const permissions = user?.role?.permissions
            ? user.role.permissions.map((p) => `${p.module}:${p.action}:${p.scope || 'all'}`)
            : [];
        return { permissions, teamId: user?.teamId ?? null };
    }
    catch {
        return { permissions: [], teamId: null };
    }
}
// Resolve whether a user may perform an action on a module, and at what scope.
function resolvePermission(user, module, action) {
    if (!user)
        return { allowed: false, scope: null };
    // Admin always has full access (safety net against accidental lockout).
    if (user.role === 'Admin')
        return { allowed: true, scope: 'all' };
    const perms = user.permissions || [];
    // Widest scope wins if a role somehow has several.
    if (perms.includes(`${module}:${action}:all`))
        return { allowed: true, scope: 'all' };
    if (perms.includes(`${module}:${action}:team`))
        return { allowed: true, scope: 'team' };
    if (perms.includes(`${module}:${action}:self`))
        return { allowed: true, scope: 'self' };
    return { allowed: false, scope: null };
}
// The read scope for a module: 'all' | 'team' | 'self' | null (no access).
const getReadScope = (user, module) => resolvePermission(user, module, 'read').scope;
exports.getReadScope = getReadScope;
// The scope for a specific action: 'all' | 'team' | 'self' | null.
const getScope = (user, module, action) => resolvePermission(user, module, action).scope;
exports.getScope = getScope;
function getCookieValue(req, name) {
    const cookies = req.headers.cookie?.split(';');
    if (!cookies)
        return undefined;
    for (const cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) {
            return decodeURIComponent(value);
        }
    }
    return undefined;
}
// Extract the raw JWT from the Authorization header or the authToken cookie.
const extractToken = (req) => {
    const headerToken = req.headers.authorization?.split(' ')[1];
    if (headerToken)
        return headerToken;
    return getCookieValue(req, 'authToken');
};
exports.extractToken = extractToken;
const verifyToken = async (req, res, next) => {
    const token = (0, exports.extractToken)(req);
    if (!token) {
        (0, securityLogger_1.logSecurityEvent)('AUTH_MISSING_TOKEN', { ...(0, securityLogger_1.requestContext)(req), reason: 'No token provided' });
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, error: 'JWT_SECRET not configured' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Reject tokens that were explicitly revoked (e.g. via logout).
        if (await token_blacklist_service_1.default.isRevoked(token)) {
            (0, securityLogger_1.logSecurityEvent)('AUTH_INVALID_TOKEN', { ...(0, securityLogger_1.requestContext)(req), reason: 'Token revoked' });
            return res.status(401).json({ success: false, error: 'Token revoked' });
        }
        // Attach the user's live permissions + team so scoping reflects current config.
        const ctx = await loadUserContext(decoded.id);
        decoded.permissions = ctx.permissions;
        decoded.teamId = ctx.teamId;
        req.user = decoded;
        next();
    }
    catch (error) {
        (0, securityLogger_1.logSecurityEvent)('AUTH_INVALID_TOKEN', {
            ...(0, securityLogger_1.requestContext)(req),
            reason: error instanceof Error ? error.message : 'Invalid token',
        });
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};
exports.verifyToken = verifyToken;
// Guard a route so only the given roles may access it.
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            (0, securityLogger_1.logSecurityEvent)('ACCESS_DENIED', {
                ...(0, securityLogger_1.requestContext)(req),
                userId: req.user.id,
                email: req.user.email,
                role: req.user.role,
                reason: `requires role: ${allowedRoles.join(', ')}`,
            });
            return res
                .status(403)
                .json({ success: false, error: 'You do not have permission to perform this action' });
        }
        next();
    };
};
exports.requireRole = requireRole;
// Returns the ownerId a user is restricted to for a module, or undefined if
// they can see every record. Driven by the configured read scope:
//   read:all  -> undefined (no restriction)
//   read:self -> the user's own id
//   (no read) -> the user's own id (most restrictive fallback)
const getOwnerScope = (user, module) => {
    if (!user)
        return undefined;
    const { scope } = resolvePermission(user, module, 'read');
    return scope === 'all' ? undefined : user?.id;
};
exports.getOwnerScope = getOwnerScope;
// True if the user may access a record owned by ownerId for the given action
// on a module. "all" scope allows any record; "self" scope only the user's own.
const canAccessRecord = (user, module, ownerId, action = 'read', assigneeIds) => {
    if (!user)
        return false;
    const { allowed, scope } = resolvePermission(user, module, action);
    if (!allowed)
        return false;
    if (scope === 'all')
        return true;
    // Self scope: the primary owner or any additional assignee may access it.
    return user.id === ownerId || (Array.isArray(assigneeIds) && assigneeIds.includes(user.id));
};
exports.canAccessRecord = canAccessRecord;
// Invoices, contracts, projects and tickets have no owner column: they inherit
// ownership from their account, plus whatever personal link the module has
// (creator, project manager, ticket reporter/assignee). At "all" scope this is a
// no-op; at "self" scope it throws unless the user matches one of them.
const assertOwnsViaAccount = (user, module, action, accountOwnerId, personalIds = []) => {
    if ((0, exports.getOwnerScope)(user, module) === undefined)
        return; // "all" scope
    const owners = [accountOwnerId, ...personalIds.flat()];
    if (!owners.includes(user.id)) {
        throw new errorHandler_1.AppError(403, `You can only ${action} ${module} for your own accounts`);
    }
};
exports.assertOwnsViaAccount = assertOwnsViaAccount;
const generateToken = (id, email, role) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET not configured');
    }
    // JWT_EXPIRATION may be either a plain number of SECONDS ("3600") or a duration
    // string ("1h", "7d"). A pure-digit value is converted to a number so
    // jsonwebtoken treats it as seconds (a bare numeric string would otherwise be
    // parsed as milliseconds); anything else is passed through to the ms parser.
    const rawExpiration = (process.env.JWT_EXPIRATION || '3600').trim();
    const expiresIn = /^\d+$/.test(rawExpiration)
        ? parseInt(rawExpiration, 10)
        : rawExpiration;
    const options = {
        expiresIn: expiresIn,
    };
    return jsonwebtoken_1.default.sign({ id, email, role }, secret, options);
};
exports.generateToken = generateToken;
// Check if user has permission for an action on a module (either scope).
// Driven entirely by the role's configured permissions.
const canPerformAction = (user, module, action) => {
    return resolvePermission(user, module, action).allowed;
};
exports.canPerformAction = canPerformAction;
// May the user reassign a record of this module to another owner?
// Requires update at the "all" scope (Admin/Manager-style roles); a self-scoped
// user cannot hand records to other people.
//
// This checks the *update* scope directly. It previously combined
// canPerformAction(update) with getOwnerScope(), which resolves the **read**
// scope -- so a role holding `update:self` plus `read:all` was allowed to
// reassign, the exact case this is meant to prevent.
const canReassign = (user, module) => {
    return resolvePermission(user, module, 'update').scope === 'all';
};
exports.canReassign = canReassign;
//# sourceMappingURL=auth.js.map