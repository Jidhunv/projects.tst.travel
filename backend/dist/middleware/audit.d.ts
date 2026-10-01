import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare const auditMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=audit.d.ts.map