import { Response, NextFunction } from 'express';
import { ILike } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Supplier } from '../models/Supplier';
import { AuthRequest, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import pick from '../utils/pick';
import logger from '../utils/logger';

const repo = () => AppDataSource.getRepository(Supplier);

// createdById and timestamps are system-managed and must not be client-settable.
const SUPPLIER_UPDATABLE = ['name', 'contactPerson', 'email', 'phoneNumber', 'category', 'region', 'country', 'notes'] as const;

export class SupplierController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'suppliers', 'read')) {
        throw new AppError(403, 'You do not have permission to view suppliers');
      }
      const { search, region, country, category } = req.query;
      const where: any = {};
      if (region) where.region = ILike(`%${region}%`);
      if (country) where.country = ILike(`%${country}%`);
      if (category) where.category = ILike(`%${category}%`);
      if (search) where.name = ILike(`%${search}%`);

      const data = await repo().find({ where, order: { name: 'ASC' } });
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'suppliers', 'create')) {
        throw new AppError(403, 'You do not have permission to create suppliers');
      }
      const { name, contactPerson, email, phoneNumber, category, region, country, notes } = req.body;
      if (!name) throw new AppError(400, 'Supplier name is required');

      const supplier = repo().create({
        name,
        contactPerson,
        email,
        phoneNumber,
        category,
        region,
        country,
        notes,
        createdById: req.user!.id,
      });
      await repo().save(supplier);
      logger.info(`Supplier created: ${supplier.name} by ${req.user!.email}`);
      return res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'suppliers', 'update')) {
        throw new AppError(403, 'You do not have permission to update suppliers');
      }
      const supplier = await repo().findOne({ where: { id: req.params.id } });
      if (!supplier) throw new AppError(404, 'Supplier not found');
      // Whitelist to prevent mass assignment (e.g. forging createdById).
      Object.assign(supplier, pick(req.body, SUPPLIER_UPDATABLE));
      await repo().save(supplier);
      return res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'suppliers', 'delete')) {
        throw new AppError(403, 'You do not have permission to delete suppliers');
      }
      const supplier = await repo().findOne({ where: { id: req.params.id } });
      if (!supplier) throw new AppError(404, 'Supplier not found');
      await repo().remove(supplier);
      return res.json({ success: true, data: { message: 'Supplier deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new SupplierController();
