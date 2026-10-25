import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as salesActivityService from '../services/salesActivity.service';

// Sales activity KPIs. Access and the salesperson filter are checked in the service.
export class SalesActivityController {
  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { from, to, country, region, salespersonId } = req.query;
      const data = await salesActivityService.summary(req.user, {
        from: from as string | undefined,
        to: to as string | undefined,
        country: country as string | undefined,
        region: region as string | undefined,
        salespersonId: salespersonId as string | undefined,
      });
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOptions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // The Reports page asks for the report module's visibility; the KPI and visit screens use sales visits.
      const module = req.query.module === 'reports' ? 'reports' : 'sales_visits';
      const data = await salesActivityService.options(req.user, module);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export default new SalesActivityController();
