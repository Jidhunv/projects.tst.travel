"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const database_1 = require("../config/database");
const Opportunity_1 = require("../models/Opportunity");
const Lead_1 = require("../models/Lead");
const Account_1 = require("../models/Account");
const constants_1 = require("../utils/constants");
const logger_1 = __importDefault(require("../utils/logger"));
class ReportService {
    constructor() {
        this.oppRepository = database_1.AppDataSource.getRepository(Opportunity_1.Opportunity);
        this.leadRepository = database_1.AppDataSource.getRepository(Lead_1.Lead);
        this.accountRepository = database_1.AppDataSource.getRepository(Account_1.Account);
    }
    // Apply Sales Rep ownership scope when an ownerId is provided.
    scopeOwner(query, ownerId) {
        if (ownerId) {
            query.andWhere('opp.ownerId = :ownerId', { ownerId });
        }
        return query;
    }
    // --- Pipeline value report: open opportunities grouped by stage, in dollars ---
    async getPipelineReport(ownerId) {
        const query = this.oppRepository
            .createQueryBuilder('opp')
            .select('opp.stage', 'stage')
            .addSelect('COUNT(opp.id)', 'count')
            .addSelect('COALESCE(SUM(opp.amount), 0)', 'totalValue')
            .addSelect('COALESCE(SUM(opp.amount * opp.probability / 100), 0)', 'weightedValue')
            .where('opp.status = :status', { status: 'Open' })
            .groupBy('opp.stage');
        this.scopeOwner(query, ownerId);
        const rows = await query.getRawMany();
        const rowMap = new Map(rows.map((r) => [r.stage, r]));
        // Return all open stages in canonical order, zero-filled where empty.
        const openStages = constants_1.OPPORTUNITY_STAGES.filter((s) => !s.startsWith('Closed'));
        const byStage = openStages.map((stage) => {
            const r = rowMap.get(stage);
            return {
                stage,
                count: r ? parseInt(r.count, 10) : 0,
                totalValue: r ? parseFloat(r.totalValue) : 0,
                weightedValue: r ? parseFloat(r.weightedValue) : 0,
            };
        });
        return {
            byStage,
            totalOpenValue: byStage.reduce((s, b) => s + b.totalValue, 0),
            totalWeightedValue: byStage.reduce((s, b) => s + b.weightedValue, 0),
            openCount: byStage.reduce((s, b) => s + b.count, 0),
        };
    }
    // --- Sales report: closed deals (won/lost) with dollar figures ---
    async getSalesReport(ownerId, from, to) {
        const base = () => {
            const q = this.oppRepository.createQueryBuilder('opp');
            if (from)
                q.andWhere('opp.closedAt >= :from', { from });
            if (to)
                q.andWhere('opp.closedAt <= :to', { to });
            this.scopeOwner(q, ownerId);
            return q;
        };
        const won = await base()
            .select('COUNT(opp.id)', 'count')
            .addSelect('COALESCE(SUM(opp.amount), 0)', 'value')
            .where('opp.status = :status', { status: 'Won' })
            .getRawOne();
        const lost = await base()
            .select('COUNT(opp.id)', 'count')
            .addSelect('COALESCE(SUM(opp.amount), 0)', 'value')
            .where('opp.status = :status', { status: 'Lost' })
            .getRawOne();
        const lossRows = await base()
            .select('opp.closedReason', 'reason')
            .addSelect('COUNT(opp.id)', 'count')
            .addSelect('COALESCE(SUM(opp.amount), 0)', 'value')
            .where('opp.status = :status', { status: 'Lost' })
            .groupBy('opp.closedReason')
            .orderBy('value', 'DESC')
            .getRawMany();
        const wonCount = parseInt(won.count, 10);
        const wonValue = parseFloat(won.value);
        const lostCount = parseInt(lost.count, 10);
        const lostValue = parseFloat(lost.value);
        const totalClosed = wonCount + lostCount;
        return {
            wonCount,
            wonValue,
            lostCount,
            lostValue,
            winRate: totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0,
            avgDealSize: wonCount > 0 ? Math.round(wonValue / wonCount) : 0,
            lossReasons: lossRows.map((r) => ({
                reason: r.reason || 'Unspecified',
                count: parseInt(r.count, 10),
                value: parseFloat(r.value),
            })),
        };
    }
    // --- Sales performance by owner (for managers to compare reps) ---
    async getSalesByOwner() {
        const rows = await this.oppRepository
            .createQueryBuilder('opp')
            .leftJoin('opp.owner', 'owner')
            .select('opp.ownerId', 'ownerId')
            .addSelect("owner.firstName || ' ' || owner.lastName", 'ownerName')
            .addSelect("COALESCE(SUM(CASE WHEN opp.status = 'Open' THEN opp.amount ELSE 0 END), 0)", 'openValue')
            .addSelect("COALESCE(SUM(CASE WHEN opp.status = 'Won' THEN opp.amount ELSE 0 END), 0)", 'wonValue')
            .addSelect("COALESCE(SUM(CASE WHEN opp.status = 'Lost' THEN opp.amount ELSE 0 END), 0)", 'lostValue')
            .addSelect("SUM(CASE WHEN opp.status = 'Won' THEN 1 ELSE 0 END)", 'wonCount')
            .addSelect("SUM(CASE WHEN opp.status = 'Lost' THEN 1 ELSE 0 END)", 'lostCount')
            .groupBy('opp.ownerId')
            .addGroupBy('owner.firstName')
            .addGroupBy('owner.lastName')
            .getRawMany();
        return rows.map((r) => {
            const wonCount = parseInt(r.wonCount, 10);
            const lostCount = parseInt(r.lostCount, 10);
            const closed = wonCount + lostCount;
            return {
                ownerId: r.ownerId,
                ownerName: r.ownerName || 'Unknown',
                openValue: parseFloat(r.openValue),
                wonValue: parseFloat(r.wonValue),
                lostValue: parseFloat(r.lostValue),
                winRate: closed > 0 ? Math.round((wonCount / closed) * 100) : 0,
            };
        });
    }
    // --- Consolidated MIS dashboard ---
    async getMIS(ownerId) {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const quarter = Math.floor(now.getMonth() / 3);
            const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
            const pipeline = await this.getPipelineReport(ownerId);
            const salesAllTime = await this.getSalesReport(ownerId);
            const wonThisMonth = await this.wonInPeriod(startOfMonth, ownerId);
            const wonThisQuarter = await this.wonInPeriod(startOfQuarter, ownerId);
            // Leads by status
            const leadQuery = this.leadRepository
                .createQueryBuilder('lead')
                .select('lead.status', 'status')
                .addSelect('COUNT(lead.id)', 'count')
                .groupBy('lead.status');
            if (ownerId)
                leadQuery.where('lead.ownerId = :ownerId', { ownerId });
            const leadRows = await leadQuery.getRawMany();
            const leadsByStatus = leadRows.map((r) => ({
                status: r.status,
                count: parseInt(r.count, 10),
            }));
            const totalLeads = leadsByStatus.reduce((s, l) => s + l.count, 0);
            const convertedLeads = leadsByStatus.find((l) => l.status === 'Converted')?.count || 0;
            const result = {
                pipeline: {
                    byStage: pipeline.byStage,
                    totalOpenValue: pipeline.totalOpenValue,
                    totalWeightedValue: pipeline.totalWeightedValue,
                    openCount: pipeline.openCount,
                },
                sales: {
                    wonCount: salesAllTime.wonCount,
                    wonValue: salesAllTime.wonValue,
                    lostCount: salesAllTime.lostCount,
                    lostValue: salesAllTime.lostValue,
                    winRate: salesAllTime.winRate,
                    avgDealSize: salesAllTime.avgDealSize,
                },
                wonThisMonth,
                wonThisQuarter,
                leads: {
                    byStatus: leadsByStatus,
                    total: totalLeads,
                    conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
                },
                lossReasons: salesAllTime.lossReasons,
            };
            // Manager/Admin view (no ownerId scope) also gets per-rep performance.
            if (!ownerId) {
                result.salesByOwner = await this.getSalesByOwner();
            }
            return result;
        }
        catch (error) {
            logger_1.default.error('Error in getMIS:', error);
            // Return empty dashboard structure if query fails
            return {
                pipeline: {
                    byStage: [],
                    totalOpenValue: 0,
                    totalWeightedValue: 0,
                    openCount: 0,
                },
                sales: {
                    wonCount: 0,
                    wonValue: 0,
                    lostCount: 0,
                    lostValue: 0,
                    winRate: 0,
                    avgDealSize: 0,
                },
                wonThisMonth: { count: 0, value: 0 },
                wonThisQuarter: { count: 0, value: 0 },
                leads: {
                    byStatus: [],
                    total: 0,
                    conversionRate: 0,
                },
                lossReasons: [],
            };
        }
    }
    // --- Conversion timeline: Account created -> Lead added -> Lead converted
    // to Opportunity, one row per chain, with a timestamp at each stage.
    async getConversionTimeline(ownerId) {
        const accountQuery = this.accountRepository
            .createQueryBuilder('account')
            .leftJoinAndSelect('account.owner', 'owner')
            .orderBy('account.createdAt', 'DESC');
        if (ownerId) {
            accountQuery.andWhere('(account.ownerId = :ownerId OR account.assigneeIds LIKE :ownerIdLike)', {
                ownerId,
                ownerIdLike: `%${ownerId}%`,
            });
        }
        const accounts = await accountQuery.getMany();
        if (accounts.length === 0)
            return [];
        const accountIds = accounts.map((a) => a.id);
        const leads = await this.leadRepository
            .createQueryBuilder('lead')
            .where('lead.accountId IN (:...accountIds)', { accountIds })
            .orderBy('lead.createdAt', 'ASC')
            .getMany();
        const opportunities = await this.oppRepository
            .createQueryBuilder('opp')
            .where('opp.accountId IN (:...accountIds)', { accountIds })
            .orderBy('opp.createdAt', 'ASC')
            .getMany();
        const oppsByLeadId = new Map();
        const directOppsByAccountId = new Map();
        for (const opp of opportunities) {
            if (opp.convertedFromLeadId) {
                const list = oppsByLeadId.get(opp.convertedFromLeadId) || [];
                list.push(opp);
                oppsByLeadId.set(opp.convertedFromLeadId, list);
            }
            else {
                const list = directOppsByAccountId.get(opp.accountId) || [];
                list.push(opp);
                directOppsByAccountId.set(opp.accountId, list);
            }
        }
        const leadsByAccountId = new Map();
        for (const lead of leads) {
            const list = leadsByAccountId.get(lead.accountId) || [];
            list.push(lead);
            leadsByAccountId.set(lead.accountId, list);
        }
        const rows = [];
        for (const account of accounts) {
            const accountOwner = account.owner
                ? `${account.owner.firstName} ${account.owner.lastName}`
                : '';
            const accountLeads = leadsByAccountId.get(account.id) || [];
            const accountDirectOpps = directOppsByAccountId.get(account.id) || [];
            if (accountLeads.length === 0 && accountDirectOpps.length === 0) {
                // Account with no leads and no opportunities yet.
                rows.push({
                    accountId: account.id,
                    accountName: account.name,
                    accountCreatedAt: account.createdAt,
                    accountOwner,
                    leadId: null,
                    leadName: null,
                    leadCreatedAt: null,
                    leadStatus: null,
                    leadConvertedAt: null,
                    opportunityId: null,
                    opportunityName: null,
                    opportunityCreatedAt: null,
                    opportunityStage: null,
                    opportunityStatus: null,
                });
                continue;
            }
            for (const lead of accountLeads) {
                const leadOpps = oppsByLeadId.get(lead.id) || [];
                if (leadOpps.length === 0) {
                    rows.push({
                        accountId: account.id,
                        accountName: account.name,
                        accountCreatedAt: account.createdAt,
                        accountOwner,
                        leadId: lead.id,
                        leadName: `${lead.firstName} ${lead.lastName}`,
                        leadCreatedAt: lead.createdAt,
                        leadStatus: lead.status,
                        // updatedAt is the best available signal for "when status last
                        // changed"; only meaningful once status is actually Converted.
                        leadConvertedAt: lead.status === 'Converted' ? lead.updatedAt : null,
                        opportunityId: null,
                        opportunityName: null,
                        opportunityCreatedAt: null,
                        opportunityStage: null,
                        opportunityStatus: null,
                    });
                }
                else {
                    for (const opp of leadOpps) {
                        rows.push({
                            accountId: account.id,
                            accountName: account.name,
                            accountCreatedAt: account.createdAt,
                            accountOwner,
                            leadId: lead.id,
                            leadName: `${lead.firstName} ${lead.lastName}`,
                            leadCreatedAt: lead.createdAt,
                            leadStatus: lead.status,
                            leadConvertedAt: lead.status === 'Converted' ? lead.updatedAt : null,
                            opportunityId: opp.id,
                            opportunityName: opp.name,
                            opportunityCreatedAt: opp.createdAt,
                            opportunityStage: opp.stage,
                            opportunityStatus: opp.status,
                        });
                    }
                }
            }
            // Opportunities created directly on the account (no lead conversion).
            for (const opp of accountDirectOpps) {
                rows.push({
                    accountId: account.id,
                    accountName: account.name,
                    accountCreatedAt: account.createdAt,
                    accountOwner,
                    leadId: null,
                    leadName: null,
                    leadCreatedAt: null,
                    leadStatus: null,
                    leadConvertedAt: null,
                    opportunityId: opp.id,
                    opportunityName: opp.name,
                    opportunityCreatedAt: opp.createdAt,
                    opportunityStage: opp.stage,
                    opportunityStatus: opp.status,
                });
            }
        }
        return rows;
    }
    async wonInPeriod(from, ownerId) {
        const q = this.oppRepository
            .createQueryBuilder('opp')
            .select('COUNT(opp.id)', 'count')
            .addSelect('COALESCE(SUM(opp.amount), 0)', 'value')
            .where('opp.status = :status', { status: 'Won' })
            .andWhere('opp.closedAt >= :from', { from });
        this.scopeOwner(q, ownerId);
        const r = await q.getRawOne();
        return { count: parseInt(r.count, 10), value: parseFloat(r.value) };
    }
}
exports.ReportService = ReportService;
exports.default = new ReportService();
//# sourceMappingURL=report.service.js.map