import { Request } from 'express';
export type SecurityEventType = 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_LOCKED' | 'LOGOUT' | 'AUTH_MISSING_TOKEN' | 'AUTH_INVALID_TOKEN' | 'ACCESS_DENIED' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_COMPLETED' | 'PASSWORD_CHANGED' | 'ADMIN_SET_PASSWORD';
export interface SecurityEventDetail {
    email?: string;
    userId?: string;
    role?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    method?: string;
    reason?: string;
    [key: string]: any;
}
export declare function requestContext(req: Request): SecurityEventDetail;
export declare function logSecurityEvent(type: SecurityEventType, detail?: SecurityEventDetail): void;
declare const _default: {
    logSecurityEvent: typeof logSecurityEvent;
    requestContext: typeof requestContext;
};
export default _default;
//# sourceMappingURL=securityLogger.d.ts.map