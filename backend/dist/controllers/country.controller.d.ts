import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class CountryController {
    list(req: any, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: CountryController;
export default _default;
//# sourceMappingURL=country.controller.d.ts.map