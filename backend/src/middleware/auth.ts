import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ROLES_WITH_FULL_VISIBILITY } from '../utils/constants';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
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

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Try to get token from Authorization header first, then from HTTPOnly cookie
  let token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    token = getCookieValue(req, 'authToken');
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: 'JWT_SECRET not configured' });
    }
    const decoded = jwt.verify(token, secret);
    req.user = decoded as AuthUser;
    next();
  } catch (error) {
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
      return res
        .status(403)
        .json({ success: false, error: 'You do not have permission to perform this action' });
    }
    next();
  };
};

// Returns the ownerId a user is restricted to, or undefined if they can see everything.
// Sales Rep -> their own id. Admin/Manager -> undefined (no restriction).
export const getOwnerScope = (user?: AuthUser): string | undefined => {
  if (!user) return undefined;
  if (ROLES_WITH_FULL_VISIBILITY.includes(user.role)) return undefined;
  return user.id;
};

// True if the user is allowed to see/edit a record owned by ownerId.
export const canAccessRecord = (user: AuthUser | undefined, ownerId: string): boolean => {
  if (!user) return false;
  if (ROLES_WITH_FULL_VISIBILITY.includes(user.role)) return true;
  return user.id === ownerId;
};

export const generateToken = (id: string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRATION || '24h') as SignOptions['expiresIn'],
  };
  return jwt.sign({ id, email, role }, secret, options);
};

// Role-based action restrictions
const ROLE_ACTION_RESTRICTIONS: Record<string, { [module: string]: string[] }> = {
  'Deal Stage Manager': {
    'leads': ['read', 'status_only'],  // Can only read and update status
    'opportunities': ['read', 'stage_probability_only'],  // Can only read and update stage/probability
    'accounts': ['read'],
    'contacts': ['read'],
  },
  'Sales Rep': {
    'leads': ['create', 'read', 'update', 'delete', 'bulk_action'],
    'opportunities': ['create', 'read', 'update', 'delete', 'bulk_action'],
    'accounts': ['create', 'read', 'update', 'delete', 'bulk_action'],
    'contacts': ['create', 'read', 'update', 'delete', 'bulk_action'],
  },
  'Manager': {
    'leads': ['create', 'read', 'update', 'delete', 'bulk_action'],
    'opportunities': ['create', 'read', 'update', 'delete', 'bulk_action'],
    'accounts': ['create', 'read', 'update', 'delete', 'bulk_action'],
    'contacts': ['create', 'read', 'update', 'delete', 'bulk_action'],
    'users': ['create', 'read', 'update', 'delete'],
  },
  'Admin': {
    'all': ['all'],
  },
};

// Check if user has permission for an action on a module
export const canPerformAction = (
  user: AuthUser | undefined,
  module: string,
  action: string
): boolean => {
  if (!user) return false;
  if (user.role === 'Admin') return true;

  const roleRestrictions = ROLE_ACTION_RESTRICTIONS[user.role];
  if (!roleRestrictions) return false;

  const allowedActions = roleRestrictions[module] || [];
  return allowedActions.includes(action);
};
