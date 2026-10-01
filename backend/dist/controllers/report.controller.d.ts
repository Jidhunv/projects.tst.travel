import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ReportController {
    getPipelineReport(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getSalesReport(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getMIS(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    getConversionTimeline(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: ReportController;
export default _default;
//# sourceMappingURL=report.controller.d.ts.map