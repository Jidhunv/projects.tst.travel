import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ProductCategoryController {
    list(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    remove(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: ProductCategoryController;
export default _default;
//# sourceMappingURL=product-category.controller.d.ts.map