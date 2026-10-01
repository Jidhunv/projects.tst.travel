import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class AuditLogController {
    getAuditLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getEntityAuditTrail(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: AuditLogController;
export default _default;
//# sourceMappingURL=audit-log.controller.d.ts.map