import { Router } from 'express';
import SalesActivityController from '../controllers/salesActivity.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/summary', (req, res, next) => SalesActivityController.getSummary(req, res, next));
router.get('/options', (req, res, next) => SalesActivityController.getOptions(req, res, next));

export default router;
