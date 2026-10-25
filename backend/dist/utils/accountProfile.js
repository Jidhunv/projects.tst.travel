"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normaliseProfile = normaliseProfile;
const errorHandler_1 = require("../middleware/errorHandler");
// Onboarding profile fields on an account. An empty value clears the field.
// Returns only the fields that were present in the input, cleaned and typed.
function normaliseProfile(input) {
    const out = {};
    if ('companyTypeId' in input) {
        out.companyTypeId = input.companyTypeId || null;
    }
    for (const key of ['isB2B', 'isRetail']) {
        if (key in input) {
            const v = input[key];
            out[key] = v === null || v === '' || v === undefined ? null : v === true || v === 'true';
        }
    }
    if ('primaryBusiness' in input) {
        const v = typeof input.primaryBusiness === 'string' ? input.primaryBusiness.trim() : '';
        if (v.length > 255)
            throw new errorHandler_1.AppError(400, 'Primary business must be 255 characters or fewer');
        out.primaryBusiness = v || null;
    }
    if ('employeeCount' in input) {
        const raw = input.employeeCount;
        if (raw === null || raw === '' || raw === undefined) {
            out.employeeCount = null;
        }
        else {
            const n = Number(raw);
            if (!Number.isInteger(n) || n < 0) {
                throw new errorHandler_1.AppError(400, 'Number of employees must be a whole number, 0 or more');
            }
            out.employeeCount = n;
        }
    }
    if ('branchLocations' in input) {
        const raw = input.branchLocations;
        if (raw === null || raw === undefined || raw === '') {
            out.branchLocations = null;
        }
        else if (!Array.isArray(raw)) {
            throw new errorHandler_1.AppError(400, 'Branch locations must be a list');
        }
        else {
            const locations = raw.map((l) => (typeof l === 'string' ? l.trim() : '')).filter((l) => l !== '');
            if (locations.some((l) => l.length > 255)) {
                throw new errorHandler_1.AppError(400, 'Each branch location must be 255 characters or fewer');
            }
            out.branchLocations = locations.length > 0 ? locations : null;
        }
    }
    return out;
}
//# sourceMappingURL=accountProfile.js.map