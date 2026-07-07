import { Router } from 'express';
import CountryController from '../controllers/country.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

// GET /api/countries - public endpoint, no auth required
router.get('/', (req, res, next) => CountryController.list(req, res, next));

// POST /api/countries - admin only
router.post('/', verifyToken, (req, res, next) => CountryController.create(req, res, next));

export default router;
