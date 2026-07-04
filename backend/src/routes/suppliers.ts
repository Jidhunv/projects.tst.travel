import { Router } from 'express';
import SupplierController from '../controllers/supplier.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => SupplierController.list(req, res, next));
router.post('/', (req, res, next) => SupplierController.create(req, res, next));
router.patch('/:id', (req, res, next) => SupplierController.update(req, res, next));
router.delete('/:id', (req, res, next) => SupplierController.remove(req, res, next));

export default router;
