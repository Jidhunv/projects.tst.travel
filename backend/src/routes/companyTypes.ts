import { Router } from 'express';
import CompanyTypeController from '../controllers/companyType.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => CompanyTypeController.list(req, res, next));
router.post('/', (req, res, next) => CompanyTypeController.create(req, res, next));
router.patch('/:id', (req, res, next) => CompanyTypeController.update(req, res, next));
router.delete('/:id', (req, res, next) => CompanyTypeController.remove(req, res, next));

export default router;
