import { Router } from 'express';
import SalesVisitController from '../controllers/salesVisit.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => SalesVisitController.list(req, res, next));
router.post('/', (req, res, next) => SalesVisitController.create(req, res, next));
router.patch('/:id', (req, res, next) => SalesVisitController.update(req, res, next));
router.delete('/:id', (req, res, next) => SalesVisitController.remove(req, res, next));

export default router;
