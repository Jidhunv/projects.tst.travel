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
  // Use auth token or session cookie as session identifier (more reliable than IP)
  const authToken = (req.headers.authorization as string) || '';
  const sessionCookie = getCookieValue(req, 'authToken') || '';
  return (req.headers['x-session-id'] as string) || sessionCookie || authToken || `${req.ip}:${req.headers['user-agent']}`;
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

  const sessionId = getSessionId(req);
  let csrfToken: string | undefined = (req.headers['x-csrf-token'] as string) || (req.body?.csrfToken as string);

  // Try to get CSRF token from cookie if not in headers or body
  if (!csrfToken) {
    csrfToken = getCookieValue(req, 'XSRF-TOKEN');
  }

  console.log(`[CSRF] Verifying token for sessionId: ${sessionId.substring(0, 20)}...`);
  console.log(`[CSRF] Token received: ${csrfToken?.substring(0, 20)}...`);

  if (!csrfToken) {
    console.log('[CSRF] ❌ No token provided');
    res.status(403).json({
      success: false,
      error: 'CSRF token is missing',
    });
    return;
  }

  const stored = csrfTokenStore.get(sessionId);
  console.log(`[CSRF] Token in store: ${stored?.token.substring(0, 20)}...`);

  if (!stored) {
    console.log('[CSRF] ❌ Session token not found in store');
    // Token doesn't exist, generate a new one for this session
    const newToken = generateToken();
    csrfTokenStore.set(sessionId, {
      token: newToken,
      createdAt: Date.now(),
    });
    res.status(403).json({
      success: false,
      error: 'CSRF token is invalid or expired',
    });
    return;
  }

  // Check token expiration
  if (Date.now() - stored.createdAt > TOKEN_EXPIRY) {
    console.log('[CSRF] ❌ Token expired');
    csrfTokenStore.delete(sessionId);
    res.status(403).json({
      success: false,
      error: 'CSRF token expired',
    });
    return;
  }

  // Verify token matches (constant-time comparison)
  const tokensMatch = stored.token.length === csrfToken.length &&
    crypto.timingSafeEqual(Buffer.from(stored.token), Buffer.from(csrfToken));

  if (!tokensMatch) {
    console.log(`[CSRF] ❌ Token mismatch - Expected: ${stored.token.substring(0, 20)}..., Got: ${csrfToken.substring(0, 20)}...`);
    res.status(403).json({
      success: false,
      error: 'CSRF token mismatch',
    });
    return;
  }

  console.log('[CSRF] ✅ Token validated successfully');

  // Token is valid, regenerate for next use
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

  console.log(`[CSRF] ✅ New token generated: ${newToken.substring(0, 20)}...`);

  next();
}
