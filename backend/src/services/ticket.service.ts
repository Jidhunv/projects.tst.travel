import { AppDataSource } from '../config/database';
import { Ticket } from '../models/Ticket';
import { AppError } from '../middleware/errorHandler';

class TicketService {
  private repository = AppDataSource.getRepository(Ticket);

  async createTicket(data: Partial<Ticket> & { accountId: string; reporterId: string }) {
    // Auto-generate ticket number
    const ticketCount = await this.repository.count();
    const ticketNumber = `TKT-${String(ticketCount + 1).padStart(6, '0')}`;

    const ticket = this.repository.create({
      ...data,
      ticketNumber,
      account: { id: data.accountId },
      reporter: { id: data.reporterId },
      responseDeadline: data.slaResponseHours
        ? new Date(Date.now() + data.slaResponseHours * 3600000)
        : undefined,
      resolutionDeadline: data.slaResolutionHours
        ? new Date(Date.now() + data.slaResolutionHours * 3600000)
        : undefined,
    });

    return await this.repository.save(ticket);
  }

  async getTickets(filters: {
    page?: number;
    limit?: number;
    accountId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.account', 'account')
      .leftJoinAndSelect('ticket.reporter', 'reporter')
      .leftJoinAndSelect('ticket.assignee', 'assignee');

    if (filters.accountId) {
      query.andWhere('ticket.accountId = :accountId', { accountId: filters.accountId });
    }
    if (filters.assigneeId) {
      query.andWhere('ticket.assigneeId = :assigneeId', { assigneeId: filters.assigneeId });
    }
    if (filters.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }
    if (filters.priority) {
      query.andWhere('ticket.priority = :priority', { priority: filters.priority });
    }

    const [data, total] = await query
      .orderBy('ticket.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getTicketById(id: string) {
    const ticket = await this.repository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.account', 'account')
      .leftJoinAndSelect('ticket.reporter', 'reporter')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .where('ticket.id = :id', { id })
      .getOne();

    if (!ticket) {
      throw new AppError(404, 'Ticket not found');
    }

    return ticket;
  }

  async updateTicket(id: string, data: Partial<Ticket>) {
    const ticket = await this.getTicketById(id);

    if (data.status === 'Resolved' && !ticket.resolvedAt) {
      data.resolvedAt = new Date();
    }

    if (data.status === 'In Progress' && !ticket.respondedAt) {
      data.respondedAt = new Date();
    }

    Object.assign(ticket, data);
    return await this.repository.save(ticket);
  }

  async assignTicket(id: string, assigneeIds: string[]) {
    // First id is the primary assignee; all ids are stored for multi-assign.
    return await this.updateTicket(id, {
      assignee: { id: assigneeIds[0] } as any,
      assigneeIds,
    } as any);
  }

  async resolveTicket(id: string, resolutionNotes: string) {
    return await this.updateTicket(id, {
      status: 'Resolved',
      resolvedAt: new Date(),
      resolutionNotes,
    });
  }

  async closeTicket(id: string) {
    return await this.updateTicket(id, { status: 'Closed' });
  }

  async deleteTicket(id: string) {
    const ticket = await this.getTicketById(id);
    await this.repository.remove(ticket);
  }
}

export default new TicketService();
