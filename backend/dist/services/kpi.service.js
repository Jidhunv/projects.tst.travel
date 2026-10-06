"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const targets_engine_1 = require("./targets.engine");
const num = (v) => Number(v || 0);
const pad = (n) => String(n).padStart(2, '0');
const dayStr = (v) => v ? (v instanceof Date ? `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}` : String(v).slice(0, 10)) : null;
const DAY = 86400000;
const addMonth = (firstOfMonth) => {
    const d = new Date(`${firstOfMonth}T00:00:00Z`);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
};
class KpiService {
    // Append one row to the audit trail. Failures are thrown, not swallowed:
    // a change that cannot be audited should not silently succeed.
    async audit(entityType, entityId, subjectUserId, actorId, action, before, after) {
        await database_1.AppDataSource.query(`INSERT INTO kpi_audit_trail ("entityType","entityId","subjectUserId","actorId",action,"before","after")
       VALUES ($1,$2,$3,$4,$5,$6,$7)`, [entityType, entityId, subjectUserId, actorId || null, action, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]);
    }
    async listAudit(opts) {
        const where = [];
        const args = [];
        const add = (sql, v) => { args.push(v); where.push(sql.replace('?', `$${args.length}`)); };
        if (opts.subjectUserId)
            add('t."subjectUserId" = ?', opts.subjectUserId);
        if (opts.entityType)
            add('t."entityType" = ?', opts.entityType);
        if (opts.from)
            add('t."createdAt" >= ?', new Date(`${opts.from}T00:00:00Z`));
        if (opts.to)
            add('t."createdAt" < ?', new Date(Date.parse(`${opts.to}T00:00:00Z`) + DAY));
        const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [{ n }] = await database_1.AppDataSource.query(`SELECT COUNT(*) n FROM kpi_audit_trail t ${w}`, args);
        const rows = await database_1.AppDataSource.query(`SELECT t.id, t."entityType", t."entityId", t."subjectUserId", t."actorId", t.action, t."before", t."after", t."createdAt",
              su."firstName" || ' ' || su."lastName" AS "subjectName", au."firstName" || ' ' || au."lastName" AS "actorName"
       FROM kpi_audit_trail t
       LEFT JOIN users su ON su.id = t."subjectUserId"
       LEFT JOIN users au ON au.id = t."actorId"
       ${w} ORDER BY t."createdAt" DESC LIMIT ${opts.limit} OFFSET ${(opts.page - 1) * opts.limit}`, args);
        return { rows, total: num(n) };
    }
    // Per staff, per KPI: what was reported in [from, to] against what was expected.
    // `onlyUserId` restricts the result to one person.
    async summary(from, to, onlyUserId) {
        const rows = await database_1.AppDataSource.query(`SELECT d.id, d.name, d.type, d.unit, d.frequency, d."targetValue", d."userId",
              u."firstName" || ' ' || u."lastName" AS "userName",
              COALESCE(SUM(e."numberValue"), 0) AS total, COUNT(e.id) AS entries,
              COUNT(DISTINCT e."entryDate") AS "daysReported", MAX(e."entryDate") AS "lastEntry"
       FROM kpi_definitions d
       JOIN users u ON u.id = d."userId"
       LEFT JOIN kpi_entries e ON e."kpiId" = d.id AND e."entryDate" >= $1 AND e."entryDate" <= $2
       WHERE d."isActive" = TRUE ${onlyUserId ? 'AND d."userId" = $3' : ''}
       GROUP BY d.id, u."firstName", u."lastName"
       ORDER BY u."firstName", d.name`, onlyUserId ? [from, to, onlyUserId] : [from, to]);
        return rows.map((r) => {
            const periods = (0, targets_engine_1.periodsInRange)(r.frequency, from, to);
            const target = r.targetValue === null ? null : num(r.targetValue) * periods;
            // yes/no answers are stored as 1/0, so summing counts the "yes" answers;
            // text answers have no number, so they count entries.
            const total = r.type === 'text' ? num(r.entries) : num(r.total);
            return {
                kpiId: r.id, name: r.name, type: r.type, unit: r.unit, frequency: r.frequency,
                userId: r.userId, userName: r.userName,
                total, entries: num(r.entries), daysReported: num(r.daysReported), lastEntry: dayStr(r.lastEntry),
                periods, target,
                pctOfTarget: target && target > 0 ? Math.round((total / target) * 1000) / 10 : null,
            };
        });
    }
    // Monthly projected-vs-actual for the given users and months (first-of-month dates).
    async projectionsVsActual(months, userIds) {
        if (months.length === 0)
            return [];
        const ids = userIds && userIds.length ? userIds : null;
        const projections = await database_1.AppDataSource.query(`SELECT p.id, p."userId", p.month, p.metric, p.amount, p.note, p."updatedAt",
              (SELECT COUNT(*) FROM kpi_audit_trail t WHERE t."entityType"='projection' AND t."entityId"=p.id) AS revisions
       FROM kpi_projections p WHERE p.month = ANY($1::date[]) ${ids ? 'AND p."userId" = ANY($2::uuid[])' : ''}`, ids ? [months, ids] : [months]);
        const out = [];
        for (const p of projections) {
            const month = dayStr(p.month);
            const from = new Date(`${month}T00:00:00Z`);
            const to = addMonth(month);
            const [row] = await database_1.AppDataSource.query(p.metric === 'won_value'
                ? `SELECT COALESCE(SUM(amount),0) v FROM opportunities WHERE status='Won' AND "ownerId"=$1 AND "closedAt" >= $2 AND "closedAt" < $3`
                : `SELECT COALESCE(SUM(amount),0) v FROM opportunities WHERE "ownerId"=$1 AND "createdAt" >= $2 AND "createdAt" < $3`, [p.userId, from, to]);
            const actual = num(row.v);
            out.push({
                id: p.id, userId: p.userId, month, metric: p.metric, projected: num(p.amount), actual,
                pct: num(p.amount) > 0 ? Math.round((actual / num(p.amount)) * 1000) / 10 : null,
                note: p.note, updatedAt: p.updatedAt, revisions: num(p.revisions),
            });
        }
        return out;
    }
    // Everything a daily or weekly meeting needs for [from, to]: per person and combined.
    async meetingReport(from, to, onlyUserIds, today) {
        const fromD = new Date(`${from}T00:00:00Z`);
        const toD = new Date(Date.parse(`${to}T00:00:00Z`) + DAY); // exclusive
        const months = (0, targets_engine_1.monthsInRange)(from, to);
        // Who is in the meeting: anyone with a KPI, a projection for these months, or pipeline activity in the range.
        const candidates = await database_1.AppDataSource.query(`SELECT DISTINCT id FROM (
         SELECT "userId" id FROM kpi_definitions WHERE "isActive" = TRUE
         UNION SELECT "userId" FROM kpi_projections WHERE month = ANY($1::date[])
         UNION SELECT "ownerId" FROM opportunities WHERE ("createdAt" >= $2 AND "createdAt" < $3) OR (status='Won' AND "closedAt" >= $2 AND "closedAt" < $3)
       ) c WHERE id IS NOT NULL`, [months, fromD, toD]);
        let ids = candidates.map((c) => c.id);
        if (onlyUserIds)
            ids = ids.filter((i) => onlyUserIds.includes(i));
        if (ids.length === 0)
            return { from, to, today, people: [], combined: null };
        const [users, defs, entries, created, won, leads, visits, projections] = await Promise.all([
            database_1.AppDataSource.query(`SELECT id, "firstName" || ' ' || "lastName" AS name FROM users WHERE id = ANY($1::uuid[])`, [ids]),
            database_1.AppDataSource.query(`SELECT * FROM kpi_definitions WHERE "isActive" = TRUE AND "userId" = ANY($1::uuid[]) ORDER BY name`, [ids]),
            database_1.AppDataSource.query(`SELECT e."kpiId", e."userId", e."entryDate", e."numberValue", e."textValue", a.name AS "accountName"
         FROM kpi_entries e LEFT JOIN accounts a ON a.id = e."accountId"
         WHERE e."entryDate" >= $1 AND e."entryDate" <= $2 AND e."userId" = ANY($3::uuid[]) ORDER BY e."entryDate", e."createdAt"`, [from, to, ids]),
            database_1.AppDataSource.query(`SELECT "ownerId" id, COALESCE(SUM(amount),0) v, COUNT(*) n FROM opportunities WHERE "createdAt" >= $1 AND "createdAt" < $2 AND "ownerId" = ANY($3::uuid[]) GROUP BY 1`, [fromD, toD, ids]),
            database_1.AppDataSource.query(`SELECT "ownerId" id, COALESCE(SUM(amount),0) v, COUNT(*) n FROM opportunities WHERE status='Won' AND "closedAt" >= $1 AND "closedAt" < $2 AND "ownerId" = ANY($3::uuid[]) GROUP BY 1`, [fromD, toD, ids]),
            database_1.AppDataSource.query(`SELECT "ownerId" id, COUNT(*) n FROM leads WHERE "createdAt" >= $1 AND "createdAt" < $2 AND "ownerId" = ANY($3::uuid[]) GROUP BY 1`, [fromD, toD, ids]),
            database_1.AppDataSource.query(`SELECT "createdById" id, COUNT(*) n FROM sales_visits WHERE "visitDate" >= $1 AND "visitDate" < $2 AND "createdById" = ANY($3::uuid[]) GROUP BY 1`, [fromD, toD, ids]),
            this.projectionsVsActual(months, ids),
        ]);
        const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
        const cM = byId(created), wM = byId(won), lM = byId(leads), vM = byId(visits);
        const workdays = (0, targets_engine_1.workdaysInRange)(from, to);
        const periodsCache = new Map();
        const periods = (f) => { if (!periodsCache.has(f))
            periodsCache.set(f, (0, targets_engine_1.periodsInRange)(f, from, to)); return periodsCache.get(f); };
        const people = users.map((u) => {
            const myEntries = entries.filter((e) => e.userId === u.id);
            const reportedDates = new Set(myEntries.map((e) => dayStr(e.entryDate)));
            const kpis = defs.filter((d) => d.userId === u.id).map((d) => {
                const es = myEntries.filter((e) => e.kpiId === d.id);
                const daily = {};
                for (const e of es) {
                    const k = dayStr(e.entryDate);
                    daily[k] = (daily[k] || 0) + (d.type === 'text' ? 1 : num(e.numberValue));
                }
                const total = Object.values(daily).reduce((a, b) => a + b, 0);
                const target = d.targetValue === null ? null : num(d.targetValue) * periods(d.frequency);
                return {
                    kpiId: d.id, name: d.name, type: d.type, unit: d.unit, frequency: d.frequency, total, target,
                    pct: target && target > 0 ? Math.round((total / target) * 1000) / 10 : null,
                    daily,
                    // free-text answers and prospect notes are what the meeting actually discusses
                    answers: es.filter((e) => e.textValue || e.accountName).slice(-30).map((e) => ({
                        date: dayStr(e.entryDate), text: e.textValue, value: e.numberValue === null ? null : num(e.numberValue), prospect: e.accountName,
                    })),
                };
            });
            return {
                userId: u.id, name: u.name,
                compliance: (0, targets_engine_1.reportingCompliance)(workdays, reportedDates, today),
                kpis,
                pipeline: {
                    createdValue: num(cM.get(u.id)?.v), createdCount: num(cM.get(u.id)?.n),
                    wonValue: num(wM.get(u.id)?.v), wonCount: num(wM.get(u.id)?.n),
                    leadsCreated: num(lM.get(u.id)?.n), visitsLogged: num(vM.get(u.id)?.n),
                },
                projections: projections.filter((p) => p.userId === u.id).sort((a, b) => a.month.localeCompare(b.month)),
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
        // ---- Combined (the whole team in one view) ----
        const sum = (f) => people.reduce((s, p) => s + f(p), 0);
        const kpiMap = new Map();
        for (const p of people) {
            for (const k of p.kpis) {
                const key = `${k.name}|${k.unit || ''}|${k.type}|${k.frequency}`;
                const c = kpiMap.get(key) || { name: k.name, type: k.type, unit: k.unit, frequency: k.frequency, total: 0, target: null, staff: 0, daily: {} };
                c.total += k.total;
                if (k.target !== null)
                    c.target = (c.target || 0) + k.target;
                c.staff++;
                for (const [d, v] of Object.entries(k.daily))
                    c.daily[d] = (c.daily[d] || 0) + v;
                kpiMap.set(key, c);
            }
        }
        const projMap = new Map();
        for (const p of people) {
            for (const pr of p.projections) {
                const key = `${pr.month}|${pr.metric}`;
                const c = projMap.get(key) || { month: pr.month, metric: pr.metric, projected: 0, actual: 0, staff: 0 };
                c.projected += pr.projected;
                c.actual += pr.actual;
                c.staff++;
                projMap.set(key, c);
            }
        }
        const due = sum((p) => p.compliance.dueDays), rep = sum((p) => p.compliance.reportedDays);
        const combined = {
            staff: people.length,
            compliance: { dueDays: due, reportedDays: rep, pct: due ? Math.round((rep / due) * 1000) / 10 : null, todayPending: people.filter((p) => p.compliance.todayPending).map((p) => p.name) },
            kpis: [...kpiMap.values()].map((c) => ({ ...c, pct: c.target && c.target > 0 ? Math.round((c.total / c.target) * 1000) / 10 : null })),
            pipeline: {
                createdValue: sum((p) => p.pipeline.createdValue), createdCount: sum((p) => p.pipeline.createdCount),
                wonValue: sum((p) => p.pipeline.wonValue), wonCount: sum((p) => p.pipeline.wonCount),
                leadsCreated: sum((p) => p.pipeline.leadsCreated), visitsLogged: sum((p) => p.pipeline.visitsLogged),
            },
            projections: [...projMap.values()].map((c) => ({ ...c, pct: c.projected > 0 ? Math.round((c.actual / c.projected) * 1000) / 10 : null })).sort((a, b) => a.month.localeCompare(b.month)),
        };
        return { from, to, today, workdays, people, combined };
    }
}
exports.default = new KpiService();
//# sourceMappingURL=kpi.service.js.map