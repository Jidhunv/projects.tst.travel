"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLifecycleRow = buildLifecycleRow;
exports.summariseLifecycle = summariseLifecycle;
const database_1 = require("../config/database");
// Lead lifecycle: when each lead was created, qualified and converted, and when its deal reached each
// later stage and closed. Built from the lead status history and the deal stage history.
const DAY = 86400000;
const days = (from, to) => (from && to ? Math.round(((to.getTime() - from.getTime()) / DAY) * 10) / 10 : null);
// Pure: builds one row from a lead's status events and its (first) deal's stage events.
function buildLifecycleRow(lead, leadEvents, deal, dealEvents) {
    const first = (list, pred) => list.find(pred)?.at ?? null;
    const qualifiedAt = first(leadEvents, (e) => e.status === 'Qualified');
    const disqualifiedAt = first(leadEvents, (e) => e.status === 'Disqualified');
    const convertedAt = first(leadEvents, (e) => e.status === 'Converted');
    const demonstrationAt = first(dealEvents, (e) => e.stage === 'Demonstration');
    const proposalAt = first(dealEvents, (e) => e.stage === 'Proposal');
    const negotiationAt = first(dealEvents, (e) => e.stage === 'Negotiation');
    const closedAt = first(dealEvents, (e) => e.stage === 'Closed-Won' || e.stage === 'Closed-Lost');
    const outcome = disqualifiedAt && !convertedAt ? 'Disqualified'
        : !deal ? 'Not converted'
            : deal.stage === 'Closed-Won' ? 'Won'
                : deal.stage === 'Closed-Lost' ? 'Lost'
                    : 'Open';
    return {
        leadId: lead.id, leadName: lead.name, company: lead.company, ownerName: lead.ownerName, currentLeadStatus: lead.status,
        createdAt: lead.createdAt, qualifiedAt, disqualifiedAt, convertedAt,
        dealId: deal?.id ?? null, dealName: deal?.name ?? null,
        demonstrationAt, proposalAt, negotiationAt, closedAt, outcome, dealStage: deal?.stage ?? null,
        daysLeadToQualified: days(lead.createdAt, qualifiedAt),
        daysQualifiedToDemo: days(qualifiedAt, demonstrationAt),
        daysDemoToProposal: days(demonstrationAt, proposalAt),
        daysProposalToNegotiation: days(proposalAt, negotiationAt),
        daysNegotiationToClose: days(negotiationAt, closedAt),
        daysLeadToClose: days(lead.createdAt, closedAt),
    };
}
// Averages and conversion rates over a set of rows.
function summariseLifecycle(rows) {
    const avg = (xs) => {
        const v = xs.filter((x) => x !== null);
        return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
    };
    const n = rows.length;
    const pct = (k) => (n ? Math.round((k / n) * 1000) / 10 : null);
    return {
        leads: n,
        qualified: rows.filter((r) => r.qualifiedAt).length,
        converted: rows.filter((r) => r.convertedAt).length,
        won: rows.filter((r) => r.outcome === 'Won').length,
        lost: rows.filter((r) => r.outcome === 'Lost').length,
        open: rows.filter((r) => r.outcome === 'Open').length,
        disqualified: rows.filter((r) => r.outcome === 'Disqualified').length,
        qualifiedPct: pct(rows.filter((r) => r.qualifiedAt).length),
        convertedPct: pct(rows.filter((r) => r.convertedAt).length),
        wonPct: pct(rows.filter((r) => r.outcome === 'Won').length),
        avgDays: {
            leadToQualified: avg(rows.map((r) => r.daysLeadToQualified)),
            qualifiedToDemo: avg(rows.map((r) => r.daysQualifiedToDemo)),
            demoToProposal: avg(rows.map((r) => r.daysDemoToProposal)),
            proposalToNegotiation: avg(rows.map((r) => r.daysProposalToNegotiation)),
            negotiationToClose: avg(rows.map((r) => r.daysNegotiationToClose)),
            leadToClose: avg(rows.map((r) => r.daysLeadToClose)),
        },
    };
}
class LifecycleService {
    async report(f) {
        const conds = [];
        const args = [];
        const p = (v) => { args.push(v); return `$${args.length}`; };
        if (f.ownerId)
            conds.push(`l."ownerId" = ${p(f.ownerId)}`);
        if (f.from)
            conds.push(`l."createdAt" >= ${p(new Date(`${f.from}T00:00:00Z`))}`);
        if (f.to)
            conds.push(`l."createdAt" < ${p(new Date(Date.parse(`${f.to}T00:00:00Z`) + 86400000))}`);
        const w = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
        const leads = await database_1.AppDataSource.query(`SELECT l.id, l."firstName", l."lastName", l.company, l.status, l."createdAt",
              COALESCE(u."firstName" || ' ' || u."lastName", '') AS "ownerName"
       FROM prospects l LEFT JOIN users u ON u.id = l."ownerId" ${w} ORDER BY l."createdAt" DESC LIMIT 5000`, args);
        if (leads.length === 0)
            return { rows: [], summary: summariseLifecycle([]) };
        const ids = leads.map((l) => l.id);
        const leadHist = await database_1.AppDataSource.query('SELECT "prospectId" AS "leadId", "toStatus", "createdAt" FROM prospect_status_history WHERE "prospectId" = ANY($1::uuid[]) ORDER BY "createdAt", id', [ids]);
        // The first deal created from each lead (a lead can convert more than once in theory).
        const deals = await database_1.AppDataSource.query(`SELECT o.id, o.name, o.stage, o.status, o."convertedFromLeadId", o."createdAt"
       FROM opportunities o WHERE o."convertedFromLeadId" = ANY($1::text[]) ORDER BY o."createdAt"`, [ids]);
        const dealIds = [...new Set(deals.map((d) => d.id))];
        const dealHist = dealIds.length
            ? await database_1.AppDataSource.query('SELECT "opportunityId", "toStage", "createdAt" FROM opportunity_stage_history WHERE "opportunityId" = ANY($1::uuid[]) ORDER BY "createdAt", id', [dealIds])
            : [];
        const rows = leads.map((l) => {
            const lh = leadHist.filter((h) => h.leadId === l.id).map((h) => ({ status: h.toStatus, at: new Date(h.createdAt) }));
            const deal = deals.find((d) => d.convertedFromLeadId === l.id) || null;
            const dh = deal ? dealHist.filter((h) => h.opportunityId === deal.id).map((h) => ({ stage: h.toStage, at: new Date(h.createdAt) })) : [];
            return buildLifecycleRow({ id: l.id, name: `${l.firstName} ${l.lastName}`.trim(), company: l.company || '', ownerName: l.ownerName, status: l.status, createdAt: new Date(l.createdAt) }, lh, deal ? { id: deal.id, name: deal.name, stage: deal.stage, status: deal.status } : null, dh);
        });
        return { rows, summary: summariseLifecycle(rows) };
    }
    // How much happened in a period, per week or month: new leads, qualifications, new deals, demos,
    // proposals, negotiations, wins and losses; plus the most recent additions. Scoped like the other reports.
    // Every query builds its own parameters, so each one only passes what it uses.
    async activity(f) {
        const grain = f.grain === 'month' ? 'month' : 'week';
        const scoped = (dateCol, ownerCol, extra = []) => {
            const a = [];
            const c = [...extra];
            const p = (v) => { a.push(v); return `$${a.length}`; };
            if (f.from)
                c.push(`${dateCol} >= ${p(new Date(`${f.from}T00:00:00Z`))}`);
            if (f.to)
                c.push(`${dateCol} < ${p(new Date(Date.parse(`${f.to}T00:00:00Z`) + 86400000))}`);
            if (f.ownerId)
                c.push(`${ownerCol} = ${p(f.ownerId)}`);
            return { where: c.length ? `WHERE ${c.join(' AND ')}` : '', args: a };
        };
        const L = scoped('l."createdAt"', 'l."ownerId"');
        const Q = scoped('h."createdAt"', 'l."ownerId"', [`h."toStatus" = 'Qualified'`]);
        const D = scoped('o."createdAt"', 'o."ownerId"');
        const W = scoped('h."createdAt"', 'o."ownerId"', [`h."toStage" IN ('Closed-Won', 'Closed-Lost')`]);
        const S = scoped('h."createdAt"', 'o."ownerId"', [`h."toStage" IN ('Demonstration', 'Proposal', 'Negotiation')`]);
        const leads = await database_1.AppDataSource.query(`SELECT date_trunc('${grain}', l."createdAt")::date AS period, COUNT(*) n FROM prospects l ${L.where} GROUP BY 1`, L.args);
        const qual = await database_1.AppDataSource.query(`SELECT date_trunc('${grain}', h."createdAt")::date AS period, COUNT(*) n
       FROM prospect_status_history h JOIN prospects l ON l.id = h."prospectId" ${Q.where} GROUP BY 1`, Q.args);
        const deals = await database_1.AppDataSource.query(`SELECT date_trunc('${grain}', o."createdAt")::date AS period, COUNT(*) n FROM opportunities o ${D.where} GROUP BY 1`, D.args);
        const wins = await database_1.AppDataSource.query(`SELECT date_trunc('${grain}', h."createdAt")::date AS period,
              SUM(CASE WHEN h."toStage" = 'Closed-Won' THEN 1 ELSE 0 END) won,
              SUM(CASE WHEN h."toStage" = 'Closed-Lost' THEN 1 ELSE 0 END) lost
       FROM opportunity_stage_history h JOIN opportunities o ON o.id = h."opportunityId" ${W.where} GROUP BY 1`, W.args);
        const stageRows = await database_1.AppDataSource.query(`SELECT date_trunc('${grain}', h."createdAt")::date AS period, h."toStage" AS stage, COUNT(*) n
       FROM opportunity_stage_history h JOIN opportunities o ON o.id = h."opportunityId" ${S.where} GROUP BY 1, 2`, S.args);
        const key = (d) => (d instanceof Date ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : String(d).slice(0, 10));
        const buckets = new Map();
        const get = (d) => {
            const k = key(d);
            if (!buckets.has(k))
                buckets.set(k, { period: k, newLeads: 0, qualified: 0, newDeals: 0, demos: 0, proposals: 0, negotiations: 0, won: 0, lost: 0 });
            return buckets.get(k);
        };
        for (const r of leads)
            get(r.period).newLeads = Number(r.n);
        for (const r of qual)
            get(r.period).qualified = Number(r.n);
        for (const r of deals)
            get(r.period).newDeals = Number(r.n);
        for (const r of wins) {
            get(r.period).won = Number(r.won);
            get(r.period).lost = Number(r.lost);
        }
        const stageKey = { Demonstration: 'demos', Proposal: 'proposals', Negotiation: 'negotiations' };
        for (const r of stageRows)
            get(r.period)[stageKey[r.stage]] += Number(r.n);
        const periods = [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
        // Latest additions, newest first.
        const [recLeads, recQual, recDeals, recWins] = await Promise.all([
            database_1.AppDataSource.query(`SELECT 'New lead' AS kind, l."createdAt" AS at, (l."firstName" || ' ' || l."lastName") AS name, l.company AS company,
                COALESCE(u."firstName" || ' ' || u."lastName", '') AS "by", l.id::text AS "refId"
         FROM prospects l LEFT JOIN users u ON u.id = l."ownerId" ${L.where} ORDER BY l."createdAt" DESC LIMIT 30`, L.args),
            database_1.AppDataSource.query(`SELECT 'Lead qualified' AS kind, h."createdAt" AS at, (l."firstName" || ' ' || l."lastName") AS name, l.company AS company,
                COALESCE(u."firstName" || ' ' || u."lastName", '') AS "by", l.id::text AS "refId"
         FROM prospect_status_history h JOIN prospects l ON l.id = h."prospectId" LEFT JOIN users u ON u.id = l."ownerId" ${Q.where}
         ORDER BY h."createdAt" DESC LIMIT 30`, Q.args),
            database_1.AppDataSource.query(`SELECT 'New deal (pipeline)' AS kind, o."createdAt" AS at, o.name AS name, '' AS company,
                COALESCE(u."firstName" || ' ' || u."lastName", '') AS "by", o.id::text AS "refId"
         FROM opportunities o LEFT JOIN users u ON u.id = o."ownerId" ${D.where} ORDER BY o."createdAt" DESC LIMIT 30`, D.args),
            database_1.AppDataSource.query(`SELECT CASE WHEN h."toStage" = 'Closed-Won' THEN 'Deal won' ELSE 'Deal lost' END AS kind, h."createdAt" AS at, o.name AS name, '' AS company,
                COALESCE(u."firstName" || ' ' || u."lastName", '') AS "by", o.id::text AS "refId"
         FROM opportunity_stage_history h JOIN opportunities o ON o.id = h."opportunityId" LEFT JOIN users u ON u.id = o."ownerId"
         ${W.where} ORDER BY h."createdAt" DESC LIMIT 30`, W.args),
        ]);
        const latest = [...recLeads, ...recQual, ...recDeals, ...recWins]
            .map((r) => ({ ...r, at: new Date(r.at) }))
            .sort((a, b) => b.at.getTime() - a.at.getTime())
            .slice(0, 30);
        const totals = periods.reduce((t, r) => ({
            newLeads: t.newLeads + r.newLeads, qualified: t.qualified + r.qualified, newDeals: t.newDeals + r.newDeals,
            demos: t.demos + r.demos, proposals: t.proposals + r.proposals, negotiations: t.negotiations + r.negotiations,
            won: t.won + r.won, lost: t.lost + r.lost,
        }), { newLeads: 0, qualified: 0, newDeals: 0, demos: 0, proposals: 0, negotiations: 0, won: 0, lost: 0 });
        return { grain, periods, totals, latest };
    }
}
exports.default = new LifecycleService();
//# sourceMappingURL=lifecycle.service.js.map