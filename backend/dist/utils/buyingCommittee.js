"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normaliseCommittee = normaliseCommittee;
exports.hasCommitteeMember = hasCommitteeMember;
const constants_1 = require("./constants");
const errorHandler_1 = require("../middleware/errorHandler");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Validates the committee payload. A member is only recorded when a name is
// given, and a named member must also have an email and a phone number, so the
// committee can always be reached. Members without a name are skipped (an empty
// row just means that role has not been identified yet).
function normaliseCommittee(members) {
    const out = [];
    for (const m of members) {
        if (!constants_1.STAKEHOLDER_ROLES.includes(m.role)) {
            throw new errorHandler_1.AppError(400, `Invalid stakeholder role: ${m.role}`);
        }
        const name = (m.name ?? '').trim();
        if (!name)
            continue;
        const email = (m.email ?? '').trim();
        const phone = (m.phone ?? '').trim();
        if (!email || !phone) {
            throw new errorHandler_1.AppError(400, `Buying committee member "${name}" (${m.role}) needs an email and a phone number`);
        }
        if (!EMAIL_RE.test(email)) {
            throw new errorHandler_1.AppError(400, `Buying committee member "${name}" has an invalid email`);
        }
        out.push({
            role: m.role,
            name,
            email,
            phone,
            designationId: m.designationId || undefined,
        });
    }
    return out;
}
// An account has a buying committee once at least one role holds a named member.
function hasCommitteeMember(rows) {
    return rows.some((r) => !!r.name && r.name.trim() !== '');
}
//# sourceMappingURL=buyingCommittee.js.map