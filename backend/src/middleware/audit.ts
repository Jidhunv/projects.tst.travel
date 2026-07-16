import { Request, Response, NextFunction } from 'express';
import auditLogService from '../services/audit-log.service';
import { AuthRequest } from './auth';
import logger from '../utils/logger';

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
        // Extract entity type from path
        // Paths: /api/leads -> "leads", /api/leads/123 -> "leads", /api/leads/123/assign -> "leads"
        const pathSegments = req.path.split('/').filter(p => p); // Remove empty strings

        let entity = 'unknown';

        // pathSegments after split will be like: ['api', 'leads'] or ['api', 'leads', 'id'] or ['api', 'leads', 'id', 'assign']
        if (pathSegments.length > 0) {
          // Skip 'api' prefix if present, get the first non-numeric, non-action segment
          let startIdx = pathSegments[0] === 'api' ? 1 : 0;

          if (startIdx < pathSegments.length) {
            const potentialEntity = pathSegments[startIdx];

            // Check if this is actually an entity name (not a number/ID)
            if (potentialEntity && isNaN(parseInt(potentialEntity))) {
              // Make sure it's not a special action name
              const actionNames = ['assign', 'convert', 'close', 'resolve', 'upload', 'download', 'me'];
              const isAction = actionNames.some(action => potentialEntity === action);

              if (!isAction) {
                entity = potentialEntity;
              }
            }
          }
        }

        // If entity is still unknown, try to infer from request body or response data
        if (entity === 'unknown' && responseData?.data) {
          if (responseData.data.email) {
            entity = 'users';
          } else if (responseData.data.companyName || responseData.data.accountName) {
            entity = 'accounts';
          } else if (responseData.data.status === 'open' || responseData.data.status === 'closed' || responseData.data.ticketNumber) {
            entity = 'tickets';
          }
        }

        const entityId = req.params.id || responseData.data.id || responseData.data?.ticketId;
        const action = req.method === 'POST' ? 'CREATE' : req.method === 'PATCH' ? 'UPDATE' : 'DELETE';

        // Sanitize data before logging to remove sensitive fields
        const sanitizedData = sanitizeObject(responseData.data);

        // Create better descriptions based on entity type
        let description = `${action} ${entity}`;
        if (responseData.data?.name) {
          description = `${action} ${entity}: ${responseData.data.name}`;
        } else if (responseData.data?.firstName && responseData.data?.lastName) {
          description = `${action} ${entity}: ${responseData.data.firstName} ${responseData.data.lastName}`;
        } else if (responseData.data?.title) {
          description = `${action} ${entity}: ${responseData.data.title}`;
        } else if (responseData.data?.email) {
          description = `${action} ${entity}: ${responseData.data.email}`;
        } else if (responseData.data?.ticketNumber) {
          description = `${action} ${entity}: ${responseData.data.ticketNumber}`;
        }

        auditLogService.logChange({
          entityType: entity || 'unknown',
          entityId,
          action: action as 'CREATE' | 'UPDATE' | 'DELETE',
          newValues: sanitizedData,
          oldValues: action === 'UPDATE' ? (req as any).originalBody : undefined,
          userId: req.user?.id || 'unknown',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          description,
        }).catch((err) => {
          logger.error('Audit log error:', err);
        });
      }
    }

    return originalSend.call(this, data);
  };

  next();
};
