import { Response, NextFunction } from 'express';
import notificationService from '../services/notification.service';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      const userId = req.user?.id || '';

      const { data, total } = await notificationService.getNotifications(userId, {
        page: Number(page),
        limit: Number(limit),
        unreadOnly: unreadOnly === 'true',
      });

      return res.json({
        success: true,
        data,
        meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || '';
      const count = await notificationService.getUnreadCount(userId);
      return res.json({ success: true, data: { unreadCount: count } });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notification = await notificationService.markAsRead(req.params.id);
      logger.info(`Notification marked as read: ${notification.id} by ${req.user?.email}`);
      return res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || '';
      await notificationService.markAllAsRead(userId);
      logger.info(`All notifications marked as read for ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'All notifications marked as read' } });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.deleteNotification(req.params.id);
      logger.info(`Notification deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Notification deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
