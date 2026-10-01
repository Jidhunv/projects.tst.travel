import { Request, Response, NextFunction } from 'express';
export declare const loginLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const passwordResetLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const __resetRateLimitStore: () => void;
//# sourceMappingURL=rateLimit.d.ts.map