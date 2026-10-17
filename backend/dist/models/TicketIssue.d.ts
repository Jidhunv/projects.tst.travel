import { Ticket } from './Ticket';
export declare class TicketIssue {
    id: string;
    ticket: Ticket;
    ticketId: string;
    issueNumber: number;
    title: string;
    description: string | null;
    priority: string;
    stage: string;
    assigneeId: string | null;
    createdById: string | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=TicketIssue.d.ts.map