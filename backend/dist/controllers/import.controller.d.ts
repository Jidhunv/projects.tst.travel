import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ImportController {
    previewMidtImport(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    saveMidtImport(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: ImportController;
export default _default;
//# sourceMappingURL=import.controller.d.ts.map