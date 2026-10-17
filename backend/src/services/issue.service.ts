import { AppDataSource } from '../config/database';
import { TicketIssue } from '../models/TicketIssue';
import { TicketIssueHistory } from '../models/TicketIssueHistory';
import { AppError } from '../middleware/errorHandler';
import { evaluateIssue, summariseSla, SLA_DEFAULTS, SLA_PAUSE_STAGES, RESOLVED_STAGE } from '../utils/issueSla';
import { checkTransition, isFinished, ticketStatusFor, ALL_STAGES, ISSUE_STAGES } from '../utils/issueWorkflow';

import { PRIORITIES as PRIORITY_LIST } from '../utils/issueSla';
const PRIORITIES: string[] = [...PRIORITY_LIST];
const num = (v: unknown) => Number(v || 0);

export interface IssueFilters {
  accountId?: string;
  ticketId?: string;
  stage?: string;
  state?: 'open' | 'closed';
  assigneeId?: string;
  search?: string;
  scopeUserId?: string; // "self" privilege: only issues assigned to or logged by this user
  page?: number;
  limit?: number;
}

// A person's departments are their own if set, otherwise their role's.
const DEV_FILTER = `u."isActive" = TRUE AND 'Development' = ANY(string_to_array(COALESCE(NULLIF(u.departments, ''), NULLIF(r.departments, ''), ''), ','))`;

class IssueService {
  private issues = () => AppDataSource.getRepository(TicketIssue);

  // The people an issue can be assigned to: staff in the Development department.
  async listAssignees() {
    return AppDataSource.query(
      `SELECT u.id, u."firstName", u."lastName" FROM users u JOIN roles r ON r.id = u."roleId" WHERE ${DEV_FILTER} ORDER BY u."firstName", u."lastName"`
    );
  }

  private async assertDeveloper(userId: string) {
    const ok = await AppDataSource.query(`SELECT 1 FROM users u JOIN roles r ON r.id = u."roleId" WHERE u.id = $1 AND ${DEV_FILTER}`, [userId]);
    if (!ok.length) throw new AppError(400, 'Issues can only be assigned to people in the Development department. Set a person\'s (or their role\'s) department to Development first.');
  }

  // Keeps the ticket's status in step with its issues. When the last open issue
  // finishes the ticket closes; if an issue is reopened or added, it reopens.
  async syncTicket(ticketId: string, actorId?: string): Promise<{ status: string | null; changed: boolean }> {
    const rows: { stage: string }[] = await AppDataSource.query('SELECT stage FROM ticket_issues WHERE "ticketId" = $1', [ticketId]);
    const next = ticketStatusFor(rows.map((r) => r.stage));
    if (!next) return { status: null, changed: false };
    const [t] = await AppDataSource.query('SELECT status FROM tickets WHERE id = $1', [ticketId]);
    if (!t || t.status === next) return { status: next, changed: false };
    // "Resolved" is a manual status on the ticket screen; do not downgrade it to In Progress
    // unless something is actually still open.
    if (t.status === 'Resolved' && next === 'Closed') {
      await AppDataSource.query(`UPDATE tickets SET status = 'Closed', "updatedAt" = NOW() WHERE id = $1`, [ticketId]);
      return { status: next, changed: true };
    }
    await AppDataSource.query(
      next === 'Closed'
        ? `UPDATE tickets SET status = 'Closed', "resolvedAt" = COALESCE("resolvedAt", NOW()), "updatedAt" = NOW() WHERE id = $1`
        : `UPDATE tickets SET status = $2::tickets_status_enum, "updatedAt" = NOW() WHERE id = $1`,
      next === 'Closed' ? [ticketId] : [ticketId, next]
    );
    void actorId;
    return { status: next, changed: true };
  }

