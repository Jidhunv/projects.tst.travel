"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = __importDefault(require("../services/notification.service"));
const logger_1 = __importDefault(require("../utils/logger"));
class NotificationController {
    async getNotifications(req, res, next) {
        try {
            const { page = 1, limit = 20, unreadOnly = false } = req.query;
            const userId = req.user?.id || '';
            const { data, total } = await notification_service_1.default.getNotifications(userId, {
                page: Number(page),
                limit: Number(limit),
                unreadOnly: unreadOnly === 'true',
            });
            return res.json({
                success: true,
                data,
                meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUnreadCount(req, res, next) {
        try {
            const userId = req.user?.id || '';
            const count = await notification_service_1.default.getUnreadCount(userId);
            return res.json({ success: true, data: { unreadCount: count } });
        }
        catch (error) {
            next(error);
        }
    }
    async markAsRead(req, res, next) {
        try {
            const notification = await notification_service_1.default.markAsRead(req.params.id);
            logger_1.default.info(`Notification marked as read: ${notification.id} by ${req.user?.email}`);
            return res.json({ success: true, data: notification });
        }
        catch (error) {
            next(error);
        }
    }
    async markAllAsRead(req, res, next) {
        try {
            const userId = req.user?.id || '';
            await notification_service_1.default.markAllAsRead(userId);
            logger_1.default.info(`All notifications marked as read for ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'All notifications marked as read' } });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteNotification(req, res, next) {
        try {
            await notification_service_1.default.deleteNotification(req.params.id);
            logger_1.default.info(`Notification deleted: ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Notification deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotificationController = NotificationController;
exports.default = new NotificationController();
//# sourceMappingURL=notification.controller.js.map