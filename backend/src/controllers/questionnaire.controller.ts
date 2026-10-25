import { Response, NextFunction } from 'express';
import opportunityService from '../services/opportunity.service';
import questionnaireService from '../services/questionnaire.service';
import { AuthRequest, canAccessRecord, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// The stage questionnaire of one opportunity (see utils/questionnaire.ts).
export class QuestionnaireController {
  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const opp = await opportunityService.getOpportunityById(req.params.id);
      if (!canAccessRecord(req.user, 'opportunities', opp.ownerId, 'read', opp.assigneeIds)) {
        throw new AppError(403, 'You can only view questionnaires for your own opportunities');
      }
      res.json({ success: true, data: await questionnaireService.getQuestionnaire(req.params.id) });
    } catch (e) { next(e); }
  }

  async save(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'opportunities', 'update')) throw new AppError(403, 'You do not have permission to update opportunities');
      const opp = await opportunityService.getOpportunityById(req.params.id);
      if (!canAccessRecord(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
        throw new AppError(403, 'You can only update your own opportunities');
      }
      const { value, status } = req.body || {};
      if (value !== undefined && value !== null && typeof value !== 'string') throw new AppError(400, 'The answer must be text');
      if (status !== undefined && status !== 'answered' && status !== 'unknown') throw new AppError(400, 'status must be answered or unknown');
      const data = await questionnaireService.saveAnswer(req.params.id, req.params.key, { value, status }, req.user!.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async history(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const opp = await opportunityService.getOpportunityById(req.params.id);
      if (!canAccessRecord(req.user, 'opportunities', opp.ownerId, 'read', opp.assigneeIds)) {
        throw new AppError(403, 'You can only view questionnaires for your own opportunities');
      }
      res.json({ success: true, data: await questionnaireService.history(req.params.id, req.params.key) });
    } catch (e) { next(e); }
  }
}

export default new QuestionnaireController();
