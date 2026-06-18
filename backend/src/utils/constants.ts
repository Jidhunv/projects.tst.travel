// Centralized business constants

export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES_REP: 'Sales Rep',
} as const;

// Roles that can see ALL records. Anyone else only sees records they own.
export const ROLES_WITH_FULL_VISIBILITY: string[] = [ROLES.ADMIN, ROLES.MANAGER];

// Roles that can manage users
export const ROLES_CAN_MANAGE_USERS: string[] = [ROLES.ADMIN, ROLES.MANAGER];

export const LEAD_STATUSES = ['Open', 'Qualified', 'Disqualified', 'Converted'] as const;

export const OPPORTUNITY_STAGES = [
  'Prospecting',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closed-Won',
  'Closed-Lost',
] as const;

// Fixed rejection / loss reasons (dropdown) used when a deal is Closed-Lost
// or a lead is Disqualified.
export const REJECTION_REASONS = [
  'Price too high',
  'Chose competitor',
  'No budget',
  'Bad timing',
  'No response',
  'Not a fit',
  'Lost to in-house solution',
  'Other',
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

// Activity types (calls, meetings, follow-ups, etc.)
export const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Task', 'Note', 'System'] as const;

// Resource types that can have notes/activities attached
export const RESOURCE_TYPES = ['Lead', 'Account', 'Contact', 'Opportunity'] as const;
