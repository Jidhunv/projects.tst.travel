import { AppDataSource } from '../config/database';
import { AuthUser, getReadScope } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { OPPORTUNITY_STAGES } from '../utils/constants';
import teamService from './team.service';

// Sales activity KPIs: what each salesperson has done over a date range, filtered
// by country, region and salesperson. Who may see whom follows the sales_visits
// read scope: all = every salesperson, team = self plus members of teams the
// viewer supervises, self = only the viewer.

export interface SalesActivityFilters {
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
  country?: string;
  region?: string;
  salespersonId?: string;
}

const UNASSIGNED = 'unassigned';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Owner ids the viewer may see, or null when every salesperson is visible.
export async function visibleOwnerIds(user: AuthUser | undefined, module = 'sales_visits'): Promise<string[] | null> {
  const scope = getReadScope(user, module);
  if (!user || !scope) throw new AppError(403, 'You do not have permission to view sales activity');
  if (scope === 'all') return null;
  if (scope === 'self') return [user.id];
  return [user.id, ...(await teamService.getSupervisedMemberUserIds(user.id))];
}

// Owners the query should cover, after applying an optional salesperson filter.
export async function ownersForFilter(user: AuthUser | undefined, salespersonId?: string, module = 'sales_visits'): Promise<string[] | null> {
  const visible = await visibleOwnerIds(user, module);
  if (!salespersonId) return visible;
  if (visible && !visible.includes(salespersonId)) {
    throw new AppError(403, 'You do not have permission to view this salesperson');
  }
  return [salespersonId];
}

// A real calendar date in YYYY-MM-DD form (rejects shapes like 2026-13-01).
const isCalendarDate = (d: string) => {
  if (!ISO_DATE.test(d)) return false;
  const parsed = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d;
};

export function validateFilters(f: SalesActivityFilters): SalesActivityFilters {
  for (const d of [f.from, f.to]) {
    if (d !== undefined && d !== '' && !isCalendarDate(d)) throw new AppError(400, 'Dates must be real dates in YYYY-MM-DD form');
  }
  if (f.from && f.to && f.from > f.to) throw new AppError(400, 'From date must be before the To date');
  return f;
}

// Builds a WHERE clause from conditions that are only added when a value is set.
// Write ? in a condition for the placeholder.
class Where {
  private parts: string[] = [];
  private params: unknown[] = [];

  add(condition: string, value?: unknown): this {
    if (value === undefined || value === null || value === '') return this;
    this.params.push(value);
    this.parts.push(condition.replace('?', `$${this.params.length}`));
    return this;
  }

  dateRange(column: string, f: SalesActivityFilters): this {
    return this.add(`${column} >= ?::date`, f.from).add(`${column} < (?::date + INTERVAL '1 day')`, f.to);
  }

  owners(column: string, owners: string[] | null): this {
    return owners ? this.add(`${column} = ANY(?::uuid[])`, owners) : this;
  }

  build(): { sql: string; params: unknown[] } {
    return { sql: this.parts.length ? `WHERE ${this.parts.join(' AND ')}` : '', params: this.params };
  }
}

interface PersonActivity {
  ownerId: string | null;
  name: string;
  leadsCreated: number;
  prospects: number;
  demosConducted: number;
  proposalsSent: number;
  reachedNegotiation: number;
  closedWon: number;
  closedLost: number;
  openDeals: number;
  pipelineValue: number;
  salesCalls: number;
  visits: number;
}

const emptyPerson = (ownerId: string, name: string): PersonActivity => ({
  ownerId: ownerId === UNASSIGNED ? null : ownerId,
  name,
  leadsCreated: 0,
  prospects: 0,
  demosConducted: 0,
  proposalsSent: 0,
  reachedNegotiation: 0,
  closedWon: 0,
  closedLost: 0,
  openDeals: 0,
  pipelineValue: 0,
  salesCalls: 0,
  visits: 0,
});

