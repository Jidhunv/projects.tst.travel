"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.effectiveDepartments = exports.ASSIGNABLE_DEPARTMENT = exports.DEPARTMENTS = void 0;
exports.cleanDepartments = cleanDepartments;
// The functions a role or person can belong to. A person works in one or more.
exports.DEPARTMENTS = ['Sales', 'Operations', 'Development', 'Finance', 'Support'];
// Only Development staff can be assigned issues.
exports.ASSIGNABLE_DEPARTMENT = 'Development';
// Validates a list from a request body. Returns the cleaned list, or throws a message.
function cleanDepartments(input) {
    if (input === undefined || input === null || input === '')
        return [];
    if (!Array.isArray(input))
        throw new Error('Departments must be a list');
    const out = [];
    for (const d of input) {
        if (!exports.DEPARTMENTS.includes(d))
            throw new Error(`Unknown department: ${String(d)}. Choose from ${exports.DEPARTMENTS.join(', ')}`);
        if (!out.includes(d))
            out.push(d);
    }
    return out;
}
// A person's own departments if any were set, otherwise their role's.
const effectiveDepartments = (own, fromRole) => own && own.length ? own : fromRole || [];
exports.effectiveDepartments = effectiveDepartments;
//# sourceMappingURL=departments.js.map