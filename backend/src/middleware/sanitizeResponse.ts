import { Request, Response, NextFunction } from 'express';

// Fields that must never be serialized to a client, no matter which query
// loaded them (e.g. a User joined as `owner` on a lead/account/opportunity).
const SENSITIVE_KEYS = new Set(['password', 'resetToken', 'resetTokenExpiry']);

function deepStrip(value: unknown, seen: WeakSet<object>): void {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value as object)) return;
  seen.add(value as object);

  if (Array.isArray(value)) {
    for (const item of value) deepStrip(item, seen);
    return;
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      delete (value as Record<string, unknown>)[key];
    } else {
      deepStrip((value as Record<string, unknown>)[key], seen);
    }
  }
}

// Wrap res.json so every response payload is scrubbed of sensitive fields.
export function sanitizeResponse(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    try {
      deepStrip(body, new WeakSet<object>());
    } catch {
      // Never let sanitization break a response.
    }
    return originalJson(body);
  };
  next();
}

export default sanitizeResponse;