  async createIssue(data: { ticketId: string; title: string; description?: string | null; priority?: string; assigneeId?: string | null }, actorId: string) {
    if (!data.title || !data.title.trim()) throw new AppError(400, 'Give the issue a title');
    if (data.title.length > 255) throw new AppError(400, 'The title is too long (max 255 characters)');
    const priority = data.priority || 'Medium';
    if (!PRIORITIES.includes(priority)) throw new AppError(400, `Priority must be one of: ${PRIORITIES.join(', ')}`);
    const [ticket] = await AppDataSource.query('SELECT id FROM tickets WHERE id = $1', [data.ticketId]);
    if (!ticket) throw new AppError(404, 'Ticket not found');
    if (data.assigneeId) await this.assertDeveloper(data.assigneeId);

    // Timestamps are set here from one clock instead of the database default. The database may run in a
    // different time zone from this server, and a "timestamp without time zone" column would then be read
    // back hours off - which would corrupt response and resolution times.
    const now = new Date();
    return AppDataSource.transaction(async (m) => {
      // Lock the ticket row so two people adding at once cannot take the same number.
      await m.query('SELECT id FROM tickets WHERE id = $1 FOR UPDATE', [data.ticketId]);
      const [{ n }] = await m.query('SELECT COALESCE(MAX("issueNumber"), 0) + 1 AS n FROM ticket_issues WHERE "ticketId" = $1', [data.ticketId]);
      const issue = await m.getRepository(TicketIssue).save(
        m.getRepository(TicketIssue).create({
          ticketId: data.ticketId, issueNumber: num(n), title: data.title.trim(), description: data.description?.trim() || null,
          priority, stage: 'Logged', assigneeId: data.assigneeId || null, createdById: actorId, createdAt: now, updatedAt: now,
        })
      );
      await m.getRepository(TicketIssueHistory).save(
        m.getRepository(TicketIssueHistory).create({ issueId: issue.id, fromStage: null, toStage: 'Logged', note: 'Issue logged', actorId, createdAt: now })
      );
      return issue;
    }).then(async (issue) => {
      const sync = await this.syncTicket(issue.ticketId, actorId);
      return { issue, ticketStatus: sync.status };
    });
  }

  async updateIssue(id: string, data: { title?: string; description?: string | null; priority?: string; assigneeId?: string | null }) {
    const issue = await this.issues().findOne({ where: { id } });
    if (!issue) throw new AppError(404, 'Issue not found');
    const patch: Partial<TicketIssue> = {};
    if (data.title !== undefined) {
      if (!data.title.trim() || data.title.length > 255) throw new AppError(400, 'Give the issue a title (max 255 characters)');
      patch.title = data.title.trim();
    }
    if (data.description !== undefined) patch.description = data.description?.trim() || null;
    if (data.priority !== undefined) {
      if (!PRIORITIES.includes(data.priority)) throw new AppError(400, `Priority must be one of: ${PRIORITIES.join(', ')}`);
      patch.priority = data.priority;
    }
    if (data.assigneeId !== undefined) {
      if (data.assigneeId) await this.assertDeveloper(data.assigneeId);
      patch.assigneeId = data.assigneeId || null;
    }
    await this.issues().update(id, { ...patch, updatedAt: new Date() });
    return this.issues().findOne({ where: { id } });
  }

  async moveStage(id: string, input: { toStage: string; note?: string; customerContact?: string; assigneeId?: string | null }, actorId: string) {
    const issue = await this.issues().findOne({ where: { id } });
    if (!issue) throw new AppError(404, 'Issue not found');
    let assigneeId = issue.assigneeId;
    if (input.assigneeId) {
      await this.assertDeveloper(input.assigneeId);
      assigneeId = input.assigneeId;
    }
    const err = checkTransition({ from: issue.stage, to: input.toStage, note: input.note, customerContact: input.customerContact, hasAssignee: !!assigneeId });
    if (err) throw new AppError(400, err);

    const finished = isFinished(input.toStage);
    const now = new Date();
    await AppDataSource.transaction(async (m) => {
      await m.getRepository(TicketIssue).update(id, { stage: input.toStage, assigneeId, closedAt: finished ? now : null, updatedAt: now });
      await m.getRepository(TicketIssueHistory).save(
        m.getRepository(TicketIssueHistory).create({
          issueId: id, fromStage: issue.stage, toStage: input.toStage, note: input.note?.trim() || null,
          customerContact: input.customerContact?.trim() || null, actorId, createdAt: now,
        })
      );
    });
    const sync = await this.syncTicket(issue.ticketId, actorId);
    return { issue: await this.issues().findOne({ where: { id } }), ticketStatus: sync.status, ticketChanged: sync.changed };
  }

