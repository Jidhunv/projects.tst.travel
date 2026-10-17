export declare const PRIORITIES: readonly ["Critical", "High", "Medium", "Low"];
export declare const SLA_DEFAULTS: Record<string, {
    responseHours: number;
    resolutionHours: number;
}>;
export declare const SLA_PAUSE_STAGES: string[];
export declare const RESOLVED_STAGE = "Deployed";
export interface Transition {
    toStage: string;
    at: Date;
}
export declare function slaTargets(priority: string, ticketResponseHours?: number | null, ticketResolutionHours?: number | null): {
    responseHours: number;
    resolutionHours: number;
    fromTicket: boolean;
};
export declare function slaHours(from: Date, to: Date, transitions: Transition[]): number;
export type SlaState = 'met' | 'breached' | 'within' | 'n/a';
export interface IssueSlaInput {
    loggedAt: Date;
    stage: string;
    priority: string;
    closedAt: Date | null;
    transitions: Transition[];
    ticketResponseHours?: number | null;
    ticketResolutionHours?: number | null;
}
export interface IssueSla {
    responseTarget: number;
    resolutionTarget: number;
    respondedAt: Date | null;
    responseHours: number | null;
    responseState: SlaState;
    resolvedAt: Date | null;
    resolutionHours: number | null;
    resolutionState: SlaState;
    closedAt: Date | null;
    daysToClose: number | null;
    daysOpen: number;
}
export declare function evaluateIssue(i: IssueSlaInput, now?: Date): IssueSla;
export interface SlaRowLike {
    response: SlaState;
    resolution: SlaState;
    responseHours: number | null;
    resolutionHours: number | null;
    daysToClose: number | null;
}
export declare function summariseSla(rows: SlaRowLike[]): {
    issues: number;
    response: {
        avgHours: number | null;
        medianHours: number | null;
        met: number;
        breached: number;
        pctWithinSla: number | null;
    };
    resolution: {
        avgHours: number | null;
        medianHours: number | null;
        met: number;
        breached: number;
        pctWithinSla: number | null;
    };
    avgDaysToClose: number | null;
    closedCount: number;
};
//# sourceMappingURL=issueSla.d.ts.map