"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pick = pick;
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
function pick(body, allowed) {
    const out = {};
    for (const key of allowed) {
        // hasOwnProperty, not `in`: `in` walks the prototype chain, so an inherited
        // or prototype-polluted property would be copied into the update payload.
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            out[key] = body[key];
        }
    }
    return out;
}
exports.default = pick;
//# sourceMappingURL=pick.js.map