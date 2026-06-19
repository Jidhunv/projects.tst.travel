import { Router } from 'express';
import ProjectController from '../controllers/project.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.post('/', (req, res, next) => ProjectController.createProject(req, res, next));
router.get('/', (req, res, next) => ProjectController.getProjects(req, res, next));
router.get('/:id', (req, res, next) => ProjectController.getProject(req, res, next));
router.patch('/:id', (req, res, next) => ProjectController.updateProject(req, res, next));
router.delete('/:id', (req, res, next) => ProjectController.deleteProject(req, res, next));

// Milestones
router.post('/:id/milestones', (req, res, next) => ProjectController.addMilestone(req, res, next));
router.get('/:id/milestones', (req, res, next) => ProjectController.getMilestones(req, res, next));
router.patch('/milestones/:milestoneId/approve', (req, res, next) =>
  ProjectController.approveMilestone(req, res, next)
);

export default router;
