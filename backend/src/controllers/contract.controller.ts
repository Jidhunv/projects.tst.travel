import { Response, NextFunction } from 'express';
import contractService from '../services/contract.service';
import { AuthRequest, canPerformAction, getOwnerScope } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class ContractController {
  // A Contract has no owner column; it inherits ownership from its account.
  // At "self" scope a user may only touch contracts for an account they own, or
  // that they created themselves.
  private async assertCanAccess(
    req: AuthRequest,
    contract: { account?: { ownerId?: string }; createdById?: string },
    action: string
  ) {
    if (getOwnerScope(req.user, 'contracts') === undefined) return; // "all" scope
    const mine =
      contract.account?.ownerId === req.user!.id || contract.createdById === req.user!.id;
    if (!mine) {
      throw new AppError(403, `You can only ${action} contracts for your own accounts`);
    }
  }

  async createContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'contracts', 'create')) {
        throw new AppError(403, 'You do not have permission to create contracts');
      }

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
      if (!canPerformAction(req.user, 'contracts', 'read')) {
        throw new AppError(403, 'You do not have permission to view contracts');
      }

      const { page = 1, limit = 20, accountId, status, search } = req.query;
      const { data, total } = await contractService.getContracts({
        page: Number(page),
        limit: Number(limit),
        accountId: accountId as string,
        status: status as string,
        search: search as string,
        // undefined at "all" scope; the user's id at "self" scope.
        scopeUserId: getOwnerScope(req.user, 'contracts'),
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
      if (!canPerformAction(req.user, 'contracts', 'read')) {
        throw new AppError(403, 'You do not have permission to view contracts');
      }
      const contract = await contractService.getContractById(req.params.id);
      await this.assertCanAccess(req, contract, 'view');
      return res.json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  }

  async updateContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'contracts', 'update')) {
        throw new AppError(403, 'You do not have permission to update contracts');
      }
      await this.assertCanAccess(req, await contractService.getContractById(req.params.id), 'update');

      const contract = await contractService.updateContract(req.params.id, req.body);
      logger.info(`Contract updated: ${contract.id} by ${req.user?.email}`);
      return res.json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  }

  async approveContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Approving mutates the contract, so it requires update rights.
      if (!canPerformAction(req.user, 'contracts', 'update')) {
        throw new AppError(403, 'You do not have permission to approve contracts');
      }
      await this.assertCanAccess(req, await contractService.getContractById(req.params.id), 'approve');

      const contract = await contractService.approveContract(req.params.id, req.user?.email || 'Unknown');
      logger.info(`Contract approved: ${contract.id} by ${req.user?.email}`);
      return res.json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  }

  async deleteContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'contracts', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete contracts');
      }
      await this.assertCanAccess(req, await contractService.getContractById(req.params.id), 'delete');

      await contractService.deleteContract(req.params.id);
      logger.info(`Contract deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Contract deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new ContractController();
