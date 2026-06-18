import { Request, Response, NextFunction } from 'express';
import leadService from '../services/lead.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class LeadController {
  async createLead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, phoneNumber, company, jobTitle, source } =
        req.body;

      if (!firstName || !lastName || !email) {
        throw new AppError(400, 'First name, last name, and email are required');
      }

      const lead = await leadService.createLead({
        firstName,
        lastName,
        email,
        phoneNumber,
        company,
        jobTitle,
        source,
        ownerId: req.user!.id,
      });

      logger.info(`Lead created: ${lead.email} by ${req.user!.email}`);

      return res.status(201).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLeads(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status, source, ownerId, search } = req.query;

      const { data, total } = await leadService.getLeads({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        source: source as string,
        ownerId: ownerId as string,
        search: search as string,
      });

      return res.json({
        success: true,
        data,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getLead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const lead = await leadService.getLeadById(id);

      return res.json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const lead = await leadService.updateLead(id, updates);

      logger.info(`Lead updated: ${lead.id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteLead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await leadService.deleteLead(id);

      logger.info(`Lead deleted: ${id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: { message: 'Lead deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLeadStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        throw new AppError(400, 'Status is required');
      }

      const lead = await leadService.updateLeadStatus(id, status);

      logger.info(`Lead status updated to ${status}: ${id}`);

      return res.json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  }

  async convertLeadToAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const account = await leadService.convertLeadToAccount(id);

      logger.info(`Lead converted to account: ${account.id} by ${req.user!.email}`);

      return res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkImport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { leads } = req.body;

      if (!Array.isArray(leads)) {
        throw new AppError(400, 'Leads must be an array');
      }

      const result = await leadService.bulkImportLeads(leads, req.user!.id);

      logger.info(
        `Bulk import completed: ${result.success} success, ${result.failed} failed by ${req.user!.email}`
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new LeadController();
