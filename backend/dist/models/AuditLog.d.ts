import { User } from './User';
export declare class AuditLog {
    id: string;
    entityType: string;
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    oldValues?: Record<string, any>;
    newValues: Record<string, any>;
    user: User;
    ipAddress?: string;
    userAgent?: string;
    description?: string;
    createdAt: Date;
}
//# sourceMappingURL=AuditLog.d.ts.map