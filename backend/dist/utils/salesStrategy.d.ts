export declare const SALES_STRATEGY: {
    tierTouchCadenceDays: Record<string, number>;
    defaultTouchCadenceDays: number;
    firstTouchGraceDays: number;
    stageMaxDays: Record<string, number>;
    leadFirstActionDays: number;
    leadToOpportunityDays: number;
    accountToLeadDays: number;
    opportunityCycleDays: number;
    closeDateWarnDays: number;
    overdueFollowupHighDays: number;
    overdueFollowupCriticalDays: number;
    visitFollowupGraceDays: number;
    visitFollowupLookbackDays: number;
    followupCompletionMin: number;
    followupCompletionMinSample: number;
    requiredRolesByStage: Record<string, string[]>;
    championFromStage: string;
    scorePenalty: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    statusThresholds: {
        onTrackMinScore: number;
        atRiskMinScore: number;
    };
};
export type SalesStrategy = typeof SALES_STRATEGY;
export declare const GLOBAL_BENCHMARKS: {
    winRate: number;
    pipelineCoverage: number;
    minClosedDealsForOwnWinRate: number;
};
export declare const WORKWEEK: {
    weekendDays: number[];
};
//# sourceMappingURL=salesStrategy.d.ts.map