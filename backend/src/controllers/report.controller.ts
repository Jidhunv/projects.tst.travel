import { Response, NextFunction } from 'express';
import reportService from '../services/report.service';
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
}

export default new ReportController();
