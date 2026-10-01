import { User } from './User';
export declare class Notification {
    id: string;
    type: 'ContractExpiry' | 'InvoiceDue' | 'UATApproval' | 'PaymentReminder' | 'ProjectMilestone' | 'TicketUpdate';
    title: string;
    message: string;
    recipient: User;
    relatedEntityType?: string;
    relatedEntityId?: string;
    relatedEntityName?: string;
    isRead: boolean;
    readAt?: Date;
    actionUrl?: string;
    actionLabel?: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Notification.d.ts.map