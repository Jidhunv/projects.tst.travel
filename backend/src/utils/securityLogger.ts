import winston from 'winston';
import { Request } from 'express';

// Security event types captured for monitoring / audit.
export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'ACCOUNT_LOCKED'
  | 'LOGOUT'
  | 'AUTH_MISSING_TOKEN'
  | 'AUTH_INVALID_TOKEN'
  | 'ACCESS_DENIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'PASSWORD_CHANGED'
  | 'ADMIN_SET_PASSWORD';

// Dedicated logger writing structured JSON to logs/security.log so security
// events are isolated from application noise and easy to ship to a SIEM.
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { channel: 'security' },
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, ...meta }) =>
            `[${timestamp}] ${level}: [SECURITY] ${message} ${JSON.stringify(meta.detail || {})}`
        )
      ),
    }),
  ],
});

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

// Extract request context (IP, UA, path) for enriching a security event.
export function requestContext(req: Request): SecurityEventDetail {
  return {
    ip: req.ip || (req.socket && req.socket.remoteAddress) || undefined,
    userAgent: req.get ? req.get('user-agent') : undefined,
    path: req.originalUrl,
    method: req.method,
  };
}

// Record a security event. `WARN` level for failures/denials, `INFO` otherwise.
export function logSecurityEvent(type: SecurityEventType, detail: SecurityEventDetail = {}) {
  const isFailure =
    type === 'LOGIN_FAILURE' ||
    type === 'ACCOUNT_LOCKED' ||
    type === 'ACCESS_DENIED' ||
    type === 'AUTH_INVALID_TOKEN' ||
    type === 'AUTH_MISSING_TOKEN';

  const payload = { event: type, detail };
  if (isFailure) {
    securityLogger.warn(type, payload);
  } else {
    securityLogger.info(type, payload);
  }
}

export default { logSecurityEvent, requestContext };