// Leads, deals and visits are attributed to their owner. Counts are for events that
// happened in the date range; the pipeline is a snapshot of deals as they stand today.
export async function summary(user: AuthUser | undefined, input: SalesActivityFilters) {
  const f = validateFilters(input);
  const owners = await ownersForFilter(user, f.salespersonId);
  const people = new Map<string, PersonActivity>();
  const person = (owner: string, names: Map<string, string>) => {
    let p = people.get(owner);
    if (!p) {
      p = emptyPerson(owner, owner === UNASSIGNED ? 'Unassigned' : names.get(owner) || 'Unknown user');
      people.set(owner, p);
    }
    return p;
  };
  const rows = async (sql: string, params: unknown[]) => AppDataSource.query(sql, params) as Promise<any[]>;

  // Leads created in the period.
  const leadW = new Where().dateRange('l."createdAt"', f).owners('l."ownerId"', owners).add('TRIM(l.country) = ?', f.country).add('TRIM(l.region) = ?', f.region).build();
  const leadsCreated = await rows(
    `SELECT COALESCE(l."ownerId"::text, '${UNASSIGNED}') AS owner, COUNT(*)::int AS n FROM prospects l ${leadW.sql} GROUP BY 1`,
    leadW.params
  );

  // Leads that moved to Prospect in the period.
  const prospectW = new Where().add('h."toStatus" = ?', 'Prospect').dateRange('h."createdAt"', f).owners('l."ownerId"', owners).add('TRIM(l.country) = ?', f.country).add('TRIM(l.region) = ?', f.region).build();
  const prospects = await rows(
    `SELECT COALESCE(l."ownerId"::text, '${UNASSIGNED}') AS owner, COUNT(DISTINCT h."prospectId")::int AS n
       FROM prospect_status_history h JOIN prospects l ON l.id = h."prospectId" ${prospectW.sql} GROUP BY 1`,
    prospectW.params
  );

  // Demos conducted (attendance recorded, DEMO-06) and proposals sent (PROP-07), answered in the period.
  const answerW = new Where().add('a."questionKey" = ANY(?::text[])', ['DEMO-06', 'PROP-07']).add('a.status = ?', 'answered').dateRange('a."updatedAt"', f).owners('o."ownerId"', owners).add('TRIM(o.country) = ?', f.country).add('TRIM(o.region) = ?', f.region).build();
  const answers = await rows(
    `SELECT COALESCE(o."ownerId"::text, '${UNASSIGNED}') AS owner, a."questionKey" AS key, COUNT(DISTINCT a."opportunityId")::int AS n
       FROM opportunity_answers a JOIN opportunities o ON o.id = a."opportunityId" ${answerW.sql} GROUP BY 1, 2`,
    answerW.params
  );

  // Deals that reached Negotiation, Closed-Won or Closed-Lost in the period.
  const stageW = new Where().add('h."toStage" = ANY(?::text[])', ['Negotiation', 'Closed-Won', 'Closed-Lost']).dateRange('h."createdAt"', f).owners('o."ownerId"', owners).add('TRIM(o.country) = ?', f.country).add('TRIM(o.region) = ?', f.region).build();
  const reached = await rows(
    `SELECT COALESCE(o."ownerId"::text, '${UNASSIGNED}') AS owner, h."toStage" AS stage, COUNT(DISTINCT h."opportunityId")::int AS n
       FROM opportunity_stage_history h JOIN opportunities o ON o.id = h."opportunityId" ${stageW.sql} GROUP BY 1, 2`,
    stageW.params
  );

  // Pipeline today: every deal as it stands, by owner and stage.
  const pipeW = new Where().dateRange('o."createdAt"', f).owners('o."ownerId"', owners).add('TRIM(o.country) = ?', f.country).add('TRIM(o.region) = ?', f.region).build();
  const pipeline = await rows(
    `SELECT COALESCE(o."ownerId"::text, '${UNASSIGNED}') AS owner, o.stage AS stage, COUNT(*)::int AS n, COALESCE(SUM(o.amount), 0)::float AS value
       FROM opportunities o ${pipeW.sql} GROUP BY 1, 2`,
    pipeW.params
  );

  // Sales visits in the period. A visit counts as a call when its type is Call.
  const visitW = new Where().dateRange('COALESCE(v."visitDate", v."createdAt")', f).owners('v."createdById"', owners).add('TRIM(a.country) = ?', f.country).add('TRIM(a.region) = ?', f.region).build();
  const visits = await rows(
    `SELECT COALESCE(v."createdById"::text, '${UNASSIGNED}') AS owner,
            COUNT(*) FILTER (WHERE v."visitType" = 'Call')::int AS calls,
            COUNT(*)::int AS visits
       FROM sales_visits v LEFT JOIN leads a ON a.id = v."accountId" ${visitW.sql} GROUP BY 1`,
    visitW.params
  );

  // Names for the people who appear in the results.
  const ownerIds = new Set<string>();
  for (const r of [...leadsCreated, ...prospects, ...answers, ...reached, ...pipeline, ...visits]) {
    if (r.owner !== UNASSIGNED) ownerIds.add(r.owner);
  }
  const names = new Map<string, string>();
  if (ownerIds.size > 0) {
    const users = await rows(
      `SELECT id::text AS id, "firstName", "lastName" FROM users WHERE id = ANY($1::uuid[])`,
      [[...ownerIds]]
    );
    for (const u of users) names.set(u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown user');
  }

  for (const r of leadsCreated) person(r.owner, names).leadsCreated = r.n;
  for (const r of prospects) person(r.owner, names).prospects = r.n;
  for (const r of answers) {
    const p = person(r.owner, names);
    if (r.key === 'DEMO-06') p.demosConducted = r.n;
    if (r.key === 'PROP-07') p.proposalsSent = r.n;
  }
  for (const r of reached) {
    const p = person(r.owner, names);
    if (r.stage === 'Negotiation') p.reachedNegotiation = r.n;
    if (r.stage === 'Closed-Won') p.closedWon = r.n;
    if (r.stage === 'Closed-Lost') p.closedLost = r.n;
  }
  const pipelineByStage = new Map<string, { stage: string; count: number; value: number }>(
    OPPORTUNITY_STAGES.map((s) => [s, { stage: s, count: 0, value: 0 }])
  );
  for (const r of pipeline) {
    const p = person(r.owner, names);
    const open = r.stage !== 'Closed-Won' && r.stage !== 'Closed-Lost';
    if (open) {
      p.openDeals += r.n;
      p.pipelineValue += r.value;
    }
    const stage = pipelineByStage.get(r.stage) ?? { stage: r.stage, count: 0, value: 0 };
    stage.count += r.n;
    stage.value += r.value;
    pipelineByStage.set(r.stage, stage);
  }
  for (const r of visits) {
    const p = person(r.owner, names);
    p.salesCalls = r.calls;
    p.visits = r.visits;
  }

  const byPerson = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  const totals = byPerson.reduce(
    (t, p) => {
      for (const key of Object.keys(t) as Array<keyof PersonActivity>) {
        if (key !== 'ownerId' && key !== 'name') (t as any)[key] += p[key];
      }
      return t;
    },
    { ...emptyPerson(UNASSIGNED, ''), ownerId: undefined, name: undefined } as Omit<PersonActivity, 'ownerId' | 'name'> & Record<string, any>
  );

  return {
    filters: f,
    totals,
    pipelineByStage: [...pipelineByStage.values()],
    byPerson,
  };
}

// Choices for the filter dropdowns: the people the viewer may see, and the countries and regions in use.
export async function options(user: AuthUser | undefined, module = 'sales_visits') {
  const visible = await visibleOwnerIds(user, module);
  const people = visible
    ? await AppDataSource.query(
        `SELECT id::text AS id, "firstName", "lastName" FROM users WHERE id = ANY($1::uuid[]) ORDER BY "firstName"`,
        [visible]
      )
    : await AppDataSource.query(
        `SELECT id::text AS id, "firstName", "lastName" FROM users WHERE "isActive" = true ORDER BY "firstName"`
      );
  const distinct = async (column: string) =>
    (
      await AppDataSource.query(
        `SELECT DISTINCT TRIM(${column}) AS value FROM (
           SELECT ${column} FROM opportunities UNION SELECT ${column} FROM prospects UNION SELECT ${column} FROM leads
         ) x WHERE TRIM(${column}) <> '' ORDER BY 1`
      )
    ).map((r: { value: string }) => r.value);
  return {
    people: people.map((u: any) => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown user' })),
    countries: await distinct('country'),
    regions: await distinct('region'),
    // Whether the viewer may pick anyone other than themselves.
    canViewOthers: visible === null || visible.length > 1,
  };
}
