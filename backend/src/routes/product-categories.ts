import { Router } from 'express';
import ProductCategoryController from '../controllers/product-category.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => ProductCategoryController.list(req, res, next));
router.post('/', (req, res, next) => ProductCategoryController.create(req, res, next));
router.patch('/:id', (req, res, next) => ProductCategoryController.update(req, res, next));
router.delete('/:id', (req, res, next) => ProductCategoryController.remove(req, res, next));

export default router;
