import { Router } from 'express';
import ProductController from '../controllers/product.controller';
import { verifyToken, requireRole } from '../middleware/auth';
import { ROLES } from '../utils/constants';

const router = Router();

router.use(verifyToken);

// Everyone can read the catalog
router.get('/', (req, res, next) => ProductController.getProducts(req, res, next));
router.get('/:id', (req, res, next) => ProductController.getProduct(req, res, next));

// Only Admin/Manager can manage the catalog
router.post('/', requireRole(ROLES.ADMIN, ROLES.MANAGER), (req, res, next) =>
  ProductController.createProduct(req, res, next)
);
router.patch('/:id', requireRole(ROLES.ADMIN, ROLES.MANAGER), (req, res, next) =>
  ProductController.updateProduct(req, res, next)
);
router.delete('/:id', requireRole(ROLES.ADMIN, ROLES.MANAGER), (req, res, next) =>
  ProductController.deleteProduct(req, res, next)
);

export default router;
