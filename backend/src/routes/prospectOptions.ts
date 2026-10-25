import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AuthRequest, verifyToken, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { isProspectOptionCategory } from '../services/prospectOptions.service';
import logger from '../utils/logger';

const router = Router();
router.use(verifyToken);

// Anyone signed in can read the options (the Prospecting form needs them). Changing them needs the master-data privilege.
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where = typeof req.query.category === 'string' && isProspectOptionCategory(req.query.category)
      ? 'WHERE category = $1' : '';
    const args = where ? [req.query.category] : [];
    const rows = await AppDataSource.query(
      `SELECT id, category, name, "isActive" FROM prospect_options ${where} ORDER BY category, name`, args
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canPerformAction(req.user, 'prospect_options', 'create')) throw new AppError(403, 'You do not have permission to add prospect options');
    const { category, name } = req.body ?? {};
    if (!isProspectOptionCategory(category)) throw new AppError(400, 'Category must be businessType, employeeBand or branch');
    const clean = typeof name === 'string' ? name.trim() : '';
    if (!clean || clean.length > 255) throw new AppError(400, 'Option name is required (max 255 characters)');
    const [row] = await AppDataSource.query(
      `INSERT INTO prospect_options (category, name) VALUES ($1, $2)
       ON CONFLICT (category, name) DO UPDATE SET "isActive" = TRUE, "updatedAt" = now()
       RETURNING id, category, name, "isActive"`,
      [category, clean]
    );
    logger.info(`Prospect option added: ${category} ${clean} by ${req.user?.email}`);
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

// Rename or activate/deactivate an option. Deactivating keeps existing answers readable.
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canPerformAction(req.user, 'prospect_options', 'update')) throw new AppError(403, 'You do not have permission to change prospect options');
    const sets: string[] = [];
    const args: unknown[] = [];
    if (typeof req.body?.name === 'string') {
      const clean = req.body.name.trim();
      if (!clean || clean.length > 255) throw new AppError(400, 'Option name is required (max 255 characters)');
      args.push(clean);
      sets.push(`name = $${args.length}`);
    }
    if (typeof req.body?.isActive === 'boolean') {
      args.push(req.body.isActive);
      sets.push(`"isActive" = $${args.length}`);
    }
    if (!sets.length) throw new AppError(400, 'Nothing to change');
    args.push(req.params.id);
    const [row] = await AppDataSource.query(
      `UPDATE prospect_options SET ${sets.join(', ')}, "updatedAt" = now() WHERE id = $${args.length}
       RETURNING id, category, name, "isActive"`,
      args
    );
    if (!row) throw new AppError(404, 'Option not found');
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

export default router;
