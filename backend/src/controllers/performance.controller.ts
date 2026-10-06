import { Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { SalesTarget } from '../models/SalesTarget';
import { KpiDefinition } from '../models/KpiDefinition';
import { KpiEntry } from '../models/KpiEntry';
import { KpiProjection } from '../models/KpiProjection';
import { Account } from '../models/Account';
import performanceService from '../services/performance.service';
import kpiService from '../services/kpi.service';
import { AuthRequest, canPerformAction, getOwnerScope, getScope } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import pick from '../utils/pick';

// Privileges (configurable per role in Role Management):
//   targets   - read/create/update/delete sales targets
//   kpi_setup - read/create/update/delete KPI definitions
//   kpis      - read/create/update/delete KPI entries, monthly projections,
//               the meeting report and the audit trail
// For `kpis` and `targets`, scope "all" reaches other people's records and
// scope "self" (or "team", not wired for these) only the user's own.
type Scope = 'all' | 'self';
const scopeOf = (req: AuthRequest, module: string, action: string): Scope | null => {
  const s = getScope(req.user, module, action);
  return s === 'all' ? 'all' : s ? 'self' : null;
};
const need = (req: AuthRequest, module: string, action: string, what: string): Scope => {
  const s = scopeOf(req, module, action);
  if (!s) throw new AppError(403, `You do not have permission to ${what}`);
  return s;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v: unknown): v is string => typeof v === 'string' && DATE_RE.test(v) && !isNaN(Date.parse(`${v}T00:00:00Z`));
const todayStr = () => new Date().toISOString().slice(0, 10);
const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);
const DAY = 86_400_000;

const METRICS = ['won_value', 'opportunity_value'];
const KPI_TYPES = ['number', 'yes_no', 'text'];
const FREQUENCIES = ['daily', 'weekly', 'monthly'];
const MAX_REPORT_DAYS = 92;

// Validates an answer against its KPI's type and returns the columns to store.
function parseAnswer(def: KpiDefinition, body: any) {
  let numberValue: number | null = null;
  let textValue: string | null = null;
  if (def.type === 'number') {
    numberValue = Number(body.numberValue);
    if (body.numberValue === '' || body.numberValue === null || body.numberValue === undefined || !isFinite(numberValue)) throw new AppError(400, 'Enter a number');
  } else if (def.type === 'yes_no') {
    if (![0, 1, '0', '1'].includes(body.numberValue)) throw new AppError(400, 'Answer yes or no');
    numberValue = Number(body.numberValue);
  } else {
    textValue = typeof body.textValue === 'string' ? body.textValue.trim() : '';
    if (!textValue) throw new AppError(400, 'Enter an answer');
  }
  if (def.type !== 'text' && typeof body.textValue === 'string' && body.textValue.trim()) textValue = body.textValue.trim().slice(0, 2000); // optional note
  return { numberValue, textValue };
}

const entrySnapshot = (e: Partial<KpiEntry>, def?: KpiDefinition) => ({
  kpiId: e.kpiId, kpi: def?.name, entryDate: e.entryDate && String(e.entryDate).slice(0, 10),
  numberValue: e.numberValue === null || e.numberValue === undefined ? null : Number(e.numberValue),
  textValue: e.textValue ?? null, accountId: e.accountId ?? null,
});

