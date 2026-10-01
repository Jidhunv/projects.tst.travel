"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Ticket_1 = require("../models/Ticket");
const errorHandler_1 = require("../middleware/errorHandler");
class TicketService {
    constructor() {
        this.repository = database_1.AppDataSource.getRepository(Ticket_1.Ticket);
    }
    async createTicket(data) {
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
    async getTickets(filters) {
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
        if (filters.scopeUserId) {
            query.andWhere('(account.ownerId = :scopeUserId OR ticket.reporterId = :scopeUserId OR ticket.assigneeId = :scopeUserId)', { scopeUserId: filters.scopeUserId });
        }
        const [data, total] = await query
            .orderBy('ticket.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async getTicketById(id) {
        const ticket = await this.repository
            .createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.account', 'account')
            .leftJoinAndSelect('ticket.reporter', 'reporter')
            .leftJoinAndSelect('ticket.assignee', 'assignee')
            .where('ticket.id = :id', { id })
            .getOne();
        if (!ticket) {
            throw new errorHandler_1.AppError(404, 'Ticket not found');
        }
        return ticket;
    }
    async updateTicket(id, data) {
        const ticket = await this.getTicketById(id);
        if (data.status === 'Resolved' && !ticket.resolvedAt) {
            data.resolvedAt = new Date();
        }
        if (data.status === 'In Progress' && !ticket.respondedAt) {
            data.respondedAt = new Date();
        }
        // Column-level update: the getById above eager-loads relations, and save()
        // gives a loaded relation precedence over its FK column -- so changing only
        // the FK would be silently overwritten by the stale relation object.
        // update() writes exactly the columns given.
        await this.repository.update(id, data);
        return await this.getTicketById(id);
    }
    async assignTicket(id, assigneeIds) {
        // First id is the primary assignee; all ids are stored for multi-assign.
        return await this.updateTicket(id, {
            assignee: { id: assigneeIds[0] },
            assigneeIds,
        });
    }
    async resolveTicket(id, resolutionNotes) {
        return await this.updateTicket(id, {
            status: 'Resolved',
            resolvedAt: new Date(),
            resolutionNotes,
        });
    }
    async closeTicket(id) {
        return await this.updateTicket(id, { status: 'Closed' });
    }
    async deleteTicket(id) {
        const ticket = await this.getTicketById(id);
        await this.repository.remove(ticket);
    }
    async addAttachment(id, filePath) {
        const ticket = await this.getTicketById(id);
        ticket.attachmentPaths = ticket.attachmentPaths || [];
        ticket.attachmentPaths.push(filePath);
        return await this.repository.save(ticket);
    }
}
exports.default = new TicketService();
//# sourceMappingURL=ticket.service.js.map