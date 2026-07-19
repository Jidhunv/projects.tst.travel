/**
 * Copy only the listed keys from a request body.
 *
 * Controllers must never hand `req.body` straight to a service: every column on
 * the entity then becomes client-settable, including fields the application is
 * supposed to own. Forging `resolvedAt` / `createdAt` on a ticket to fake SLA
 * compliance was possible for exactly this reason.
 *
 * Keys absent from the body are left out entirely, so a PATCH stays partial and
 * does not blank unrelated columns.
 */
export function pick<T extends object>(body: T, allowed: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) out[key] = (body as Record<string, unknown>)[key];
  }
  return out;
}

export default pick;
