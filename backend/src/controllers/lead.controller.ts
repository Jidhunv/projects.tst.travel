import { Request, Response, NextFunction } from 'express';
import leadService from '../services/lead.service';
import { AuthRequest, getOwnerScope, canAccessRecord, canPerformAction, canReassign } from '../middleware/auth';
import userService from '../services/user.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class LeadController {
  async createLead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if user has permission to create leads
      if (!canPerformAction(req.user, 'leads', 'create')) {
        throw new AppError(403, 'You do not have permission to create leads');
      }

      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        company,
        jobTitle,
        source,
        value,
        expectedCloseDate,
        productId,
        productName,
        productIds,
        productNames,
        remark,
        businessVolume,
        supplierList,
        region,
        country,
      } = req.body;

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
        value: value !== undefined ? Number(value) : undefined,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
        productId,
        productName,
        productIds,
        productNames,
        remark,
        businessVolume: businessVolume !== undefined ? Number(businessVolume) : undefined,
        supplierList: Array.isArray(supplierList) ? supplierList : undefined,
        region,
        country,
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
      const { page = 1, limit = 20, status, source, ownerId, search, fromDate, toDate, region, country } = req.query;

      // Sales Reps are restricted to their own leads; Admin/Manager see all.
      const scope = getOwnerScope(req.user, 'leads');
      const effectiveOwnerId = scope ?? (ownerId as string);

      const { data, total } = await leadService.getLeads(
        {
          page: Number(page),
          limit: Number(limit),
          status: status as string,
          source: source as string,
          ownerId: effectiveOwnerId,
          search: search as string,
          fromDate: fromDate as string,
          toDate: toDate as string,
          region: region as string,
          country: country as string,
        },
        req.traceId
      );

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

      if (!canAccessRecord(req.user, 'leads', lead.ownerId, 'read', lead.assigneeIds)) {
        throw new AppError(403, 'You can only view your own leads');
      }

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
      let updates = req.body;

      const lead = await leadService.getLeadById(id);

      if (!canAccessRecord(req.user, 'leads', lead.ownerId, 'update', lead.assigneeIds)) {
        throw new AppError(403, 'You can only update your own leads');
      }

      // Deal Stage Manager can only update status via dedicated endpoint
      if (req.user?.role === 'Deal Stage Manager') {
        throw new AppError(403, 'Deal Stage Manager can only update status via /status endpoint');
      }

      // Check if user has permission to update leads
      if (!canPerformAction(req.user, 'leads', 'update')) {
        throw new AppError(403, 'You do not have permission to update leads');
      }

      const updatedLead = await leadService.updateLead(id, updates);

      logger.info(`Lead updated: ${updatedLead.id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: updatedLead,
      });
    } catch (error) {
      next(error);
    }
  }

  // Assign a lead to one or more users (Admin/Manager only). The first id
  // becomes the primary owner; all ids are stored as assignees.
  async assignLead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canReassign(req.user, 'leads')) {
        throw new AppError(403, 'You do not have permission to reassign leads');
      }
      const ids: string[] = Array.isArray(req.body.ownerIds)
        ? req.body.ownerIds
        : req.body.ownerId ? [req.body.ownerId] : [];
      if (!ids.length) throw new AppError(400, 'ownerIds is required');
      for (const id of ids) await userService.getUserById(id); // 404 if any is invalid
      const lead = await leadService.updateLead(req.params.id, { ownerId: ids[0], assigneeIds: ids } as any);
      logger.info(`Lead ${lead.id} assigned to [${ids.join(', ')}] by ${req.user!.email}`);
      return res.json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }

  async deleteLead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const lead = await leadService.getLeadById(id);

      if (!canAccessRecord(req.user, 'leads', lead.ownerId, 'delete', lead.assigneeIds)) {
        throw new AppError(403, 'You can only delete your own leads');
      }

      // Check if user has permission to delete leads
      if (!canPerformAction(req.user, 'leads', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete leads');
      }

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

      const lead = await leadService.getLeadById(id);

      if (!canAccessRecord(req.user, 'leads', lead.ownerId, 'update', lead.assigneeIds)) {
        throw new AppError(403, 'You can only update your own leads');
      }

      const updatedLead = await leadService.updateLeadStatus(id, status);

      logger.info(`Lead status updated to ${status}: ${id}`);

      return res.json({
        success: true,
        data: updatedLead,
      });
    } catch (error) {
      next(error);
    }
  }

  async convertLeadToAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const lead = await leadService.getLeadById(id);

      if (!canAccessRecord(req.user, 'leads', lead.ownerId, 'update', lead.assigneeIds)) {
        throw new AppError(403, 'You can only convert your own leads');
      }

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

  async convertToOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const opportunity = await leadService.convertLeadToOpportunity(id);

      logger.info(
        `Lead ${id} converted to opportunity ${opportunity.id} by ${req.user!.email}`
      );

      return res.status(201).json({
        success: true,
        data: opportunity,
      });
    } catch (error) {
      next(error);
    }
  }

  async markLost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { lostReason } = req.body;

      if (!lostReason) {
        throw new AppError(400, 'lostReason is required');
      }

      const lead = await leadService.markLeadLost(id, lostReason);

      logger.info(`Lead ${id} marked lost (${lostReason}) by ${req.user!.email}`);

      return res.json({
        success: true,
        data: lead,
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