  async deleteIssue(id: string) {
    const issue = await this.issues().findOne({ where: { id } });
    if (!issue) throw new AppError(404, 'Issue not found');
    await this.issues().delete(id); // history cascades
    await this.syncTicket(issue.ticketId);
  }

  async getHistory(issueId: string) {
    return AppDataSource.query(
      `SELECT h.id, h."fromStage", h."toStage", h.note, h."customerContact", h."createdAt",
              u."firstName" || ' ' || u."lastName" AS "actorName"
       FROM ticket_issue_history h LEFT JOIN users u ON u.id = h."actorId"
       WHERE h."issueId" = $1 ORDER BY h."createdAt" ASC`, [issueId]);
  }

  async listIssues(f: IssueFilters) {
    const page = Math.max(f.page || 1, 1);
    const limit = Math.min(Math.max(f.limit || 25, 1), 500);
    return this.runList(f, page, limit);
  }

  private async runList(f: IssueFilters, page: number, limit: number) {
    const conds: string[] = [];
    const args: any[] = [];
    const p = (v: unknown) => { args.push(v); return `$${args.length}`; };
    if (f.accountId) conds.push(`t."accountId" = ${p(f.accountId)}`);
    if (f.ticketId) conds.push(`i."ticketId" = ${p(f.ticketId)}`);
    if (f.stage && ALL_STAGES.includes(f.stage)) conds.push(`i.stage = ${p(f.stage)}`);
    if (f.state === 'open') conds.push(`i.stage NOT IN ('Deployed','Cancelled')`);
    if (f.state === 'closed') conds.push(`i.stage IN ('Deployed','Cancelled')`);
    if (f.assigneeId) conds.push(`i."assigneeId" = ${p(f.assigneeId)}`);
    if (f.search?.trim()) { const s = p(`%${f.search.trim()}%`); conds.push(`(i.title ILIKE ${s} OR t.title ILIKE ${s} OR t."ticketNumber" ILIKE ${s})`); }
    if (f.scopeUserId) { const u = p(f.scopeUserId); conds.push(`(i."assigneeId" = ${u} OR i."createdById" = ${u})`); }
    const w = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const base = `FROM ticket_issues i JOIN tickets t ON t.id = i."ticketId" JOIN accounts a ON a.id = t."accountId"
                  LEFT JOIN users u ON u.id = i."assigneeId" ${w}`;
    const [{ n }] = await AppDataSource.query(`SELECT COUNT(*) n ${base}`, args);
    const rows = await AppDataSource.query(
      `SELECT i.id, i."ticketId", i."issueNumber", i.title, i.description, i.priority, i.stage, i."assigneeId", i."closedAt",
              i."createdAt", i."updatedAt",
              (SELECT MIN(h."createdAt") FROM ticket_issue_history h WHERE h."issueId" = i.id AND h."toStage" = 'Deployed') AS "resolvedAt",
              t."ticketNumber", t.title AS "ticketTitle", t.status AS "ticketStatus",
              t."accountId", a.name AS "accountName", u."firstName" || ' ' || u."lastName" AS "assigneeName"
       ${base} ORDER BY (i.stage IN ('Deployed','Cancelled')) ASC, t."createdAt" DESC, i."issueNumber" ASC
       LIMIT ${limit} OFFSET ${(page - 1) * limit}`, args);
    return { rows, total: num(n), page, limit };
  }

