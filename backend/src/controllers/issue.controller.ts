import { Response, NextFunction } from 'express';
import issueService from '../services/issue.service';
import { AuthRequest, getScope } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import pick from '../utils/pick';
import { ISSUE_STAGES, STAGE_HELP, STAGE_ON_HOLD, STAGE_CANCELLED } from '../utils/issueWorkflow';

// Privilege: `issue_log` (read / create / update / delete). Scope "all" reaches every
// client's issues; scope "self" only issues assigned to, or logged by, the user.
type Scope = 'all' | 'self';
const scopeOf = (req: AuthRequest, action: string): Scope | null => {
  const s = getScope(req.user, 'issue_log', action);
  return s === 'all' ? 'all' : s ? 'self' : null;
};
const need = (req: AuthRequest, action: string, what: string): Scope => {
  const s = scopeOf(req, action);
  if (!s) throw new AppError(403, `You do not have permission to ${what}`);
  return s;
};
const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);

// A "self" user may only touch issues assigned to, or logged by, themselves.
async function assertCanTouch(req: AuthRequest, scope: Scope, issueId: string) {
  const sc = await issueService.getIssueScope(issueId);
  if (!sc || (scope === 'self' && sc.assigneeId !== req.user!.id && sc.createdById !== req.user!.id)) throw new AppError(404, 'Issue not found');
}

export class IssueController {
  async workflow(_req: AuthRequest, res: Response) {
    res.json({ success: true, data: { stages: [...ISSUE_STAGES], onHold: STAGE_ON_HOLD, cancelled: STAGE_CANCELLED, help: STAGE_HELP } });
  }

  async clients(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'read', 'view the issue log');
      const data = await issueService.clientSummary({ search: str(req.query.search), scopeUserId: scope === 'self' ? req.user!.id : undefined });
      const stages = await issueService.stageCounts(undefined, scope === 'self' ? req.user!.id : undefined);
      res.json({ success: true, data, stages });
    } catch (e) { next(e); }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'read', 'view the issue log');
      const state = req.query.state === 'open' || req.query.state === 'closed' ? (req.query.state as 'open' | 'closed') : undefined;
      const r = await issueService.listIssues({
        accountId: str(req.query.accountId), ticketId: str(req.query.ticketId), stage: str(req.query.stage), state,
        assigneeId: str(req.query.assigneeId), search: str(req.query.search),
        scopeUserId: scope === 'self' ? req.user!.id : undefined,
        page: parseInt(String(req.query.page), 10) || 1, limit: parseInt(String(req.query.limit), 10) || 25,
      });
      res.json({ success: true, data: r.rows, meta: { page: r.page, limit: r.limit, total: r.total, totalPages: Math.max(1, Math.ceil(r.total / r.limit)) } });
    } catch (e) { next(e); }
  }

  async slaReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'read', 'view the issue log');
      const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
      const state = req.query.state === 'open' || req.query.state === 'closed' ? (req.query.state as 'open' | 'closed') : undefined;
      const from = date(req.query.from), to = date(req.query.to);
      if (from && to && from > to) throw new AppError(400, 'From date cannot be after the To date');
      const r = await issueService.slaReport({
        from, to, accountId: str(req.query.accountId), priority: str(req.query.priority), assigneeId: str(req.query.assigneeId), state,
        scopeUserId: scope === 'self' ? req.user!.id : undefined,
        page: parseInt(String(req.query.page), 10) || 1, limit: parseInt(String(req.query.limit), 10) || 25, all: req.query.all === 'true',
      });
      res.json({ success: true, data: r });
    } catch (e) { next(e); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      need(req, 'create', 'log issues');
      const b = pick(req.body || {}, ['ticketId', 'title', 'description', 'priority', 'assigneeId']) as any;
      if (typeof b.ticketId !== 'string' || !b.ticketId) throw new AppError(400, 'Pick the ticket this issue belongs to');
      const r = await issueService.createIssue(b, req.user!.id);
      res.status(201).json({ success: true, data: r.issue, ticketStatus: r.ticketStatus });
    } catch (e) { next(e); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'update', 'edit issues');
      await assertCanTouch(req, scope, req.params.id);
      const b = pick(req.body || {}, ['title', 'description', 'priority', 'assigneeId']) as any;
      res.json({ success: true, data: await issueService.updateIssue(req.params.id, b) });
    } catch (e) { next(e); }
  }

  async move(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'update', 'update issues');
      await assertCanTouch(req, scope, req.params.id);
      const b = pick(req.body || {}, ['toStage', 'note', 'customerContact', 'assigneeId']) as any;
      if (typeof b.toStage !== 'string') throw new AppError(400, 'Choose the stage to move to');
      if (typeof b.note === 'string' && b.note.length > 2000) throw new AppError(400, 'The note is too long (max 2000 characters)');
      const r = await issueService.moveStage(req.params.id, b, req.user!.id);
      res.json({ success: true, data: r.issue, ticketStatus: r.ticketStatus, ticketChanged: r.ticketChanged });
    } catch (e) { next(e); }
  }

  async history(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'read', 'view the issue log');
      await assertCanTouch(req, scope, req.params.id);
      res.json({ success: true, data: await issueService.getHistory(req.params.id) });
    } catch (e) { next(e); }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'delete', 'delete issues');
      await assertCanTouch(req, scope, req.params.id);
      await issueService.deleteIssue(req.params.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
}

export default new IssueController();
