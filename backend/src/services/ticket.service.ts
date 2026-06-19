import { AppDataSource } from '../config/database';
import { Ticket } from '../models/Ticket';
import { AppError } from '../middleware/errorHandler';
import { startSpan } from '../utils/tracer';

class TicketService {
  private repository = AppDataSource.getRepository(Ticket);

  async createTicket(data: Partial<Ticket> & { ticketNumber: string; accountId: string; reporterId: string }) {
    const span = startSpan('ticket.create');
    try {
      const existingTicket = await this.repository.findOne({ where: { ticketNumber: data.ticketNumber } });
      if (existingTicket) {
        throw new AppError(400, 'Ticket number already exists');
      }

      const ticket = this.repository.create({
        ...data,
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
    } finally {
      span.end();
    }
  }

  async getTickets(filters: {
    page?: number;
    limit?: number;
    accountId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
  }) {
    const span = startSpan('ticket.list');
    try {
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
    } finally {
      span.end();
    }
  }

  async getTicketById(id: string) {
    const span = startSpan('ticket.get');
    try {
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
    } finally {
      span.end();
    }
  }

  async updateTicket(id: string, data: Partial<Ticket>) {
    const span = startSpan('ticket.update');
    try {
      const ticket = await this.getTicketById(id);

      if (data.status === 'Resolved' && !ticket.resolvedAt) {
        data.resolvedAt = new Date();
      }

      if (data.status === 'In Progress' && !ticket.respondedAt) {
        data.respondedAt = new Date();
      }

      Object.assign(ticket, data);
      return await this.repository.save(ticket);
    } finally {
      span.end();
    }
  }

  async assignTicket(id: string, assigneeId: string) {
    const span = startSpan('ticket.assign');
    try {
      return await this.updateTicket(id, { assignee: { id: assigneeId } });
    } finally {
      span.end();
    }
  }

  async resolveTicket(id: string, resolutionNotes: string) {
    const span = startSpan('ticket.resolve');
    try {
      return await this.updateTicket(id, {
        status: 'Resolved',
        resolvedAt: new Date(),
        resolutionNotes,
      });
    } finally {
      span.end();
    }
  }

  async closeTicket(id: string) {
    const span = startSpan('ticket.close');
    try {
      return await this.updateTicket(id, { status: 'Closed' });
    } finally {
      span.end();
    }
  }

  async deleteTicket(id: string) {
    const span = startSpan('ticket.delete');
    try {
      const ticket = await this.getTicketById(id);
      await this.repository.remove(ticket);
    } finally {
      span.end();
    }
  }
}

export default new TicketService();
