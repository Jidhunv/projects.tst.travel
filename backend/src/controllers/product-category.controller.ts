import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { ProductCategory } from '../models/ProductCategory';
import { Product } from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import InputValidator from '../utils/inputValidator';
import logger from '../utils/logger';

const repo = () => AppDataSource.getRepository(ProductCategory);

export class ProductCategoryController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.query;
      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const data = await repo().find({
        where,
        order: { displayOrder: 'ASC', name: 'ASC' },
      });
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, code, displayOrder } = req.body;

      const nameCheck = InputValidator.validateString(name, 'Category name', 1, 100);
      if (!nameCheck.valid) {
        throw new AppError(400, nameCheck.errors.join(', '));
      }

      if (await repo().findOne({ where: { name } })) {
        throw new AppError(409, 'A category with this name already exists');
      }
      if (code && (await repo().findOne({ where: { code } }))) {
        throw new AppError(409, 'A category with this code already exists');
      }

      const category = repo().create({
        name,
        description,
        code: code || undefined,
        displayOrder: displayOrder ? Number(displayOrder) : 0,
        isActive: true,
      });
      await repo().save(category);

      logger.info(`Product category created: ${category.name} by ${req.user?.email}`);
      return res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = await repo().findOne({ where: { id: req.params.id } });
      if (!category) throw new AppError(404, 'Category not found');

      const { name, description, code, displayOrder, isActive } = req.body;

      if (name !== undefined) {
        const nameCheck = InputValidator.validateString(name, 'Category name', 1, 100);
        if (!nameCheck.valid) throw new AppError(400, nameCheck.errors.join(', '));

        const clash = await repo().findOne({ where: { name } });
        if (clash && clash.id !== category.id) {
          throw new AppError(409, 'A category with this name already exists');
        }
        category.name = name;
      }

      if (code !== undefined) {
        if (code) {
          const clash = await repo().findOne({ where: { code } });
          if (clash && clash.id !== category.id) {
            throw new AppError(409, 'A category with this code already exists');
          }
        }
        category.code = code || null as unknown as string;
      }

      if (description !== undefined) category.description = description;
      if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
      if (isActive !== undefined) category.isActive = Boolean(isActive);

      await repo().save(category);
      logger.info(`Product category updated: ${category.id} by ${req.user?.email}`);
      return res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = await repo().findOne({ where: { id: req.params.id } });
      if (!category) throw new AppError(404, 'Category not found');

      // Products reference categories by FK, so removing one that is still in
      // use would orphan those rows. Deactivate instead of deleting, matching
      // how products themselves are retired.
      const inUse = await AppDataSource.getRepository(Product).count({
        where: { categoryId: category.id },
      });
      if (inUse > 0) {
        category.isActive = false;
        await repo().save(category);
        logger.info(`Product category deactivated (in use by ${inUse}): ${category.id}`);
        return res.json({
          success: true,
          data: { message: `Category is used by ${inUse} product(s), so it was deactivated rather than deleted.` },
        });
      }

      await repo().remove(category);
      logger.info(`Product category deleted: ${req.params.id} by ${req.user?.email}`);
      return res.json({ success: true, data: { message: 'Category deleted' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductCategoryController();
