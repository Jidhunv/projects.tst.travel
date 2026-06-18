import { Router } from 'express';
import ReportController from '../controllers/report.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.get('/pipeline', (req, res, next) =>
  ReportController.getPipelineReport(req, res, next)
);
router.get('/sales', (req, res, next) => ReportController.getSalesReport(req, res, next));
router.get('/mis', (req, res, next) => ReportController.getMIS(req, res, next));

export default router;
