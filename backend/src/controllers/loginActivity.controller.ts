import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import loginActivityService from '../services/loginActivity.service';
import logger from '../utils/logger';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EVENTS = ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'ACCOUNT_LOCKED', 'LOGOUT'];

export class LoginActivityController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 50, 1), 200);
      const from = typeof req.query.from === 'string' && DATE_RE.test(req.query.from) ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' && DATE_RE.test(req.query.to) ? req.query.to : undefined;
      const event = typeof req.query.event === 'string' && EVENTS.includes(req.query.event) ? req.query.event : undefined;
      const userId = typeof req.query.userId === 'string' && req.query.userId ? req.query.userId : undefined;

      const { data, total } = await loginActivityService.list({ userId, event, from, to, page, limit });
      logger.info(`Login activity viewed by ${req.user?.email}: ${data.length} record(s)`);
      res.json({ success: true, data, meta: { total, page, limit, retentionDays: 365 } });
    } catch (error) {
      next(error);
    }
  }
}

export default new LoginActivityController();
