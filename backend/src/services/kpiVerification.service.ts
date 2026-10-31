import { AppDataSource } from '../config/database';
import { AuthUser, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ownersForFilter, validateFilters } from './salesActivity.service';

// Daily KPI verification, in the same layout as the My KPI sheet: for each KPI the target, the achieved
// value calculated from the CRM, the weight, and the supervisor's value and remarks beside it.
// A KPI contributes weight x min(achieved / target, 1) to the score. The weights add up to 1.0.

// The seven daily KPIs, in sheet order.
const METRIC_KEYS = ['newLeads', 'prospects', 'existingOpportunities', 'demosConducted', 'statusChanges', 'attendance', 'tasksAssigned'] as const;
type MetricKey = (typeof METRIC_KEYS)[number];
const MAX_DAYS = 31;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEIGHT_TOTAL = 1;

export interface MetricSetting {
  metricKey: string;
  label: string;
  target: number;
  weight: number;
}

export interface MetricValue {
  target: number;
  auto: number;
  supervisor: number | null;
  note: string | null;
  updatedAt: string | null;
  // The records behind the number, shown when hovering over it.
  names: string[];
}

export interface PersonDay {
  userId: string;
  name: string;
  approvedAt: string | null;
  approvedById: string | null;
  lastUpdatedAt: string | null;
  metrics: Record<string, MetricValue>;
  autoScore: number;
  supervisorScore: number;
}

const rows = (sql: string, params: unknown[] = []) => AppDataSource.query(sql, params) as Promise<any[]>;

const todayIso = () => new Date().toISOString().slice(0, 10);

// Every date from `from` to `to`, inclusive, as YYYY-MM-DD.
function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

function assertDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new AppError(400, `${label} must be a date in YYYY-MM-DD form`);
  }
  return value;
}

export async function listSettings(): Promise<MetricSetting[]> {
  return (await rows(`SELECT "metricKey", label, target::float AS target, weight::float AS weight FROM kpi_metric_weights ORDER BY weight DESC, label`)) as MetricSetting[];
}

// Replaces the targets and weights from Settings. The weights must add up to 1.0.
export async function saveSettings(actor: AuthUser | undefined, items: Array<{ metricKey: string; target: unknown; weight: unknown }>): Promise<MetricSetting[]> {
  if (!canPerformAction(actor, 'kpi_setup', 'update')) throw new AppError(403, 'You do not have permission to change KPI targets and weightage');
  const current = await listSettings();
  const known = new Set(current.map((c) => c.metricKey));
  const next = new Map(current.map((c) => [c.metricKey, { target: c.target, weight: c.weight }]));
  for (const i of items) {
    if (!known.has(i.metricKey)) throw new AppError(400, `Unknown KPI: ${i.metricKey}`);
    const target = Number(i.target);
    const weight = Number(i.weight);
    if (!Number.isFinite(target) || target <= 0 || target > 1_000_000) throw new AppError(400, 'Target must be a number above 0');
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new AppError(400, 'Weightage must be a number from 0 to 1');
    next.set(i.metricKey, { target, weight });
  }
  const total = [...next.values()].reduce((s, v) => s + v.weight, 0);
  if (Math.abs(total - WEIGHT_TOTAL) > 0.0001) {
    throw new AppError(400, `The weightage must add up to ${WEIGHT_TOTAL.toFixed(1)} (it is now ${total.toFixed(2)})`);
  }
  await AppDataSource.transaction(async (manager) => {
    for (const [metricKey, v] of next) {
      await manager.query(
        `UPDATE kpi_metric_weights SET target = $2, weight = $3, "updatedById" = $4, "updatedAt" = NOW() WHERE "metricKey" = $1`,
        [metricKey, v.target, v.weight, actor!.id]
      );
    }
  });
  return listSettings();
}

// The people the viewer may act on in a module: all salespeople for all scope, their team for team scope,
// only themselves for self scope. Throws if the viewer has no access to the module.
async function assertVisibleTo(actor: AuthUser | undefined, userId: string, module: string) {
  const visible = await ownersForFilter(actor, undefined, module);
  if (visible && !visible.includes(userId)) throw new AppError(403, 'You cannot access this person');
}

