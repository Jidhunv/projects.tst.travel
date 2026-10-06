import { AccountHealth, HealthStatus, Severity } from './salesHealth.engine';
export interface SalesHealthFilters {
    ownerId?: string;
    tier?: string;
    status?: HealthStatus;
    severity?: Severity;
    flagCode?: string;
    search?: string;
    sort?: 'score' | 'value' | 'overdue' | 'quiet' | 'name';
    page?: number;
    limit?: number;
}
declare class SalesHealthService {
    analyseAll(scopeOwnerId?: string, now?: Date): Promise<AccountHealth[]>;
    getReport(scopeOwnerId: string | undefined, f: SalesHealthFilters): Promise<{
        generatedAt: string;
        summary: import("./salesHealth.engine").HealthSummary;
        rows: AccountHealth[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        strategy: {
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
    }>;
}
declare const _default: SalesHealthService;
export default _default;
//# sourceMappingURL=salesHealth.service.d.ts.map