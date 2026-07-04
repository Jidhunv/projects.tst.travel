import { Router } from 'express';
import ExpenseController from '../controllers/expense.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => ExpenseController.list(req, res, next));
router.post('/', (req, res, next) => ExpenseController.create(req, res, next));
router.patch('/:id', (req, res, next) => ExpenseController.update(req, res, next));
router.post('/:id/decision', (req, res, next) => ExpenseController.decide(req, res, next));
router.delete('/:id', (req, res, next) => ExpenseController.remove(req, res, next));

export default router;
