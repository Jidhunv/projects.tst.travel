import { Notification } from '../models/Notification';
declare class NotificationService {
    private repository;
    createNotification(data: {
        type: 'ContractExpiry' | 'InvoiceDue' | 'UATApproval' | 'PaymentReminder' | 'ProjectMilestone' | 'TicketUpdate';
        title: string;
        message: string;
        recipientId: string;
        relatedEntityType?: string;
        relatedEntityId?: string;
        relatedEntityName?: string;
        actionUrl?: string;
        actionLabel?: string;
    }): Promise<Notification>;
    getNotifications(userId: string, filters?: {
        page?: number;
        limit?: number;
        unreadOnly?: boolean;
    }): Promise<{
        data: Notification[];
        total: number;
    }>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(notificationId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<import("typeorm").UpdateResult>;
    deleteNotification(notificationId: string): Promise<void>;
    checkExpiringContracts(): Promise<void>;
    checkOverdueInvoices(): Promise<void>;
}
declare const _default: NotificationService;
export default _default;
//# sourceMappingURL=notification.service.d.ts.map