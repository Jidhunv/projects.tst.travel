"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_service_1 = __importDefault(require("../services/report.service"));
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
            const data = await report_service_1.default.getConversionTimeline(effectiveOwnerId);
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