import { Response, NextFunction } from 'express';
import { ILike } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Country } from '../models/Country';
import { AuthRequest, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const repo = () => AppDataSource.getRepository(Country);

export class CountryController {
  async list(req: any, res: Response, next: NextFunction) {
    try {
      // Countries are reference/master data used by dropdowns across the app
      // (Leads form, accounts, etc). Any authenticated user may read them; only
      // create is permission-gated. No per-module read permission is required.
      const { search } = req.query;
      const where: any = {};
      if (search) {
        where.name = ILike(`%${search}%`);
      }

      const data = await repo().find({
        where,
        order: { name: 'ASC' },
      });
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'countries', 'create')) {
        throw new AppError(403, 'You do not have permission to create countries');
      }

      const { code, name, region } = req.body;
      if (!code || !name) {
        throw new AppError(400, 'Country code and name are required');
      }

      const upperCode = code.toUpperCase();
      const existing = await repo().findOne({ where: { code: upperCode } });
      if (existing) {
        throw new AppError(400, `Country with code "${upperCode}" already exists`);
      }

      const country = repo().create({
        code: upperCode,
        name,
        region,
      });
      await repo().save(country);
      logger.info(`Country created: ${country.name} (${country.code})`);
      return res.status(201).json({ success: true, data: country });
    } catch (error) {
      next(error);
    }
  }
}

export default new CountryController();
