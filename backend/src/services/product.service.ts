import { AppDataSource } from '../config/database';
import { Product } from '../models/Product';
import { AppError } from '../middleware/errorHandler';

interface ProductFilters {
  categoryId?: string;
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
    categoryId?: string;
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
      name: data.name,
      sku: data.sku,
      description: data.description,
      categoryId: data.categoryId,
      unitPrice: data.unitPrice ?? 0,
      billingType: data.billingType || 'one-time',
      isActive: true,
    });

    return await this.productRepository.save(product);
  }

  async getProductById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!product) {
      throw new AppError(404, 'Product not found');
    }
    return product;
  }

  async getProducts(filters: ProductFilters = {}): Promise<{ data: Product[]; total: number }> {
    const { page = 1, limit = 20, search, ...where } = filters;
    const skip = (page - 1) * limit;

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    if (search) {
      query.where('(product.name ILIKE :search OR product.sku ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (where.categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId: where.categoryId });
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
    // Ensure it exists (throws 404 otherwise).
    await this.getProductById(id);

    // Column-level update. getProductById eager-loads the `category` relation,
    // and save() gives a loaded relation precedence over its FK column -- so
    // assigning only categoryId would be silently overwritten by the stale
    // relation. update() writes exactly the columns given.
    await this.productRepository.update(id, data);

    return await this.getProductById(id);
  }

  async deleteProduct(id: string): Promise<void> {
    // Soft-deactivate rather than hard delete, so historical line items stay valid.
    const product = await this.getProductById(id);
    product.isActive = false;
    await this.productRepository.save(product);
  }
}

export default new ProductService();
