import { Product } from '../models/Product';
interface ProductFilters {
    categoryId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    search?: string;
}
export declare class ProductService {
    private productRepository;
    createProduct(data: {
        name: string;
        sku?: string;
        description?: string;
        categoryId?: string;
        unitPrice?: number;
        billingType?: string;
    }): Promise<Product>;
    getProductById(id: string): Promise<Product>;
    getProducts(filters?: ProductFilters): Promise<{
        data: Product[];
        total: number;
    }>;
    updateProduct(id: string, data: Partial<Product>): Promise<Product>;
    deleteProduct(id: string): Promise<void>;
}
declare const _default: ProductService;
export default _default;
//# sourceMappingURL=product.service.d.ts.map