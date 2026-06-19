import { Response, NextFunction } from 'express';
import contractService from '../services/contract.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class ContractController {
  async createContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { contractNumber, title, type, value, startDate, endDate, accountId, opportunityId, paymentTerms, slaTerms, remarks } = req.body;

      if (!contractNumber || !title || !type || !value || !startDate || !endDate || !accountId) {
        throw new AppError(400, 'Required fields: contractNumber, title, type, value, startDate, endDate, accountId');
      }

      const contract = await contractService.createContract({
        contractNumber,
        title,
        type,
        value: Number(value),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        accountId,
        opportunityId,
        paymentTerms,
        slaTerms,
        remarks,
        createdById: req.user?.id,
      });

      logger.info(`Contract created: ${contract.contractNumber} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  }

  async getContracts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, accountId, status, search } = req.query;
      const { data, total } = await contractService.getContracts({
        page: Number(page),
        limit: Number(limit),
        accountId: accountId as string,
        status: status as string,
        search: search as string,
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

  async getContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const contract = await contractService.getContractById(req.params.id);
      return res.json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  }

  async updateContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const contract = await contractService.updateContract(req.params.id, req.body);
      logger.info(`Contract updated: ${contract.id} by ${req.user?.email}`);
      return res.json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  }

  async approveContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const contract = await contractService.approveContract(req.params.id, req.user?.email || 'Unknown');
      logger.info(`Contract approved: ${contract.id} by ${req.user?.email}`);
      return res.json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  }

  async deleteContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await contractService.deleteContract(req.params.id);
      logger.info(`Contract deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Contract deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new ContractController();
