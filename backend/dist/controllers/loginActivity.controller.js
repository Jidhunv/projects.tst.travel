"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginActivityController = void 0;
const loginActivity_service_1 = __importDefault(require("../services/loginActivity.service"));
const logger_1 = __importDefault(require("../utils/logger"));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EVENTS = ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'ACCOUNT_LOCKED', 'LOGOUT'];
class LoginActivityController {
    async list(req, res, next) {
        try {
            const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
            const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 50, 1), 200);
            const from = typeof req.query.from === 'string' && DATE_RE.test(req.query.from) ? req.query.from : undefined;
            const to = typeof req.query.to === 'string' && DATE_RE.test(req.query.to) ? req.query.to : undefined;
            const event = typeof req.query.event === 'string' && EVENTS.includes(req.query.event) ? req.query.event : undefined;
            const userId = typeof req.query.userId === 'string' && req.query.userId ? req.query.userId : undefined;
            const { data, total } = await loginActivity_service_1.default.list({ userId, event, from, to, page, limit });
            logger_1.default.info(`Login activity viewed by ${req.user?.email}: ${data.length} record(s)`);
            res.json({ success: true, data, meta: { total, page, limit, retentionDays: 365 } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LoginActivityController = LoginActivityController;
exports.default = new LoginActivityController();
//# sourceMappingURL=loginActivity.controller.js.map