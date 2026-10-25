export interface KpiReportRow {
    type: string;
    total: number;
    entries: number;
    target: number | null;
    weightage: number | null;
    pctOfTarget: number | null;
    met: boolean | null;
}
export declare function kpiMet(r: KpiReportRow): boolean | null;
export declare function weightedScore(rows: KpiReportRow[]): {
    weightTotal: number;
    weightedScore: number | null;
    scorePct: number | null;
};
//# sourceMappingURL=kpiReport.d.ts.map