// Confirms the actor may verify this person's KPIs: an Admin, or a supervisor of one of the person's teams.
async function assertCanVerify(actor: AuthUser | undefined, userId: string) {
  if (!canPerformAction(actor, 'kpi_verification', 'update')) throw new AppError(403, 'You do not have permission to verify KPIs');
  await assertVisibleTo(actor, userId, 'kpi_verification');
}

// Each CRM event behind the daily KPIs, one row per event: day (YYYY-MM-DD), owner, and a label naming the
// record (account, prospect, deal, visit, task). Counts and the names shown on hover both come from these rows.
//   newLeads: accounts whose prospecting was completed that day.
//   prospects: prospects added that day.
//   demosConducted: every move into Demonstration on an opportunity. A demo that happens again is counted again.
//   statusChanges: every stage movement on an opportunity, and every status change on a prospect.
//   existingOpportunities: sales visits that day plus demos conducted.
//   attendance: a successful login that day (the rule in verificationDays also needs a KPI change).
//   tasksAssigned: tasks given to the person that day.
async function crmEvents(from: string, to: string, owners: string[] | null) {
  const ownerAnd = (col: string) => (owners ? ` AND ${col} = ANY($3::uuid[])` : '');
  const withOwners = owners ? [from, to, owners] : [from, to];
  const range = (col: string) => `${col} >= $1::date AND ${col} < ($2::date + INTERVAL '1 day')`;
  const visitDate = `COALESCE(v."visitDate", v."createdAt")`;
  const prospectName = (p: string) => `COALESCE(NULLIF(TRIM(${p}.company), ''), TRIM(${p}."firstName" || ' ' || ${p}."lastName"))`;

  const queries: Array<[MetricKey, string]> = [
    ['newLeads', `SELECT DATE(a."prospectedAt")::text AS day, a."ownerId"::text AS owner, a.name AS label
       FROM leads a WHERE a."prospectedAt" IS NOT NULL AND ${range('a."prospectedAt"')}${ownerAnd('a."ownerId"')}`],
    ['prospects', `SELECT DATE(p."createdAt")::text AS day, p."ownerId"::text AS owner, ${prospectName('p')} AS label
       FROM prospects p WHERE ${range('p."createdAt"')}${ownerAnd('p."ownerId"')}`],
    ['existingOpportunities', `SELECT DATE(${visitDate})::text AS day, v."createdById"::text AS owner, COALESCE(v."companyName", 'Visit') AS label
         FROM sales_visits v WHERE ${range(visitDate)}${ownerAnd('v."createdById"')}
       UNION ALL
       SELECT DATE(h."createdAt")::text AS day, o."ownerId"::text AS owner, o.name AS label
         FROM opportunity_stage_history h JOIN opportunities o ON o.id = h."opportunityId"
        WHERE h."toStage" = 'Demonstration' AND ${range('h."createdAt"')}${ownerAnd('o."ownerId"')}`],
    ['demosConducted', `SELECT DATE(h."createdAt")::text AS day, o."ownerId"::text AS owner, o.name AS label
       FROM opportunity_stage_history h JOIN opportunities o ON o.id = h."opportunityId"
      WHERE h."toStage" = 'Demonstration' AND ${range('h."createdAt"')}${ownerAnd('o."ownerId"')}`],
    ['statusChanges', `SELECT DATE(h."createdAt")::text AS day, o."ownerId"::text AS owner, o.name AS label
         FROM opportunity_stage_history h JOIN opportunities o ON o.id = h."opportunityId"
        WHERE ${range('h."createdAt"')}${ownerAnd('o."ownerId"')}
       UNION ALL
       SELECT DATE(h."createdAt")::text AS day, l."ownerId"::text AS owner, ${prospectName('l')} AS label
         FROM prospect_status_history h JOIN prospects l ON l.id = h."prospectId"
        WHERE ${range('h."createdAt"')}${ownerAnd('l."ownerId"')}`],
    ['attendance', `SELECT DATE("createdAt")::text AS day, "userId"::text AS owner, 'Login' AS label
       FROM login_activity
      WHERE event = 'LOGIN_SUCCESS' AND success = true AND "userId" IS NOT NULL AND ${range('"createdAt"')}${ownerAnd('"userId"')}`],
    ['tasksAssigned', `SELECT DATE(t."createdAt")::text AS day, t."assigneeId"::text AS owner, t.title AS label
       FROM tasks t WHERE ${range('t."createdAt"')}${ownerAnd('t."assigneeId"')}`],
  ];

  // Events per metric, grouped by person and day.
  const events = new Map<MetricKey, Map<string, string[]>>();
  for (const [metric, sql] of queries) {
    const byKey = new Map<string, string[]>();
    for (const r of await rows(sql, withOwners)) {
      const key = `${r.owner}|${r.day}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(r.label ?? '');
    }
    events.set(metric, byKey);
  }
  return events;
}

// The verification page: for each day in the range, each person's CRM values, supervisor values, scores and approval.
export async function verificationDays(actor: AuthUser | undefined, input: { from?: string; to?: string; userId?: string }) {
  if (!canPerformAction(actor, 'kpi_verification', 'read')) throw new AppError(403, 'You do not have permission to view KPI verification');
  const from = input.from ? assertDate(input.from, 'From date') : todayIso();
  const to = input.to ? assertDate(input.to, 'To date') : from;
  validateFilters({ from, to });
  const days = datesBetween(from, to);
  if (days.length > MAX_DAYS) throw new AppError(400, `Choose at most ${MAX_DAYS} days at a time`);

  // Salespeople: active users whose departments (their own, or their role's when they have none) include Sales.
  const salesRows = await rows(
    `SELECT u.id::text AS id, u."firstName", u."lastName"
       FROM users u LEFT JOIN roles r ON r.id = u."roleId"
      WHERE u."isActive" = true
        AND 'Sales' = ANY(string_to_array(COALESCE(NULLIF(u.departments, ''), r.departments, ''), ','))
      ORDER BY u."firstName", u."lastName"`
  );
  const salesIds = salesRows.map((r) => r.id);
  // The salespeople the viewer may see (all, their team, or only themselves).
  const visible = await ownersForFilter(actor, undefined, 'kpi_verification');
  const owners = visible ? visible.filter((id) => salesIds.includes(id)) : salesIds;
  const staff = salesRows
    .filter((r) => !visible || visible.includes(r.id))
    .map((u) => ({ userId: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown user' }));
  const staffFilter = input.userId && UUID.test(input.userId) ? input.userId : null;
  const settings = await listSettings();
  const byMetric = new Map(settings.map((s) => [s.metricKey, s]));
  // Supervisor-set targets for each person; a KPI without one uses the default target.
  const personTargets = new Map<string, number>();
  for (const t of await rows(
    owners ? `SELECT "userId"::text AS "userId", "metricKey", target::float AS target FROM kpi_person_targets WHERE "userId" = ANY($1::uuid[])`
           : `SELECT "userId"::text AS "userId", "metricKey", target::float AS target FROM kpi_person_targets`,
    owners ? [owners] : []
  )) {
    personTargets.set(`${t.userId}|${t.metricKey}`, Number(t.target));
  }
  const targetOf = (userId: string, metric: MetricKey) => personTargets.get(`${userId}|${metric}`) ?? byMetric.get(metric)?.target ?? 1;

  // CRM values, counted from the opportunities, leads, prospects, visits, logins and tasks for the range.
  const crm = new Map<string, Record<string, number>>();
  const valueFor = (userId: string, day: string) => {
    const key = `${userId}|${day}`;
    if (!crm.has(key)) crm.set(key, Object.fromEntries(METRIC_KEYS.map((k) => [k, 0])));
    return crm.get(key)!;
  };
  const names = new Map<string, string>();
  const events = await crmEvents(from, to, owners);
  for (const [metric, byKey] of events) {
    for (const [key, labels] of byKey) {
      const [userId, day] = key.split('|');
      valueFor(userId, day)[metric] = labels.length;
    }
  }
  // Every salesperson in view gets a row on every day, even with no activity, so their targets show.
  for (const day of days) {
    for (const id of owners) valueFor(id, day);
  }
  // Attendance: a login counts only when the same person also makes a KPI change that day.
  for (const v of crm.values()) {
    const changes = METRIC_KEYS.filter((k) => k !== 'attendance').reduce((t, k) => t + v[k], 0);
    v.attendance = v.attendance > 0 && changes > 0 ? 1 : 0;
  }
  const ownerIds = [...new Set([...crm.keys()].map((k) => k.split('|')[0]))];
  if (ownerIds.length > 0) {
    const users = await rows(`SELECT id::text AS id, "firstName", "lastName" FROM users WHERE id = ANY($1::uuid[])`, [ownerIds]);
    for (const u of users) names.set(u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown user');
  }

  // Supervisor values, remarks and approvals in the range, limited to the people the viewer can see.
  const ownerClause = owners ? `AND "userId" = ANY($3::uuid[])` : '';
  const ownerParams: unknown[] = owners ? [owners] : [];
  const supervisorRows = await rows(
    `SELECT "userId", day::text AS day, "metricKey", "supervisorValue"::float AS value, note, "updatedAt"
       FROM kpi_daily_verifications WHERE day >= $1::date AND day <= $2::date ${ownerClause}`,
    [from, to, ...ownerParams]
  );
  const approvalRows = await rows(
    `SELECT "userId", day::text AS day, "approvedById", "approvedAt"
       FROM kpi_daily_approvals WHERE day >= $1::date AND day <= $2::date ${ownerClause}`,
    [from, to, ...ownerParams]
  );

  // Names for people who appear only through a supervisor value or approval.
  const extraIds = [...new Set([...supervisorRows, ...approvalRows].map((r) => r.userId))].filter((id) => !names.has(id));
  if (extraIds.length > 0) {
    const users = await rows(`SELECT id::text AS id, "firstName", "lastName" FROM users WHERE id = ANY($1::uuid[])`, [extraIds]);
    for (const u of users) names.set(u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown user');
  }
  for (const r of [...supervisorRows, ...approvalRows]) valueFor(r.userId, r.day);

  const supervisorBy = new Map<string, Record<string, { value: number | null; note: string | null; updatedAt: string }>>();
  const lastUpdatedBy = new Map<string, string>();
  for (const r of supervisorRows) {
    const key = `${r.userId}|${r.day}`;
    const updatedAt = new Date(r.updatedAt).toISOString();
    if (!supervisorBy.has(key)) supervisorBy.set(key, {});
    supervisorBy.get(key)![r.metricKey] = { value: r.value === null ? null : Number(r.value), note: r.note, updatedAt };
    if (!lastUpdatedBy.has(key) || lastUpdatedBy.get(key)! < updatedAt) lastUpdatedBy.set(key, updatedAt);
  }
  const approvalBy = new Map(approvalRows.map((r) => [`${r.userId}|${r.day}`, r]));

  // Score for a value: weight x how much of the target it reached, capped at the target.
  const scoreOf = (userId: string, metric: MetricKey, value: number) => {
    const s = byMetric.get(metric);
    if (!s) return 0;
    return s.weight * Math.min(value / targetOf(userId, metric), 1);
  };

  const result = days.map((day) => {
    const personDays: PersonDay[] = [];
    for (const [key, v] of crm) {
      const [userId, d] = key.split('|');
      if (d !== day) continue;
      if (staffFilter && userId !== staffFilter) continue;
      const sup = supervisorBy.get(key) || {};
      const metrics: Record<string, MetricValue> = {};
      let autoScore = 0;
      let supervisorScore = 0;
      for (const k of METRIC_KEYS) {
        const auto = v[k];
        const supervisor = sup[k]?.value ?? null;
        metrics[k] = { target: targetOf(userId, k), auto, supervisor, note: sup[k]?.note ?? null, updatedAt: sup[k]?.updatedAt ?? null, names: [] };
        metrics[k].names = events.get(k)?.get(key) ?? [];
        autoScore += scoreOf(userId, k, auto);
        supervisorScore += scoreOf(userId, k, supervisor ?? auto);
      }
      const approval = approvalBy.get(key);
      personDays.push({
        userId,
        name: names.get(userId) || 'Unknown user',
        approvedAt: approval ? new Date(approval.approvedAt).toISOString() : null,
        approvedById: approval ? approval.approvedById : null,
        lastUpdatedAt: lastUpdatedBy.get(key) ?? null,
        metrics,
        autoScore,
        supervisorScore,
      });
    }
    personDays.sort((a, b) => a.name.localeCompare(b.name));
    return { day, people: personDays };
  });

  // Who the viewer may enter values and approve for: nobody without the update permission, otherwise the people
  // they can see. Unlock needs the delete permission.
  const canVerify = !canPerformAction(actor, 'kpi_verification', 'update') ? [] : visible ?? 'all';
  const canUnlock = canPerformAction(actor, 'kpi_verification', 'delete');
  return { from, to, staff, staffId: staffFilter, settings, canVerify, canUnlock, days: result };
}

// Saves the supervisor's value for one KPI on one person's day. An empty value clears it.
export async function setSupervisorValue(
  actor: AuthUser | undefined,
  input: { userId: string; day: string; metricKey: string; value: unknown; note?: unknown }
) {
  const day = assertDate(input.day, 'Day');
  await assertCanVerify(actor, input.userId);
  if (!METRIC_KEYS.includes(input.metricKey as MetricKey)) throw new AppError(400, `Unknown KPI: ${input.metricKey}`);
  await assertNotApproved(input.userId, day);

  let value: number | null = null;
  if (input.value !== null && input.value !== undefined && input.value !== '') {
    value = Number(input.value);
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000) throw new AppError(400, 'The supervisor value must be a number from 0 to 1,000,000');
  }
  const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim().slice(0, 500) : null;

  await AppDataSource.query(
    `INSERT INTO kpi_daily_verifications ("userId", day, "metricKey", "supervisorValue", note, "updatedById", "updatedAt")
     VALUES ($1, $2::date, $3, $4, $5, $6, NOW())
     ON CONFLICT ("userId", day, "metricKey")
     DO UPDATE SET "supervisorValue" = EXCLUDED."supervisorValue", note = EXCLUDED.note,
                   "updatedById" = EXCLUDED."updatedById", "updatedAt" = NOW()`,
    [input.userId, day, input.metricKey, value, note, actor!.id]
  );
  return { userId: input.userId, day, metricKey: input.metricKey, value, note };
}

// An approved day is locked: its supervisor values and remarks can no longer be changed.
async function assertNotApproved(userId: string, day: string) {
  const approved = await rows(`SELECT 1 FROM kpi_daily_approvals WHERE "userId" = $1 AND day = $2::date`, [userId, day]);
  if (approved.length > 0) throw new AppError(400, 'This day is approved and can no longer be changed');
}

// Marks one person's day as verified by the supervisor. Approving again changes nothing.
export async function approveDay(actor: AuthUser | undefined, input: { userId: string; day: string }) {
  const day = assertDate(input.day, 'Day');
  await assertCanVerify(actor, input.userId);
  await AppDataSource.query(
    `INSERT INTO kpi_daily_approvals ("userId", day, "approvedById", "approvedAt")
     VALUES ($1, $2::date, $3, NOW())
     ON CONFLICT ("userId", day) DO NOTHING`,
    [input.userId, day, actor!.id]
  );
  return { userId: input.userId, day };
}

// The salespeople the viewer may see for KPI targets. Needs the kpi_targets permission for the action.
async function targetMembers(actor: AuthUser | undefined, action: 'read' | 'update'): Promise<Array<{ userId: string; name: string }>> {
  if (!canPerformAction(actor, 'kpi_targets', action)) throw new AppError(403, 'You do not have permission to set KPI targets');
  const visible = await ownersForFilter(actor, undefined, 'kpi_targets');
  const sales = await rows(
    `SELECT u.id::text AS id, u."firstName", u."lastName"
       FROM users u LEFT JOIN roles r ON r.id = u."roleId"
      WHERE u."isActive" = true
        AND 'Sales' = ANY(string_to_array(COALESCE(NULLIF(u.departments, ''), r.departments, ''), ','))
      ORDER BY u."firstName", u."lastName"`
  );
  return sales
    .filter((u) => !visible || visible.includes(u.id))
    .map((u) => ({ userId: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown user' }));
}

// The targets page: each person in the viewer's teams, the default target and their own target for each KPI.
export async function targetsPage(actor: AuthUser | undefined) {
  const members = await targetMembers(actor, 'read');
  const settings = await listSettings();
  const ids = members.map((m) => m.userId);
  const set = ids.length
    ? await rows(`SELECT "userId"::text AS "userId", "metricKey", target::float AS target FROM kpi_person_targets WHERE "userId" = ANY($1::uuid[])`, [ids])
    : [];
  const own = new Map(set.map((r) => [`${r.userId}|${r.metricKey}`, Number(r.target)]));
  return {
    settings,
    people: members.map((m) => ({
      ...m,
      targets: Object.fromEntries(settings.map((s) => [s.metricKey, own.get(`${m.userId}|${s.metricKey}`) ?? null])),
    })),
  };
}

// Sets one person's target for one KPI. An empty target clears it, so the default applies again.
export async function setPersonTarget(actor: AuthUser | undefined, input: { userId: string; metricKey: string; target: unknown }) {
  const members = await targetMembers(actor, 'update');
  if (!members.some((m) => m.userId === input.userId)) throw new AppError(403, 'You can only set targets for people you can see');
  const known = await rows(`SELECT 1 FROM kpi_metric_weights WHERE "metricKey" = $1`, [input.metricKey]);
  if (known.length === 0) throw new AppError(400, `Unknown KPI: ${input.metricKey}`);

  if (input.target === null || input.target === undefined || input.target === '') {
    await AppDataSource.query(`DELETE FROM kpi_person_targets WHERE "userId" = $1 AND "metricKey" = $2`, [input.userId, input.metricKey]);
    return { userId: input.userId, metricKey: input.metricKey, target: null };
  }
  const target = Number(input.target);
  if (!Number.isFinite(target) || target <= 0 || target > 1_000_000) throw new AppError(400, 'Target must be a number above 0');
  await AppDataSource.query(
    `INSERT INTO kpi_person_targets ("userId", "metricKey", target, "updatedById", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT ("userId", "metricKey") DO UPDATE SET target = EXCLUDED.target, "updatedById" = EXCLUDED."updatedById", "updatedAt" = NOW()`,
    [input.userId, input.metricKey, target, actor!.id]
  );
  return { userId: input.userId, metricKey: input.metricKey, target };
}

// Unlocks an approved day so the supervisor can enter values again. Needs the kpi_verification delete permission.
export async function unlockDay(actor: AuthUser | undefined, input: { userId: string; day: string }) {
  const day = assertDate(input.day, 'Day');
  if (!canPerformAction(actor, 'kpi_verification', 'delete')) throw new AppError(403, 'You do not have permission to unlock KPI days');
  await assertVisibleTo(actor, input.userId, 'kpi_verification');
  const approved = await rows(`SELECT 1 FROM kpi_daily_approvals WHERE "userId" = $1 AND day = $2::date`, [input.userId, day]);
  if (approved.length === 0) throw new AppError(404, 'This day is not approved');
  await AppDataSource.query(`DELETE FROM kpi_daily_approvals WHERE "userId" = $1 AND day = $2::date`, [input.userId, day]);
  return { userId: input.userId, day, unlockedBy: actor!.id };
}
