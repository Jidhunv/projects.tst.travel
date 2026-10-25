import { Router } from 'express';
import C from '../controllers/questionMaster.controller';
import { verifyToken } from '../middleware/auth';

// Mounted at /api/questionnaire-master: the editable question master for opportunity stages.
const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => C.list(req, res, next));
router.post('/', (req, res, next) => C.create(req, res, next));
router.patch('/:id', (req, res, next) => C.update(req, res, next));
router.delete('/:id', (req, res, next) => C.remove(req, res, next));

export default router;
