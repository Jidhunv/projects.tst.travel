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
}

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
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
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRATION || '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET || 'secret', options);
};
