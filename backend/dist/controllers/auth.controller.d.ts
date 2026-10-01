import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class AuthController {
    login(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    logout(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    passwordReset(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    passwordResetConfirm(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    changePasswordOnFirstLogin(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    setUserPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
declare const _default: AuthController;
export default _default;
//# sourceMappingURL=auth.controller.d.ts.map