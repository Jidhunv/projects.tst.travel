"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCategoryController = void 0;
const database_1 = require("../config/database");
const TaskCategory_1 = require("../models/TaskCategory");
const Task_1 = require("../models/Task");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const inputValidator_1 = __importDefault(require("../utils/inputValidator"));
const logger_1 = __importDefault(require("../utils/logger"));
const repo = () => database_1.AppDataSource.getRepository(TaskCategory_1.TaskCategory);
// Task Category master. Anyone may read the list (it feeds the Task Manager dropdown);
// changing it needs the task_categories permissions.
class TaskCategoryController {
    async list(req, res, next) {
        try {
            const { isActive } = req.query;
            const where = {};
            if (isActive !== undefined)
                where.isActive = isActive === 'true';
            const data = await repo().find({ where, order: { name: 'ASC' } });
            return res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'task_categories', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create task categories');
            }
            const { name } = req.body;
            const nameCheck = inputValidator_1.default.validateString(name, 'Category name', 1, 100);
            if (!nameCheck.valid)
                throw new errorHandler_1.AppError(400, nameCheck.errors.join(', '));
            if (await repo().findOne({ where: { name } })) {
                throw new errorHandler_1.AppError(409, `Category "${name}" already exists`);
            }
            const category = repo().create({ name, isActive: true });
            await repo().save(category);
            logger_1.default.info(`Task category created: ${category.name} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: category });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'task_categories', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update task categories');
            }
            const category = await repo().findOne({ where: { id: req.params.id } });
            if (!category)
                throw new errorHandler_1.AppError(404, 'Category not found');
            const { name, isActive } = req.body;
            if (name !== undefined) {
                const nameCheck = inputValidator_1.default.validateString(name, 'Category name', 1, 100);
                if (!nameCheck.valid)
                    throw new errorHandler_1.AppError(400, nameCheck.errors.join(', '));
                const clash = await repo().findOne({ where: { name } });
                if (clash && clash.id !== category.id)
                    throw new errorHandler_1.AppError(409, `Category "${name}" already exists`);
                category.name = name;
            }
            if (isActive !== undefined)
                category.isActive = Boolean(isActive);
            await repo().save(category);
            logger_1.default.info(`Task category updated: ${category.id} by ${req.user?.email}`);
            return res.json({ success: true, data: category });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'task_categories', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete task categories');
            }
            const category = await repo().findOne({ where: { id: req.params.id } });
            if (!category)
                throw new errorHandler_1.AppError(404, 'Category not found');
            // A category already used by tasks is deactivated, so existing tasks keep their label.
            const inUse = await database_1.AppDataSource.getRepository(Task_1.Task).count({ where: { categoryId: category.id } });
            if (inUse > 0) {
                category.isActive = false;
                await repo().save(category);
                return res.json({
                    success: true,
                    data: { message: `Category is used by ${inUse} task(s), so it was deactivated rather than deleted.` },
                });
            }
            await repo().remove(category);
            logger_1.default.info(`Task category deleted: ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Category deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TaskCategoryController = TaskCategoryController;
exports.default = new TaskCategoryController();
//# sourceMappingURL=taskCategory.controller.js.map