import { Router } from 'express';
import NotificationController from '../controllers/notification.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.get('/', (req, res, next) => NotificationController.getNotifications(req, res, next));
router.get('/count/unread', (req, res, next) => NotificationController.getUnreadCount(req, res, next));
router.patch('/:id/read', (req, res, next) => NotificationController.markAsRead(req, res, next));
router.patch('/mark-all/read', (req, res, next) => NotificationController.markAllAsRead(req, res, next));
router.delete('/:id', (req, res, next) => NotificationController.deleteNotification(req, res, next));

export default router;
