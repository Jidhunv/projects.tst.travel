"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityService = void 0;
const database_1 = require("../config/database");
const stageHistory_service_1 = __importDefault(require("./stageHistory.service"));
const Opportunity_1 = require("../models/Opportunity");
const LineItem_1 = require("../models/LineItem");
const Account_1 = require("../models/Account");
const errorHandler_1 = require("../middleware/errorHandler");
const constants_1 = require("../utils/constants");
const questionnaire_1 = require("../utils/questionnaire");
const buyingCommittee_service_1 = require("./buyingCommittee.service");
const listSort_1 = require("../utils/listSort");
const OPPORTUNITY_SORT = {
    name: 'opp.name',
    amount: 'opp.amount',
    stage: 'opp.stage',
    status: 'opp.status',
    probability: 'opp.probability',
    closeDate: 'opp.forecastedCloseDate',
    country: 'opp.country',
    region: 'opp.region',
    createdAt: 'opp.createdAt',
};
class OpportunityService {
    constructor() {
        this.oppRepository = database_1.AppDataSource.getRepository(Opportunity_1.Opportunity);
        this.lineItemRepository = database_1.AppDataSource.getRepository(LineItem_1.LineItem);
    }
    formatOpportunity(opp) {
        const formatted = { ...opp };
        if (opp.lineItems && opp.lineItems.length > 0) {
            formatted.productIds = opp.lineItems.map((item) => item.productId).filter(Boolean);
            formatted.productNames = opp.lineItems.map((item) => item.productName);
        }
        else {
            formatted.productIds = [];
            formatted.productNames = [];
        }
        return formatted;
    }
    async createOpportunity(data) {
        if (!constants_1.OPPORTUNITY_STAGES.includes(data.stage)) {
            throw new errorHandler_1.AppError(400, 'Invalid opportunity stage');
        }
        const { productIds, productNames, ...oppData } = data;
        // Get account to populate tier if not provided
        let tier = data.tier;
        if (!tier && data.accountId) {
            const account = await database_1.AppDataSource.getRepository(Account_1.Account).findOne({
                where: { id: data.accountId },
            });
            tier = account?.tier;
        }
        const opp = this.oppRepository.create({
            ...oppData,
            status: 'Open',
            probability: data.probability || 10,
            country: data.country,
            city: data.city,
            region: data.region,
            tier,
        });
        const savedOpp = await this.oppRepository.save(opp);
        await stageHistory_service_1.default.record(savedOpp.id, savedOpp.stage, data.ownerId, 'Deal created');
        // Create line items if products are provided
        if (productIds && productIds.length > 0) {
            const names = productNames || [];
            for (let i = 0; i < productIds.length; i++) {
                const lineItem = this.lineItemRepository.create({
                    productId: productIds[i],
                    productName: names[i] || '',
                    quantity: 1,
                    unitPrice: 0,
                    opportunity: savedOpp,
                });
                await this.lineItemRepository.save(lineItem);
            }
            // Reload to get the line items
            return await this.getOpportunityById(savedOpp.id);
        }
        return this.formatOpportunity(savedOpp);
    }
    async getOpportunityById(id) {
        const opp = await this.oppRepository.findOne({
            where: { id },
            relations: ['owner', 'account', 'primaryContact', 'lineItems'],
        });
        if (!opp) {
            throw new errorHandler_1.AppError(404, 'Opportunity not found');
        }
        return this.formatOpportunity(opp);
    }
    async getOpportunities(filters = {}) {
        const { page = 1, limit = 20, search, fromDate, toDate, amountFrom, amountTo, ...where } = filters;
        const order = (0, listSort_1.resolveSort)(filters.sortBy, filters.sortDir, OPPORTUNITY_SORT, 'closeDate', 'ASC');
        const skip = (page - 1) * limit;
        const query = this.oppRepository
            .createQueryBuilder('opp')
            .leftJoinAndSelect('opp.owner', 'owner')
            .leftJoinAndSelect('opp.account', 'account')
            .leftJoinAndSelect('opp.lineItems', 'lineItems');
        if (search) {
            query.where('opp.name ILIKE :search', { search: `%${search}%` });
        }
        if (where.stage) {
            query.andWhere('opp.stage = :stage', { stage: where.stage });
        }
        if (where.status) {
            query.andWhere('opp.status = :status', { status: where.status });
        }
        if (where.ownerId) {
            query.andWhere('(opp.ownerId = :ownerId OR opp.assigneeIds LIKE :ownerIdLike)', {
                ownerId: where.ownerId,
                ownerIdLike: `%${where.ownerId}%`,
            });
        }
        if (where.accountId) {
            query.andWhere('opp.accountId = :accountId', { accountId: where.accountId });
        }
        if (where.region) {
            query.andWhere('opp.region ILIKE :region', { region: `%${where.region}%` });
        }
        if (where.country) {
            query.andWhere('opp.country ILIKE :country', { country: `%${where.country}%` });
        }
        if (where.city) {
            query.andWhere('opp.city ILIKE :city', { city: `%${where.city}%` });
        }
        if (where.products && where.products.length > 0) {
            query.andWhere('lineItems.productId IN (:...productIds)', { productIds: where.products });
        }
        if (fromDate) {
            query.andWhere('opp.createdAt >= :fromDate', { fromDate: new Date(`${fromDate}T00:00:00.000Z`) });
        }
        if (toDate) {
            query.andWhere('opp.createdAt <= :toDate', { toDate: new Date(`${toDate}T23:59:59.999Z`) });
        }
        if (amountFrom !== undefined && amountFrom !== null) {
            query.andWhere('opp.amount >= :amountFrom', { amountFrom: Number(amountFrom) });
        }
        if (amountTo !== undefined && amountTo !== null) {
            query.andWhere('opp.amount <= :amountTo', { amountTo: Number(amountTo) });
        }
        const [rows, total] = await query
            .orderBy(order.column, order.dir)
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        // Flag deals whose account has no buying committee yet, at every stage.
        const counts = await (0, buyingCommittee_service_1.committeeCountsByAccount)(rows.map((o) => o.accountId));
        const data = rows.map((opp) => {
            const n = counts.get(opp.accountId) ?? 0;
            return { ...this.formatOpportunity(opp), buyingCommitteeCount: n, hasBuyingCommittee: n > 0 };
        });
        return { data, total };
    }
    async updateOpportunity(id, data, actorId) {
        const opp = await this.oppRepository.findOne({
            where: { id },
            relations: ['lineItems'],
        });
        if (!opp) {
            throw new errorHandler_1.AppError(404, 'Opportunity not found');
        }
        if (data.stage) {
            if (!constants_1.OPPORTUNITY_STAGES.includes(data.stage)) {
                throw new errorHandler_1.AppError(400, 'Invalid opportunity stage');
            }
        }
        if (data.status) {
            const validStatuses = ['Open', 'Won', 'Lost'];
            if (!validStatuses.includes(data.status)) {
                throw new errorHandler_1.AppError(400, 'Invalid opportunity status');
            }
            if (data.status === 'Won') {
                data.stage = 'Closed-Won';
                data.probability = 100;
                data.closedAt = new Date();
            }
            else if (data.status === 'Lost') {
                data.stage = 'Closed-Lost';
                data.probability = 0;
                data.closedAt = new Date();
            }
        }
        // Handle product updates
        const { productIds, productNames, ...oppData } = data;
        if ((productIds !== undefined || productNames !== undefined) && Array.isArray(productIds) && productIds.length > 0) {
            // Remove existing line items
            if (opp.lineItems && opp.lineItems.length > 0) {
                await this.lineItemRepository.delete({ opportunity: { id } });
            }
            // Create new line items
            const names = productNames || [];
            for (let i = 0; i < productIds.length; i++) {
                const lineItem = this.lineItemRepository.create({
                    productId: productIds[i],
                    productName: names[i] || '',
                    quantity: 1,
                    unitPrice: 0,
                    opportunity: opp,
                });
                await this.lineItemRepository.save(lineItem);
            }
        }
        else if (Array.isArray(productIds) && productIds.length === 0) {
            // Clear all line items if empty array is passed
            await this.lineItemRepository.delete({ opportunity: { id } });
        }
        // Column-level update: the getById above eager-loads relations, and save()
        // gives a loaded relation precedence over its FK column -- so changing only
        // the FK would be silently overwritten by the stale relation object.
        // update() writes exactly the columns given.
        await this.oppRepository.update(id, oppData);
        if (data.stage && data.stage !== opp.stage)
            await stageHistory_service_1.default.record(id, data.stage, actorId ?? null, null, opp.stage);
        return await this.getOpportunityById(id);
    }
    // Admin-only: directly overwrite system-managed timestamp columns to
    // backfill historical/imported data. These fields are deliberately absent
    // from OPPORTUNITY_UPDATABLE (the normal edit whitelist) since they should
    // never be client-settable through the regular edit form - this is a
    // separate, explicitly gated path for data correction only.
    async adminUpdateDates(id, data) {
        const opp = await this.oppRepository.findOne({ where: { id } });
        if (!opp) {
            throw new errorHandler_1.AppError(404, 'Opportunity not found');
        }
        const updates = {};
        if (data.createdAt !== undefined) {
            const d = new Date(data.createdAt);
            if (isNaN(d.getTime()))
                throw new errorHandler_1.AppError(400, 'Invalid createdAt date');
            updates.createdAt = d;
        }
        if (data.forecastedCloseDate !== undefined) {
            const d = new Date(data.forecastedCloseDate);
            if (isNaN(d.getTime()))
                throw new errorHandler_1.AppError(400, 'Invalid forecastedCloseDate date');
            updates.forecastedCloseDate = d;
        }
        if (data.closedAt !== undefined) {
            if (data.closedAt === null || data.closedAt === '') {
                updates.closedAt = null;
            }
            else {
                const d = new Date(data.closedAt);
                if (isNaN(d.getTime()))
                    throw new errorHandler_1.AppError(400, 'Invalid closedAt date');
                updates.closedAt = d;
            }
        }
        if (Object.keys(updates).length === 0) {
            throw new errorHandler_1.AppError(400, 'No date fields provided');
        }
        await this.oppRepository.update(id, updates);
        return await this.getOpportunityById(id);
    }
    async updateStage(id, stage, actorId) {
        if (!constants_1.OPPORTUNITY_STAGES.includes(stage)) {
            throw new errorHandler_1.AppError(400, 'Invalid opportunity stage');
        }
        const rawOpp = await this.oppRepository.findOne({
            where: { id },
            relations: ['lineItems'],
        });
        if (!rawOpp) {
            throw new errorHandler_1.AppError(404, 'Opportunity not found');
        }
        const fromStage = rawOpp.stage;
        rawOpp.stage = stage;
        // Update probability based on stage
        const stageProbability = {
            'Customer engagement': 10,
            Demonstration: 25,
            Proposal: 50,
            Negotiation: 75,
            'Closed-Won': 100,
            Handover: 100,
            'Closed-Lost': 0,
        };
        rawOpp.probability = stageProbability[stage] || rawOpp.probability;
        // The stage endpoint sets the status too, so a win or loss reads Won/Lost, not Open.
        rawOpp.status = (0, questionnaire_1.statusForStage)(stage);
        const saved = await this.oppRepository.save(rawOpp);
        if (fromStage !== stage)
            await stageHistory_service_1.default.record(id, stage, actorId ?? null, null, fromStage);
        return this.formatOpportunity(saved);
    }
    async closeOpportunity(id, outcome, rejectionReason, actorId) {
        const rawOpp = await this.oppRepository.findOne({
            where: { id },
            relations: ['lineItems'],
        });
        if (!rawOpp) {
            throw new errorHandler_1.AppError(404, 'Opportunity not found');
        }
        const fromStage = rawOpp.stage;
        rawOpp.status = outcome === 'Won' ? 'Won' : 'Lost';
        rawOpp.stage = outcome === 'Won' ? 'Closed-Won' : 'Closed-Lost';
        // For a win, record the outcome; for a loss, store the selected rejection reason.
        rawOpp.closedReason = outcome === 'Won' ? 'Won' : rejectionReason || 'Lost';
        rawOpp.closedAt = new Date();
        rawOpp.probability = outcome === 'Won' ? 100 : 0;
        const saved = await this.oppRepository.save(rawOpp);
        if (fromStage !== rawOpp.stage)
            await stageHistory_service_1.default.record(id, rawOpp.stage, actorId ?? null, rejectionReason ? `Lost: ${rejectionReason}` : null, fromStage);
        return this.formatOpportunity(saved);
    }
    async deleteOpportunity(id) {
        const opp = await this.getOpportunityById(id);
        await this.oppRepository.remove(opp);
    }
    async addLineItem(opportunityId, data) {
        const opp = await this.getOpportunityById(opportunityId);
        const lineItem = this.lineItemRepository.create({
            ...data,
            opportunity: opp,
        });
        const saved = await this.lineItemRepository.save(lineItem);
        // Recalculate opportunity amount
        await this.recalculateAmount(opportunityId);
        return saved;
    }
    async updateLineItem(opportunityId, lineItemId, data) {
        const lineItem = await this.lineItemRepository.findOne({
            where: { id: lineItemId, opportunityId },
        });
        if (!lineItem) {
            throw new errorHandler_1.AppError(404, 'Line item not found');
        }
        Object.assign(lineItem, data);
        const saved = await this.lineItemRepository.save(lineItem);
        // Recalculate opportunity amount
        await this.recalculateAmount(opportunityId);
        return saved;
    }
    async deleteLineItem(opportunityId, lineItemId) {
        const lineItem = await this.lineItemRepository.findOne({
            where: { id: lineItemId, opportunityId },
        });
        if (!lineItem) {
            throw new errorHandler_1.AppError(404, 'Line item not found');
        }
        await this.lineItemRepository.remove(lineItem);
        // Recalculate opportunity amount
        await this.recalculateAmount(opportunityId);
    }
    async recalculateAmount(opportunityId) {
        const lineItems = await this.lineItemRepository.find({
            where: { opportunityId },
        });
        const total = lineItems.reduce((sum, item) => {
            const itemTotal = item.quantity * item.unitPrice;
            const discountAmount = item.discountPercent
                ? (itemTotal * item.discountPercent) / 100
                : item.discount || 0;
            return sum + (itemTotal - discountAmount);
        }, 0);
        const opp = await this.getOpportunityById(opportunityId);
        opp.amount = total;
        await this.oppRepository.save(opp);
    }
    async getPipeline(filters = {}) {
        const query = this.oppRepository
            .createQueryBuilder('opp')
            .leftJoinAndSelect('opp.owner', 'owner')
            .leftJoinAndSelect('opp.account', 'account')
            .where('opp.status = :status', { status: 'Open' });
        if (filters.ownerId) {
            query.andWhere('opp.ownerId = :ownerId', { ownerId: filters.ownerId });
        }
        if (filters.accountId) {
            query.andWhere('opp.accountId = :accountId', { accountId: filters.accountId });
        }
        const opps = await query.orderBy('opp.forecastedCloseDate', 'ASC').getMany();
        const pipeline = {};
        constants_1.OPPORTUNITY_STAGES.forEach((stage) => {
            pipeline[stage] = opps.filter((opp) => opp.stage === stage);
        });
        return pipeline;
    }
    async getForecast(ownerId) {
        const query = this.oppRepository
            .createQueryBuilder('opp')
            .select('opp.stage', 'stage')
            .addSelect('COUNT(opp.id)', 'count')
            .addSelect('SUM(opp.amount)', 'totalAmount')
            .addSelect('SUM(opp.amount * opp.probability / 100)', 'expectedRevenue')
            .where('opp.status = :status', { status: 'Open' })
            .groupBy('opp.stage');
        if (ownerId) {
            query.andWhere('opp.ownerId = :ownerId', { ownerId });
        }
        const result = await query.getRawMany();
        return result.map((row) => ({
            stage: row.stage,
            count: parseInt(row.count),
            totalAmount: parseFloat(row.totalAmount || 0),
            expectedRevenue: parseFloat(row.expectedRevenue || 0),
        }));
    }
}
exports.OpportunityService = OpportunityService;
exports.default = new OpportunityService();
//# sourceMappingURL=opportunity.service.js.map