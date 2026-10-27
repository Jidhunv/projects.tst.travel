import { Response, NextFunction } from 'express';
import { AuthRequest, canAccessRecord, canPerformAction, getReadScope, getScope } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import taskService from '../services/task.service';
import { pickTaskFields, taskFieldError, TaskFields } from '../utils/tasks';
import logger from '../utils/logger';

// Who sees a task: read:all sees every task. A narrower read scope sees only the tasks the user
// assigned (owner) or was assigned (assignee). A task outside that is 404, so its existence stays hidden.
// Editing: the owner edits everything and may reassign. The assignee may only change the status.
// Deleting: the owner, or a read:all/delete:all role.
class TaskController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = getReadScope(req.user, 'tasks');
      if (!scope) throw new AppError(403, 'You do not have permission to view tasks');

      const view = ['assignedToMe', 'assignedByMe'].includes(String(req.query.view))
        ? (String(req.query.view) as 'assignedToMe' | 'assignedByMe')
        : 'all';
      const status = req.query.status ? String(req.query.status) : undefined;

      const data = await taskService.list({
        userId: req.user!.id,
        restrictToUser: scope !== 'all',
        view,
        status,
      });
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Who a task can be assigned to. Needed by anyone who may create or read tasks.
  async assignees(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tasks', 'create') && !canPerformAction(req.user, 'tasks', 'read')) {
        throw new AppError(403, 'You do not have permission to view tasks');
      }
      const data = await taskService.activeAssignees();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tasks', 'read')) {
        throw new AppError(403, 'You do not have permission to view tasks');
      }
      const task = await taskService.findById(req.params.id);
      if (!task || !canAccessRecord(req.user, 'tasks', task.ownerId, 'read', [task.assigneeId])) {
        throw new AppError(404, 'Task not found');
      }
      return res.json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tasks', 'create')) {
        throw new AppError(403, 'You do not have permission to create tasks');
      }
      const fields = pickTaskFields(req.body);
      const problem = taskFieldError(fields, true);
      if (problem) throw new AppError(400, problem);

      // A task goes from one person to another.
      if (fields.assigneeId === req.user!.id) throw new AppError(400, 'Assign the task to another person');
      if (!(await taskService.findActiveUser(fields.assigneeId!))) {
        throw new AppError(400, 'Choose an active user to assign the task to');
      }

      const task = await taskService.create({
        title: fields.title!,
        description: fields.description ?? null,
        priority: fields.priority ?? 'Medium',
        status: 'Open',
        followupDate: fields.followupDate ?? null,
        ownerId: req.user!.id,
        assigneeId: fields.assigneeId!,
      });
      logger.info(`Task ${task.id} assigned to ${fields.assigneeId} by ${req.user!.email}`);

      return res.status(201).json({ success: true, data: await taskService.findById(task.id) });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tasks', 'update')) {
        throw new AppError(403, 'You do not have permission to update tasks');
      }
      const task = await taskService.findById(req.params.id);
      if (!task || !canAccessRecord(req.user, 'tasks', task.ownerId, 'read', [task.assigneeId])) {
        throw new AppError(404, 'Task not found');
      }

      const isOwner = task.ownerId === req.user!.id || getScope(req.user, 'tasks', 'update') === 'all';
      const isAssignee = task.assigneeId === req.user!.id;
      if (!isOwner && !isAssignee) throw new AppError(404, 'Task not found');

      const fields = pickTaskFields(req.body);
      let patch: TaskFields;
      if (isOwner) {
        const problem = taskFieldError(fields, false);
        if (problem) throw new AppError(400, problem);
        if (fields.assigneeId === req.user!.id) throw new AppError(400, 'Assign the task to another person');
        if (fields.assigneeId && fields.assigneeId !== task.assigneeId && !(await taskService.findActiveUser(fields.assigneeId))) {
          throw new AppError(400, 'Choose an active user to assign the task to');
        }
        patch = fields;
      } else {
        if (Object.keys(fields).some((key) => key !== 'status' && key !== 'actionsTaken')) {
          throw new AppError(403, 'The assignee can only change the status and actions taken');
        }
        const problem = taskFieldError(fields, false);
        if (problem) throw new AppError(400, problem);
        patch = fields;
      }

      // completedAt follows the status: set when the task is completed, cleared when it is reopened.
      if (patch.status !== undefined) {
        const completedAt = patch.status === 'Completed'
          ? (task.status === 'Completed' ? task.completedAt : new Date())
          : null;
        await taskService.update(task.id, { ...(patch as object), completedAt } as any);
      } else if (Object.keys(patch).length) {
        await taskService.update(task.id, patch as any);
      }

      return res.json({ success: true, data: await taskService.findById(task.id) });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tasks', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete tasks');
      }
      const task = await taskService.findById(req.params.id);
      if (!task || !canAccessRecord(req.user, 'tasks', task.ownerId, 'read', [task.assigneeId])) {
        throw new AppError(404, 'Task not found');
      }
      if (task.ownerId !== req.user!.id && getScope(req.user, 'tasks', 'delete') !== 'all') {
        throw new AppError(403, 'Only the person who assigned the task can delete it');
      }
      await taskService.remove(task.id);
      return res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export default new TaskController();
