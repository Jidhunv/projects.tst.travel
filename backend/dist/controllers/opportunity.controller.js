"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityController = void 0;
const opportunity_service_1 = __importDefault(require("../services/opportunity.service"));
const auth_1 = require("../middleware/auth");
const user_service_1 = __importDefault(require("../services/user.service"));
const errorHandler_1 = require("../middleware/errorHandler");
const constants_1 = require("../utils/constants");
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
// ownerId/assigneeIds/accountId/convertedFromLeadId/closedAt and timestamps are
// system-managed; pick() drops them so a raw body cannot reassign or re-parent
// an opportunity or forge close/creation data.
const OPPORTUNITY_UPDATABLE = [
    'name', 'amount', 'stage', 'status', 'description', 'forecastedCloseDate',
    'probability', 'primaryContactId', 'businessVolume', 'supplierList', 'region',
    'country', 'city', 'company', 'contactPerson', 'contactEmail', 'contactPhone',
    'jobTitle', 'source', 'remark', 'tags', 'closedReason', 'productIds', 'productNames', 'tier',
];
// Line-item fields a client may set (addLineItem accepts the same set).
const LINE_ITEM_UPDATABLE = [
    'productId', 'productName', 'quantity', 'unitPrice', 'discount',
    'discountPercent', 'description',
];
class OpportunityController {
    async createOpportunity(req, res, next) {
        try {
            // Check if user has permission to create opportunities
            if (!(0, auth_1.canPerformAction)(req.user, 'opportunities', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create opportunities');
            }
            const { name, amount, stage, forecastedCloseDate, accountId, primaryContactId, probability, productIds, productNames, country, city, region, tier, } = req.body;
            if (!name || !amount || !stage || !forecastedCloseDate || !accountId) {
                throw new errorHandler_1.AppError(400, 'Name, amount, stage, close date, and account are required');
            }
            const opp = await opportunity_service_1.default.createOpportunity({
                name,
                amount,
                stage,
                forecastedCloseDate: new Date(forecastedCloseDate),
                accountId,
                primaryContactId,
                ownerId: req.user.id,
                probability,
                productIds,
                productNames,
                country,
                city,
                region,
                tier,
            });
            logger_1.default.info(`Opportunity created: ${opp.name} by ${req.user.email}`);
            return res.status(201).json({
                success: true,
                data: opp,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOpportunities(req, res, next) {
        try {
            const { page = 1, limit = 20, stage, status, ownerId, accountId, search, fromDate, toDate, amountFrom, amountTo, region, country, city, products } = req.query;
            // Sales Reps see only their own opportunities; Admin/Manager see all.
            const scope = (0, auth_1.getOwnerScope)(req.user, 'opportunities');
            // If restricted user (scope = user.id), use that. If admin (scope = undefined), use ownerId filter if provided, else undefined.
            const effectiveOwnerId = scope || (ownerId && ownerId !== '' ? ownerId : undefined);
            const { data, total } = await opportunity_service_1.default.getOpportunities({
                page: Number(page),
                limit: Number(limit),
                stage: stage,
                status: status,
                ownerId: effectiveOwnerId,
                accountId: accountId,
                search: search,
                fromDate: fromDate,
                toDate: toDate,
                amountFrom: amountFrom ? Number(amountFrom) : undefined,
                amountTo: amountTo ? Number(amountTo) : undefined,
                region: region,
                country: country,
                city: city,
                products: products ? (typeof products === 'string' ? products.split(',') : products) : undefined,
            });
            return res.json({
                success: true,
                data,
                meta: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOpportunity(req, res, next) {
        try {
            const { id } = req.params;
            const opp = await opportunity_service_1.default.getOpportunityById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'opportunities', opp.ownerId, 'read', opp.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only view your own opportunities');
            }
            return res.json({
                success: true,
                data: opp,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateOpportunity(req, res, next) {
        try {
            const { id } = req.params;
            const opp = await opportunity_service_1.default.getOpportunityById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only update your own opportunities');
            }
            // Deal Stage Manager can only update stage/probability via dedicated endpoints
            if (req.user?.role === 'Deal Stage Manager') {
                throw new errorHandler_1.AppError(403, 'Deal Stage Manager can only update stage via /stage endpoint');
            }
            // Check if user has permission to update opportunities
            if (!(0, auth_1.canPerformAction)(req.user, 'opportunities', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update opportunities');
            }
            // Whitelist to prevent mass assignment (ownerId, assigneeIds, timestamps).
            const updates = (0, pick_1.default)(req.body, OPPORTUNITY_UPDATABLE);
            const updatedOpp = await opportunity_service_1.default.updateOpportunity(id, updates);
            logger_1.default.info(`Opportunity updated: ${updatedOpp.id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: updatedOpp,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Admin-only data-correction endpoint: directly overwrite createdAt /
    // forecastedCloseDate / closedAt to backfill historical or imported
    // records. Hard-gated to the Admin role (not permission-based) since this
    // bypasses the normal update whitelist by design.
    async adminUpdateDates(req, res, next) {
        try {
            if (req.user?.role !== 'Admin') {
                throw new errorHandler_1.AppError(403, 'Only Admin can manually correct opportunity dates');
            }
            const { id } = req.params;
            const { createdAt, forecastedCloseDate, closedAt } = req.body;
            const updatedOpp = await opportunity_service_1.default.adminUpdateDates(id, {
                createdAt,
                forecastedCloseDate,
                closedAt,
            });
            logger_1.default.info(`Opportunity dates manually corrected: ${updatedOpp.id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: updatedOpp,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStage(req, res, next) {
        try {
            const { id } = req.params;
            const { stage } = req.body;
            if (!stage) {
                throw new errorHandler_1.AppError(400, 'Stage is required');
            }
            const opp = await opportunity_service_1.default.getOpportunityById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only update your own opportunities');
            }
            const updatedOpp = await opportunity_service_1.default.updateStage(id, stage);
            logger_1.default.info(`Opportunity stage updated to ${stage}: ${updatedOpp.id}`);
            return res.json({
                success: true,
                data: updatedOpp,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async closeOpportunity(req, res, next) {
        try {
            const { id } = req.params;
            const { outcome, rejectionReason } = req.body;
            if (!outcome || !['Won', 'Lost'].includes(outcome)) {
                throw new errorHandler_1.AppError(400, 'outcome must be Won or Lost');
            }
            // When a deal is Lost, require a rejection reason from the fixed list.
            if (outcome === 'Lost') {
                if (!rejectionReason || !constants_1.REJECTION_REASONS.includes(rejectionReason)) {
                    throw new errorHandler_1.AppError(400, `A rejection reason is required when losing a deal. Allowed: ${constants_1.REJECTION_REASONS.join(', ')}`);
                }
            }
            const opp = await opportunity_service_1.default.getOpportunityById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only close your own opportunities');
            }
            const closedOpp = await opportunity_service_1.default.closeOpportunity(id, outcome, rejectionReason);
            logger_1.default.info(`Opportunity closed as ${outcome}: ${closedOpp.id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: closedOpp,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Expose the fixed rejection-reason list for dropdowns in the UI.
    async getRejectionReasons(_req, res, next) {
        try {
            return res.json({ success: true, data: constants_1.REJECTION_REASONS });
        }
        catch (error) {
            next(error);
        }
    }
    // Assign an opportunity to one or more users (Admin/Manager only).
    async assignOpportunity(req, res, next) {
        try {
            if (!(0, auth_1.canReassign)(req.user, 'opportunities')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to reassign opportunities');
            }
            const ids = Array.isArray(req.body.ownerIds)
                ? req.body.ownerIds
                : req.body.ownerId ? [req.body.ownerId] : [];
            if (!ids.length)
                throw new errorHandler_1.AppError(400, 'ownerIds is required');
            for (const id of ids)
                await user_service_1.default.getUserById(id);
            const opp = await opportunity_service_1.default.updateOpportunity(req.params.id, { ownerId: ids[0], assigneeIds: ids });
            logger_1.default.info(`Opportunity ${opp.id} assigned to [${ids.join(', ')}] by ${req.user.email}`);
            return res.json({ success: true, data: opp });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteOpportunity(req, res, next) {
        try {
            const { id } = req.params;
            const opp = await opportunity_service_1.default.getOpportunityById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'opportunities', opp.ownerId, 'delete', opp.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only delete your own opportunities');
            }
            await opportunity_service_1.default.deleteOpportunity(id);
            logger_1.default.info(`Opportunity deleted: ${id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: { message: 'Opportunity deleted successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Line items belong to an opportunity and inherit its ownership. Every line
    // item operation must verify the caller may update the parent opportunity,
    // otherwise a user can mutate line items on opportunities they do not own
    // (IDOR) simply by passing another opportunity's id.
    async assertCanEditOpportunity(req, opportunityId) {
        if (!(0, auth_1.canPerformAction)(req.user, 'opportunities', 'update')) {
            throw new errorHandler_1.AppError(403, 'You do not have permission to update opportunities');
        }
        const opp = await opportunity_service_1.default.getOpportunityById(opportunityId);
        if (!(0, auth_1.canAccessRecord)(req.user, 'opportunities', opp.ownerId, 'update', opp.assigneeIds)) {
            throw new errorHandler_1.AppError(403, 'You can only modify your own opportunities');
        }
    }
    async addLineItem(req, res, next) {
        try {
            const { opportunityId } = req.params;
            await this.assertCanEditOpportunity(req, opportunityId);
            const { productId, productName, quantity, unitPrice, discount, discountPercent, description } = req.body;
            if (!productName || !quantity || !unitPrice) {
                throw new errorHandler_1.AppError(400, 'Product name, quantity, and unit price are required');
            }
            const lineItem = await opportunity_service_1.default.addLineItem(opportunityId, {
                productId,
                productName,
                quantity,
                unitPrice,
                discount,
                discountPercent,
                description,
            });
            logger_1.default.info(`Line item added to opportunity ${opportunityId}: ${productName}`);
            return res.status(201).json({
                success: true,
                data: lineItem,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateLineItem(req, res, next) {
        try {
            const { opportunityId, lineItemId } = req.params;
            await this.assertCanEditOpportunity(req, opportunityId);
            const updates = (0, pick_1.default)(req.body, LINE_ITEM_UPDATABLE);
            const lineItem = await opportunity_service_1.default.updateLineItem(opportunityId, lineItemId, updates);
            logger_1.default.info(`Line item updated: ${lineItemId}`);
            return res.json({
                success: true,
                data: lineItem,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteLineItem(req, res, next) {
        try {
            const { opportunityId, lineItemId } = req.params;
            await this.assertCanEditOpportunity(req, opportunityId);
            await opportunity_service_1.default.deleteLineItem(opportunityId, lineItemId);
            logger_1.default.info(`Line item deleted: ${lineItemId}`);
            return res.json({
                success: true,
                data: { message: 'Line item deleted successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPipeline(req, res, next) {
        try {
            const { ownerId, accountId } = req.query;
            // Self-scoped users only see their own pipeline; the query param cannot
            // widen that. Admin/Manager (all scope) may filter by any ownerId.
            const scope = (0, auth_1.getOwnerScope)(req.user, 'opportunities');
            const effectiveOwnerId = scope || (ownerId && ownerId !== '' ? ownerId : undefined);
            const pipeline = await opportunity_service_1.default.getPipeline({
                ownerId: effectiveOwnerId,
                accountId: accountId,
            });
            return res.json({
                success: true,
                data: pipeline,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getForecast(req, res, next) {
        try {
            const { ownerId } = req.query;
            // Self-scoped users only see their own forecast.
            const scope = (0, auth_1.getOwnerScope)(req.user, 'opportunities');
            const effectiveOwnerId = scope || (ownerId && ownerId !== '' ? ownerId : undefined);
            const forecast = await opportunity_service_1.default.getForecast(effectiveOwnerId);
            return res.json({
                success: true,
                data: forecast,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.OpportunityController = OpportunityController;
exports.default = new OpportunityController();
//# sourceMappingURL=opportunity.controller.js.map