  // One row per client that has issues: how many, how many closed, how far along.
  async clientSummary(opts: { search?: string; scopeUserId?: string }) {
    const args: any[] = [];
    const conds: string[] = [];
    if (opts.search?.trim()) { args.push(`%${opts.search.trim()}%`); conds.push(`a.name ILIKE $${args.length}`); }
    if (opts.scopeUserId) { args.push(opts.scopeUserId); conds.push(`(i."assigneeId" = $${args.length} OR i."createdById" = $${args.length})`); }
    const w = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = await AppDataSource.query(
      `SELECT a.id AS "accountId", a.name AS "accountName",
              COUNT(DISTINCT t.id) AS tickets,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status <> 'Closed') AS "openTickets",
              COUNT(i.id) AS total,
              COUNT(i.id) FILTER (WHERE i.stage IN ('Deployed','Cancelled')) AS closed,
              COUNT(i.id) FILTER (WHERE i.stage NOT IN ('Deployed','Cancelled') AND i.priority IN ('Critical','High')) AS "urgentOpen",
              COUNT(i.id) FILTER (WHERE i.stage IN ('User acceptance')) AS "waitingOnCustomer",
              MAX(i."updatedAt") AS "lastUpdate"
       FROM ticket_issues i JOIN tickets t ON t.id = i."ticketId" JOIN accounts a ON a.id = t."accountId"
       ${w} GROUP BY a.id, a.name ORDER BY (COUNT(i.id) FILTER (WHERE i.stage NOT IN ('Deployed','Cancelled'))) DESC, a.name`, args);
    return rows.map((r: any) => {
      const total = num(r.total), closed = num(r.closed);
      return { ...r, tickets: num(r.tickets), openTickets: num(r.openTickets), total, closed, open: total - closed,
        urgentOpen: num(r.urgentOpen), waitingOnCustomer: num(r.waitingOnCustomer), pctClosed: total ? Math.round((closed / total) * 100) : 0 };
    });
  }

  // Stage counts for a quick pipeline view (optionally for one client).
  async stageCounts(accountId?: string, scopeUserId?: string) {
    const args: any[] = [];
    const conds: string[] = [];
    if (accountId) { args.push(accountId); conds.push(`t."accountId" = $${args.length}`); }
    if (scopeUserId) { args.push(scopeUserId); conds.push(`(i."assigneeId" = $${args.length} OR i."createdById" = $${args.length})`); }
    const w = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = await AppDataSource.query(`SELECT i.stage, COUNT(*) n FROM ticket_issues i JOIN tickets t ON t.id = i."ticketId" ${w} GROUP BY i.stage`, args);
    const m = new Map<string, number>(rows.map((r: any) => [r.stage, num(r.n)]));
    return [...ISSUE_STAGES, 'On hold', 'Cancelled'].map((s) => ({ stage: s, count: m.get(s) || 0 }));
  }

