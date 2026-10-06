import { Response, NextFunction } from 'express';
import reportService from '../services/report.service';
import salesHealthService from '../services/salesHealth.service';
import { AuthRequest, getOwnerScope } from '../middleware/auth';

// Reports respect role-based visibility: a Sales Rep only sees their own numbers,
// Admin/Manager see organization-wide figures.
export class ReportController {
  async getPipelineReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = getOwnerScope(req.user, 'reports');
      const data = await reportService.getPipelineReport(scope);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getSalesReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = getOwnerScope(req.user, 'reports');
      const { from, to } = req.query;
      const data = await reportService.getSalesReport(
        scope,
        from ? new Date(from as string) : undefined,
        to ? new Date(to as string) : undefined
      );
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getMIS(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = getOwnerScope(req.user, 'reports');
      const data = await reportService.getMIS(scope);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getConversionTimeline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = getOwnerScope(req.user, 'reports');
      const { ownerId } = req.query;
      // Restricted users always see their own; unrestricted (scope undefined)
      // may optionally filter by a specific owner via the query param.
      const effectiveOwnerId = scope || (ownerId && ownerId !== '' ? (ownerId as string) : undefined);
      const { page, limit, fromDate, toDate, search, all } = req.query;
      const data = await reportService.getConversionTimeline(effectiveOwnerId, {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        fromDate: fromDate as string | undefined,
        toDate: toDate as string | undefined,
        search: search as string | undefined,
        all: all === 'true',
      });
      return res.json({ success: true, data: data.rows, meta: data.meta });
    } catch (error) {
      next(error);
    }
  }

  async getSalesHealth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = getOwnerScope(req.user, 'reports');
      const q = req.query;
      const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);
      const oneOf = <T extends string>(v: unknown, allowed: T[]) =>
        allowed.includes(v as T) ? (v as T) : undefined;
      const data = await salesHealthService.getReport(scope, {
        // Restricted users are pinned to their own accounts by `scope`;
        // unrestricted users may narrow to one owner.
        ownerId: str(q.ownerId),
        tier: str(q.tier),
        search: str(q.search),
        flagCode: str(q.flagCode),
        status: oneOf(q.status, ['on-track', 'at-risk', 'derailed', 'no-pipeline']),
        severity: oneOf(q.severity, ['critical', 'high', 'medium', 'low']),
        sort: oneOf(q.sort, ['score', 'value', 'overdue', 'quiet', 'name']),
        page: q.page ? parseInt(q.page as string, 10) || 1 : undefined,
        limit: q.all === 'true' ? 10000 : Math.min(parseInt(q.limit as string, 10) || 25, 200),
      });
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export default new ReportController();
