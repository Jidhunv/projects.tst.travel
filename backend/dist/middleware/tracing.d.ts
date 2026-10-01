import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export interface TracedRequest extends AuthRequest {
    traceId: string;
}
export declare function tracingMiddleware(req: TracedRequest, res: Response, next: NextFunction): void;
export declare function withTracing(traceId: string, operation: string, fn: (spanId: string) => Promise<any>): () => Promise<any>;
//# sourceMappingURL=tracing.d.ts.map