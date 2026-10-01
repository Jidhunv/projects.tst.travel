"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracingMiddleware = tracingMiddleware;
exports.withTracing = withTracing;
const tracer_1 = require("../utils/tracer");
const trace_service_1 = __importDefault(require("../services/trace.service"));
const logger_1 = __importDefault(require("../utils/logger"));
function tracingMiddleware(req, res, next) {
    const traceId = (0, tracer_1.initTrace)();
    req.traceId = traceId;
    const apiSpan = (0, tracer_1.startSpan)(traceId, `api.${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        query: req.query,
    });
    // Attach traceId to response headers for client debugging
    res.setHeader('X-Trace-ID', traceId);
    res.on('finish', () => {
        (0, tracer_1.endSpan)(traceId, apiSpan.id, {
            statusCode: res.statusCode,
            contentLength: res.get('content-length'),
        });
        // Log trace info and keep for retrieval (development only)
        if (process.env.LOG_LEVEL === 'debug') {
            logger_1.default.debug(`[TRACE ${traceId}] ${req.method} ${req.path} → ${res.statusCode}`);
            trace_service_1.default.saveTrace(traceId);
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
        (0, tracer_1.clearTrace)(traceId);
    });
    next();
}
// Helper for services to attach to current trace
function withTracing(traceId, operation, fn) {
    return async () => {
        const span = (0, tracer_1.startSpan)(traceId, operation);
        try {
            const result = await fn(span.id);
            (0, tracer_1.endSpan)(traceId, span.id, result);
            return result;
        }
        catch (err) {
            (0, tracer_1.endSpan)(traceId, span.id, undefined, err.message);
            throw err;
        }
    };
}
//# sourceMappingURL=tracing.js.map