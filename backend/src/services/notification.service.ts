import { AppDataSource } from '../config/database';
import { Notification } from '../models/Notification';
import { startSpan } from '../utils/tracer';

class NotificationService {
  private repository = AppDataSource.getRepository(Notification);

  async createNotification(data: {
    type: 'ContractExpiry' | 'InvoiceDue' | 'UATApproval' | 'PaymentReminder' | 'ProjectMilestone' | 'TicketUpdate';
    title: string;
    message: string;
    recipientId: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    relatedEntityName?: string;
    actionUrl?: string;
    actionLabel?: string;
  }) {
    const span = startSpan('notification.create');
    try {
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
    } finally {
      span.end();
    }
  }

  async getNotifications(userId: string, filters?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const span = startSpan('notification.list');
    try {
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
    } finally {
      span.end();
    }
  }

  async getUnreadCount(userId: string) {
    const span = startSpan('notification.unread-count');
    try {
      return await this.repository.countBy({ recipient: { id: userId }, isRead: false });
    } finally {
      span.end();
    }
  }

  async markAsRead(notificationId: string) {
    const span = startSpan('notification.mark-read');
    try {
      const notification = await this.repository.findOneBy({ id: notificationId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.isRead = true;
      notification.readAt = new Date();
      return await this.repository.save(notification);
    } finally {
      span.end();
    }
  }

  async markAllAsRead(userId: string) {
    const span = startSpan('notification.mark-all-read');
    try {
      const now = new Date();
      return await this.repository
        .createQueryBuilder()
        .update(Notification)
        .set({ isRead: true, readAt: now })
        .where('recipientId = :userId AND isRead = false', { userId })
        .execute();
    } finally {
      span.end();
    }
  }

  async deleteNotification(notificationId: string) {
    const span = startSpan('notification.delete');
    try {
      const notification = await this.repository.findOneBy({ id: notificationId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      await this.repository.remove(notification);
    } finally {
      span.end();
    }
  }

  async checkExpiringContracts() {
    const span = startSpan('notification.check-expiring-contracts');
    try {
      // This would be called by a cron job
      // Check for contracts expiring in next 30 days
      const sql = `
        SELECT c.id, c.title, a.id as accountId, u.id as userId
        FROM contracts c
        JOIN accounts a ON c.accountId = a.id
        JOIN users u ON a.ownerId = u.id
        WHERE c.renewalDate BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        AND c.status = 'Active'
      `;
      // Execute and create notifications
    } finally {
      span.end();
    }
  }

  async checkOverdueInvoices() {
    const span = startSpan('notification.check-overdue-invoices');
    try {
      // This would be called by a cron job
      // Check for invoices due or overdue
      const sql = `
        SELECT i.id, i.invoiceNumber, i.totalAmount, a.id as accountId, c.ownerId as userId
        FROM invoices i
        JOIN contracts c ON i.contractId = c.id
        JOIN accounts a ON c.accountId = a.id
        WHERE i.dueDate <= NOW()
        AND i.status NOT IN ('Paid', 'Cancelled')
      `;
      // Execute and create notifications
    } finally {
      span.end();
    }
  }
}

export default new NotificationService();
