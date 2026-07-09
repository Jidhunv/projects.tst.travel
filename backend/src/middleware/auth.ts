import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { logSecurityEvent, requestContext } from '../utils/securityLogger';
import tokenBlacklist from '../services/token-blacklist.service';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  // Flat list of the user's effective permissions, e.g. "leads:read:all".
  // Loaded from the DB on each authenticated request so that permission
  // changes take effect immediately without requiring re-login.
  permissions?: string[];
}

// Load the user's configured permissions as "module:action:scope" strings.
async function loadUserPermissions(userId: string): Promise<string[]> {
  try {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });
    if (!user?.role?.permissions) return [];
    return user.role.permissions.map(
      (p) => `${p.module}:${p.action}:${p.scope || 'all'}`
    );
  } catch {
    return [];
  }
}

// Resolve whether a user may perform an action on a module, and at what scope.
function resolvePermission(
  user: AuthUser | undefined,
  module: string,
  action: string
): { allowed: boolean; scope: 'all' | 'self' | null } {
  if (!user) return { allowed: false, scope: null };
  // Admin always has full access (safety net against accidental lockout).
  if (user.role === 'Admin') return { allowed: true, scope: 'all' };

  const perms = user.permissions || [];
  if (perms.includes(`${module}:${action}:all`)) return { allowed: true, scope: 'all' };
  if (perms.includes(`${module}:${action}:self`)) return { allowed: true, scope: 'self' };
  return { allowed: false, scope: null };
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  traceId?: string;
}

function getCookieValue(req: Request, name: string): string | undefined {
  const cookies = req.headers.cookie?.split(';');
  if (!cookies) return undefined;

  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return undefined;
}

// Extract the raw JWT from the Authorization header or the authToken cookie.
export const extractToken = (req: Request): string | undefined => {
  const headerToken = req.headers.authorization?.split(' ')[1];
  if (headerToken) return headerToken;
  return getCookieValue(req, 'authToken');
};

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

  if (!token) {
    logSecurityEvent('AUTH_MISSING_TOKEN', { ...requestContext(req), reason: 'No token provided' });
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: 'JWT_SECRET not configured' });
    }
    const decoded = jwt.verify(token, secret) as AuthUser;

    // Reject tokens that were explicitly revoked (e.g. via logout).
    if (await tokenBlacklist.isRevoked(token)) {
      logSecurityEvent('AUTH_INVALID_TOKEN', { ...requestContext(req), reason: 'Token revoked' });
      return res.status(401).json({ success: false, error: 'Token revoked' });
    }

    // Attach the user's live permissions so scoping reflects current config.
    decoded.permissions = await loadUserPermissions(decoded.id);
    req.user = decoded;
    next();
  } catch (error) {
    logSecurityEvent('AUTH_INVALID_TOKEN', {
      ...requestContext(req),
      reason: error instanceof Error ? error.message : 'Invalid token',
    });
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Guard a route so only the given roles may access it.
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      logSecurityEvent('ACCESS_DENIED', {
        ...requestContext(req),
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

// Returns the ownerId a user is restricted to for a module, or undefined if
// they can see every record. Driven by the configured read scope:
//   read:all  -> undefined (no restriction)
//   read:self -> the user's own id
//   (no read) -> the user's own id (most restrictive fallback)
export const getOwnerScope = (
  user: AuthUser | undefined,
  module: string
): string | undefined => {
  if (!user) return undefined;
  const { scope } = resolvePermission(user, module, 'read');
  return scope === 'all' ? undefined : user?.id;
};

// True if the user may access a record owned by ownerId for the given action
// on a module. "all" scope allows any record; "self" scope only the user's own.
export const canAccessRecord = (
  user: AuthUser | undefined,
  module: string,
  ownerId: string,
  action: string = 'read',
  assigneeIds?: string[]
): boolean => {
  if (!user) return false;
  const { allowed, scope } = resolvePermission(user, module, action);
  if (!allowed) return false;
  if (scope === 'all') return true;
  // Self scope: the primary owner or any additional assignee may access it.
  return user.id === ownerId || (Array.isArray(assigneeIds) && assigneeIds.includes(user.id));
};

export const generateToken = (id: string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  // JWT_EXPIRATION may be either a plain number of SECONDS ("3600") or a duration
  // string ("1h", "7d"). A pure-digit value is converted to a number so
  // jsonwebtoken treats it as seconds (a bare numeric string would otherwise be
  // parsed as milliseconds); anything else is passed through to the ms parser.
  const rawExpiration = (process.env.JWT_EXPIRATION || '3600').trim();
  const expiresIn: number | string = /^\d+$/.test(rawExpiration)
    ? parseInt(rawExpiration, 10)
    : rawExpiration;
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign({ id, email, role }, secret, options);
};

// Check if user has permission for an action on a module (either scope).
// Driven entirely by the role's configured permissions.
export const canPerformAction = (
  user: AuthUser | undefined,
  module: string,
  action: string
): boolean => {
  return resolvePermission(user, module, action).allowed;
};

// May the user reassign a record of this module to another owner?
// Requires update permission at the "all" scope (i.e. Admin/Manager-style roles);
// a self-scoped user cannot hand records to other people.
export const canReassign = (user: AuthUser | undefined, module: string): boolean => {
  return (
    canPerformAction(user, module, 'update') &&
    getOwnerScope(user, module) === undefined
  );
};
