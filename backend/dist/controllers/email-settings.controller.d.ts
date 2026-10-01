import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class EmailSettingsController {
    private emailSettingsRepository;
    getSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    updateSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    testConnection(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    sendTestEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: EmailSettingsController;
export default _default;
//# sourceMappingURL=email-settings.controller.d.ts.map