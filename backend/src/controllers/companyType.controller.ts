import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { CompanyType } from '../models/CompanyType';
import { Account } from '../models/Account';
import { AuthRequest, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import InputValidator from '../utils/inputValidator';
import logger from '../utils/logger';

const repo = () => AppDataSource.getRepository(CompanyType);

export class CompanyTypeController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Reference/master data for dropdowns - any authenticated user may read.
      const { isActive } = req.query;
      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const data = await repo().find({ where, order: { name: 'ASC' } });
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'company_types', 'create')) {
        throw new AppError(403, 'You do not have permission to create company types');
      }

      const { name } = req.body;
      const nameCheck = InputValidator.validateString(name, 'Company type name', 1, 255);
      if (!nameCheck.valid) {
        throw new AppError(400, nameCheck.errors.join(', '));
      }

      if (await repo().findOne({ where: { name } })) {
        throw new AppError(409, `Company type "${name}" already exists`);
      }

      const companyType = repo().create({ name, isActive: true });
      await repo().save(companyType);

      logger.info(`Company type created: ${companyType.name} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: companyType });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'company_types', 'update')) {
        throw new AppError(403, 'You do not have permission to update company types');
      }

      const companyType = await repo().findOne({ where: { id: req.params.id } });
      if (!companyType) throw new AppError(404, 'Company type not found');

      const { name, isActive } = req.body;
      if (name !== undefined) {
        const nameCheck = InputValidator.validateString(name, 'Company type name', 1, 255);
        if (!nameCheck.valid) throw new AppError(400, nameCheck.errors.join(', '));

        const clash = await repo().findOne({ where: { name } });
        if (clash && clash.id !== companyType.id) {
          throw new AppError(409, `Company type "${name}" already exists`);
        }
        companyType.name = name;
      }
      if (isActive !== undefined) companyType.isActive = Boolean(isActive);

      await repo().save(companyType);
      logger.info(`Company type updated: ${companyType.id} by ${req.user?.email}`);
      return res.json({ success: true, data: companyType });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'company_types', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete company types');
      }

      const companyType = await repo().findOne({ where: { id: req.params.id } });
      if (!companyType) throw new AppError(404, 'Company type not found');

      const inUse = await AppDataSource.getRepository(Account).count({
        where: { companyTypeId: companyType.id },
      });
      if (inUse > 0) {
        companyType.isActive = false;
        await repo().save(companyType);
        logger.info(`Company type deactivated (in use by ${inUse}): ${companyType.id}`);
        return res.json({
          success: true,
          data: { message: `Company type is used by ${inUse} account(s), so it was deactivated rather than deleted.` },
        });
      }

      await repo().remove(companyType);
      logger.info(`Company type deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Company type deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new CompanyTypeController();
