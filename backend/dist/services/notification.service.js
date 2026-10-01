"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Notification_1 = require("../models/Notification");
class NotificationService {
    constructor() {
        this.repository = database_1.AppDataSource.getRepository(Notification_1.Notification);
    }
    async createNotification(data) {
        const notification = this.repository.create({
            type: data.type,
            title: data.title,
            message: data.message,
            recipient: { id: data.recipientId },
            relatedEntityType: data.relatedEntityType,
            relatedEntityId: data.relatedEntityId,
            relatedEntityName: data.relatedEntityName,
            actionUrl: data.actionUrl,
            actionLabel: data.actionLabel,
        });
        return await this.repository.save(notification);
    }
    async getNotifications(userId, filters) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const skip = (page - 1) * limit;
        const query = this.repository.createQueryBuilder('notification').where('notification.recipientId = :userId', {
            userId,
        });
        if (filters?.unreadOnly) {
            query.andWhere('notification.isRead = false');
        }
        const [data, total] = await query
            .orderBy('notification.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async getUnreadCount(userId) {
        return await this.repository.countBy({ recipient: { id: userId }, isRead: false });
    }
    async markAsRead(notificationId) {
        const notification = await this.repository.findOneBy({ id: notificationId });
        if (!notification) {
            throw new Error('Notification not found');
        }
        notification.isRead = true;
        notification.readAt = new Date();
        return await this.repository.save(notification);
    }
    async markAllAsRead(userId) {
        const now = new Date();
        return await this.repository
            .createQueryBuilder()
            .update(Notification_1.Notification)
            .set({ isRead: true, readAt: now })
            .where('recipientId = :userId AND isRead = false', { userId })
            .execute();
    }
    async deleteNotification(notificationId) {
        const notification = await this.repository.findOneBy({ id: notificationId });
        if (!notification) {
            throw new Error('Notification not found');
        }
        await this.repository.remove(notification);
    }
    async checkExpiringContracts() {
        // This would be called by a cron job
        // Check for contracts expiring in next 30 days
    }
    async checkOverdueInvoices() {
        // This would be called by a cron job
        // Check for invoices due or overdue
    }
}
exports.default = new NotificationService();
//# sourceMappingURL=notification.service.js.map