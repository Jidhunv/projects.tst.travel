import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { TaskCategory } from '../models/TaskCategory';
import { Task } from '../models/Task';
import { AuthRequest, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import InputValidator from '../utils/inputValidator';
import logger from '../utils/logger';

const repo = () => AppDataSource.getRepository(TaskCategory);

// Task Category master. Anyone may read the list (it feeds the Task Manager dropdown);
// changing it needs the task_categories permissions.
export class TaskCategoryController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.query;
      const where: Record<string, unknown> = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const data = await repo().find({ where, order: { name: 'ASC' } });
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'task_categories', 'create')) {
        throw new AppError(403, 'You do not have permission to create task categories');
      }

      const { name } = req.body;
      const nameCheck = InputValidator.validateString(name, 'Category name', 1, 100);
      if (!nameCheck.valid) throw new AppError(400, nameCheck.errors.join(', '));

      if (await repo().findOne({ where: { name } })) {
        throw new AppError(409, `Category "${name}" already exists`);
      }

      const category = repo().create({ name, isActive: true });
      await repo().save(category);
      logger.info(`Task category created: ${category.name} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'task_categories', 'update')) {
        throw new AppError(403, 'You do not have permission to update task categories');
      }

      const category = await repo().findOne({ where: { id: req.params.id } });
      if (!category) throw new AppError(404, 'Category not found');

      const { name, isActive } = req.body;
      if (name !== undefined) {
        const nameCheck = InputValidator.validateString(name, 'Category name', 1, 100);
        if (!nameCheck.valid) throw new AppError(400, nameCheck.errors.join(', '));

        const clash = await repo().findOne({ where: { name } });
        if (clash && clash.id !== category.id) throw new AppError(409, `Category "${name}" already exists`);
        category.name = name;
      }
      if (isActive !== undefined) category.isActive = Boolean(isActive);

      await repo().save(category);
      logger.info(`Task category updated: ${category.id} by ${req.user?.email}`);
      return res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'task_categories', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete task categories');
      }

      const category = await repo().findOne({ where: { id: req.params.id } });
      if (!category) throw new AppError(404, 'Category not found');

      // A category already used by tasks is deactivated, so existing tasks keep their label.
      const inUse = await AppDataSource.getRepository(Task).count({ where: { categoryId: category.id } });
      if (inUse > 0) {
        category.isActive = false;
        await repo().save(category);
        return res.json({
          success: true,
          data: { message: `Category is used by ${inUse} task(s), so it was deactivated rather than deleted.` },
        });
      }

      await repo().remove(category);
      logger.info(`Task category deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Category deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new TaskCategoryController();
