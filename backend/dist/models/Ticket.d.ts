import { Account } from './Account';
import { Contact } from './Contact';
import { User } from './User';
import { Activity } from './Activity';
export declare class Ticket {
    id: string;
    ticketNumber: string;
    title: string;
    description: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    status: 'Open' | 'In Progress' | 'Pending Customer' | 'Resolved' | 'Closed';
    category?: string;
    source?: string;
    account: Account;
    productId?: string;
    moduleType?: 'Bug' | 'Feature Request' | 'Enhancement Suggestion';
    attachmentPaths?: string[];
    contact?: Contact;
    reporter: User;
    assignee?: User;
    assigneeIds?: string[];
    slaResponseHours?: number;
    slaResolutionHours?: number;
    responseDeadline?: Date;
    resolutionDeadline?: Date;
    respondedAt?: Date;
    resolvedAt?: Date;
    resolutionNotes?: string;
    activities?: Activity[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Ticket.d.ts.map