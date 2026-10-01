"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogController = void 0;
const audit_log_service_1 = __importDefault(require("../services/audit-log.service"));
const logger_1 = __importDefault(require("../utils/logger"));
class AuditLogController {
    async getAuditLogs(req, res, next) {
        try {
            const { page = 1, limit = 50, entityType, entityId, userId, action, fromDate, toDate } = req.query;
            const { data, total } = await audit_log_service_1.default.getAuditLogs({
                page: Number(page),
                limit: Number(limit),
                entityType: entityType,
                entityId: entityId,
                userId: userId,
                action: action,
                fromDate: fromDate ? new Date(fromDate) : undefined,
                toDate: toDate ? new Date(toDate) : undefined,
            });
            logger_1.default.info(`Audit logs retrieved by ${req.user?.email}: ${data.length} records`);
            return res.json({
                success: true,
                data,
                meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getEntityAuditTrail(req, res, next) {
        try {
            const { entityType, entityId } = req.params;
            const trail = await audit_log_service_1.default.getEntityAuditTrail(entityType, entityId);
            logger_1.default.info(`Entity audit trail retrieved for ${entityType}:${entityId} by ${req.user?.email}`);
            return res.json({ success: true, data: trail });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuditLogController = AuditLogController;
exports.default = new AuditLogController();
//# sourceMappingURL=audit-log.controller.js.map