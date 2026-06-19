import { Router } from 'express';
import AuditLogController from '../controllers/audit-log.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.get('/', (req, res, next) => AuditLogController.getAuditLogs(req, res, next));
router.get('/:entityType/:entityId', (req, res, next) => AuditLogController.getEntityAuditTrail(req, res, next));

export default router;
