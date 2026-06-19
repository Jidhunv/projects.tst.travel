import { Response, NextFunction } from 'express';
import auditLogService from '../services/audit-log.service';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

export class AuditLogController {
  async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 50, entityType, entityId, userId, action, fromDate, toDate } = req.query;

      const { data, total } = await auditLogService.getAuditLogs({
        page: Number(page),
        limit: Number(limit),
        entityType: entityType as string,
        entityId: entityId as string,
        userId: userId as string,
        action: action as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
      });

      logger.info(`Audit logs retrieved by ${req.user?.email}: ${data.length} records`);
      return res.json({
        success: true,
        data,
        meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
      });
    } catch (error) {
      next(error);
    }
  }

  async getEntityAuditTrail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params;

      const trail = await auditLogService.getEntityAuditTrail(entityType, entityId);

      logger.info(`Entity audit trail retrieved for ${entityType}:${entityId} by ${req.user?.email}`);
      return res.json({ success: true, data: trail });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuditLogController();
