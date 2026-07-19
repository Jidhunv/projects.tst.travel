import { Request, Response, NextFunction } from 'express';

// Fixed-window rate limiting, in memory.
//
// Two buckets are checked per request: one keyed on the submitted email, one on
// the client IP. Keying on email alone (as this previously did) makes the budget
// per-account rather than per-client, so a single source could try one password
// against unlimited accounts unthrottled.
//
// The IP budget is deliberately looser than the per-email one, so a shared
// office NAT is not locked out by ordinary mistyped passwords while spraying is
// still capped.
//
// Entries are evicted once expired, so unique keys cannot accumulate
// indefinitely. This is per-process: behind multiple instances, move to a shared
// store (Redis) with TTLs.
const store = new Map<string, { count: number; resetAt: number }>();

// Backstop sweep; expired entries are also dropped on read, so this only
// reclaims keys that are never revisited.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

/** True while the key is within its allowance. Consumes one attempt. */
function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count += 1;
  return entry.count <= max;
}

interface LimitConfig {
  kind: string;
  perEmail: number;
  perIp: number;
  windowMs: number;
  message: string;
}

/** Limit by client IP *and* by submitted email; either being over rejects. */
function limiter({ kind, perEmail, perIp, windowMs, message }: LimitConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const email = String(req.body?.email ?? '').toLowerCase();

    const buckets: Array<[string, number]> = [[`${kind}:ip:${req.ip}`, perIp]];
    if (email) buckets.push([`${kind}:email:${email}`, perEmail]);

    // Evaluate every bucket so each is consumed, then reject if any is over.
    const withinLimit = buckets
      .map(([key, max]) => allow(key, max, windowMs))
      .every(Boolean);

    if (!withinLimit) {
      res.status(429).json({ success: false, error: message });
      return;
    }
    next();
  };
}

export const loginLimiter = limiter({
  kind: 'login',
  perEmail: 5,
  perIp: 20,
  windowMs: 15 * 60 * 1000,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

export const passwordResetLimiter = limiter({
  kind: 'password-reset',
  perEmail: 3,
  perIp: 10,
  windowMs: 60 * 60 * 1000,
  message: 'Too many password reset requests. Please try again after 1 hour.',
});

// Exposed for tests.
export const __resetRateLimitStore = () => store.clear();
