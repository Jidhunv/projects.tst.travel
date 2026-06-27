import { Request, Response } from 'express';

// Simple rate limiting implementation without external dependency
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: Request, type: 'login' | 'password-reset'): string {
  const email = (req.body?.email as string) || '';
  return `${type}:${email || req.ip}`;
}

function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= maxAttempts;
}

export function loginLimiter(req: Request, res: Response, next: any): void {
  const key = getRateLimitKey(req, 'login');
  if (!checkRateLimit(key, 5, 15 * 60 * 1000)) {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again after 15 minutes.',
    });
    return;
  }
  next();
}

export function passwordResetLimiter(req: Request, res: Response, next: any): void {
  const key = getRateLimitKey(req, 'password-reset');
  if (!checkRateLimit(key, 3, 60 * 60 * 1000)) {
    res.status(429).json({
      success: false,
      error: 'Too many password reset requests. Please try again after 1 hour.',
    });
    return;
  }
  next();
}