  // Response and resolution times for issues logged in a period, judged against each ticket's SLA
  // hours (or the priority defaults), with breakdowns for the meeting.
  async slaReport(f: { from?: string; to?: string; accountId?: string; priority?: string; assigneeId?: string; state?: 'open' | 'closed'; scopeUserId?: string; page?: number; limit?: number; all?: boolean }, now: Date = new Date()) {
    const conds: string[] = [];
    const args: any[] = [];
    const p = (v: unknown) => { args.push(v); return `$${args.length}`; };
    if (f.from) conds.push(`i."createdAt" >= ${p(new Date(`${f.from}T00:00:00Z`))}`);
    if (f.to) conds.push(`i."createdAt" < ${p(new Date(Date.parse(`${f.to}T00:00:00Z`) + 86_400_000))}`);
    if (f.accountId) conds.push(`t."accountId" = ${p(f.accountId)}`);
    if (f.priority && PRIORITIES.includes(f.priority)) conds.push(`i.priority = ${p(f.priority)}`);
    if (f.assigneeId) conds.push(`i."assigneeId" = ${p(f.assigneeId)}`);
    if (f.state === 'open') conds.push(`i.stage NOT IN ('Deployed','Cancelled')`);
    if (f.state === 'closed') conds.push(`i.stage IN ('Deployed','Cancelled')`);
    if (f.scopeUserId) { const u = p(f.scopeUserId); conds.push(`(i."assigneeId" = ${u} OR i."createdById" = ${u})`); }
    const w = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const issues: any[] = await AppDataSource.query(
      `SELECT i.id, i."issueNumber", i.title, i.priority, i.stage, i."closedAt", i."createdAt", i."assigneeId",
              t."ticketNumber", t.title AS "ticketTitle", t."slaResponseHours", t."slaResolutionHours", t."accountId",
              a.name AS "accountName", u."firstName" || ' ' || u."lastName" AS "assigneeName"
       FROM ticket_issues i JOIN tickets t ON t.id = i."ticketId" JOIN accounts a ON a.id = t."accountId"
       LEFT JOIN users u ON u.id = i."assigneeId" ${w} ORDER BY i."createdAt" DESC LIMIT 5000`, args);

    const hist: any[] = issues.length
      ? await AppDataSource.query(`SELECT "issueId", "toStage", "createdAt" FROM ticket_issue_history WHERE "issueId" = ANY($1::uuid[]) ORDER BY "createdAt" ASC`, [issues.map((i) => i.id)])
      : [];
    const byIssue = new Map<string, { toStage: string; at: Date }[]>();
    for (const h of hist) {
      const l = byIssue.get(h.issueId) || [];
      l.push({ toStage: h.toStage, at: new Date(h.createdAt) });
      byIssue.set(h.issueId, l);
    }

    const rows = issues.map((i) => {
      const loggedAt = new Date(i.createdAt);
      const e = evaluateIssue({
        loggedAt, stage: i.stage, priority: i.priority, closedAt: i.closedAt ? new Date(i.closedAt) : null,
        transitions: byIssue.get(i.id) || [{ toStage: 'Logged', at: loggedAt }],
        ticketResponseHours: i.slaResponseHours, ticketResolutionHours: i.slaResolutionHours,
      }, now);
      const finished = i.stage === 'Deployed' || i.stage === 'Cancelled';
      return {
        id: i.id, issueNumber: i.issueNumber, title: i.title, priority: i.priority, stage: i.stage, ticketNumber: i.ticketNumber, ticketTitle: i.ticketTitle,
        accountId: i.accountId, accountName: i.accountName, assigneeId: i.assigneeId, assigneeName: i.assigneeName,
        loggedAt, respondedAt: e.respondedAt, responseHours: e.responseHours, responseTarget: e.responseTarget, response: e.responseState,
        resolvedAt: e.resolvedAt, resolutionHours: e.resolutionHours, resolutionTarget: e.resolutionTarget, resolution: e.resolutionState,
        closedAt: e.closedAt, daysToClose: e.daysToClose, daysOpen: e.daysOpen, finished,
        // still open and already past a target it has not met
        breachingNow: !finished && ((e.responseState === 'breached' && !e.respondedAt) || (e.resolutionState === 'breached' && !e.resolvedAt)),
      };
    });

    const group = (key: (r: (typeof rows)[number]) => string, label: (r: (typeof rows)[number]) => string) => {
      const m = new Map<string, { label: string; rows: typeof rows }>();
      for (const r of rows) { const k = key(r) || 'none'; const g = m.get(k) || { label: label(r) || 'Unassigned', rows: [] as typeof rows }; g.rows.push(r); m.set(k, g); }
      return [...m.values()].map((g) => ({ label: g.label, breachingNow: g.rows.filter((r) => r.breachingNow).length, ...summariseSla(g.rows) })).sort((a, b) => b.issues - a.issues);
    };

    rows.sort((a, b) => Number(b.breachingNow) - Number(a.breachingNow) || Number(a.finished) - Number(b.finished) || b.daysOpen - a.daysOpen);
    const limit = f.all ? rows.length || 1 : Math.min(Math.max(f.limit || 25, 1), 200);
    const total = rows.length;
    const page = f.all ? 1 : Math.min(Math.max(f.page || 1, 1), Math.max(1, Math.ceil(total / limit)));
    return {
      generatedAt: now.toISOString(),
      summary: { ...summariseSla(rows), breachingNow: rows.filter((r) => r.breachingNow).length, openIssues: rows.filter((r) => !r.finished).length },
      byPriority: PRIORITIES.map((pr) => ({ label: pr, ...summariseSla(rows.filter((r) => r.priority === pr)), breachingNow: rows.filter((r) => r.priority === pr && r.breachingNow).length, targets: SLA_DEFAULTS[pr] })).filter((g) => g.issues > 0),
      byClient: group((r) => r.accountId, (r) => r.accountName),
      byDeveloper: group((r) => r.assigneeId || '', (r) => r.assigneeName || ''),
      rows: rows.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      rules: { resolutionPoint: RESOLVED_STAGE, clockStoppedIn: SLA_PAUSE_STAGES, defaults: SLA_DEFAULTS },
    };
  }

  async getIssueScope(id: string) {
    const [r] = await AppDataSource.query('SELECT "assigneeId", "createdById" FROM ticket_issues WHERE id = $1', [id]);
    return r as { assigneeId: string | null; createdById: string | null } | undefined;
  }
}

export default new IssueService();
