export interface StageEntry {
    id: string;
    stage: string;
    enteredAt: Date;
    leftAt: Date | null;
    days: number;
    actorName: string;
    note: string | null;
    current: boolean;
}
export declare function buildTimeline(rows: {
    id: string;
    stage: string;
    enteredAt: Date;
    actorName: string;
    note: string | null;
}[], now: Date, closed: boolean): StageEntry[];
declare class StageHistoryService {
    record(oppId: string, toStage: string, actorId: string | null, note?: string | null, fromStage?: string | null): Promise<void>;
    timeline(oppId: string): Promise<{
        opportunityId: string;
        stage: any;
        status: any;
        createdAt: any;
        closedAt: any;
        totalDays: number;
        entries: StageEntry[];
    }>;
}
declare const _default: StageHistoryService;
export default _default;
//# sourceMappingURL=stageHistory.service.d.ts.map