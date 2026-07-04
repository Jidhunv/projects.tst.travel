import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getCookieValue(req: Request, name: string): string | undefined {
  const cookies = req.headers.cookie?.split(';');
  if (!cookies) return undefined;

  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return undefined;
}

function setCsrfCookie(res: Response, token: string): void {
  // Expose the token in a header so the SPA can pick it up on first load
  res.set('X-CSRF-Token', token);
  // Non-HttpOnly so the frontend JS can read it and echo it back in a header.
  // SameSite=Strict is what actually blocks cross-site forgery.
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY,
  });
}

/**
 * Ensure a CSRF cookie exists (double-submit cookie pattern).
 *
 * The token is issued ONCE and kept stable. We deliberately do NOT rotate it
 * on every request — rotation combined with the SPA's concurrent requests was
 * the root cause of the "CSRF token mismatch" errors, because the cookie the
 * browser held could get overwritten between the time the SPA read it and the
 * time it submitted a state-changing request.
 */
export function generateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const existing = getCookieValue(req, 'XSRF-TOKEN');
  if (existing) {
    // Keep the same token; just surface it in the header for convenience.
    res.set('X-CSRF-Token', existing);
  } else {
    setCsrfCookie(res, generateToken());
  }
  next();
}

/**
 * Verify state-changing requests using the double-submit cookie pattern.
 *
 * The X-CSRF-Token header must equal the XSRF-TOKEN cookie. A cross-site
 * attacker can neither read the SameSite=Strict cookie nor set a custom header
 * on a cross-origin request, so a match proves the request originated from our
 * own frontend. No server-side token store or session id is needed, which
 * removes the fragility that previously caused false mismatches.
 */
export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Safe methods never change state.
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Login and password reset happen before a CSRF cookie can exist.
  if (req.path.includes('/auth/login') || req.path.includes('/auth/password-reset')) {
    next();
    return;
  }

  const cookieToken = getCookieValue(req, 'XSRF-TOKEN');
  const headerToken =
    (req.headers['x-csrf-token'] as string) || (req.body?.csrfToken as string);

  const valid =
    !!cookieToken &&
    !!headerToken &&
    cookieToken.length === headerToken.length &&
    crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));

  if (!valid) {
    res.status(403).json({
      success: false,
      error: 'CSRF token mismatch',
    });
    return;
  }

  next();
}
