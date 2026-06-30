import { Request, Response, NextFunction } from 'express';
import auditLogService from '../services/audit-log.service';
import { AuthRequest } from './auth';

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'resetToken',
  'refreshToken',
  'apiKey',
  'apiSecret',
  'creditCardNumber',
  'ssn',
  'securityCode',
  'cvv',
  'privateKey',
  'accessToken',
  'jwtToken',
];

function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}

export const auditMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  // Store original request body (sanitized) for logging if needed
  if (req.body && (['POST', 'PATCH', 'DELETE'].includes(req.method))) {
    (req as any).originalBody = sanitizeObject(req.body);
  }

  res.send = function (data: any) {
    // Only log mutations (POST, PATCH, DELETE), not GET requests
    if (['POST', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode < 400) {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;

      if (responseData?.success && responseData?.data) {
        const entity = req.path.split('/')[2]; // Extract entity type from path (e.g., /api/leads/:id)
        const entityId = req.params.id || responseData.data.id;
        const action = req.method === 'POST' ? 'CREATE' : req.method === 'PATCH' ? 'UPDATE' : 'DELETE';

        // Sanitize data before logging to remove sensitive fields
        const sanitizedData = sanitizeObject(responseData.data);

        auditLogService.logChange({
          entityType: entity || 'unknown',
          entityId,
          action: action as 'CREATE' | 'UPDATE' | 'DELETE',
          newValues: sanitizedData,
          oldValues: action === 'UPDATE' ? (req as any).originalBody : undefined,
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
