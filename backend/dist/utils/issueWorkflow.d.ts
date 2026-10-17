export declare const ISSUE_STAGES: readonly ["Logged", "Actioning", "Picked up", "Under development", "Under testing", "Customer acceptance", "Approved for deployment", "Deployed to production", "Customer feedback", "Closed"];
export declare const STAGE_ON_HOLD = "On hold";
export declare const STAGE_CANCELLED = "Cancelled";
export type IssueStage = (typeof ISSUE_STAGES)[number] | typeof STAGE_ON_HOLD | typeof STAGE_CANCELLED;
export declare const ALL_STAGES: string[];
export declare const CUSTOMER_STAGES: string[];
export declare const isFinished: (stage: string) => stage is "Closed" | "Cancelled";
export declare const stageIndex: (stage: string) => number;
export declare const STAGE_HELP: Record<string, string>;
export interface TransitionInput {
    from: string;
    to: string;
    note?: string | null;
    customerContact?: string | null;
    hasAssignee: boolean;
}
export declare function checkTransition(t: TransitionInput): string | null;
export declare function ticketStatusFor(stages: string[]): 'Open' | 'In Progress' | 'Pending Customer' | 'Closed' | null;
//# sourceMappingURL=issueWorkflow.d.ts.map