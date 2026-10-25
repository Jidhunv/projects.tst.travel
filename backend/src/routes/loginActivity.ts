import { Router } from 'express';
import LoginActivityController from '../controllers/loginActivity.controller';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Who logged in, from where, and when is sensitive - Admin only, like the audit log.
router.use(verifyToken);
router.use(requireRole('Admin'));

router.get('/', (req, res, next) => LoginActivityController.list(req, res, next));

export default router;
