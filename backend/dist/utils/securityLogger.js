"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContext = requestContext;
exports.logSecurityEvent = logSecurityEvent;
const winston_1 = __importDefault(require("winston"));
// Dedicated logger writing structured JSON to logs/security.log so security
// events are isolated from application noise and easy to ship to a SIEM.
const securityLogger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.json()),
    defaultMeta: { channel: 'security' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/security.log' }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ level, message, timestamp, ...meta }) => `[${timestamp}] ${level}: [SECURITY] ${message} ${JSON.stringify(meta.detail || {})}`)),
        }),
    ],
});
// Extract request context (IP, UA, path) for enriching a security event.
function requestContext(req) {
    return {
        ip: req.ip || (req.socket && req.socket.remoteAddress) || undefined,
        userAgent: req.get ? req.get('user-agent') : undefined,
        path: req.originalUrl,
        method: req.method,
    };
}
// Record a security event. `WARN` level for failures/denials, `INFO` otherwise.
function logSecurityEvent(type, detail = {}) {
    const isFailure = type === 'LOGIN_FAILURE' ||
        type === 'ACCOUNT_LOCKED' ||
        type === 'ACCESS_DENIED' ||
        type === 'AUTH_INVALID_TOKEN' ||
        type === 'AUTH_MISSING_TOKEN';
    const payload = { event: type, detail };
    if (isFailure) {
        securityLogger.warn(type, payload);
    }
    else {
        securityLogger.info(type, payload);
    }
}
exports.default = { logSecurityEvent, requestContext };
//# sourceMappingURL=securityLogger.js.map