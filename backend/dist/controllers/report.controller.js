"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_service_1 = __importDefault(require("../services/report.service"));
const salesHealth_service_1 = __importDefault(require("../services/salesHealth.service"));
const auth_1 = require("../middleware/auth");
// Reports respect role-based visibility: a Sales Rep only sees their own numbers,
// Admin/Manager see organization-wide figures.
class ReportController {
    async getPipelineReport(req, res, next) {
        try {
            const scope = (0, auth_1.getOwnerScope)(req.user, 'reports');
            const data = await report_service_1.default.getPipelineReport(scope);
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getSalesReport(req, res, next) {
        try {
            const scope = (0, auth_1.getOwnerScope)(req.user, 'reports');
            const { from, to } = req.query;
            const data = await report_service_1.default.getSalesReport(scope, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getMIS(req, res, next) {
        try {
            const scope = (0, auth_1.getOwnerScope)(req.user, 'reports');
            const data = await report_service_1.default.getMIS(scope);
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getConversionTimeline(req, res, next) {
        try {
            const scope = (0, auth_1.getOwnerScope)(req.user, 'reports');
            const { ownerId } = req.query;
            // Restricted users always see their own; unrestricted (scope undefined)
            // may optionally filter by a specific owner via the query param.
            const effectiveOwnerId = scope || (ownerId && ownerId !== '' ? ownerId : undefined);
            const { page, limit, fromDate, toDate, search, all } = req.query;
            const data = await report_service_1.default.getConversionTimeline(effectiveOwnerId, {
                page: page ? parseInt(page, 10) : undefined,
                limit: limit ? parseInt(limit, 10) : undefined,
                fromDate: fromDate,
                toDate: toDate,
                search: search,
                all: all === 'true',
            });
            return res.json({ success: true, data: data.rows, meta: data.meta });
        }
        catch (error) {
            next(error);
        }
    }
    async getSalesHealth(req, res, next) {
        try {
            const scope = (0, auth_1.getOwnerScope)(req.user, 'reports');
            const q = req.query;
            const str = (v) => (typeof v === 'string' && v !== '' ? v : undefined);
            const oneOf = (v, allowed) => allowed.includes(v) ? v : undefined;
            const data = await salesHealth_service_1.default.getReport(scope, {
                // Restricted users are pinned to their own accounts by `scope`;
                // unrestricted users may narrow to one owner.
                ownerId: str(q.ownerId),
                tier: str(q.tier),
                search: str(q.search),
                flagCode: str(q.flagCode),
                status: oneOf(q.status, ['on-track', 'at-risk', 'derailed', 'no-pipeline']),
                severity: oneOf(q.severity, ['critical', 'high', 'medium', 'low']),
                sort: oneOf(q.sort, ['score', 'value', 'overdue', 'quiet', 'name']),
                page: q.page ? parseInt(q.page, 10) || 1 : undefined,
                limit: q.all === 'true' ? 10000 : Math.min(parseInt(q.limit, 10) || 25, 200),
            });
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ReportController = ReportController;
exports.default = new ReportController();
//# sourceMappingURL=report.controller.js.map