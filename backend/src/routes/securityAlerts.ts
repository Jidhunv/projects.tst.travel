import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AuthRequest, verifyToken, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const router = Router();

// Security alerts are shown to admins only.
router.use(verifyToken);
router.use(requireRole('Admin'));

// Open alerts first, newest first. ?status=open (default) | acknowledged | all
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    const where = status === 'acknowledged' ? 'WHERE "acknowledgedAt" IS NOT NULL'
      : status === 'all' ? ''
      : 'WHERE "acknowledgedAt" IS NULL';
    const rows = await AppDataSource.query(
      `SELECT a.*, u."firstName" || ' ' || u."lastName" AS "acknowledgedBy"
         FROM security_alerts a LEFT JOIN users u ON u.id = a."acknowledgedById"
         ${where}
         ORDER BY a."acknowledgedAt" IS NULL DESC, a."createdAt" DESC
         LIMIT 200`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/acknowledge', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [row] = await AppDataSource.query(
      `UPDATE security_alerts SET "acknowledgedAt" = now(), "acknowledgedById" = $2
        WHERE id = $1 AND "acknowledgedAt" IS NULL RETURNING id`,
      [req.params.id, req.user!.id]
    );
    if (!row) throw new AppError(404, 'Alert not found or already acknowledged');
    logger.info(`Security alert ${req.params.id} acknowledged by ${req.user?.email}`);
    res.json({ success: true, data: { id: row.id } });
  } catch (error) {
    next(error);
  }
});

export default router;
