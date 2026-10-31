"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visibleOwnerIds = visibleOwnerIds;
exports.ownersForFilter = ownersForFilter;
exports.validateFilters = validateFilters;
exports.summary = summary;
exports.options = options;
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const constants_1 = require("../utils/constants");
const team_service_1 = __importDefault(require("./team.service"));
const UNASSIGNED = 'unassigned';
// Pipeline table rows. Open, qualified and prospect statuses all make up the single Lead Prospects row.
const PROSPECT_STAGE_LABEL = { Open: 'Lead Prospects', Qualified: 'Lead Prospects', Prospect: 'Lead Prospects' };
const PROSPECT_STAGE_ROWS = ['Lead Account', 'Lead Prospects'];
const STAGE_LABEL = { 'Customer engagement': 'Customer Engagement', 'Closed-Won': 'Close Won', 'Closed-Lost': 'Close Lost' };
const stageLabel = (stage) => STAGE_LABEL[stage] ?? stage;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Owner ids the viewer may see, or null when every salesperson is visible.
async function visibleOwnerIds(user, module = 'sales_visits') {
    const scope = (0, auth_1.getReadScope)(user, module);
    if (!user || !scope)
        throw new errorHandler_1.AppError(403, 'You do not have permission to view sales activity');
    if (scope === 'all')
        return null;
    if (scope === 'self')
        return [user.id];
    return [user.id, ...(await team_service_1.default.getSupervisedMemberUserIds(user.id))];
}
// Owners the query should cover, after applying an optional salesperson filter.
async function ownersForFilter(user, salespersonId, module = 'sales_visits') {
    const visible = await visibleOwnerIds(user, module);
    if (!salespersonId)
        return visible;
    if (visible && !visible.includes(salespersonId)) {
        throw new errorHandler_1.AppError(403, 'You do not have permission to view this salesperson');
    }
    return [salespersonId];
}
// A real calendar date in YYYY-MM-DD form (rejects shapes like 2026-13-01).
const isCalendarDate = (d) => {
    if (!ISO_DATE.test(d))
        return false;
    const parsed = new Date(`${d}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d;
};
function validateFilters(f) {
    for (const d of [f.from, f.to]) {
        if (d !== undefined && d !== '' && !isCalendarDate(d))
            throw new errorHandler_1.AppError(400, 'Dates must be real dates in YYYY-MM-DD form');
    }
    if (f.from && f.to && f.from > f.to)
        throw new errorHandler_1.AppError(400, 'From date must be before the To date');
    return f;
}
// Builds a WHERE clause from conditions that are only added when a value is set.
// Write ? in a condition for the placeholder.
class Where {
    constructor() {
        this.parts = [];
        this.params = [];
    }
    add(condition, value) {
        if (value === undefined || value === null || value === '')
            return this;
        this.params.push(value);
        this.parts.push(condition.replace('?', `$${this.params.length}`));
        return this;
    }
    dateRange(column, f) {
        return this.add(`${column} >= ?::date`, f.from).add(`${column} < (?::date + INTERVAL '1 day')`, f.to);
    }
    owners(column, owners) {
        return owners ? this.add(`${column} = ANY(?::uuid[])`, owners) : this;
    }
    build() {
        return { sql: this.parts.length ? `WHERE ${this.parts.join(' AND ')}` : '', params: this.params };
    }
}
const emptyPerson = (ownerId, name) => ({
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
async function summary(user, input) {
    const f = validateFilters(input);
    const owners = await ownersForFilter(user, f.salespersonId);
    const people = new Map();
    const person = (owner, names) => {
        let p = people.get(owner);
        if (!p) {
            p = emptyPerson(owner, owner === UNASSIGNED ? 'Unassigned' : names.get(owner) || 'Unknown user');
            people.set(owner, p);
        }
        return p;
    };
    const rows = async (sql, params) => database_1.AppDataSource.query(sql, params);
    // Leads created in the period.
    const leadW = new Where().dateRange('l."createdAt"', f).owners('l."ownerId"', owners).add('TRIM(l.country) = ?', f.country).add('TRIM(l.region) = ?', f.region).build();
    const leadsCreated = await rows(`SELECT COALESCE(l."ownerId"::text, '${UNASSIGNED}') AS owner, COUNT(*)::int AS n FROM prospects l ${leadW.sql} GROUP BY 1`, leadW.params);
    // Leads that moved to Prospect in the period.
    const prospectW = new Where().add('h."toStatus" = ?', 'Prospect').dateRange('h."createdAt"', f).owners('l."ownerId"', owners).add('TRIM(l.country) = ?', f.country).add('TRIM(l.region) = ?', f.region).build();
    const prospects = await rows(`SELECT COALESCE(l."ownerId"::text, '${UNASSIGNED}') AS owner, COUNT(DISTINCT h."prospectId")::int AS n
       FROM prospect_status_history h JOIN prospects l ON l.id = h."prospectId" ${prospectW.sql} GROUP BY 1`, prospectW.params);
    // Proposals sent (PROP-07), answered in the period.
    const answerW = new Where().add('a."questionKey" = ?', 'PROP-07').add('a.status = ?', 'answered').dateRange('a."updatedAt"', f).owners('o."ownerId"', owners).add('TRIM(o.country) = ?', f.country).add('TRIM(o.region) = ?', f.region).build();
    const answers = await rows(`SELECT COALESCE(o."ownerId"::text, '${UNASSIGNED}') AS owner, a."questionKey" AS key, COUNT(DISTINCT a."opportunityId")::int AS n
       FROM opportunity_answers a JOIN opportunities o ON o.id = a."opportunityId" ${answerW.sql} GROUP BY 1, 2`, answerW.params);
    // Demos conducted: every move into Demonstration in the period. The same source as the KPI verification sheet,
    // so a demo that happens again is counted again.
    const demoW = new Where().add('h."toStage" = ?', 'Demonstration').dateRange('h."createdAt"', f).owners('o."ownerId"', owners).add('TRIM(o.country) = ?', f.country).add('TRIM(o.region) = ?', f.region).build();
    const demos = await rows(`SELECT COALESCE(o."ownerId"::text, '${UNASSIGNED}') AS owner, COUNT(*)::int AS n
       FROM opportunity_stage_history h JOIN opportunities o ON o.id = h."opportunityId" ${demoW.sql} GROUP BY 1`, demoW.params);
    // Deals that reached Negotiation, Closed-Won or Closed-Lost in the period.
    const stageW = new Where().add('h."toStage" = ANY(?::text[])', ['Negotiation', 'Closed-Won', 'Closed-Lost']).dateRange('h."createdAt"', f).owners('o."ownerId"', owners).add('TRIM(o.country) = ?', f.country).add('TRIM(o.region) = ?', f.region).build();
    const reached = await rows(`SELECT COALESCE(o."ownerId"::text, '${UNASSIGNED}') AS owner, h."toStage" AS stage, COUNT(DISTINCT h."opportunityId")::int AS n
       FROM opportunity_stage_history h JOIN opportunities o ON o.id = h."opportunityId" ${stageW.sql} GROUP BY 1, 2`, stageW.params);
    // Pipeline today: every deal as it stands, by owner and stage.
    const pipeW = new Where().dateRange('o."createdAt"', f).owners('o."ownerId"', owners).add('TRIM(o.country) = ?', f.country).add('TRIM(o.region) = ?', f.region).build();
    const pipeline = await rows(`SELECT COALESCE(o."ownerId"::text, '${UNASSIGNED}') AS owner, o.stage AS stage, COUNT(*)::int AS n, COALESCE(SUM(o.amount), 0)::float AS value
       FROM opportunities o ${pipeW.sql} GROUP BY 1, 2`, pipeW.params);
    // Sales visits in the period. A visit counts as a call when its type is Call.
    const visitW = new Where().dateRange('COALESCE(v."visitDate", v."createdAt")', f).owners('v."createdById"', owners).add('TRIM(a.country) = ?', f.country).add('TRIM(a.region) = ?', f.region).build();
    const visits = await rows(`SELECT COALESCE(v."createdById"::text, '${UNASSIGNED}') AS owner,
            COUNT(*) FILTER (WHERE v."visitType" = 'Call')::int AS calls,
            COUNT(*)::int AS visits
       FROM sales_visits v LEFT JOIN leads a ON a.id = v."accountId" ${visitW.sql} GROUP BY 1`, visitW.params);
    // Names for the people who appear in the results.
    const ownerIds = new Set();
    for (const r of [...leadsCreated, ...prospects, ...answers, ...demos, ...reached, ...pipeline, ...visits]) {
        if (r.owner !== UNASSIGNED)
            ownerIds.add(r.owner);
    }
    const names = new Map();
    if (ownerIds.size > 0) {
        const users = await rows(`SELECT id::text AS id, "firstName", "lastName" FROM users WHERE id = ANY($1::uuid[])`, [[...ownerIds]]);
        for (const u of users)
            names.set(u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown user');
    }
    for (const r of leadsCreated)
        person(r.owner, names).leadsCreated = r.n;
    for (const r of prospects)
        person(r.owner, names).prospects = r.n;
    for (const r of answers)
        person(r.owner, names).proposalsSent = r.n;
    for (const r of demos)
        person(r.owner, names).demosConducted = r.n;
    for (const r of reached) {
        const p = person(r.owner, names);
        if (r.stage === 'Negotiation')
            p.reachedNegotiation = r.n;
        if (r.stage === 'Closed-Won')
            p.closedWon = r.n;
        if (r.stage === 'Closed-Lost')
            p.closedLost = r.n;
    }
    // Lead accounts, leads and prospects come first, then the opportunity stages.
    const pipelineByStage = new Map([...PROSPECT_STAGE_ROWS, ...constants_1.OPPORTUNITY_STAGES.map(stageLabel)].map((s) => [s, { stage: s, count: 0, value: 0 }]));
    // Lead accounts: accounts whose prospecting is complete. Accounts have no value, so only the count.
    const accountFilter = (sql) => (sql ? `${sql} AND` : 'WHERE');
    const accW = new Where().dateRange('l."createdAt"', f).owners('l."ownerId"', owners).add('TRIM(l.country) = ?', f.country).add('TRIM(l.region) = ?', f.region).build();
    const [leadAccounts] = await rows(`SELECT COUNT(*)::int AS n FROM leads l ${accountFilter(accW.sql)} l."prospectedAt" IS NOT NULL`, accW.params);
    // Leads, qualified leads and prospects, from the prospects table, with their value.
    const prospW = new Where().dateRange('p."createdAt"', f).owners('p."ownerId"', owners).add('TRIM(p.country) = ?', f.country).add('TRIM(p.region) = ?', f.region).build();
    const prospectStages = await rows(`SELECT p.status AS status, COUNT(*)::int AS n, COALESCE(SUM(p.value), 0)::float AS value
       FROM prospects p ${accountFilter(prospW.sql)} p.status = ANY(ARRAY['Open', 'Qualified', 'Prospect']::text[])
      GROUP BY 1`, prospW.params);
    const leadAccountRow = pipelineByStage.get('Lead Account');
    leadAccountRow.count += leadAccounts?.n ?? 0;
    for (const r of prospectStages) {
        const stage = pipelineByStage.get(PROSPECT_STAGE_LABEL[r.status]);
        stage.count += r.n;
        stage.value += r.value;
    }
    for (const r of pipeline) {
        const p = person(r.owner, names);
        const open = r.stage !== 'Closed-Won' && r.stage !== 'Closed-Lost';
        if (open) {
            p.openDeals += r.n;
            p.pipelineValue += r.value;
        }
        const label = stageLabel(r.stage);
        const stage = pipelineByStage.get(label) ?? { stage: label, count: 0, value: 0 };
        stage.count += r.n;
        stage.value += r.value;
        pipelineByStage.set(label, stage);
    }
    for (const r of visits) {
        const p = person(r.owner, names);
        p.salesCalls = r.calls;
        p.visits = r.visits;
    }
    const byPerson = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
    const totals = byPerson.reduce((t, p) => {
        for (const key of Object.keys(t)) {
            if (key !== 'ownerId' && key !== 'name')
                t[key] += p[key];
        }
        return t;
    }, { ...emptyPerson(UNASSIGNED, ''), ownerId: undefined, name: undefined });
    return {
        filters: f,
        totals,
        pipelineByStage: [...pipelineByStage.values()],
        byPerson,
    };
}
// Choices for the filter dropdowns: the people the viewer may see, and the countries and regions in use.
async function options(user, module = 'sales_visits') {
    const visible = await visibleOwnerIds(user, module);
    const people = visible
        ? await database_1.AppDataSource.query(`SELECT id::text AS id, "firstName", "lastName" FROM users WHERE id = ANY($1::uuid[]) ORDER BY "firstName"`, [visible])
        : await database_1.AppDataSource.query(`SELECT id::text AS id, "firstName", "lastName" FROM users WHERE "isActive" = true ORDER BY "firstName"`);
    const distinct = async (column) => (await database_1.AppDataSource.query(`SELECT DISTINCT TRIM(${column}) AS value FROM (
           SELECT ${column} FROM opportunities UNION SELECT ${column} FROM prospects UNION SELECT ${column} FROM leads
         ) x WHERE TRIM(${column}) <> '' ORDER BY 1`)).map((r) => r.value);
    return {
        people: people.map((u) => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown user' })),
        countries: await distinct('country'),
        regions: await distinct('region'),
        // Whether the viewer may pick anyone other than themselves.
        canViewOthers: visible === null || visible.length > 1,
    };
}
//# sourceMappingURL=salesActivity.service.js.map