import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { initTrace, startSpan, endSpan, clearTrace } from '../utils/tracer';
import traceService from '../services/trace.service';
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
      traceService.saveTrace(traceId);
    }

    // initTrace() above has no counterpart without this: every request
    // added an entry to tracer.ts's module-level Map with nothing ever
    // removing it - an unconditional (including production) memory leak.
    // This must live in THIS handler, not a later separate middleware: a
    // route earlier in the stack that sends its own response (which is
    // nearly all of them) ends the middleware chain there, so a save/clear
    // step registered after the routes in app.ts would only ever fire for
    // requests that fall through unmatched. res.on('finish', ...) here
    // fires on actual response completion regardless of what else in the
    // chain ran, since this listener is attached before any route handler
    // gets a chance to respond.
    clearTrace(traceId);
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
