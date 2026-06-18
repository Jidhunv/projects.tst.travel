import { AppDataSource } from '../config/database';
import { Product } from '../models/Product';
import { AppError } from '../middleware/errorHandler';

interface ProductFilters {
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

export class ProductService {
  private productRepository = AppDataSource.getRepository(Product);

  async createProduct(data: {
    name: string;
    sku?: string;
    description?: string;
    category?: string;
    unitPrice?: number;
    billingType?: string;
  }): Promise<Product> {
    if (data.sku) {
      const existing = await this.productRepository.findOne({ where: { sku: data.sku } });
      if (existing) {
        throw new AppError(409, 'Product with this SKU already exists');
      }
    }

    const product = this.productRepository.create({
      ...data,
      unitPrice: data.unitPrice ?? 0,
      billingType: data.billingType || 'one-time',
      isActive: true,
    });

    return await this.productRepository.save(product);
  }

  async getProductById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new AppError(404, 'Product not found');
    }
    return product;
  }

  async getProducts(filters: ProductFilters = {}): Promise<{ data: Product[]; total: number }> {
    const { page = 1, limit = 20, search, ...where } = filters;
    const skip = (page - 1) * limit;

    const query = this.productRepository.createQueryBuilder('product');

    if (search) {
      query.where('(product.name ILIKE :search OR product.sku ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (where.category) {
      query.andWhere('product.category = :category', { category: where.category });
    }
    if (where.isActive !== undefined) {
      query.andWhere('product.isActive = :isActive', { isActive: where.isActive });
    }

    const [data, total] = await query
      .orderBy('product.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const product = await this.getProductById(id);
    Object.assign(product, data);
    return await this.productRepository.save(product);
  }

  async deleteProduct(id: string): Promise<void> {
    // Soft-deactivate rather than hard delete, so historical line items stay valid.
    const product = await this.getProductById(id);
    product.isActive = false;
    await this.productRepository.save(product);
  }
}

export default new ProductService();