export class PerformanceController {
  // ---- Statistics (reports module) ----------------------------------------
  async overview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!canPerformAction(req.user, 'reports', 'read')) throw new AppError(403, 'You do not have permission to view reports');
      const scope = getOwnerScope(req.user, 'reports');
      const data = await performanceService.getOverview(scope || str(req.query.ownerId));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  // ---- Targets (targets module) -------------------------------------------
  async listTargets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = scopeOf(req, 'targets', 'read');
      // No targets privilege simply means an empty list, so the Performance page still loads.
      const data = scope ? await performanceService.listTargets(scope === 'all' ? undefined : req.user!.id) : [];
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  private parseTarget(body: any, partial: boolean) {
    const d: any = pick(body || {}, ['name', 'metric', 'ownerId', 'startDate', 'endDate', 'targetValue']);
    const bad = (m: string) => { throw new AppError(400, m); };
    if (!partial || 'name' in d) { if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 255) bad('Name is required (max 255 characters)'); d.name = d.name.trim(); }
    if (!partial || 'metric' in d) { if (!METRICS.includes(d.metric)) bad(`Metric must be one of: ${METRICS.join(', ')}`); }
    if (!partial || 'startDate' in d) { if (!isDate(d.startDate)) bad('Start date must be YYYY-MM-DD'); }
    if (!partial || 'endDate' in d) { if (!isDate(d.endDate)) bad('End date must be YYYY-MM-DD'); }
    if (!partial || 'targetValue' in d) {
      d.targetValue = Number(d.targetValue);
      if (!isFinite(d.targetValue) || d.targetValue <= 0) bad('Target value must be a positive number');
    }
    if ('ownerId' in d && !d.ownerId) d.ownerId = null; // blank = whole team
    return d;
  }

  async createTarget(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'targets', 'create', 'set targets');
      const d = this.parseTarget(req.body, false);
      if (d.endDate < d.startDate) throw new AppError(400, 'End date cannot be before the start date');
      // A "self" privilege can only set targets for oneself.
      if (scope === 'self') d.ownerId = req.user!.id;
      const repo = AppDataSource.getRepository(SalesTarget);
      const saved = await repo.save(repo.create({ ...d, ownerId: d.ownerId || null, createdById: req.user!.id }));
      res.status(201).json({ success: true, data: saved });
    } catch (e) { next(e); }
  }

  async updateTarget(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'targets', 'update', 'change targets');
      const repo = AppDataSource.getRepository(SalesTarget);
      const existing = await repo.findOne({ where: { id: req.params.id } });
      if (!existing || (scope === 'self' && existing.ownerId !== req.user!.id)) throw new AppError(404, 'Target not found');
      const d = this.parseTarget(req.body, true);
      if (scope === 'self' && 'ownerId' in d) d.ownerId = req.user!.id;
      const start = d.startDate ?? existing.startDate;
      const end = d.endDate ?? existing.endDate;
      if (String(end) < String(start)) throw new AppError(400, 'End date cannot be before the start date');
      await repo.update(existing.id, d); // column-level write; see CLAUDE.md
      res.json({ success: true, data: await repo.findOne({ where: { id: existing.id } }) });
    } catch (e) { next(e); }
  }

  async deleteTarget(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'targets', 'delete', 'delete targets');
      const repo = AppDataSource.getRepository(SalesTarget);
      const existing = await repo.findOne({ where: { id: req.params.id } });
      if (!existing || (scope === 'self' && existing.ownerId !== req.user!.id)) throw new AppError(404, 'Target not found');
      await repo.delete(existing.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  // ---- KPI definitions (kpi_setup configures; kpis users read their own) ---
  async listDefinitions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const qb = AppDataSource.getRepository(KpiDefinition).createQueryBuilder('d').orderBy('d.createdAt', 'DESC');
      if (scopeOf(req, 'kpi_setup', 'read')) {
        const uid = str(req.query.userId);
        if (uid) qb.where('d.userId = :u', { u: uid });
      } else {
        need(req, 'kpis', 'read', 'view KPIs');
        qb.where('d.userId = :u AND d.isActive = TRUE', { u: req.user!.id });
      }
      res.json({ success: true, data: await qb.getMany() });
    } catch (e) { next(e); }
  }

  private parseDefinition(body: any, partial: boolean) {
    const d: any = pick(body || {}, ['name', 'description', 'type', 'unit', 'userId', 'frequency', 'targetValue', 'isActive']);
    const bad = (m: string) => { throw new AppError(400, m); };
    if (!partial || 'name' in d) { if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 255) bad('The question/name is required (max 255 characters)'); d.name = d.name.trim(); }
    if (!partial || 'type' in d) { if (!KPI_TYPES.includes(d.type)) bad(`Type must be one of: ${KPI_TYPES.join(', ')}`); }
    if (!partial || 'frequency' in d) { if (!FREQUENCIES.includes(d.frequency)) bad(`Frequency must be one of: ${FREQUENCIES.join(', ')}`); }
    if (!partial || 'userId' in d) { if (typeof d.userId !== 'string' || !d.userId) bad('Pick the staff member this KPI is for'); }
    if ('targetValue' in d) {
      if (d.targetValue === '' || d.targetValue === null) d.targetValue = null;
      else { d.targetValue = Number(d.targetValue); if (!isFinite(d.targetValue) || d.targetValue < 0) bad('Target must be a non-negative number'); }
    }
    if ('unit' in d && d.unit !== null && String(d.unit).length > 32) bad('Unit is too long (max 32 characters)');
    return d;
  }

  async createDefinition(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      need(req, 'kpi_setup', 'create', 'configure KPIs');
      const d = this.parseDefinition(req.body, false);
      const user = await AppDataSource.query('SELECT id FROM users WHERE id = $1', [d.userId]);
      if (user.length === 0) throw new AppError(400, 'That staff member does not exist');
      const repo = AppDataSource.getRepository(KpiDefinition);
      const saved = await repo.save(repo.create({ ...d, createdById: req.user!.id }));
      res.status(201).json({ success: true, data: saved });
    } catch (e) { next(e); }
  }

  async updateDefinition(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      need(req, 'kpi_setup', 'update', 'configure KPIs');
      const repo = AppDataSource.getRepository(KpiDefinition);
      if (!(await repo.findOne({ where: { id: req.params.id } }))) throw new AppError(404, 'KPI not found');
      await repo.update(req.params.id, this.parseDefinition(req.body, true));
      res.json({ success: true, data: await repo.findOne({ where: { id: req.params.id } }) });
    } catch (e) { next(e); }
  }

  async deleteDefinition(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      need(req, 'kpi_setup', 'delete', 'delete KPIs');
      const r = await AppDataSource.getRepository(KpiDefinition).delete(req.params.id); // entries cascade (their audit history is kept)
      if (!r.affected) throw new AppError(404, 'KPI not found');
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  // ---- KPI entries (kpis module) -------------------------------------------
  async listEntries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'kpis', 'read', 'view KPI entries');
      const kpiId = str(req.query.kpiId), from = str(req.query.from), to = str(req.query.to), userId = str(req.query.userId);
      const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 25, 1), 200);
      const qb = AppDataSource.getRepository(KpiEntry).createQueryBuilder('e')
        .leftJoinAndSelect('e.kpi', 'kpi')
        .orderBy('e.entryDate', 'DESC').addOrderBy('e.createdAt', 'DESC');
      if (scope === 'self') qb.andWhere('e.userId = :me', { me: req.user!.id });
      else if (userId) qb.andWhere('e.userId = :uid', { uid: userId });
      if (kpiId) qb.andWhere('e.kpiId = :k', { k: kpiId });
      if (from && isDate(from)) qb.andWhere('e.entryDate >= :from', { from });
      if (to && isDate(to)) qb.andWhere('e.entryDate <= :to', { to });
      const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

      const ids = [...new Set(rows.map((r) => r.accountId).filter(Boolean))] as string[];
      const accounts = ids.length ? await AppDataSource.getRepository(Account).createQueryBuilder('a').select(['a.id', 'a.name']).where('a.id = ANY(:ids)', { ids }).getMany() : [];
      const nameOf = new Map(accounts.map((a) => [a.id, a.name]));
      const userRows: any[] = await AppDataSource.query(`SELECT id, "firstName" || ' ' || "lastName" AS name FROM users`);
      const userName = new Map<string, string>(userRows.map((u) => [u.id, u.name]));
      const data = rows.map((r) => ({ ...r, accountName: r.accountId ? nameOf.get(r.accountId) || null : null, userName: userName.get(r.userId) || '' }));
      res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
    } catch (e) { next(e); }
  }

  private async loadDefForWrite(req: AuthRequest, scope: Scope, kpiId: unknown) {
    const def = typeof kpiId === 'string' ? await AppDataSource.getRepository(KpiDefinition).findOne({ where: { id: kpiId } }) : null;
    // Someone else's KPI looks the same as a missing one unless the privilege reaches all staff.
    if (!def || !def.isActive || (scope === 'self' && def.userId !== req.user!.id)) throw new AppError(404, 'KPI not found');
    return def;
  }

  private async checkAccount(accountId: unknown) {
    if (!accountId) return null;
    if (!(await AppDataSource.getRepository(Account).findOne({ where: { id: accountId as string }, select: ['id'] }))) throw new AppError(400, 'That prospect does not exist');
    return accountId as string;
  }

  async createEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'kpis', 'create', 'record KPI entries');
      const body = pick(req.body || {}, ['kpiId', 'entryDate', 'numberValue', 'textValue', 'accountId']) as any;
      const def = await this.loadDefForWrite(req, scope, body.kpiId);
      const entryDate = body.entryDate || todayStr();
      if (!isDate(entryDate)) throw new AppError(400, 'Date must be YYYY-MM-DD');
      if (entryDate > todayStr()) throw new AppError(400, 'You cannot report a KPI for a future date');
      const { numberValue, textValue } = parseAnswer(def, body);
      const accountId = await this.checkAccount(body.accountId);
      const repo = AppDataSource.getRepository(KpiEntry);
      // The figure belongs to the KPI's owner, even when someone with wider access records it.
      const saved = await repo.save(repo.create({ kpiId: def.id, userId: def.userId, entryDate, numberValue, textValue, accountId }));
      await kpiService.audit('kpi_entry', saved.id, def.userId, req.user!.id, 'created', null, entrySnapshot(saved, def));
      res.status(201).json({ success: true, data: saved });
    } catch (e) { next(e); }
  }

  async updateEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'kpis', 'update', 'edit KPI entries');
      const repo = AppDataSource.getRepository(KpiEntry);
      const existing = await repo.findOne({ where: { id: req.params.id } });
      if (!existing || (scope === 'self' && existing.userId !== req.user!.id)) throw new AppError(404, 'Entry not found');
      const def = await this.loadDefForWrite(req, scope, existing.kpiId);
      const body = pick(req.body || {}, ['entryDate', 'numberValue', 'textValue', 'accountId']) as any;
      const entryDate = body.entryDate ?? String(existing.entryDate).slice(0, 10);
      if (!isDate(entryDate)) throw new AppError(400, 'Date must be YYYY-MM-DD');
      if (entryDate > todayStr()) throw new AppError(400, 'You cannot report a KPI for a future date');
      const merged = { numberValue: 'numberValue' in body ? body.numberValue : existing.numberValue, textValue: 'textValue' in body ? body.textValue : existing.textValue };
      const { numberValue, textValue } = parseAnswer(def, merged);
      const accountId = 'accountId' in body ? await this.checkAccount(body.accountId) : existing.accountId;
      const before = entrySnapshot(existing, def);
      await repo.update(existing.id, { entryDate, numberValue, textValue, accountId });
      const after = entrySnapshot({ ...existing, entryDate, numberValue, textValue, accountId }, def);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await kpiService.audit('kpi_entry', existing.id, existing.userId, req.user!.id, 'updated', before, after);
      }
      res.json({ success: true, data: await repo.findOne({ where: { id: existing.id } }) });
    } catch (e) { next(e); }
  }

  async deleteEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'kpis', 'delete', 'delete KPI entries');
      const repo = AppDataSource.getRepository(KpiEntry);
      const e = await repo.findOne({ where: { id: req.params.id }, relations: ['kpi'] });
      if (!e || (scope === 'self' && e.userId !== req.user!.id)) throw new AppError(404, 'Entry not found');
      await kpiService.audit('kpi_entry', e.id, e.userId, req.user!.id, 'deleted', entrySnapshot(e, e.kpi), null);
      await repo.delete(e.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  async kpiSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'kpis', 'read', 'view KPIs');
      const to = isDate(req.query.to) ? (req.query.to as string) : todayStr();
      const from = isDate(req.query.from) ? (req.query.from as string) : new Date(Date.parse(`${to}T00:00:00Z`) - 29 * DAY).toISOString().slice(0, 10);
      if (from > to) throw new AppError(400, 'From date cannot be after the To date');
      const only = scope === 'self' ? req.user!.id : str(req.query.userId);
      res.json({ success: true, data: { from, to, rows: await kpiService.summary(from, to, only) } });
    } catch (e) { next(e); }
  }

  // ---- Monthly projections (kpis module) ----------------------------------
  async listProjections(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'kpis', 'read', 'view projections');
      const userId = scope === 'self' ? req.user!.id : str(req.query.userId) || req.user!.id;
      // Default window: last month through the next 5.
      const now = new Date();
      const months = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1 + i, 1)).toISOString().slice(0, 10));
      const rows = await kpiService.projectionsVsActual(months, [userId]);
      res.json({ success: true, data: { userId, months, rows } });
    } catch (e) { next(e); }
  }

  async saveProjection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const b = pick(req.body || {}, ['userId', 'month', 'metric', 'amount', 'note']) as any;
      if (typeof b.month !== 'string' || !/^\d{4}-\d{2}(-01)?$/.test(b.month)) throw new AppError(400, 'Month must be YYYY-MM');
      const month = `${b.month.slice(0, 7)}-01`;
      if (isNaN(Date.parse(`${month}T00:00:00Z`))) throw new AppError(400, 'Month must be YYYY-MM');
      if (!METRICS.includes(b.metric)) throw new AppError(400, `Metric must be one of: ${METRICS.join(', ')}`);
      const amount = Number(b.amount);
      if (b.amount === '' || b.amount === null || b.amount === undefined || !isFinite(amount) || amount < 0) throw new AppError(400, 'Projected figure must be zero or more');
      const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 1000) : null;

      const repo = AppDataSource.getRepository(KpiProjection);
      const readScope = need(req, 'kpis', 'create', 'enter projections');
      const subject = readScope === 'all' && b.userId ? String(b.userId) : req.user!.id;
      const existing = await repo.findOne({ where: { userId: subject, month, metric: b.metric } });
      if (existing && !scopeOf(req, 'kpis', 'update')) throw new AppError(403, 'You do not have permission to revise projections');
      // Closed months are locked so a projection cannot be rewritten after the fact,
      // unless the role may update everyone's records.
      if (month < `${todayStr().slice(0, 7)}-01` && scopeOf(req, 'kpis', 'update') !== 'all') {
        throw new AppError(403, 'That month has ended; its projection is locked');
      }
      if (subject !== req.user!.id && !(await AppDataSource.query('SELECT 1 FROM users WHERE id = $1', [subject])).length) throw new AppError(400, 'That staff member does not exist');

      const snap = (p: { amount: unknown; note: string | null }) => ({ month: month.slice(0, 7), metric: b.metric, amount: Number(p.amount), note: p.note });
      let saved: KpiProjection;
      if (existing) {
        const before = snap(existing);
        await repo.update(existing.id, { amount, note });
        saved = (await repo.findOne({ where: { id: existing.id } }))!;
        const after = snap(saved);
        if (JSON.stringify(before) !== JSON.stringify(after)) await kpiService.audit('projection', saved.id, subject, req.user!.id, 'updated', before, after);
      } else {
        saved = await repo.save(repo.create({ userId: subject, month, metric: b.metric, amount, note }));
        await kpiService.audit('projection', saved.id, subject, req.user!.id, 'created', null, snap(saved));
      }
      res.status(existing ? 200 : 201).json({ success: true, data: saved });
    } catch (e) { next(e); }
  }

  async deleteProjection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'kpis', 'delete', 'delete projections');
      const repo = AppDataSource.getRepository(KpiProjection);
      const p = await repo.findOne({ where: { id: req.params.id } });
      if (!p || (scope === 'self' && p.userId !== req.user!.id)) throw new AppError(404, 'Projection not found');
      if (String(p.month).slice(0, 7) < todayStr().slice(0, 7) && scopeOf(req, 'kpis', 'update') !== 'all') throw new AppError(403, 'That month has ended; its projection is locked');
      await kpiService.audit('projection', p.id, p.userId, req.user!.id, 'deleted', { month: String(p.month).slice(0, 7), metric: p.metric, amount: Number(p.amount), note: p.note }, null);
      await repo.delete(p.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  // ---- Audit trail & meeting report (kpis read) ----------------------------
  async auditTrail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'kpis', 'read', 'view the KPI audit trail');
      const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 25, 1), 200);
      const from = isDate(req.query.from) ? (req.query.from as string) : undefined;
      const to = isDate(req.query.to) ? (req.query.to as string) : undefined;
      const entityType = ['kpi_entry', 'projection'].includes(String(req.query.entityType)) ? String(req.query.entityType) : undefined;
      const { rows, total } = await kpiService.listAudit({
        subjectUserId: scope === 'self' ? req.user!.id : str(req.query.userId), from, to, entityType, page, limit,
      });
      res.json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
    } catch (e) { next(e); }
  }

  async meetingReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scope = need(req, 'kpis', 'read', 'view the KPI report');
      const today = todayStr();
      const to = isDate(req.query.to) ? (req.query.to as string) : today;
      const from = isDate(req.query.from) ? (req.query.from as string) : to;
      if (from > to) throw new AppError(400, 'From date cannot be after the To date');
      if ((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY + 1 > MAX_REPORT_DAYS) throw new AppError(400, `Choose a range of ${MAX_REPORT_DAYS} days or fewer`);
      // Individual view = one person; combined = everyone the role may see.
      const only = scope === 'self' ? [req.user!.id] : str(req.query.userId) ? [String(req.query.userId)] : undefined;
      res.json({ success: true, data: await kpiService.meetingReport(from, to, only, today) });
    } catch (e) { next(e); }
  }
}

export default new PerformanceController();
