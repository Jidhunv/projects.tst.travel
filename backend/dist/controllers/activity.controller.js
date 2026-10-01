"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityController = void 0;
const activity_service_1 = __importDefault(require("../services/activity.service"));
const note_service_1 = __importDefault(require("../services/note.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
// Handles both Activities (calls/meetings/follow-ups) and Notes (remarks/feedback).
class ActivityController {
    // --- Activities / follow-ups ---
    async createActivity(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'activities', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create activities');
            }
            const { type, title, description, resourceType, resourceId, dueDate } = req.body;
            if (!type || !title || !resourceType || !resourceId) {
                throw new errorHandler_1.AppError(400, 'type, title, resourceType and resourceId are required');
            }
            const activity = await activity_service_1.default.createActivity({
                type,
                title,
                description,
                resourceType,
                resourceId,
                createdById: req.user.id,
                dueDate: dueDate ? new Date(dueDate) : undefined,
            });
            logger_1.default.info(`Activity (${type}) logged on ${resourceType} ${resourceId}`);
            return res.status(201).json({ success: true, data: activity });
        }
        catch (error) {
            next(error);
        }
    }
    async getActivities(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'activities', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view activities');
            }
            const { resourceType, resourceId } = req.query;
            if (!resourceType || !resourceId) {
                throw new errorHandler_1.AppError(400, 'resourceType and resourceId query params are required');
            }
            const activities = await activity_service_1.default.getActivitiesForResource(resourceType, resourceId);
            return res.json({ success: true, data: activities });
        }
        catch (error) {
            next(error);
        }
    }
    async getMyFollowUps(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'activities', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view activities');
            }
            const followUps = await activity_service_1.default.getUpcomingFollowUps(req.user.id);
            return res.json({ success: true, data: followUps });
        }
        catch (error) {
            next(error);
        }
    }
    async completeActivity(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'activities', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update activities');
            }
            const activity = await activity_service_1.default.completeActivity(req.params.id);
            return res.json({ success: true, data: activity });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteActivity(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'activities', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete activities');
            }
            await activity_service_1.default.deleteActivity(req.params.id);
            return res.json({ success: true, data: { message: 'Activity deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Notes / remarks / feedback ---
    async createNote(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'activities', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create notes');
            }
            const { content, resourceType, resourceId } = req.body;
            if (!content || !resourceType || !resourceId) {
                throw new errorHandler_1.AppError(400, 'content, resourceType and resourceId are required');
            }
            const note = await note_service_1.default.createNote({
                content,
                resourceType,
                resourceId,
                createdById: req.user.id,
            });
            logger_1.default.info(`Note added on ${resourceType} ${resourceId}`);
            return res.status(201).json({ success: true, data: note });
        }
        catch (error) {
            next(error);
        }
    }
    async getNotes(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'activities', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view notes');
            }
            const { resourceType, resourceId } = req.query;
            if (!resourceType || !resourceId) {
                throw new errorHandler_1.AppError(400, 'resourceType and resourceId query params are required');
            }
            const notes = await note_service_1.default.getNotesForResource(resourceType, resourceId);
            return res.json({ success: true, data: notes });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteNote(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'activities', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete notes');
            }
            await note_service_1.default.deleteNote(req.params.id);
            return res.json({ success: true, data: { message: 'Note deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ActivityController = ActivityController;
exports.default = new ActivityController();
//# sourceMappingURL=activity.controller.js.map