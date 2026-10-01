"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeResponse = sanitizeResponse;
// Fields that must never be serialized to a client, no matter which query
// loaded them (e.g. a User joined as `owner` on a lead/account/opportunity).
const SENSITIVE_KEYS = new Set(['password', 'resetToken', 'resetTokenExpiry']);
function deepStrip(value, seen) {
    if (value === null || typeof value !== 'object')
        return;
    if (seen.has(value))
        return;
    seen.add(value);
    if (Array.isArray(value)) {
        for (const item of value)
            deepStrip(item, seen);
        return;
    }
    for (const key of Object.keys(value)) {
        if (SENSITIVE_KEYS.has(key)) {
            delete value[key];
        }
        else {
            deepStrip(value[key], seen);
        }
    }
}
// Wrap res.json so every response payload is scrubbed of sensitive fields.
function sanitizeResponse(_req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        try {
            deepStrip(body, new WeakSet());
        }
        catch {
            // Never let sanitization break a response.
        }
        return originalJson(body);
    };
    next();
}
exports.default = sanitizeResponse;
//# sourceMappingURL=sanitizeResponse.js.map