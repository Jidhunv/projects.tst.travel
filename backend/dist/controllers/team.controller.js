"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamController = void 0;
const team_service_1 = __importDefault(require("../services/team.service"));
const user_service_1 = __importDefault(require("../services/user.service"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
class TeamController {
    async list(_req, res, next) {
        try {
            return res.json({ success: true, data: await team_service_1.default.list() });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const { name, description } = req.body;
            const team = await team_service_1.default.create({ name, description });
            logger_1.default.info(`Team created: ${team.name} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: team });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { name, description } = req.body;
            const team = await team_service_1.default.update(req.params.id, { name, description });
            return res.json({ success: true, data: team });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            await team_service_1.default.remove(req.params.id);
            return res.json({ success: true, data: { message: 'Team deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
    // Add a user to this team (many-to-many; append).
    async addMember(req, res, next) {
        try {
            const { userId } = req.body;
            if (!userId)
                throw new errorHandler_1.AppError(400, 'userId is required');
            await user_service_1.default.getUserById(userId); // 404 if invalid
            await team_service_1.default.addUserToTeam(userId, req.params.id);
            logger_1.default.info(`User ${userId} added to team ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { userId, teamId: req.params.id } });
        }
        catch (error) {
            next(error);
        }
    }
    async removeMember(req, res, next) {
        try {
            await team_service_1.default.removeUserFromTeam(req.params.userId, req.params.id);
            return res.json({ success: true, data: { message: 'Member removed' } });
        }
        catch (error) {
            next(error);
        }
    }
    async members(req, res, next) {
        try {
            return res.json({ success: true, data: await team_service_1.default.members(req.params.id) });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TeamController = TeamController;
exports.default = new TeamController();
//# sourceMappingURL=team.controller.js.map