export type AuditAction = 'created' | 'updated' | 'deleted';
declare class KpiService {
    audit(entityType: 'kpi_entry' | 'projection', entityId: string, subjectUserId: string, actorId: string | undefined, action: AuditAction, before: Record<string, unknown> | null, after: Record<string, unknown> | null): Promise<void>;
    listAudit(opts: {
        subjectUserId?: string;
        from?: string;
        to?: string;
        entityType?: string;
        page: number;
        limit: number;
    }): Promise<{
        rows: any;
        total: number;
    }>;
    summary(from: string, to: string, onlyUserId?: string): Promise<any>;
    projectionsVsActual(months: string[], userIds?: string[]): Promise<{
        id: any;
        userId: any;
        month: string;
        metric: any;
        projected: number;
        actual: number;
        pct: number | null;
        note: any;
        updatedAt: any;
        revisions: number;
    }[]>;
    meetingReport(from: string, to: string, onlyUserIds: string[] | undefined, today: string): Promise<{
        from: string;
        to: string;
        today: string;
        people: never[];
        combined: null;
        workdays?: undefined;
    } | {
        from: string;
        to: string;
        today: string;
        workdays: string[];
        people: any;
        combined: {
            staff: any;
            compliance: {
                dueDays: any;
                reportedDays: any;
                pct: number | null;
                todayPending: any;
            };
            kpis: any[];
            pipeline: {
                createdValue: any;
                createdCount: any;
                wonValue: any;
                wonCount: any;
                leadsCreated: any;
                visitsLogged: any;
            };
            projections: any[];
        };
    }>;
}
declare const _default: KpiService;
export default _default;
//# sourceMappingURL=kpi.service.d.ts.map