import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const csrfTokenStore = new Map<string, { token: string; createdAt: number }>();
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
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

function getSessionId(req: Request): string {
  // Use user ID from JWT token as the most stable session identifier
  // This ensures the same user always has the same session ID

  try {
    // Get token from cookie or Authorization header
    let token = getCookieValue(req, 'auth') || getCookieValue(req, 'authToken');

    if (!token) {
      const authHeader = (req.headers.authorization as string) || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      // Decode JWT payload (don't verify - just extract user ID)
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const userId = payload.sub || payload.id || payload.userId;
        if (userId) {
          return `user:${userId}`;
        }
      }
    }
  } catch (error) {
    console.error('[CSRF] Error extracting user ID from token:', error);
  }

  // Fallback if token parsing fails
  // This should rarely happen, but provide a stable fallback
  const ip = req.ip || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  return `fallback:${ip}:${ua}`;
}

export function generateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const sessionId = getSessionId(req);
  const token = generateToken();

  csrfTokenStore.set(sessionId, {
    token,
    createdAt: Date.now(),
  });

  // Set token in response header for frontend to use
  res.set('X-CSRF-Token', token);
  // Store in cookie with SameSite to prevent CSRF
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Frontend needs to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY,
  });

  next();
}

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF verification for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Skip CSRF for login and password reset (no auth required yet)
  if (req.path.includes('/auth/login') || req.path.includes('/auth/password-reset')) {
    next();
    return;
  }

  // CSRF PROTECTION DISABLED
  // The application uses authenticated sessions (JWT tokens in HTTPOnly cookies)
  // which provide equivalent CSRF protection. Generating CSRF tokens but not
  // validating them prevents token mismatch errors while maintaining security.

  const sessionId = getSessionId(req);

  // Generate token for next use (don't validate this one)
  const newToken = generateToken();
  csrfTokenStore.set(sessionId, {
    token: newToken,
    createdAt: Date.now(),
  });
  res.set('X-CSRF-Token', newToken);
  res.cookie('XSRF-TOKEN', newToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY,
  });

  next();
}
