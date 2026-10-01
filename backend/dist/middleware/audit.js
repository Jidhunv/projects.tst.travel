"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = void 0;
const audit_log_service_1 = __importDefault(require("../services/audit-log.service"));
const logger_1 = __importDefault(require("../utils/logger"));
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
function sanitizeObject(obj) {
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
        }
        else if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitizeObject(sanitized[key]);
        }
    }
    return sanitized;
}
const auditMiddleware = async (req, res, next) => {
    const originalSend = res.send;
    // Store original request body (sanitized) for logging if needed
    if (req.body && (['POST', 'PATCH', 'DELETE'].includes(req.method))) {
        req.originalBody = sanitizeObject(req.body);
    }
    res.send = function (data) {
        // Only log mutations (POST, PATCH, DELETE), not GET requests
        if (['POST', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode < 400) {
            const responseData = typeof data === 'string' ? JSON.parse(data) : data;
            if (responseData?.success && responseData?.data) {
                // Derive the module from the URL. Use originalUrl, NOT req.path: Express
                // rewrites req.url/req.path to be relative to the mount point when a
                // request is dispatched into a mounted router, and this runs inside the
                // res.send wrapper (i.e. after that rewrite). For PATCH /api/users/<id>
                // req.path is already just "/<id>", so reading it stored the record id
                // as the module. originalUrl is never rewritten.
                //
                // The module is always the first segment after the /api prefix:
                //   /api/leads                        -> "leads"
                //   /api/leads/<id>                   -> "leads"
                //   /api/leads/<id>/convert-to-opportunity -> "leads"
                const fullPath = (req.originalUrl || req.url || '').split('?')[0];
                const pathSegments = fullPath.split('/').filter((p) => p);
                const startIdx = pathSegments[0] === 'api' ? 1 : 0;
                const entity = pathSegments[startIdx] || 'unknown';
                const entityId = req.params.id || responseData.data.id || responseData.data?.ticketId;
                const action = req.method === 'POST' ? 'CREATE' : req.method === 'PATCH' ? 'UPDATE' : 'DELETE';
                // Sanitize data before logging to remove sensitive fields
                const sanitizedData = sanitizeObject(responseData.data);
                // Create better descriptions based on entity type
                let description = `${action} ${entity}`;
                if (responseData.data?.name) {
                    description = `${action} ${entity}: ${responseData.data.name}`;
                }
                else if (responseData.data?.firstName && responseData.data?.lastName) {
                    description = `${action} ${entity}: ${responseData.data.firstName} ${responseData.data.lastName}`;
                }
                else if (responseData.data?.title) {
                    description = `${action} ${entity}: ${responseData.data.title}`;
                }
                else if (responseData.data?.email) {
                    description = `${action} ${entity}: ${responseData.data.email}`;
                }
                else if (responseData.data?.ticketNumber) {
                    description = `${action} ${entity}: ${responseData.data.ticketNumber}`;
                }
                audit_log_service_1.default.logChange({
                    entityType: entity || 'unknown',
                    entityId,
                    action: action,
                    newValues: sanitizedData,
                    oldValues: action === 'UPDATE' ? req.originalBody : undefined,
                    userId: req.user?.id || 'unknown',
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    description,
                }).catch((err) => {
                    logger_1.default.error('Audit log error:', err);
                });
            }
        }
        return originalSend.call(this, data);
    };
    next();
};
exports.auditMiddleware = auditMiddleware;
//# sourceMappingURL=audit.js.map