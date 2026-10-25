"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionnaireController = void 0;
const opportunity_service_1 = __importDefault(require("../services/opportunity.service"));
const questionnaire_service_1 = __importDefault(require("../services/questionnaire.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
// The stage questionnaire of one opportunity (see utils/questionnaire.ts).
class QuestionnaireController {
    async get(req, res, next) {
        try {
            const opp = await opportunity_service_1.default.getOpportunityById(req.params.id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'opportunities', opp.ownerId, 'read', opp.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only view questionnaires for your own opportunities');
            }
            res.json({ success: true, data: await questionnaire_service_1.default.getQuestionnaire(req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    async save(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'opportunities', 'update'))
                throw new errorHandler_1.AppError(403, 'You do not have permission to update opportunities');
            const opp = await opportunity_service_1.default.getOpportunityById(req.params.id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only update your own opportunities');
            }
            const { value, status } = req.body || {};
            if (value !== undefined && value !== null && typeof value !== 'string')
                throw new errorHandler_1.AppError(400, 'The answer must be text');
            if (status !== undefined && status !== 'answered' && status !== 'unknown')
                throw new errorHandler_1.AppError(400, 'status must be answered or unknown');
            const data = await questionnaire_service_1.default.saveAnswer(req.params.id, req.params.key, { value, status }, req.user.id);
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    async history(req, res, next) {
        try {
            const opp = await opportunity_service_1.default.getOpportunityById(req.params.id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'opportunities', opp.ownerId, 'read', opp.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only view questionnaires for your own opportunities');
            }
            res.json({ success: true, data: await questionnaire_service_1.default.history(req.params.id, req.params.key) });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.QuestionnaireController = QuestionnaireController;
exports.default = new QuestionnaireController();
//# sourceMappingURL=questionnaire.controller.js.map