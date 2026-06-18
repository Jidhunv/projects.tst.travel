import { Request, Response, NextFunction } from 'express';
import opportunityService from '../services/opportunity.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class OpportunityController {
  async createOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
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
      const { page = 1, limit = 20, stage, status, ownerId, accountId, search } = req.query;

      const { data, total } = await opportunityService.getOpportunities({
        page: Number(page),
        limit: Number(limit),
        stage: stage as string,
        status: status as string,
        ownerId: ownerId as string,
        accountId: accountId as string,
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

  async getOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const opp = await opportunityService.getOpportunityById(id);

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
      const updates = req.body;

      const opp = await opportunityService.updateOpportunity(id, updates);

      logger.info(`Opportunity updated: ${opp.id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: opp,
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

      const opp = await opportunityService.updateStage(id, stage);

      logger.info(`Opportunity stage updated to ${stage}: ${opp.id}`);

      return res.json({
        success: true,
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  async closeOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !['Won', 'Lost'].includes(reason)) {
        throw new AppError(400, 'Reason must be Won or Lost');
      }

      const opp = await opportunityService.closeOpportunity(id, reason);

      logger.info(`Opportunity closed as ${reason}: ${opp.id} by ${req.user!.email}`);

      return res.json({
        success: true,
        data: opp,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
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

  async addLineItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { opportunityId } = req.params;
      const { productName, quantity, unitPrice, discount, discountPercent, description } =
        req.body;

      if (!productName || !quantity || !unitPrice) {
        throw new AppError(400, 'Product name, quantity, and unit price are required');
      }

      const lineItem = await opportunityService.addLineItem(opportunityId, {
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
      const updates = req.body;

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

      const pipeline = await opportunityService.getPipeline({
        ownerId: ownerId as string,
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

      const forecast = await opportunityService.getForecast(ownerId as string);

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
