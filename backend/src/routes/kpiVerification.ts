import { Router } from 'express';
import KpiVerificationController from '../controllers/kpiVerification.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/days', (req, res, next) => KpiVerificationController.getDays(req, res, next));
router.put('/values', (req, res, next) => KpiVerificationController.saveSupervisorValue(req, res, next));
router.post('/approve', (req, res, next) => KpiVerificationController.approveDay(req, res, next));
router.post('/unlock', (req, res, next) => KpiVerificationController.unlockDay(req, res, next));
router.get('/weights', (req, res, next) => KpiVerificationController.getWeights(req, res, next));
router.get('/targets', (req, res, next) => KpiVerificationController.getTargets(req, res, next));
router.put('/targets', (req, res, next) => KpiVerificationController.saveTarget(req, res, next));
router.put('/weights', (req, res, next) => KpiVerificationController.saveWeights(req, res, next));

export default router;
