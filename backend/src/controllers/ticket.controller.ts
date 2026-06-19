import { Response, NextFunction } from 'express';
import ticketService from '../services/ticket.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class TicketController {
  async createTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ticketNumber, title, description, priority, category, accountId, contactId, slaResponseHours, slaResolutionHours } = req.body;

      if (!ticketNumber || !title || !description || !accountId) {
        throw new AppError(400, 'Required fields: ticketNumber, title, description, accountId');
      }

      const ticketData: any = {
        ticketNumber,
        title,
        description,
        priority: priority || 'Medium',
        category,
        accountId,
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

  async getTickets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, accountId, assigneeId, status, priority } = req.query;
      const { data, total } = await ticketService.getTickets({
        page: Number(page),
        limit: Number(limit),
        accountId: accountId as string,
        assigneeId: assigneeId as string,
        status: status as string,
        priority: priority as string,
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
      const ticket = await ticketService.getTicketById(req.params.id);
      return res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async updateTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.updateTicket(req.params.id, req.body);
      logger.info(`Ticket updated: ${ticket.id} by ${req.user?.email}`);
      return res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async assignTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { assigneeId } = req.body;
      if (!assigneeId) {
        throw new AppError(400, 'assigneeId is required');
      }

      const ticket = await ticketService.assignTicket(req.params.id, assigneeId);
      logger.info(`Ticket assigned: ${ticket.id} to ${assigneeId} by ${req.user?.email}`);
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

      const ticket = await ticketService.resolveTicket(req.params.id, resolutionNotes);
      logger.info(`Ticket resolved: ${ticket.id} by ${req.user?.email}`);
      return res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async closeTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketService.closeTicket(req.params.id);
      logger.info(`Ticket closed: ${ticket.id} by ${req.user?.email}`);
      return res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async deleteTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await ticketService.deleteTicket(req.params.id);
      logger.info(`Ticket deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Ticket deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new TicketController();
