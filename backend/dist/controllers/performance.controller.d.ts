import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class PerformanceController {
    overview(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    listTargets(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    private parseTarget;
    createTarget(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateTarget(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteTarget(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    listDefinitions(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    private parseDefinition;
    createDefinition(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateDefinition(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteDefinition(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    listEntries(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    private loadDefForWrite;
    private checkAccount;
    createEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    kpiSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    listProjections(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    saveProjection(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteProjection(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    auditTrail(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    meetingReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
declare const _default: PerformanceController;
export default _default;
//# sourceMappingURL=performance.controller.d.ts.map