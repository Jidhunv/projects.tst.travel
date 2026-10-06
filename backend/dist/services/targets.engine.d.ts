export type PaceStatus = 'achieved' | 'ahead' | 'on-pace' | 'behind' | 'not-started' | 'ended-short';
export interface TargetProgress {
    achieved: number;
    target: number;
    pctComplete: number;
    remaining: number;
    totalDays: number;
    elapsedDays: number;
    daysLeft: number;
    elapsedPct: number;
    expectedByNow: number;
    projectedFinal: number | null;
    pace: PaceStatus;
}
export declare function targetProgress(achieved: number, target: number, startDate: string, endDate: string, now?: Date): TargetProgress;
export interface PipelineSuggestion {
    remaining: number;
    winRateUsed: number;
    winRateSource: 'own history' | 'global benchmark';
    coverage: number;
    pipelineNeededByWinRate: number;
    pipelineNeededByCoverage: number;
    recommendedPipeline: number;
    currentOpenPipeline: number;
    newOpportunityValueNeeded: number;
    newOpportunityValueIfAhead: number | null;
}
export declare function suggestPipeline(remaining: number, currentOpenPipeline: number, ownWinRate: number | null): PipelineSuggestion;
export declare function periodsInRange(frequency: string, from: string, to: string): number;
export declare function workdaysInRange(from: string, to: string, weekend?: number[]): string[];
export declare function monthsInRange(from: string, to: string): string[];
export declare function reportingCompliance(workdays: string[], reportedDates: Set<string>, today: string): {
    workdays: number;
    dueDays: number;
    reportedDays: number;
    missedDates: string[];
    todayPending: boolean;
    pct: number | null;
};
//# sourceMappingURL=targets.engine.d.ts.map