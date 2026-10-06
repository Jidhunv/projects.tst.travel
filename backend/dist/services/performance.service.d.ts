declare class PerformanceService {
    private sums;
    getOverview(ownerId?: string, now?: Date): Promise<{
        generatedAt: string;
        weekly: {
            weekStart: string;
            createdValue: number;
            createdCount: number;
            wonValue: number;
            wonCount: number;
        }[];
        periods: {
            winRate: number | null;
            wonVsCreated: number | null;
            previous: {
                createdValue: number;
                createdCount: number;
                wonValue: number;
                wonCount: number;
                lostValue: number;
                lostCount: number;
            };
            createdValue: number;
            createdCount: number;
            wonValue: number;
            wonCount: number;
            lostValue: number;
            lostCount: number;
            key: string;
            label: string;
            days: number;
        }[];
        openPipeline: {
            value: number;
            count: number;
        };
        ownWinRate: number | null;
        benchmarks: {
            winRate: number;
            pipelineCoverage: number;
            minClosedDealsForOwnWinRate: number;
        };
    }>;
    ownWinRate(ownerId: string | undefined, now: Date): Promise<number | null>;
    private achieved;
    listTargets(visibleOwnerId: string | undefined, now?: Date): Promise<{
        id: string;
        name: string;
        metric: string;
        ownerId: string | null;
        ownerName: string;
        startDate: string;
        endDate: string;
        targetValue: number;
        progress: import("./targets.engine").TargetProgress;
        suggestion: import("./targets.engine").PipelineSuggestion | null;
    }[]>;
}
declare const _default: PerformanceService;
export default _default;
//# sourceMappingURL=performance.service.d.ts.map