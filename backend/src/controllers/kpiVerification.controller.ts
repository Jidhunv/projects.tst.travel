import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as kpiVerification from '../services/kpiVerification.service';

// Daily KPI verification: CRM values, supervisor values and approval, with weightage from Settings.
export class KpiVerificationController {
  async getDays(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await kpiVerification.verificationDays(req.user, {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        userId: req.query.userId as string | undefined,
      });
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async saveSupervisorValue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await kpiVerification.setSupervisorValue(req.user, req.body || {});
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async approveDay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await kpiVerification.approveDay(req.user, req.body || {});
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async unlockDay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await kpiVerification.unlockDay(req.user, req.body || {});
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getWeights(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await kpiVerification.listSettings();
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getTargets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await kpiVerification.targetsPage(req.user);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async saveTarget(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await kpiVerification.setPersonTarget(req.user, req.body || {});
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async saveWeights(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = Array.isArray(req.body?.weights) ? req.body.weights : [];
      const data = await kpiVerification.saveSettings(req.user, items);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export default new KpiVerificationController();
