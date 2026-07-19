import { Response, NextFunction } from 'express';
import activityService from '../services/activity.service';
import noteService from '../services/note.service';
import { AuthRequest, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// Handles both Activities (calls/meetings/follow-ups) and Notes (remarks/feedback).
export class ActivityController {
  // --- Activities / follow-ups ---

  async createActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'activities', 'create')) {
        throw new AppError(403, 'You do not have permission to create activities');
      }
      const { type, title, description, resourceType, resourceId, dueDate } = req.body;

      if (!type || !title || !resourceType || !resourceId) {
        throw new AppError(400, 'type, title, resourceType and resourceId are required');
      }

      const activity = await activityService.createActivity({
        type,
        title,
        description,
        resourceType,
        resourceId,
        createdById: req.user!.id,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      logger.info(`Activity (${type}) logged on ${resourceType} ${resourceId}`);
      return res.status(201).json({ success: true, data: activity });
    } catch (error) {
      next(error);
    }
  }

  async getActivities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'activities', 'read')) {
        throw new AppError(403, 'You do not have permission to view activities');
      }
      const { resourceType, resourceId } = req.query;
      if (!resourceType || !resourceId) {
        throw new AppError(400, 'resourceType and resourceId query params are required');
      }
      const activities = await activityService.getActivitiesForResource(
        resourceType as string,
        resourceId as string
      );
      return res.json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  }

  async getMyFollowUps(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'activities', 'read')) {
        throw new AppError(403, 'You do not have permission to view activities');
      }
      const followUps = await activityService.getUpcomingFollowUps(req.user!.id);
      return res.json({ success: true, data: followUps });
    } catch (error) {
      next(error);
    }
  }

  async completeActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'activities', 'update')) {
        throw new AppError(403, 'You do not have permission to update activities');
      }
      const activity = await activityService.completeActivity(req.params.id);
      return res.json({ success: true, data: activity });
    } catch (error) {
      next(error);
    }
  }

  async deleteActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'activities', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete activities');
      }
      await activityService.deleteActivity(req.params.id);
      return res.json({ success: true, data: { message: 'Activity deleted' } });
    } catch (error) {
      next(error);
    }
  }

  // --- Notes / remarks / feedback ---

  async createNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'activities', 'create')) {
        throw new AppError(403, 'You do not have permission to create notes');
      }
      const { content, resourceType, resourceId } = req.body;
      if (!content || !resourceType || !resourceId) {
        throw new AppError(400, 'content, resourceType and resourceId are required');
      }
      const note = await noteService.createNote({
        content,
        resourceType,
        resourceId,
        createdById: req.user!.id,
      });
      logger.info(`Note added on ${resourceType} ${resourceId}`);
      return res.status(201).json({ success: true, data: note });
    } catch (error) {
      next(error);
    }
  }

  async getNotes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'activities', 'read')) {
        throw new AppError(403, 'You do not have permission to view notes');
      }
      const { resourceType, resourceId } = req.query;
      if (!resourceType || !resourceId) {
        throw new AppError(400, 'resourceType and resourceId query params are required');
      }
      const notes = await noteService.getNotesForResource(
        resourceType as string,
        resourceId as string
      );
      return res.json({ success: true, data: notes });
    } catch (error) {
      next(error);
    }
  }

  async deleteNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'activities', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete notes');
      }
      await noteService.deleteNote(req.params.id);
      return res.json({ success: true, data: { message: 'Note deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new ActivityController();
