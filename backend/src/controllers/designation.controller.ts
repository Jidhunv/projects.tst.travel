import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Designation } from '../models/Designation';
import { AccountStakeholder } from '../models/AccountStakeholder';
import { AuthRequest, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import InputValidator from '../utils/inputValidator';
import logger from '../utils/logger';

const repo = () => AppDataSource.getRepository(Designation);

export class DesignationController {
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
      if (!canPerformAction(req.user, 'designations', 'create')) {
        throw new AppError(403, 'You do not have permission to create designations');
      }

      const { name } = req.body;
      const nameCheck = InputValidator.validateString(name, 'Designation name', 1, 255);
      if (!nameCheck.valid) {
        throw new AppError(400, nameCheck.errors.join(', '));
      }

      if (await repo().findOne({ where: { name } })) {
        throw new AppError(409, `Designation "${name}" already exists`);
      }

      const designation = repo().create({ name, isActive: true });
      await repo().save(designation);

      logger.info(`Designation created: ${designation.name} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: designation });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'designations', 'update')) {
        throw new AppError(403, 'You do not have permission to update designations');
      }

      const designation = await repo().findOne({ where: { id: req.params.id } });
      if (!designation) throw new AppError(404, 'Designation not found');

      const { name, isActive } = req.body;
      if (name !== undefined) {
        const nameCheck = InputValidator.validateString(name, 'Designation name', 1, 255);
        if (!nameCheck.valid) throw new AppError(400, nameCheck.errors.join(', '));

        const clash = await repo().findOne({ where: { name } });
        if (clash && clash.id !== designation.id) {
          throw new AppError(409, `Designation "${name}" already exists`);
        }
        designation.name = name;
      }
      if (isActive !== undefined) designation.isActive = Boolean(isActive);

      await repo().save(designation);
      logger.info(`Designation updated: ${designation.id} by ${req.user?.email}`);
      return res.json({ success: true, data: designation });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'designations', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete designations');
      }

      const designation = await repo().findOne({ where: { id: req.params.id } });
      if (!designation) throw new AppError(404, 'Designation not found');

      const inUse = await AppDataSource.getRepository(AccountStakeholder).count({
        where: { designationId: designation.id },
      });
      if (inUse > 0) {
        designation.isActive = false;
        await repo().save(designation);
        logger.info(`Designation deactivated (in use by ${inUse}): ${designation.id}`);
        return res.json({
          success: true,
          data: { message: `Designation is used by ${inUse} stakeholder mapping(s), so it was deactivated rather than deleted.` },
        });
      }

      await repo().remove(designation);
      logger.info(`Designation deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Designation deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new DesignationController();
