import { Request, Response, NextFunction } from 'express';
import auditLogService from '../services/audit-log.service';
import { AuthRequest } from './auth';

export const auditMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Only log mutations (POST, PATCH, DELETE), not GET requests
    if (['POST', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode < 400) {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;

      if (responseData?.success && responseData?.data) {
        const entity = req.path.split('/')[2]; // Extract entity type from path (e.g., /api/leads/:id)
        const entityId = req.params.id || responseData.data.id;
        const action = req.method === 'POST' ? 'CREATE' : req.method === 'PATCH' ? 'UPDATE' : 'DELETE';

        auditLogService.logChange({
          entityType: entity || 'unknown',
          entityId,
          action: action as 'CREATE' | 'UPDATE' | 'DELETE',
          newValues: responseData.data,
          userId: req.user?.id || 'unknown',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          description: `${action} ${entity}`,
        }).catch((err) => {
          console.error('Audit log error:', err);
        });
      }
    }

    return originalSend.call(this, data);
  };

  next();
};
