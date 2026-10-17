import { Router } from 'express';
import C from '../controllers/issue.controller';
import { verifyToken } from '../middleware/auth';

// Mounted at /api/issues: the per-client issue log inside tickets.
const router = Router();
router.use(verifyToken);

router.get('/workflow', (req, res) => C.workflow(req, res));
router.get('/clients', (req, res, next) => C.clients(req, res, next));
router.get('/sla-report', (req, res, next) => C.slaReport(req, res, next));
router.get('/', (req, res, next) => C.list(req, res, next));
router.post('/', (req, res, next) => C.create(req, res, next));
router.patch('/:id', (req, res, next) => C.update(req, res, next));
router.post('/:id/stage', (req, res, next) => C.move(req, res, next));
router.get('/:id/history', (req, res, next) => C.history(req, res, next));
router.delete('/:id', (req, res, next) => C.remove(req, res, next));

export default router;
