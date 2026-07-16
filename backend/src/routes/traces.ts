import { Router, Request, Response, NextFunction } from 'express';
import TraceController from '../controllers/trace.controller';
import { TracedRequest } from '../middleware/tracing';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Traces expose an inventory of every endpoint called, with query strings and
// timings. That was previously readable by anyone with the URL ("don't require
// auth (for debugging)"), which is unauthenticated information disclosure.
// It is a debugging tool, so restrict it to authenticated admins.
router.use(verifyToken);
router.use(requireRole('Admin'));

router.get('/', (req: any, res, next) =>
  TraceController.getTraceList(req as TracedRequest, res)
);
router.get('/:traceId', (req: any, res, next) =>
  TraceController.getTrace(req as TracedRequest, res)
);
router.get('/:traceId/view', (req: any, res, next) =>
  TraceController.getTraceVisualization(req as TracedRequest, res)
);
router.get('/:traceId/dot', (req: any, res, next) =>
  TraceController.getTraceDot(req as TracedRequest, res)
);

export default router;
