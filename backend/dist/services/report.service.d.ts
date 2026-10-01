interface StageBucket {
    stage: string;
    count: number;
    totalValue: number;
    weightedValue: number;
}
interface ConversionTimelineRow {
    accountId: string;
    accountName: string;
    accountCreatedAt: Date;
    accountOwner: string;
    leadId: string | null;
    leadName: string | null;
    leadCreatedAt: Date | null;
    leadStatus: string | null;
    leadConvertedAt: Date | null;
    opportunityId: string | null;
    opportunityName: string | null;
    opportunityCreatedAt: Date | null;
    opportunityStage: string | null;
    opportunityStatus: string | null;
}
export declare class ReportService {
    private oppRepository;
    private leadRepository;
    private accountRepository;
    private scopeOwner;
    getPipelineReport(ownerId?: string): Promise<{
        byStage: StageBucket[];
        totalOpenValue: number;
        totalWeightedValue: number;
        openCount: number;
    }>;
    getSalesReport(ownerId?: string, from?: Date, to?: Date): Promise<{
        wonCount: number;
        wonValue: number;
        lostCount: number;
        lostValue: number;
        winRate: number;
        avgDealSize: number;
        lossReasons: {
            reason: string;
            count: number;
            value: number;
        }[];
    }>;
    getSalesByOwner(): Promise<{
        ownerId: string;
        ownerName: string;
        openValue: number;
        wonValue: number;
        lostValue: number;
        winRate: number;
    }[]>;
    getMIS(ownerId?: string): Promise<any>;
    getConversionTimeline(ownerId?: string): Promise<ConversionTimelineRow[]>;
    private wonInPeriod;
}
declare const _default: ReportService;
export default _default;
//# sourceMappingURL=report.service.d.ts.map