import { Router, Request, Response, NextFunction } from 'express';
import TraceController from '../controllers/trace.controller';
import { TracedRequest } from '../middleware/tracing';

const router = Router();

// Tracing endpoints don't require auth (for debugging)
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
