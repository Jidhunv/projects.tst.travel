export declare const ROLES: {
    readonly ADMIN: "Admin";
    readonly MANAGER: "Manager";
    readonly SALES_REP: "Sales Rep";
};
export declare const ROLES_WITH_FULL_VISIBILITY: string[];
export declare const ROLES_CAN_MANAGE_USERS: string[];
export declare const LEAD_STATUSES: readonly ["Open", "Qualified", "Disqualified", "Converted"];
export declare const OPPORTUNITY_STAGES: readonly ["Qualification", "Demonstration", "Proposal", "Negotiation", "Closed-Won", "Closed-Lost"];
export declare const REJECTION_REASONS: readonly ["Price too high", "Chose competitor", "No budget", "Bad timing", "No response", "Not a fit", "Lost to in-house solution", "Other"];
export type RejectionReason = (typeof REJECTION_REASONS)[number];
export declare const ACTIVITY_TYPES: readonly ["Call", "Email", "Meeting", "Task", "Note", "System"];
export declare const RESOURCE_TYPES: readonly ["Lead", "Account", "Contact", "Opportunity"];
export declare const STAKEHOLDER_ROLES: readonly ["Champion", "Coach", "Blocker", "Decision Maker", "Influencer", "Economic Buyer", "End User", "Gatekeeper"];
export type StakeholderRole = (typeof STAKEHOLDER_ROLES)[number];
//# sourceMappingURL=constants.d.ts.map