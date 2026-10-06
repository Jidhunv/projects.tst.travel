export declare class KpiAuditTrail {
    id: string;
    entityType: string;
    entityId: string;
    subjectUserId: string;
    actorId: string | null;
    action: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    createdAt: Date;
}
//# sourceMappingURL=KpiAuditTrail.d.ts.map