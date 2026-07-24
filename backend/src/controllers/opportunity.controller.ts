import { Request, Response, NextFunction } from 'express';
import opportunityService from '../services/opportunity.service';
import { AuthRequest, getOwnerScope, canAccessRecord, canPerformAction, canReassign } from '../middleware/auth';
import userService from '../services/user.service';
import { AppError } from '../middleware/errorHandler';
import { REJECTION_REASONS } from '../utils/constants';
import pick from '../utils/pick';
import logger from '../utils/logger';

// ownerId/assigneeIds/accountId/convertedFromLeadId/closedAt and timestamps are
// system-managed; pick() drops them so a raw body cannot reassign or re-parent
// an opportunity or forge close/creation data.
const OPPORTUNITY_UPDATABLE = [
  'name', 'amount', 'stage', 'status', 'description', 'forecastedCloseDate',
  'probability', 'primaryContactId', 'businessVolume', 'supplierList', 'region',
  'country', 'company', 'contactPerson', 'contactEmail', 'contactPhone',
  'jobTitle', 'source', 'remark', 'tags', 'closedReason',
] as const;

// Line-item fields a client may set (addLineItem accepts the same set).
const LINE_ITEM_UPDATABLE = [
  'productId', 'productName', 'quantity', 'unitPrice', 'discount',
  'discountPercent', 'description',
] as const;

export class OpportunityController {
  async createOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if user has permission to create opportunities
      if (!canPerformAction(req.user, 'opportunities', 'create')) {
        throw new AppError(403, 'You do not have permission to create opportunities');
      }

      const {
        name,
        amount,
        stage,
        forecastedCloseDate,
        accountId,
        primaryContactId,
        probability,
      } = req.body;

      if (!name || !amount || !stage || !forecastedCloseDate || !accountId) {
        throw new AppError(
          400,
          'Name, amount, stage, close date, and account are required'
        );
      }

      const opp = await opportunityService.createOpportunity({
        name,
        amount,
        stage,
        forecastedCloseDate: new Date(forecastedCloseDate),
        accountId,
        primaryContactId,
        ownerId: req.user!.id,
        probability,
      });

      logger.info(`Opportunity created: ${opp.name} by ${req.user!.email}`);

      return res.status(201).json({
        success: true,
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOpportunities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, stage, status, ownerId, accountId, search, fromDate, toDate, amountFrom, amountTo, region, country } = req.query;

      // Sales Reps see only their own opportunities; Admin/Manager see all.
      const scope = getOwnerScope(req.user, 'opportunities');
      const effectiveOwnerId = scope ?? (ownerId as string);

      const { data, total } = await opportunityService.getOpportunities({
        page: Number(page),
        limit: Number(limit),
        stage: stage as string,
        status: status as string,
        ownerId: effectiveOwnerId,
        accountId: accountId as string,
        search: search as string,
        fromDate: fromDate as string,
        toDate: toDate as string,
        amountFrom: amountFrom ? Number(amountFrom) : undefined,
        amountTo: amountTo ? Number(amountTo) : undefined,
        region: region as string,
        country: country as string,
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

  async getOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const opp = await opportunityService.getOpportunityById(id);

      if (!canAccessRecord(req.user, 'opportunities', opp.ownerId, 'read', opp.assigneeIds)) {
        throw new AppError(403, 'You can only view your own opportunities');
      }

      return res.json({
        success: true,
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const opp = await opportunityService.getOpportunityById(id);

      if (!canAccessRecord(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
        throw new AppError(403, 'You can only update your own opportunities');
      }

      // Deal Stage Manager can only update stage/probability via dedicated endpoints
      if (req.user?.role === 'Deal Stage Manager') {
        throw new AppError(403, 'Deal Stage Manager can only update stage via /stage endpoint');
      }

      // Check if user has permission to update opportunities
      if (!canPerformAction(req.user, 'opportunities', 'update')) {
        throw new AppError(403, 'You do not have permission to update opportunities');
      }

      // Whitelist to prevent mass assignment (ownerId, assigneeIds, timestamps).
      const updates = pick(req.body, OPPORTUNITY_UPDATABLE);
      const updatedOpp = await opportunityService.updateOpportunity(id, updates);

      logger.info(`Opportunity updated: ${updatedOpp.id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: updatedOpp,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { stage } = req.body;

      if (!stage) {
        throw new AppError(400, 'Stage is required');
      }

      const opp = await opportunityService.getOpportunityById(id);

      if (!canAccessRecord(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
        throw new AppError(403, 'You can only update your own opportunities');
      }

      const updatedOpp = await opportunityService.updateStage(id, stage);

      logger.info(`Opportunity stage updated to ${stage}: ${updatedOpp.id}`);

      return res.json({
        success: true,
        data: updatedOpp,
      });
    } catch (error) {
      next(error);
    }
  }

  async closeOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { outcome, rejectionReason } = req.body;

      if (!outcome || !['Won', 'Lost'].includes(outcome)) {
        throw new AppError(400, 'outcome must be Won or Lost');
      }

      // When a deal is Lost, require a rejection reason from the fixed list.
      if (outcome === 'Lost') {
        if (!rejectionReason || !REJECTION_REASONS.includes(rejectionReason)) {
          throw new AppError(
            400,
            `A rejection reason is required when losing a deal. Allowed: ${REJECTION_REASONS.join(', ')}`
          );
        }
      }

      const opp = await opportunityService.getOpportunityById(id);

      if (!canAccessRecord(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
        throw new AppError(403, 'You can only close your own opportunities');
      }

      const closedOpp = await opportunityService.closeOpportunity(id, outcome, rejectionReason);

      logger.info(`Opportunity closed as ${outcome}: ${closedOpp.id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: closedOpp,
      });
    } catch (error) {
      next(error);
    }
  }

  // Expose the fixed rejection-reason list for dropdowns in the UI.
  async getRejectionReasons(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      return res.json({ success: true, data: REJECTION_REASONS });
    } catch (error) {
      next(error);
    }
  }

  // Assign an opportunity to one or more users (Admin/Manager only).
  async assignOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canReassign(req.user, 'opportunities')) {
        throw new AppError(403, 'You do not have permission to reassign opportunities');
      }
      const ids: string[] = Array.isArray(req.body.ownerIds)
        ? req.body.ownerIds
        : req.body.ownerId ? [req.body.ownerId] : [];
      if (!ids.length) throw new AppError(400, 'ownerIds is required');
      for (const id of ids) await userService.getUserById(id);
      const opp = await opportunityService.updateOpportunity(req.params.id, { ownerId: ids[0], assigneeIds: ids } as any);
      logger.info(`Opportunity ${opp.id} assigned to [${ids.join(', ')}] by ${req.user!.email}`);
      return res.json({ success: true, data: opp });
    } catch (error) {
      next(error);
    }
  }

