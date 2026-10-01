import { AuditLog } from '../models/AuditLog';
declare class AuditLogService {
    private repository;
    logChange(data: {
        entityType: string;
        entityId: string;
        action: 'CREATE' | 'UPDATE' | 'DELETE';
        oldValues?: Record<string, any>;
        newValues: Record<string, any>;
        userId: string;
        ipAddress?: string;
        userAgent?: string;
        description?: string;
    }): Promise<AuditLog>;
    getAuditLogs(filters: {
        page?: number;
        limit?: number;
        entityType?: string;
        entityId?: string;
        userId?: string;
        action?: string;
        fromDate?: Date;
        toDate?: Date;
    }): Promise<{
        data: AuditLog[];
        total: number;
    }>;
    getEntityAuditTrail(entityType: string, entityId: string): Promise<AuditLog[]>;
}
declare const _default: AuditLogService;
export default _default;
//# sourceMappingURL=audit-log.service.d.ts.map