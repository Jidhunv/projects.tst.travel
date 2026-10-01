"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCsrfToken = generateCsrfToken;
exports.verifyCsrfToken = verifyCsrfToken;
const crypto_1 = __importDefault(require("crypto"));
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
function generateToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function getCookieValue(req, name) {
    const cookies = req.headers.cookie?.split(';');
    if (!cookies)
        return undefined;
    for (const cookie of cookies) {
        const [key, ...rest] = cookie.trim().split('=');
        if (key === name) {
            return decodeURIComponent(rest.join('='));
        }
    }
    return undefined;
}
function setCsrfCookie(res, token) {
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
function generateCsrfToken(req, res, next) {
    const existing = getCookieValue(req, 'XSRF-TOKEN');
    if (existing) {
        // Keep the same token; just surface it in the header for convenience.
        res.set('X-CSRF-Token', existing);
    }
    else {
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
function verifyCsrfToken(req, res, next) {
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
    const headerToken = req.headers['x-csrf-token'] || req.body?.csrfToken;
    const valid = !!cookieToken &&
        !!headerToken &&
        cookieToken.length === headerToken.length &&
        crypto_1.default.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
    if (!valid) {
        res.status(403).json({
            success: false,
            error: 'CSRF token mismatch',
        });
        return;
    }
    next();
}
//# sourceMappingURL=csrf.js.map