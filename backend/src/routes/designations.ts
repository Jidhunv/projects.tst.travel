import { Router } from 'express';
import DesignationController from '../controllers/designation.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => DesignationController.list(req, res, next));
router.post('/', (req, res, next) => DesignationController.create(req, res, next));
router.patch('/:id', (req, res, next) => DesignationController.update(req, res, next));
router.delete('/:id', (req, res, next) => DesignationController.remove(req, res, next));

export default router;
