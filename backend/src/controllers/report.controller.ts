import { Response, NextFunction } from 'express';
import reportService from '../services/report.service';
import salesHealthService from '../services/salesHealth.service';
import lifecycleService from '../services/lifecycle.service';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, getOwnerScope } from '../middleware/auth';
import { ownersForFilter, validateFilters } from '../services/salesActivity.service';
import { ReportScope } from '../services/report.service';

// Filters for the Reports page: salesperson (only people the viewer may see), date range, country and region.
// Dates accept from/to, or fromDate/toDate for the older list screens.
async function reportScope(req: AuthRequest): Promise<ReportScope> {
  const q = req.query;
  const f = validateFilters({
    from: (q.from || q.fromDate) as string | undefined,
    to: (q.to || q.toDate) as string | undefined,
    country: q.country as string | undefined,
    region: q.region as string | undefined,
    salespersonId: q.salespersonId as string | undefined,
  });
  const ownerIds = await ownersForFilter(req.user, f.salespersonId, 'reports');
  return {
    ownerIds,
    from: f.from || undefined,
    to: f.to || undefined,
    country: f.country || undefined,
    region: f.region || undefined,
  };
}

// Reports respect role-based visibility: a Sales Rep only sees their own numbers,
// Admin/Manager see organization-wide figures.
export class ReportController {
  async getPipelineReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportService.getPipelineReport(await reportScope(req));
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getSalesReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportService.getSalesReport(await reportScope(req));
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getMIS(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await reportService.getMIS(await reportScope(req));
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getConversionTimeline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = await reportScope(req);
      const { page, limit, search, all, sortBy, sortDir } = req.query;
      const data = await reportService.getConversionTimeline(scope, {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        fromDate: scope.from,
        toDate: scope.to,
        search: search as string | undefined,
        sortBy: sortBy as string | undefined,
        sortDir: sortDir as string | undefined,
        all: all === 'true',
      });
      return res.json({ success: true, data: data.rows, meta: data.meta });
    } catch (error) {
      next(error);
    }
  }

  // How much happened per week or month: new leads, qualifications, new deals, demos, proposals, negotiations, wins and losses.
  async getActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = getOwnerScope(req.user, 'reports');
      const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
      const from = date(req.query.from), to = date(req.query.to);
      if (from && to && from > to) throw new AppError(400, 'From date cannot be after the To date');
      const owner = scope || (typeof req.query.ownerId === 'string' && req.query.ownerId ? req.query.ownerId : undefined);
      const grain = req.query.grain === 'month' ? 'month' : 'week';
      res.json({ success: true, data: await lifecycleService.activity({ ownerId: owner, from, to, grain }) });
    } catch (error) {
      next(error);
    }
  }

  // Lead-to-close lifecycle: when each lead was qualified, converted, reached each stage and closed.
  async getLifecycle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = getOwnerScope(req.user, 'reports');
      const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
      const from = date(req.query.from), to = date(req.query.to);
      if (from && to && from > to) throw new AppError(400, 'From date cannot be after the To date');
      const owner = scope || (typeof req.query.ownerId === 'string' && req.query.ownerId ? req.query.ownerId : undefined);
      res.json({ success: true, data: await lifecycleService.report({ ownerId: owner, from, to }) });
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
