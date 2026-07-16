import { Router } from 'express';
import AuditLogController from '../controllers/audit-log.controller';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Audit logs are sensitive - restrict to Admin users only
router.use(verifyToken);
router.use(requireRole('Admin'));

router.get('/', (req, res, next) => AuditLogController.getAuditLogs(req, res, next));
router.get('/:entityType/:entityId', (req, res, next) => AuditLogController.getEntityAuditTrail(req, res, next));

export default router;
