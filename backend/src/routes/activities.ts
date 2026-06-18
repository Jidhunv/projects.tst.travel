import { Router } from 'express';
import ActivityController from '../controllers/activity.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

// Activities / follow-ups
router.post('/', (req, res, next) => ActivityController.createActivity(req, res, next));
router.get('/', (req, res, next) => ActivityController.getActivities(req, res, next));
router.get('/my-followups', (req, res, next) =>
  ActivityController.getMyFollowUps(req, res, next)
);
router.patch('/:id/complete', (req, res, next) =>
  ActivityController.completeActivity(req, res, next)
);
router.delete('/:id', (req, res, next) => ActivityController.deleteActivity(req, res, next));

// Notes / remarks / feedback
router.post('/notes', (req, res, next) => ActivityController.createNote(req, res, next));
router.get('/notes', (req, res, next) => ActivityController.getNotes(req, res, next));
router.delete('/notes/:id', (req, res, next) => ActivityController.deleteNote(req, res, next));

export default router;
