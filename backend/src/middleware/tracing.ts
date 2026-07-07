import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from './auth';
import { initTrace, startSpan, endSpan, clearTrace } from '../utils/tracer';
import logger from '../utils/logger';

export interface TracedRequest extends AuthRequest {
  traceId: string;
}

export function tracingMiddleware(req: TracedRequest, res: Response, next: NextFunction) {
  const traceId = initTrace();
  req.traceId = traceId;

  const apiSpan = startSpan(traceId, `api.${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
  });

  // Attach traceId to response headers for client debugging
  res.setHeader('X-Trace-ID', traceId);

  res.on('finish', () => {
    endSpan(traceId, apiSpan.id, {
      statusCode: res.statusCode,
      contentLength: res.get('content-length'),
    });

    // Log trace info and keep for retrieval (development only)
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug(`[TRACE ${traceId}] ${req.method} ${req.path} → ${res.statusCode}`);
    }
  });

  next();
}

// Helper for services to attach to current trace
export function withTracing(traceId: string, operation: string, fn: (spanId: string) => Promise<any>) {
  return async () => {
    const span = startSpan(traceId, operation);
    try {
      const result = await fn(span.id);
      endSpan(traceId, span.id, result);
      return result;
    } catch (err: any) {
      endSpan(traceId, span.id, undefined, err.message);
      throw err;
    }
  };
}
