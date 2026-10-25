"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_service_1 = __importDefault(require("../services/report.service"));
const salesHealth_service_1 = __importDefault(require("../services/salesHealth.service"));
const lifecycle_service_1 = __importDefault(require("../services/lifecycle.service"));
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const salesActivity_service_1 = require("../services/salesActivity.service");
// Filters for the Reports page: salesperson (only people the viewer may see), date range, country and region.
// Dates accept from/to, or fromDate/toDate for the older list screens.
async function reportScope(req) {
    const q = req.query;
    const f = (0, salesActivity_service_1.validateFilters)({
        from: (q.from || q.fromDate),
        to: (q.to || q.toDate),
        country: q.country,
        region: q.region,
        salespersonId: q.salespersonId,
    });
    const ownerIds = await (0, salesActivity_service_1.ownersForFilter)(req.user, f.salespersonId, 'reports');
    return {
        ownerIds,
        from: f.from || undefined,
        to: f.to || undefined,
        country: f.country || undefined,
        region: f.region || undefined,
    };
}
// Reports respect role-based visibility: a Sales Rep only sees their own numbers,
// Admin/Manager see organization-wide figures.
class ReportController {
    async getPipelineReport(req, res, next) {
        try {
            const data = await report_service_1.default.getPipelineReport(await reportScope(req));
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getSalesReport(req, res, next) {
        try {
            const data = await report_service_1.default.getSalesReport(await reportScope(req));
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getMIS(req, res, next) {
        try {
            const data = await report_service_1.default.getMIS(await reportScope(req));
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getConversionTimeline(req, res, next) {
        try {
            const scope = await reportScope(req);
            const { page, limit, search, all, sortBy, sortDir } = req.query;
            const data = await report_service_1.default.getConversionTimeline(scope, {
                page: page ? parseInt(page, 10) : undefined,
                limit: limit ? parseInt(limit, 10) : undefined,
                fromDate: scope.from,
                toDate: scope.to,
                search: search,
                sortBy: sortBy,
                sortDir: sortDir,
                all: all === 'true',
            });
            return res.json({ success: true, data: data.rows, meta: data.meta });
        }
        catch (error) {
            next(error);
        }
    }
    // How much happened per week or month: new leads, qualifications, new deals, demos, proposals, negotiations, wins and losses.
    async getActivity(req, res, next) {
        try {
            const scope = (0, auth_1.getOwnerScope)(req.user, 'reports');
            const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
            const from = date(req.query.from), to = date(req.query.to);
            if (from && to && from > to)
                throw new errorHandler_1.AppError(400, 'From date cannot be after the To date');
            const owner = scope || (typeof req.query.ownerId === 'string' && req.query.ownerId ? req.query.ownerId : undefined);
            const grain = req.query.grain === 'month' ? 'month' : 'week';
            res.json({ success: true, data: await lifecycle_service_1.default.activity({ ownerId: owner, from, to, grain }) });
        }
        catch (error) {
            next(error);
        }
    }
    // Lead-to-close lifecycle: when each lead was qualified, converted, reached each stage and closed.
    async getLifecycle(req, res, next) {
        try {
            const scope = (0, auth_1.getOwnerScope)(req.user, 'reports');
            const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
            const from = date(req.query.from), to = date(req.query.to);
            if (from && to && from > to)
                throw new errorHandler_1.AppError(400, 'From date cannot be after the To date');
            const owner = scope || (typeof req.query.ownerId === 'string' && req.query.ownerId ? req.query.ownerId : undefined);
            res.json({ success: true, data: await lifecycle_service_1.default.report({ ownerId: owner, from, to }) });
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