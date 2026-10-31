"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadService = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const prospectStatusHistory_service_1 = __importDefault(require("./prospectStatusHistory.service"));
const stageHistory_service_1 = __importDefault(require("./stageHistory.service"));
const Lead_1 = require("../models/Lead");
const Account_1 = require("../models/Account");
const Opportunity_1 = require("../models/Opportunity");
const LineItem_1 = require("../models/LineItem");
const errorHandler_1 = require("../middleware/errorHandler");
const constants_1 = require("../utils/constants");
const prospectQualification_1 = require("../utils/prospectQualification");
const prospecting_1 = require("../utils/prospecting");
const prospectOptions_service_1 = require("./prospectOptions.service");
const tracer_1 = require("../utils/tracer");
const buyingCommittee_service_1 = require("./buyingCommittee.service");
const questionnaire_service_1 = __importDefault(require("./questionnaire.service"));
const listSort_1 = require("../utils/listSort");
const LEAD_SORT = {
    name: 'lead.firstName',
    company: 'lead.company',
    status: 'lead.status',
    value: 'lead.value',
    tier: 'lead.tier',
    country: 'lead.country',
    region: 'lead.region',
    createdAt: 'lead.createdAt',
};
class LeadService {
    constructor() {
        this.leadRepository = database_1.AppDataSource.getRepository(Lead_1.Lead);
        this.accountRepository = database_1.AppDataSource.getRepository(Account_1.Account);
        this.oppRepository = database_1.AppDataSource.getRepository(Opportunity_1.Opportunity);
        this.lineItemRepository = database_1.AppDataSource.getRepository(LineItem_1.LineItem);
    }
    // A contact can be a prospect once per product. Throws 409 when that prospect already exists.
    async assertNoDuplicate(email, productId) {
        const existing = await this.leadRepository.findOne({
            where: { email, productId: productId ?? (0, typeorm_1.IsNull)() },
        });
        if (existing) {
            throw new errorHandler_1.AppError(409, productId
                ? `A prospect for this email and product already exists (${existing.productName || 'product'})`
                : 'A prospect with this email already exists');
        }
    }
    async createLead(data) {
        await this.assertNoDuplicate(data.email, data.productId);
        // Get account to populate tier from it
        const account = await this.accountRepository.findOne({
            where: { id: data.accountId },
        });
        const lead = this.leadRepository.create({
            ...data,
            value: data.value ?? 0,
            status: 'Open',
            score: 0,
            productIds: data.productIds || [],
            productNames: data.productNames || [],
            tier: account?.tier,
        });
        const savedLead = await this.leadRepository.save(lead);
        await prospectStatusHistory_service_1.default.record(savedLead.id, savedLead.status || 'Open', data.ownerId ?? null, 'Lead created');
        return savedLead;
    }
    async getLeadById(id) {
        const lead = await this.leadRepository.findOne({
            where: { id },
            relations: ['owner', 'account'],
        });
        if (!lead) {
            throw new errorHandler_1.AppError(404, 'Lead not found');
        }
        return lead;
    }
    async getLeads(filters = {}, traceId) {
        const order = (0, listSort_1.resolveSort)(filters.sortBy, filters.sortDir, LEAD_SORT, 'createdAt');
        const { page = 1, limit = 20, search, fromDate, toDate, ...where } = filters;
        const skip = (page - 1) * limit;
        let dbSpan;
        if (traceId) {
            dbSpan = (0, tracer_1.startSpan)(traceId, 'service.lead.getLeads', {
                page,
                limit,
                filters: { ...where, search: search ? '***masked***' : undefined },
            });
        }
        try {
            const query = this.leadRepository
                .createQueryBuilder('lead')
                .leftJoinAndSelect('lead.owner', 'owner')
                .leftJoinAndSelect('lead.account', 'account');
            // Add search filter
            if (search) {
                query.where('(lead.firstName ILIKE :search OR lead.lastName ILIKE :search OR lead.email ILIKE :search OR lead.company ILIKE :search)', { search: `%${search}%` });
            }
            // Add other filters
            // Default view: the active prospects. Converted and disqualified ones show only when the status filter asks for them.
            const statusFilter = where.status || 'active';
            if (statusFilter === 'active') {
                query.andWhere('lead.status IN (:...active)', { active: ['Open', 'Qualified', 'Prospect'] });
            }
            else if (statusFilter !== 'all') {
                query.andWhere('lead.status = :status', { status: statusFilter });
            }
            if (where.source) {
                query.andWhere('lead.source = :source', { source: where.source });
            }
            if (where.ownerIds) {
                // The owners the viewer may see (from their privilege), OR anyone they are assigned to.
                query.andWhere('(lead.ownerId = ANY(:ownerIds) OR lead.assigneeIds LIKE ANY(:ownerLikes))', {
                    ownerIds: where.ownerIds,
                    ownerLikes: where.ownerIds.map((id) => `%${id}%`),
                });
            }
            if (where.region) {
                query.andWhere('lead.region ILIKE :region', { region: `%${where.region}%` });
            }
            if (where.country) {
                query.andWhere('lead.country ILIKE :country', { country: `%${where.country}%` });
            }
            if (fromDate) {
                query.andWhere('lead.createdAt >= :fromDate', { fromDate: new Date(`${fromDate}T00:00:00.000Z`) });
            }
            if (toDate) {
                query.andWhere('lead.createdAt <= :toDate', { toDate: new Date(`${toDate}T23:59:59.999Z`) });
            }
            const [rows, total] = await query
                .orderBy(order.column, order.dir)
                .skip(skip)
                .take(limit)
                .getManyAndCount();
            // Flag leads whose account has no buying committee yet, so the list can
            // highlight them at every stage.
            const counts = await (0, buyingCommittee_service_1.committeeCountsByAccount)(rows.map((l) => l.accountId));
            const data = rows.map((l) => {
                const n = counts.get(l.accountId) ?? 0;
                return Object.assign(l, { buyingCommitteeCount: n, hasBuyingCommittee: n > 0 });
            });
            if (traceId && dbSpan) {
                (0, tracer_1.endSpan)(traceId, dbSpan.id, { count: data.length, total });
            }
            return { data, total };
        }
        catch (err) {
            if (traceId && dbSpan) {
                (0, tracer_1.endSpan)(traceId, dbSpan.id, undefined, err.message);
            }
            throw err;
        }
    }
    async updateLead(id, data) {
        await this.getLeadById(id);
        // Column-level update: the getById above eager-loads relations, and save()
        // gives a loaded relation precedence over its FK column -- so changing only
        // the FK would be silently overwritten by the stale relation object.
        // update() writes exactly the columns given.
        await this.leadRepository.update(id, data);
        return await this.getLeadById(id);
    }
    async updateLeadStatus(id, status, actorId) {
        const lead = await this.getLeadById(id);
        const validStatuses = ['Open', 'Qualified', 'Prospect', 'Disqualified', 'Converted'];
        if (!validStatuses.includes(status)) {
            throw new errorHandler_1.AppError(400, 'Invalid lead status');
        }
        // Each stage needs the questionnaire of the stage before it. Qualified: the lead questionnaire (13 questions).
        if (status === 'Qualified' && lead.status !== 'Qualified') {
            const account = await this.accountRepository.findOne({ where: { id: lead.accountId } });
            const lead13 = (0, prospecting_1.prospectingProgress)(account, account?.prospectingAnswers, await (0, prospectOptions_service_1.activeProspectOptions)());
            if (!lead13.complete) {
                throw new errorHandler_1.AppError(400, `Complete the lead questionnaire before this lead is qualified (${lead13.answered} of ${lead13.total} answered; missing: ${lead13.missing.join(', ')}). It is on the account, under Prospects > Prospecting.`);
            }
        }
        // Prospect: the qualification questionnaire (nine mandatory questions) must be complete.
        if (status === 'Prospect' && lead.status === 'Qualified') {
            const account = await this.accountRepository.findOne({ where: { id: lead.accountId } });
            const progress = (0, prospectQualification_1.leadQualificationProgress)(account?.leadQualification);
            if (!progress.complete) {
                throw new errorHandler_1.AppError(400, `Complete the customer engagement questionnaire before this lead becomes a prospect (${progress.answered} of ${progress.total} mandatory answered; missing: ${progress.missing.join(', ')}).`);
            }
        }
        // Only a qualified lead can be converted to a prospect.
        if (status === 'Prospect' && lead.status !== 'Qualified') {
            throw new errorHandler_1.AppError(400, 'Only a qualified lead can be converted to a prospect. Complete the customer engagement questionnaire first.');
        }
        const fromStatus = lead.status;
        lead.status = status;
        const saved = await this.leadRepository.save(lead);
        if (fromStatus !== status)
            await prospectStatusHistory_service_1.default.record(id, status, actorId ?? null, null, fromStatus);
        return saved;
    }
    async deleteLead(id) {
        const lead = await this.getLeadById(id);
        await this.leadRepository.remove(lead);
    }
    async convertLeadToAccount(leadId) {
        const lead = await this.getLeadById(leadId);
        if (lead.status !== 'Qualified') {
            throw new errorHandler_1.AppError(400, 'Lead must be qualified to convert');
        }
        // Check if account already exists
        if (lead.accountId) {
            throw new errorHandler_1.AppError(409, 'Lead is already converted to an account');
        }
        // Create account from lead
        const account = this.accountRepository.create({
            name: lead.company || `${lead.firstName} ${lead.lastName}`,
            ownerId: lead.ownerId,
            type: 'Prospect',
            status: 'Prospect',
        });
        const savedAccount = await this.accountRepository.save(account);
        // Update lead with account reference
        const fromStatus = lead.status;
        lead.accountId = savedAccount.id;
        lead.status = 'Converted';
        await this.leadRepository.save(lead);
        await prospectStatusHistory_service_1.default.record(leadId, 'Converted', null, 'Converted to account', fromStatus);
        return savedAccount;
    }
    // Convert a lead directly into a sales opportunity.
    // Creates (or reuses) an account, then an opportunity seeded with the lead's
    // value, expected close date, and product of interest.
    // A prospect becomes an opportunity at Customer engagement. The engagement answers are saved to it.
    async convertLeadToOpportunity(leadId, actorId, engagement) {
        const lead = await this.getLeadById(leadId);
        if (lead.status === 'Converted') {
            throw new errorHandler_1.AppError(409, 'Lead is already converted');
        }
        if (lead.status === 'Disqualified') {
            throw new errorHandler_1.AppError(400, 'A lost lead cannot be converted');
        }
        // Only a prospect becomes an opportunity.
        if (lead.status !== 'Prospect') {
            throw new errorHandler_1.AppError(400, 'Only a prospect can be converted into an opportunity. Convert the qualified lead to a prospect first.');
        }
        // Reuse a linked account or create one from the lead's company.
        let accountId = lead.accountId;
        if (!accountId) {
            const account = await this.accountRepository.save(this.accountRepository.create({
                name: lead.company || `${lead.firstName} ${lead.lastName}`,
                ownerId: lead.ownerId,
                type: 'Prospect',
                status: 'Prospect',
                contactPerson: `${lead.firstName} ${lead.lastName}`.trim(),
                region: lead.region,
                country: lead.country,
                phoneNumber: lead.phoneNumber,
            }));
            accountId = account.id;
        }
        const baseDealName = lead.productName
            ? `${lead.company || lead.firstName} - ${lead.productName}`
            : `${lead.company || lead.firstName}`;
        // Auto-generated names collide whenever the same company converts
        // another lead with no product (or the same product) set. Disambiguate
        // by appending (1), (2), ... rather than silently creating duplicates.
        let dealName = baseDealName;
        let suffix = 0;
        while (await this.oppRepository.findOne({ where: { name: dealName } })) {
            suffix++;
            dealName = `${baseDealName} (${suffix})`;
        }
        const closeDate = lead.expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const opp = await this.oppRepository.save(this.oppRepository.create({
            name: dealName,
            amount: lead.value || 0,
            stage: 'Customer engagement',
            status: 'Open',
            probability: 10,
            forecastedCloseDate: closeDate,
            accountId,
            ownerId: lead.ownerId,
            // Carry over ALL lead details so nothing is lost on conversion.
            businessVolume: lead.businessVolume,
            supplierList: lead.supplierList,
            region: lead.region,
            country: lead.country,
            company: lead.company,
            contactPerson: `${lead.firstName} ${lead.lastName}`.trim(),
            contactEmail: lead.email,
            contactPhone: lead.phoneNumber,
            jobTitle: lead.jobTitle,
            source: lead.source,
            remark: lead.remark,
            tags: lead.tags,
            convertedFromLeadId: lead.id,
        }));
        await stageHistory_service_1.default.record(opp.id, 'Customer engagement', lead.ownerId, `Converted from lead ${leadId}`);
        // Carry the lead's products across as line items.
        // Support both single product (legacy) and multiple products (array).
        const productIds = lead.productIds && lead.productIds.length > 0 ? lead.productIds : (lead.productId ? [lead.productId] : []);
        const productNames = lead.productNames && lead.productNames.length > 0 ? lead.productNames : (lead.productName ? [lead.productName] : []);
        if (productIds.length > 0) {
            for (let i = 0; i < productIds.length; i++) {
                await this.lineItemRepository.save(this.lineItemRepository.create({
                    productId: productIds[i],
                    productName: productNames[i] || '',
                    quantity: 1,
                    unitPrice: lead.value || 0,
                    opportunityId: opp.id,
                }));
            }
        }
        for (const [key, value] of Object.entries(engagement)) {
            await questionnaire_service_1.default.saveAnswer(opp.id, key, { value, status: 'answered' }, actorId ?? lead.ownerId);
        }
        const fromStatus = lead.status;
        lead.accountId = accountId;
        lead.status = 'Converted';
        await this.leadRepository.save(lead);
        await prospectStatusHistory_service_1.default.record(leadId, 'Converted', actorId ?? null, `Converted to deal ${opp.name}`, fromStatus);
        return opp;
    }
    // Close a lead as lost, recording a reason from the fixed list.
    async markLeadLost(leadId, lostReason, actorId) {
        if (!constants_1.REJECTION_REASONS.includes(lostReason)) {
            throw new errorHandler_1.AppError(400, `A valid reason is required. Allowed: ${constants_1.REJECTION_REASONS.join(', ')}`);
        }
        const lead = await this.getLeadById(leadId);
        if (lead.status === 'Converted') {
            throw new errorHandler_1.AppError(400, 'A converted lead cannot be marked lost');
        }
        const fromStatus = lead.status;
        lead.status = 'Disqualified';
        lead.lostReason = lostReason;
        const saved = await this.leadRepository.save(lead);
        await prospectStatusHistory_service_1.default.record(leadId, 'Disqualified', actorId ?? null, lostReason, fromStatus);
        return saved;
    }
    async updateLeadScore(id, points) {
        const lead = await this.getLeadById(id);
        lead.score += points;
        return await this.leadRepository.save(lead);
    }
    async bulkImportLeads(leads, ownerId) {
        let success = 0;
        let failed = 0;
        for (const leadData of leads) {
            try {
                // A lead requires an account; rows without one fail (counted below)
                // rather than saving an orphaned lead.
                if (!leadData.accountId) {
                    throw new errorHandler_1.AppError(400, 'accountId is required');
                }
                await this.createLead({
                    accountId: leadData.accountId,
                    firstName: leadData.firstName || '',
                    lastName: leadData.lastName || '',
                    email: leadData.email || '',
                    phoneNumber: leadData.phoneNumber,
                    company: leadData.company,
                    jobTitle: leadData.jobTitle,
                    source: leadData.source || 'bulk-import',
                    ownerId,
                });
                success++;
            }
            catch (error) {
                failed++;
            }
        }
        return { success, failed };
    }
}
exports.LeadService = LeadService;
exports.default = new LeadService();
//# sourceMappingURL=prospect.service.js.map