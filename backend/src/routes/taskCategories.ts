import { Router } from 'express';
import TaskCategoryController from '../controllers/taskCategory.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => TaskCategoryController.list(req, res, next));
router.post('/', (req, res, next) => TaskCategoryController.create(req, res, next));
router.patch('/:id', (req, res, next) => TaskCategoryController.update(req, res, next));
router.delete('/:id', (req, res, next) => TaskCategoryController.remove(req, res, next));

export default router;