  async deleteOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const opp = await opportunityService.getOpportunityById(id);

      if (!canAccessRecord(req.user, 'opportunities', opp.ownerId, 'delete', opp.assigneeIds)) {
        throw new AppError(403, 'You can only delete your own opportunities');
      }

      await opportunityService.deleteOpportunity(id);

      logger.info(`Opportunity deleted: ${id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: { message: 'Opportunity deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  // Line items belong to an opportunity and inherit its ownership. Every line
  // item operation must verify the caller may update the parent opportunity,
  // otherwise a user can mutate line items on opportunities they do not own
  // (IDOR) simply by passing another opportunity's id.
  private async assertCanEditOpportunity(req: AuthRequest, opportunityId: string) {
    if (!canPerformAction(req.user, 'opportunities', 'update')) {
      throw new AppError(403, 'You do not have permission to update opportunities');
    }
    const opp = await opportunityService.getOpportunityById(opportunityId);
    if (!canAccessRecord(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
      throw new AppError(403, 'You can only modify your own opportunities');
    }
  }

  async addLineItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { opportunityId } = req.params;
      await this.assertCanEditOpportunity(req, opportunityId);
      const { productId, productName, quantity, unitPrice, discount, discountPercent, description } =
        req.body;

      if (!productName || !quantity || !unitPrice) {
        throw new AppError(400, 'Product name, quantity, and unit price are required');
      }

      const lineItem = await opportunityService.addLineItem(opportunityId, {
        productId,
        productName,
        quantity,
        unitPrice,
        discount,
        discountPercent,
        description,
      });

      logger.info(
        `Line item added to opportunity ${opportunityId}: ${productName}`
      );

      return res.status(201).json({
        success: true,
        data: lineItem,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLineItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { opportunityId, lineItemId } = req.params;
      await this.assertCanEditOpportunity(req, opportunityId);
      const updates = pick(req.body, LINE_ITEM_UPDATABLE);

      const lineItem = await opportunityService.updateLineItem(
        opportunityId,
        lineItemId,
        updates
      );

      logger.info(`Line item updated: ${lineItemId}`);

      return res.json({
        success: true,
        data: lineItem,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteLineItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { opportunityId, lineItemId } = req.params;
      await this.assertCanEditOpportunity(req, opportunityId);
      await opportunityService.deleteLineItem(opportunityId, lineItemId);

      logger.info(`Line item deleted: ${lineItemId}`);

      return res.json({
        success: true,
        data: { message: 'Line item deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPipeline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ownerId, accountId } = req.query;

      // Self-scoped users only see their own pipeline; the query param cannot
      // widen that. Admin/Manager (all scope) may filter by any ownerId.
      const scope = getOwnerScope(req.user, 'opportunities');
      const effectiveOwnerId = scope ?? (ownerId as string);

      const pipeline = await opportunityService.getPipeline({
        ownerId: effectiveOwnerId,
        accountId: accountId as string,
      });

      return res.json({
        success: true,
        data: pipeline,
      });
    } catch (error) {
      next(error);
    }
  }

  async getForecast(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ownerId } = req.query;

      // Self-scoped users only see their own forecast.
      const scope = getOwnerScope(req.user, 'opportunities');
      const effectiveOwnerId = scope ?? (ownerId as string);

      const forecast = await opportunityService.getForecast(effectiveOwnerId);

      return res.json({
        success: true,
        data: forecast,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new OpportunityController();
