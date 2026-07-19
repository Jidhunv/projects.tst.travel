import { Response, NextFunction } from 'express';
import ticketService from '../services/ticket.service';
import { AuthRequest, canReassign, canPerformAction, getOwnerScope, assertOwnsViaAccount } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import pick from '../utils/pick';
import logger from '../utils/logger';

// resolvedAt/respondedAt are SLA timestamps stamped by the service -- letting
// a client set them allowed SLA compliance to be forged. ticketNumber is
// generated, reporterId fixed at creation, assignees set by /assign, and
// attachmentPaths by the upload route.
const TICKET_UPDATABLE = [
  'title',
  'description',
  'priority',
  'status',
  'category',
  'moduleType',
  'source',
  'accountId',
  'contactId',
  'productId',
  'resolutionNotes',
  'slaResponseHours',
  'slaResolutionHours',
] as const;

export class TicketController {

  async createTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tickets', 'create')) {
        throw new AppError(403, 'You do not have permission to create tickets');
      }

      const { title, description, priority, category, accountId, contactId, productId, moduleType, slaResponseHours, slaResolutionHours } = req.body;

      if (!title || !description || !accountId) {
        throw new AppError(400, 'Required fields: title, description, accountId');
      }

      const ticketData: any = {
        title,
        description,
        priority: priority || 'Medium',
        category,
        accountId,
        productId,
        moduleType,
        reporterId: req.user?.id || '',
        slaResponseHours,
        slaResolutionHours,
      };

      if (contactId) {
        ticketData.contact = { id: contactId };
      }

      const ticket = await ticketService.createTicket(ticketData);

      logger.info(`Ticket created: ${ticket.ticketNumber} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async uploadAttachment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file;
      if (!file) {
        throw new AppError(400, 'No file uploaded');
      }

      const ticketId = req.params.id;
      const filePath = file.path;

      if (!canPerformAction(req.user, 'tickets', 'update')) {
        throw new AppError(403, 'You do not have permission to attach files to tickets');
      }
      const record = await ticketService.getTicketById(ticketId);
      assertOwnsViaAccount(req.user, 'tickets', 'attach files to', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);

      const ticket = await ticketService.addAttachment(ticketId, filePath);

      logger.info(`Attachment added to ticket ${ticketId} by ${req.user?.email}`);
      return res.json({ success: true, data: ticket, path: filePath });
    } catch (error) {
      next(error);
    }
  }

  async getTickets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tickets', 'read')) {
        throw new AppError(403, 'You do not have permission to view tickets');
      }

      const { page = 1, limit = 20, accountId, assigneeId, status, priority } = req.query;
      const { data, total } = await ticketService.getTickets({
        page: Number(page),
        limit: Number(limit),
        accountId: accountId as string,
        assigneeId: assigneeId as string,
        status: status as string,
        priority: priority as string,
        // undefined at "all" scope; the user's id at "self" scope.
        scopeUserId: getOwnerScope(req.user, 'tickets'),
      });

      return res.json({
        success: true,
        data,
        meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tickets', 'read')) {
        throw new AppError(403, 'You do not have permission to view tickets');
      }
      const ticket = await ticketService.getTicketById(req.params.id);
      assertOwnsViaAccount(req.user, 'tickets', 'view', ticket.account?.ownerId, [ticket.reporter?.id, ticket.assignee?.id, ticket.assigneeIds]);
      return res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async updateTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tickets', 'update')) {
        throw new AppError(403, 'You do not have permission to update tickets');
      }
      const record = await ticketService.getTicketById(req.params.id);
      assertOwnsViaAccount(req.user, 'tickets', 'update', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);

      const ticket = await ticketService.updateTicket(req.params.id, pick(req.body, TICKET_UPDATABLE));
      logger.info(`Ticket updated: ${ticket.id} by ${req.user?.email}`);
      return res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async assignTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canReassign(req.user, 'tickets')) {
        throw new AppError(403, 'You do not have permission to assign tickets');
      }
      const ids: string[] = Array.isArray(req.body.assigneeIds)
        ? req.body.assigneeIds
        : req.body.assigneeId ? [req.body.assigneeId] : [];
      if (!ids.length) {
        throw new AppError(400, 'assigneeIds is required');
      }

      if (!canPerformAction(req.user, 'tickets', 'update')) {
        throw new AppError(403, 'You do not have permission to assign tickets');
      }
      const record = await ticketService.getTicketById(req.params.id);
      assertOwnsViaAccount(req.user, 'tickets', 'assign', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);

      const ticket = await ticketService.assignTicket(req.params.id, ids);
      logger.info(`Ticket assigned: ${ticket.id} to [${ids.join(', ')}] by ${req.user?.email}`);
      return res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async resolveTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { resolutionNotes } = req.body;
      if (!resolutionNotes) {
        throw new AppError(400, 'resolutionNotes is required');
      }

      if (!canPerformAction(req.user, 'tickets', 'update')) {
        throw new AppError(403, 'You do not have permission to resolve tickets');
      }
      const record = await ticketService.getTicketById(req.params.id);
      assertOwnsViaAccount(req.user, 'tickets', 'resolve', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);

      const ticket = await ticketService.resolveTicket(req.params.id, resolutionNotes);
      logger.info(`Ticket resolved: ${ticket.id} by ${req.user?.email}`);
      return res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async closeTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tickets', 'update')) {
        throw new AppError(403, 'You do not have permission to close tickets');
      }
      const record = await ticketService.getTicketById(req.params.id);
      assertOwnsViaAccount(req.user, 'tickets', 'close', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);

      const ticket = await ticketService.closeTicket(req.params.id);
      logger.info(`Ticket closed: ${ticket.id} by ${req.user?.email}`);
      return res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async deleteTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'tickets', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete tickets');
      }
      const record = await ticketService.getTicketById(req.params.id);
      assertOwnsViaAccount(req.user, 'tickets', 'delete', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);

      await ticketService.deleteTicket(req.params.id);
      logger.info(`Ticket deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Ticket deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new TicketController();
