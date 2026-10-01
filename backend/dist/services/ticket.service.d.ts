import { Ticket } from '../models/Ticket';
declare class TicketService {
    private repository;
    createTicket(data: Partial<Ticket> & {
        accountId: string;
        reporterId: string;
    }): Promise<Ticket>;
    getTickets(filters: {
        page?: number;
        limit?: number;
        accountId?: string;
        assigneeId?: string;
        status?: string;
        priority?: string;
        scopeUserId?: string;
    }): Promise<{
        data: Ticket[];
        total: number;
    }>;
    getTicketById(id: string): Promise<Ticket>;
    updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket>;
    assignTicket(id: string, assigneeIds: string[]): Promise<Ticket>;
    resolveTicket(id: string, resolutionNotes: string): Promise<Ticket>;
    closeTicket(id: string): Promise<Ticket>;
    deleteTicket(id: string): Promise<void>;
    addAttachment(id: string, filePath: string): Promise<Ticket>;
}
declare const _default: TicketService;
export default _default;
//# sourceMappingURL=ticket.service.d.ts.map