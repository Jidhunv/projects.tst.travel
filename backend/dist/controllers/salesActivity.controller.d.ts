import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class SalesActivityController {
    getSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getOptions(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: SalesActivityController;
export default _default;
//# sourceMappingURL=salesActivity.controller.d.ts.map