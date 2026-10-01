import { Request, Response, NextFunction } from 'express';
/**
 * Ensure a CSRF cookie exists (double-submit cookie pattern).
 *
 * The token is issued ONCE and kept stable. We deliberately do NOT rotate it
 * on every request — rotation combined with the SPA's concurrent requests was
 * the root cause of the "CSRF token mismatch" errors, because the cookie the
 * browser held could get overwritten between the time the SPA read it and the
 * time it submitted a state-changing request.
 */
export declare function generateCsrfToken(req: Request, res: Response, next: NextFunction): void;
/**
 * Verify state-changing requests using the double-submit cookie pattern.
 *
 * The X-CSRF-Token header must equal the XSRF-TOKEN cookie. A cross-site
 * attacker can neither read the SameSite=Strict cookie nor set a custom header
 * on a cross-origin request, so a match proves the request originated from our
 * own frontend. No server-side token store or session id is needed, which
 * removes the fragility that previously caused false mismatches.
 */
export declare function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=csrf.d.ts.map