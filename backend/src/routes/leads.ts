import { Router } from 'express';
import LeadController from '../controllers/lead.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.post('/', (req, res, next) => LeadController.createLead(req, res, next));
router.get('/', (req, res, next) => LeadController.getLeads(req, res, next));
router.get('/:id', (req, res, next) => LeadController.getLead(req, res, next));
router.patch('/:id', (req, res, next) => LeadController.updateLead(req, res, next));
router.delete('/:id', (req, res, next) => LeadController.deleteLead(req, res, next));
router.patch('/:id/status', (req, res, next) => LeadController.updateLeadStatus(req, res, next));
router.post('/:id/convert-to-account', (req, res, next) =>
  LeadController.convertLeadToAccount(req, res, next)
);
router.post('/:id/convert-to-opportunity', (req, res, next) =>
  LeadController.convertToOpportunity(req, res, next)
);
router.patch('/:id/lost', (req, res, next) => LeadController.markLost(req, res, next));
router.post('/bulk-import', (req, res, next) => LeadController.bulkImport(req, res, next));

export default router;
