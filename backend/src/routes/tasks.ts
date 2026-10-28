import { Router } from 'express';
import TaskController from '../controllers/task.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

router.get('/assignees', (req, res, next) => TaskController.assignees(req, res, next));
router.get('/', (req, res, next) => TaskController.list(req, res, next));
router.get('/:id', (req, res, next) => TaskController.get(req, res, next));
router.post('/', (req, res, next) => TaskController.create(req, res, next));
router.patch('/:id', (req, res, next) => TaskController.update(req, res, next));
router.delete('/:id', (req, res, next) => TaskController.remove(req, res, next));
router.get('/:id/followups', (req, res, next) => TaskController.listFollowups(req, res, next));
router.post('/:id/followups', (req, res, next) => TaskController.addFollowup(req, res, next));

export default router;
