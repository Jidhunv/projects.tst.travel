import { Response, NextFunction } from 'express';
import productService from '../services/product.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import pick from '../utils/pick';
import logger from '../utils/logger';

// Every product column is user-editable.
const PRODUCT_UPDATABLE = [
  'name',
  'sku',
  'description',
  'categoryId',
  'unitPrice',
  'billingType',
  'isActive',
] as const;

export class ProductController {
  async createProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, sku, description, categoryId, unitPrice, billingType } = req.body;

      if (!name) {
        throw new AppError(400, 'Product name is required');
      }

      const product = await productService.createProduct({
        name,
        sku,
        description,
        categoryId,
        unitPrice,
        billingType,
      });

      logger.info(`Product created: ${product.name} by ${req.user!.email}`);

      return res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async getProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, categoryId, isActive, search } = req.query;

      const { data, total } = await productService.getProducts({
        page: Number(page),
        limit: Number(limit),
        categoryId: categoryId as string,
        isActive: isActive === undefined ? undefined : isActive === 'true',
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

  async getProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await productService.getProductById(req.params.id);
      return res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await productService.updateProduct(req.params.id, pick(req.body, PRODUCT_UPDATABLE));
      logger.info(`Product updated: ${product.id} by ${req.user!.email}`);
      return res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await productService.deleteProduct(req.params.id);
      logger.info(`Product deactivated: ${req.params.id} by ${req.user!.email}`);
      return res.json({ success: true, data: { message: 'Product deactivated' } });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductController();
