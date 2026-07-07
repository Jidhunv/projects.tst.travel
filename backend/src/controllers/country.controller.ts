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
      // Only admins can create countries
      if (!req.user || (req.user as any).role?.name !== 'Admin') {
        throw new AppError(403, 'Only admins can add countries');
      }

      const { code, name, region } = req.body;
      if (!code || !name) {
        throw new AppError(400, 'Country code and name are required');
      }

      const country = repo().create({
        code: code.toUpperCase(),
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
