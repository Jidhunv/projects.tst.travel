"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const securityLogger_1 = require("../utils/securityLogger");
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        // Centrally record authorization failures raised by controllers
        // (e.g. canPerformAction / canAccessRecord throwing AppError(403)).
        if (err.statusCode === 403) {
            const user = req.user;
            (0, securityLogger_1.logSecurityEvent)('ACCESS_DENIED', {
                ...(0, securityLogger_1.requestContext)(req),
                userId: user?.id,
                email: user?.email,
                role: user?.role,
                reason: err.message,
            });
        }
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Request payload too large',
        });
    }
    logger_1.default.error('Unhandled error:', err);
    return res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map