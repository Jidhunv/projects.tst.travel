import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class QuestionMasterController {
    list(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: QuestionMasterController;
export default _default;
//# sourceMappingURL=questionMaster.controller.d.ts.map