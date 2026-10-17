import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class IssueController {
    workflow(_req: AuthRequest, res: Response): Promise<void>;
    clients(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    list(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    slaReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    move(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    history(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: IssueController;
export default _default;
//# sourceMappingURL=issue.controller.d.ts.map