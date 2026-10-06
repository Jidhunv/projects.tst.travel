"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const Account_1 = require("../models/Account");
const Lead_1 = require("../models/Lead");
const Opportunity_1 = require("../models/Opportunity");
const AccountStakeholder_1 = require("../models/AccountStakeholder");
const Activity_1 = require("../models/Activity");
const SalesVisit_1 = require("../models/SalesVisit");
const salesStrategy_1 = require("../utils/salesStrategy");
const salesHealth_engine_1 = require("./salesHealth.engine");
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK = { derailed: 0, 'at-risk': 1, 'on-track': 2, 'no-pipeline': 3 };
// Calls/emails/meetings/tasks are customer touches. Notes and System events are
// bookkeeping, not contact, so they never count towards cadence.
const TOUCH_TYPES = ['Call', 'Email', 'Meeting', 'Task'];
const asDate = (d) => (d ? new Date(d) : null);
class SalesHealthService {
    // Loads every in-scope account with its pipeline, committee, activity and visit
    // history in a fixed number of queries, then scores each one.
    async analyseAll(scopeOwnerId, now = new Date()) {
        const accountQuery = database_1.AppDataSource.getRepository(Account_1.Account)
            .createQueryBuilder('account')
            .leftJoinAndSelect('account.owner', 'owner')
            .where("account.type != 'Inactive'");
        if (scopeOwnerId) {
            accountQuery.andWhere('(account.ownerId = :o OR account.assigneeIds LIKE :ol)', {
                o: scopeOwnerId,
                ol: `%${scopeOwnerId}%`,
            });
        }
        const accounts = await accountQuery.getMany();
        if (accounts.length === 0)
            return [];
        const ids = accounts.map((a) => a.id);
        const leads = await database_1.AppDataSource.getRepository(Lead_1.Lead)
            .createQueryBuilder('l')
            .where('l.accountId = ANY(:ids)', { ids })
            .getMany();
        const opps = await database_1.AppDataSource.getRepository(Opportunity_1.Opportunity)
            .createQueryBuilder('o')
            .where('o.accountId = ANY(:ids)', { ids })
            .getMany();
        const stakeholders = await database_1.AppDataSource.getRepository(AccountStakeholder_1.AccountStakeholder)
            .createQueryBuilder('s')
            .where('s.accountId = ANY(:ids)', { ids })
            .getMany();
        const visits = await database_1.AppDataSource.getRepository(SalesVisit_1.SalesVisit)
            .createQueryBuilder('v')
            .leftJoinAndSelect('v.followups', 'f')
            .where('v.accountId = ANY(:ids)', { ids })
            .getMany();
        // Activities hang off the account, its leads or its opportunities.
        const resourceToAccount = new Map();
        for (const a of accounts)
            resourceToAccount.set(a.id, a.id);
        for (const l of leads)
            resourceToAccount.set(l.id, l.accountId);
        for (const o of opps)
            resourceToAccount.set(o.id, o.accountId);
        const activities = await database_1.AppDataSource.getRepository(Activity_1.Activity)
            .createQueryBuilder('act')
            .where('act.resourceId = ANY(:rids)', { rids: [...resourceToAccount.keys()] })
            .getMany();
        const group = (rows, key) => {
            const m = new Map();
            for (const r of rows) {
                const k = key(r);
                if (!k)
                    continue;
                const list = m.get(k);
                if (list)
                    list.push(r);
                else
                    m.set(k, [r]);
            }
            return m;
        };
        const leadsBy = group(leads, (l) => l.accountId);
        const oppsBy = group(opps, (o) => o.accountId);
        const stakeBy = group(stakeholders, (s) => s.accountId);
        const visitsBy = group(visits, (v) => v.accountId);
        const actsBy = group(activities, (a) => resourceToAccount.get(a.resourceId));
        return accounts.map((acc) => {
            const acts = actsBy.get(acc.id) || [];
            const input = {
                id: acc.id,
                name: acc.name,
                tier: acc.tier || null,
                type: acc.type,
                ownerId: acc.ownerId || null,
                ownerName: acc.owner ? `${acc.owner.firstName} ${acc.owner.lastName}` : '',
                createdAt: new Date(acc.createdAt),
                stakeholderRoles: (stakeBy.get(acc.id) || []).filter((s) => s.name && s.name.trim()).map((s) => s.role),
                leads: (leadsBy.get(acc.id) || []).map((l) => ({
                    id: l.id, status: l.status, createdAt: new Date(l.createdAt), updatedAt: new Date(l.updatedAt),
                })),
                opps: (oppsBy.get(acc.id) || []).map((o) => ({
                    id: o.id, name: o.name, stage: o.stage, status: o.status, amount: Number(o.amount || 0),
                    createdAt: new Date(o.createdAt), updatedAt: new Date(o.updatedAt),
                    forecastedCloseDate: asDate(o.forecastedCloseDate),
                })),
                touches: acts
                    .filter((a) => TOUCH_TYPES.includes(a.type) && a.isCompleted)
                    .map((a) => new Date(a.completedAt || a.updatedAt || a.createdAt)),
                openDueDates: acts
                    .filter((a) => TOUCH_TYPES.includes(a.type) && !a.isCompleted && a.dueDate)
                    .map((a) => new Date(a.dueDate)),
                visits: (visitsBy.get(acc.id) || []).map((v) => {
                    const entries = (v.followups || []).map((f) => ({
                        date: new Date(f.followupDate), completed: !!f.completed,
                    }));
                    // Visits recorded before follow-up entries existed carry a single legacy date.
                    if (entries.length === 0 && v.followupDate) {
                        entries.push({ date: new Date(v.followupDate), completed: !!v.followupCompleted });
                    }
                    return { date: new Date(v.visitDate), followups: entries };
                }),
            };
            return (0, salesHealth_engine_1.analyseAccount)(input, now);
        });
    }
    async getReport(scopeOwnerId, f) {
        const all = await this.analyseAll(scopeOwnerId);
        // Filters that narrow the population (owner/tier/search) also drive the
        // summary, so the KPIs always describe exactly what the table is showing.
        // Status/severity/flag filters only narrow the table.
        const q = f.search?.trim().toLowerCase();
        const population = all.filter((r) => (!f.ownerId || r.ownerId === f.ownerId) &&
            (!f.tier || (r.tier || '') === f.tier) &&
            (!q || r.accountName.toLowerCase().includes(q)));
        let rows = population.filter((r) => (!f.status || r.status === f.status) &&
            (!f.severity || r.flags.some((fl) => SEVERITY_RANK[fl.severity] <= SEVERITY_RANK[f.severity])) &&
            (!f.flagCode || r.flags.some((fl) => fl.code === f.flagCode)));
        const sorters = {
            score: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.score - b.score,
            value: (a, b) => b.pipelineValue - a.pipelineValue,
            overdue: (a, b) => b.overdueFollowups - a.overdueFollowups,
            quiet: (a, b) => (b.daysSinceTouch ?? 9999) - (a.daysSinceTouch ?? 9999),
            name: (a, b) => a.accountName.localeCompare(b.accountName),
        };
        rows = rows.sort(sorters[f.sort || 'score'] || sorters.score);
        const limit = Math.min(Math.max(f.limit || 25, 1), 10000);
        const total = rows.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const page = Math.min(Math.max(f.page || 1, 1), totalPages);
        return {
            generatedAt: new Date().toISOString(),
            summary: (0, salesHealth_engine_1.summarise)(population),
            rows: rows.slice((page - 1) * limit, page * limit),
            meta: { page, limit, total, totalPages },
            strategy: salesStrategy_1.SALES_STRATEGY,
        };
    }
}
exports.default = new SalesHealthService();
//# sourceMappingURL=salesHealth.service.js.map