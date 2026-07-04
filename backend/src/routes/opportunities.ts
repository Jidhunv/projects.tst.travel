import { Router } from 'express';
import OpportunityController from '../controllers/opportunity.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.post('/', (req, res, next) => OpportunityController.createOpportunity(req, res, next));
router.get('/', (req, res, next) => OpportunityController.getOpportunities(req, res, next));
router.get('/:id', (req, res, next) => OpportunityController.getOpportunity(req, res, next));
router.patch('/:id', (req, res, next) =>
  OpportunityController.updateOpportunity(req, res, next)
);
router.delete('/:id', (req, res, next) =>
  OpportunityController.deleteOpportunity(req, res, next)
);
router.patch('/:id/stage', (req, res, next) => OpportunityController.updateStage(req, res, next));
router.patch('/:id/assign', (req, res, next) => OpportunityController.assignOpportunity(req, res, next));
router.post('/:id/close', (req, res, next) =>
  OpportunityController.closeOpportunity(req, res, next)
);

// Line items
router.post('/:opportunityId/line-items', (req, res, next) =>
  OpportunityController.addLineItem(req, res, next)
);
router.patch('/:opportunityId/line-items/:lineItemId', (req, res, next) =>
  OpportunityController.updateLineItem(req, res, next)
);
router.delete('/:opportunityId/line-items/:lineItemId', (req, res, next) =>
  OpportunityController.deleteLineItem(req, res, next)
);

// Fixed rejection-reason list for the "lose deal" dropdown
router.get('/meta/rejection-reasons', (req, res, next) =>
  OpportunityController.getRejectionReasons(req, res, next)
);

// Pipeline and forecasting
router.get('/pipeline/view', (req, res, next) =>
  OpportunityController.getPipeline(req, res, next)
);
router.get('/pipeline/forecast', (req, res, next) =>
  OpportunityController.getForecast(req, res, next)
);

export default router;
