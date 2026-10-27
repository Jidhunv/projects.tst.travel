"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const task_service_1 = __importDefault(require("../services/task.service"));
const tasks_1 = require("../utils/tasks");
const logger_1 = __importDefault(require("../utils/logger"));
// Who sees a task: read:all sees every task. A narrower read scope sees only the tasks the user
// assigned (owner) or was assigned (assignee). A task outside that is 404, so its existence stays hidden.
// Editing: the owner edits everything and may reassign. The assignee may only change the status.
// Deleting: the owner, or a read:all/delete:all role.
class TaskController {
    async list(req, res, next) {
        try {
            const scope = (0, auth_1.getReadScope)(req.user, 'tasks');
            if (!scope)
                throw new errorHandler_1.AppError(403, 'You do not have permission to view tasks');
            const view = ['assignedToMe', 'assignedByMe'].includes(String(req.query.view))
                ? String(req.query.view)
                : 'all';
            const status = req.query.status ? String(req.query.status) : undefined;
            const data = await task_service_1.default.list({
                userId: req.user.id,
                restrictToUser: scope !== 'all',
                view,
                status,
            });
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    // Who a task can be assigned to. Needed by anyone who may create or read tasks.
    async assignees(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tasks', 'create') && !(0, auth_1.canPerformAction)(req.user, 'tasks', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view tasks');
            }
            const data = await task_service_1.default.activeAssignees();
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async get(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tasks', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view tasks');
            }
            const task = await task_service_1.default.findById(req.params.id);
            if (!task || !(0, auth_1.canAccessRecord)(req.user, 'tasks', task.ownerId, 'read', [task.assigneeId])) {
                throw new errorHandler_1.AppError(404, 'Task not found');
            }
            return res.json({ success: true, data: task });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tasks', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create tasks');
            }
            const fields = (0, tasks_1.pickTaskFields)(req.body);
            const problem = (0, tasks_1.taskFieldError)(fields, true);
            if (problem)
                throw new errorHandler_1.AppError(400, problem);
            // A task goes from one person to another.
            if (fields.assigneeId === req.user.id)
                throw new errorHandler_1.AppError(400, 'Assign the task to another person');
            if (!(await task_service_1.default.findActiveUser(fields.assigneeId))) {
                throw new errorHandler_1.AppError(400, 'Choose an active user to assign the task to');
            }
            const task = await task_service_1.default.create({
                title: fields.title,
                description: fields.description ?? null,
                priority: fields.priority ?? 'Medium',
                status: 'Open',
                followupDate: fields.followupDate ?? null,
                ownerId: req.user.id,
                assigneeId: fields.assigneeId,
            });
            logger_1.default.info(`Task ${task.id} assigned to ${fields.assigneeId} by ${req.user.email}`);
            return res.status(201).json({ success: true, data: await task_service_1.default.findById(task.id) });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tasks', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update tasks');
            }
            const task = await task_service_1.default.findById(req.params.id);
            if (!task || !(0, auth_1.canAccessRecord)(req.user, 'tasks', task.ownerId, 'read', [task.assigneeId])) {
                throw new errorHandler_1.AppError(404, 'Task not found');
            }
            const isOwner = task.ownerId === req.user.id || (0, auth_1.getScope)(req.user, 'tasks', 'update') === 'all';
            const isAssignee = task.assigneeId === req.user.id;
            if (!isOwner && !isAssignee)
                throw new errorHandler_1.AppError(404, 'Task not found');
            const fields = (0, tasks_1.pickTaskFields)(req.body);
            let patch;
            if (isOwner) {
                const problem = (0, tasks_1.taskFieldError)(fields, false);
                if (problem)
                    throw new errorHandler_1.AppError(400, problem);
                if (fields.assigneeId === req.user.id)
                    throw new errorHandler_1.AppError(400, 'Assign the task to another person');
                if (fields.assigneeId && fields.assigneeId !== task.assigneeId && !(await task_service_1.default.findActiveUser(fields.assigneeId))) {
                    throw new errorHandler_1.AppError(400, 'Choose an active user to assign the task to');
                }
                patch = fields;
            }
            else {
                if (Object.keys(fields).some((key) => key !== 'status' && key !== 'actionsTaken')) {
                    throw new errorHandler_1.AppError(403, 'The assignee can only change the status and actions taken');
                }
                const problem = (0, tasks_1.taskFieldError)(fields, false);
                if (problem)
                    throw new errorHandler_1.AppError(400, problem);
                patch = fields;
            }
            // completedAt follows the status: set when the task is completed, cleared when it is reopened.
            if (patch.status !== undefined) {
                const completedAt = patch.status === 'Completed'
                    ? (task.status === 'Completed' ? task.completedAt : new Date())
                    : null;
                await task_service_1.default.update(task.id, { ...patch, completedAt });
            }
            else if (Object.keys(patch).length) {
                await task_service_1.default.update(task.id, patch);
            }
            return res.json({ success: true, data: await task_service_1.default.findById(task.id) });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tasks', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete tasks');
            }
            const task = await task_service_1.default.findById(req.params.id);
            if (!task || !(0, auth_1.canAccessRecord)(req.user, 'tasks', task.ownerId, 'read', [task.assigneeId])) {
                throw new errorHandler_1.AppError(404, 'Task not found');
            }
            if (task.ownerId !== req.user.id && (0, auth_1.getScope)(req.user, 'tasks', 'delete') !== 'all') {
                throw new errorHandler_1.AppError(403, 'Only the person who assigned the task can delete it');
            }
            await task_service_1.default.remove(task.id);
            return res.json({ success: true });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.default = new TaskController();
//# sourceMappingURL=task.controller.js.map