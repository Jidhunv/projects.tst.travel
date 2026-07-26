import { Router } from 'express';
import TeamController from '../controllers/team.controller';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

// Any authenticated user may read the team list (needed for assignment dropdowns).
router.get('/', (req, res, next) => TeamController.list(req, res, next));
router.get('/:id/members', (req, res, next) => TeamController.members(req, res, next));

// Managing teams and membership is Admin-only.
router.post('/', requireRole('Admin'), (req, res, next) => TeamController.create(req, res, next));
router.patch('/:id', requireRole('Admin'), (req, res, next) => TeamController.update(req, res, next));
router.delete('/:id', requireRole('Admin'), (req, res, next) => TeamController.remove(req, res, next));
router.post('/:id/members', requireRole('Admin'), (req, res, next) => TeamController.setUserTeam(req, res, next));

export default router;
