"use strict";
// Centralized business constants
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAKEHOLDER_ROLES = exports.RESOURCE_TYPES = exports.ACTIVITY_TYPES = exports.REJECTION_REASONS = exports.OPPORTUNITY_STAGES = exports.LEAD_STATUSES = exports.ROLES_CAN_MANAGE_USERS = exports.ROLES_WITH_FULL_VISIBILITY = exports.ROLES = void 0;
exports.ROLES = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    SALES_REP: 'Sales Rep',
};
// Roles that can see ALL records. Anyone else only sees records they own.
exports.ROLES_WITH_FULL_VISIBILITY = [exports.ROLES.ADMIN, exports.ROLES.MANAGER];
// Roles that can manage users
exports.ROLES_CAN_MANAGE_USERS = [exports.ROLES.ADMIN, exports.ROLES.MANAGER];
exports.LEAD_STATUSES = ['Open', 'Qualified', 'Disqualified', 'Converted'];
exports.OPPORTUNITY_STAGES = [
    'Qualification',
    'Demonstration',
    'Proposal',
    'Negotiation',
    'Closed-Won',
    'Closed-Lost',
];
// Fixed rejection / loss reasons (dropdown) used when a deal is Closed-Lost
// or a lead is Disqualified.
exports.REJECTION_REASONS = [
    'Price too high',
    'Chose competitor',
    'No budget',
    'Bad timing',
    'No response',
    'Not a fit',
    'Lost to in-house solution',
    'Other',
];
// Activity types (calls, meetings, follow-ups, etc.)
exports.ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Task', 'Note', 'System'];
// Resource types that can have notes/activities attached
exports.RESOURCE_TYPES = ['Lead', 'Account', 'Contact', 'Opportunity'];
// The 8 fixed buying-committee roles every account must map a stakeholder to
// (name + designation) before it can be converted into a lead. Fixed list,
// not master data - these are the roles, not a configurable catalog.
exports.STAKEHOLDER_ROLES = [
    'Champion',
    'Coach',
    'Blocker',
    'Decision Maker',
    'Influencer',
    'Economic Buyer',
    'End User',
    'Gatekeeper',
];
//# sourceMappingURL=constants.js.map