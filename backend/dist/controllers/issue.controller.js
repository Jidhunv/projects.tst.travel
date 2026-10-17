"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueController = void 0;
const issue_service_1 = __importDefault(require("../services/issue.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const issueWorkflow_1 = require("../utils/issueWorkflow");
const scopeOf = (req, action) => {
    const s = (0, auth_1.getScope)(req.user, 'issue_log', action);
    return s === 'all' ? 'all' : s ? 'self' : null;
};
const need = (req, action, what) => {
    const s = scopeOf(req, action);
    if (!s)
        throw new errorHandler_1.AppError(403, `You do not have permission to ${what}`);
    return s;
};
const str = (v) => (typeof v === 'string' && v !== '' ? v : undefined);
// A "self" user may only touch issues assigned to, or logged by, themselves.
async function assertCanTouch(req, scope, issueId) {
    const sc = await issue_service_1.default.getIssueScope(issueId);
    if (!sc || (scope === 'self' && sc.assigneeId !== req.user.id && sc.createdById !== req.user.id))
        throw new errorHandler_1.AppError(404, 'Issue not found');
}
class IssueController {
    async workflow(_req, res) {
        res.json({ success: true, data: { stages: [...issueWorkflow_1.ISSUE_STAGES], onHold: issueWorkflow_1.STAGE_ON_HOLD, cancelled: issueWorkflow_1.STAGE_CANCELLED, help: issueWorkflow_1.STAGE_HELP } });
    }
    async clients(req, res, next) {
        try {
            const scope = need(req, 'read', 'view the issue log');
            const data = await issue_service_1.default.clientSummary({ search: str(req.query.search), scopeUserId: scope === 'self' ? req.user.id : undefined });
            const stages = await issue_service_1.default.stageCounts(undefined, scope === 'self' ? req.user.id : undefined);
            res.json({ success: true, data, stages });
        }
        catch (e) {
            next(e);
        }
    }
    async list(req, res, next) {
        try {
            const scope = need(req, 'read', 'view the issue log');
            const state = req.query.state === 'open' || req.query.state === 'closed' ? req.query.state : undefined;
            const r = await issue_service_1.default.listIssues({
                accountId: str(req.query.accountId), ticketId: str(req.query.ticketId), stage: str(req.query.stage), state,
                assigneeId: str(req.query.assigneeId), search: str(req.query.search),
                scopeUserId: scope === 'self' ? req.user.id : undefined,
                page: parseInt(String(req.query.page), 10) || 1, limit: parseInt(String(req.query.limit), 10) || 25,
            });
            res.json({ success: true, data: r.rows, meta: { page: r.page, limit: r.limit, total: r.total, totalPages: Math.max(1, Math.ceil(r.total / r.limit)) } });
        }
        catch (e) {
            next(e);
        }
    }
    async slaReport(req, res, next) {
        try {
            const scope = need(req, 'read', 'view the issue log');
            const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
            const state = req.query.state === 'open' || req.query.state === 'closed' ? req.query.state : undefined;
            const from = date(req.query.from), to = date(req.query.to);
            if (from && to && from > to)
                throw new errorHandler_1.AppError(400, 'From date cannot be after the To date');
            const r = await issue_service_1.default.slaReport({
                from, to, accountId: str(req.query.accountId), priority: str(req.query.priority), assigneeId: str(req.query.assigneeId), state,
                scopeUserId: scope === 'self' ? req.user.id : undefined,
                page: parseInt(String(req.query.page), 10) || 1, limit: parseInt(String(req.query.limit), 10) || 25, all: req.query.all === 'true',
            });
            res.json({ success: true, data: r });
        }
        catch (e) {
            next(e);
        }
    }
    async create(req, res, next) {
        try {
            need(req, 'create', 'log issues');
            const b = (0, pick_1.default)(req.body || {}, ['ticketId', 'title', 'description', 'priority', 'assigneeId']);
            if (typeof b.ticketId !== 'string' || !b.ticketId)
                throw new errorHandler_1.AppError(400, 'Pick the ticket this issue belongs to');
            const r = await issue_service_1.default.createIssue(b, req.user.id);
            res.status(201).json({ success: true, data: r.issue, ticketStatus: r.ticketStatus });
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const scope = need(req, 'update', 'edit issues');
            await assertCanTouch(req, scope, req.params.id);
            const b = (0, pick_1.default)(req.body || {}, ['title', 'description', 'priority', 'assigneeId']);
            res.json({ success: true, data: await issue_service_1.default.updateIssue(req.params.id, b) });
        }
        catch (e) {
            next(e);
        }
    }
    async move(req, res, next) {
        try {
            const scope = need(req, 'update', 'update issues');
            await assertCanTouch(req, scope, req.params.id);
            const b = (0, pick_1.default)(req.body || {}, ['toStage', 'note', 'customerContact', 'assigneeId']);
            if (typeof b.toStage !== 'string')
                throw new errorHandler_1.AppError(400, 'Choose the stage to move to');
            if (typeof b.note === 'string' && b.note.length > 2000)
                throw new errorHandler_1.AppError(400, 'The note is too long (max 2000 characters)');
            const r = await issue_service_1.default.moveStage(req.params.id, b, req.user.id);
            res.json({ success: true, data: r.issue, ticketStatus: r.ticketStatus, ticketChanged: r.ticketChanged });
        }
        catch (e) {
            next(e);
        }
    }
    async history(req, res, next) {
        try {
            const scope = need(req, 'read', 'view the issue log');
            await assertCanTouch(req, scope, req.params.id);
            res.json({ success: true, data: await issue_service_1.default.getHistory(req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    async remove(req, res, next) {
        try {
            const scope = need(req, 'delete', 'delete issues');
            await assertCanTouch(req, scope, req.params.id);
            await issue_service_1.default.deleteIssue(req.params.id);
            res.json({ success: true });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.IssueController = IssueController;
exports.default = new IssueController();
//# sourceMappingURL=issue.controller.js.map