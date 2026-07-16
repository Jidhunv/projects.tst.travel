import { Response, NextFunction } from 'express';
import ticketService from '../services/ticket.service';
import { AuthRequest, canReassign, canPerformAction, getOwnerScope } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class TicketController {
  // A Ticket has no owner column; it inherits ownership from its account. At
  // "self" scope a user may only touch tickets for an account they own, or that
  // they reported or are assigned to (including multi-assign).
  private async assertCanAccess(
    req: AuthRequest,
    ticket: {
      account?: { ownerId?: string };
      reporter?: { id?: string };
      assignee?: { id?: string };
      assigneeIds?: string[];
    },
    action: string
  ) {
    if (getOwnerScope(req.user, 'tickets') === undefined) return; // "all" scope
    const me = req.user!.id;
    const mine =
      ticket.account?.ownerId === me ||
      ticket.reporter?.id === me ||
      ticket.assignee?.id === me ||
      (Array.isArray(ticket.assigneeIds) && ticket.assigneeIds.includes(me));
    if (!mine) {
      throw new AppError(403, `You can only ${action} tickets for your own accounts`);
    }
  }

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
      await this.assertCanAccess(req, await ticketService.getTicketById(ticketId), 'attach files to');

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
      await this.assertCanAccess(req, ticket, 'view');
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
      await this.assertCanAccess(req, await ticketService.getTicketById(req.params.id), 'update');

      const ticket = await ticketService.updateTicket(req.params.id, req.body);
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
      await this.assertCanAccess(req, await ticketService.getTicketById(req.params.id), 'assign');

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
      await this.assertCanAccess(req, await ticketService.getTicketById(req.params.id), 'resolve');

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
      await this.assertCanAccess(req, await ticketService.getTicketById(req.params.id), 'close');

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
      await this.assertCanAccess(req, await ticketService.getTicketById(req.params.id), 'delete');

      await ticketService.deleteTicket(req.params.id);
      logger.info(`Ticket deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Ticket deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new TicketController();
