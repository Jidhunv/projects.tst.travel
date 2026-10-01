import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ProductController {
    createProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    updateProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    deleteProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: ProductController;
export default _default;
//# sourceMappingURL=product.controller.d.ts.map