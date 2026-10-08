"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadController = void 0;
const lead_service_1 = __importDefault(require("../services/lead.service"));
const auth_1 = require("../middleware/auth");
const user_service_1 = __importDefault(require("../services/user.service"));
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
// System-managed columns (ownerId, assigneeIds, score, accountId, lostReason,
// createdAt/updatedAt) must never be client-settable; pick() drops them by
// omission so a raw body cannot reassign a lead or forge its timestamps.
const LEAD_UPDATABLE = [
    'firstName', 'lastName', 'email', 'phoneNumber', 'company', 'jobTitle',
    'source', 'status', 'value', 'expectedCloseDate', 'productId', 'productName',
    'productIds', 'productNames', 'businessVolume', 'supplierList', 'region',
    'country', 'remark', 'tags',
];
class LeadController {
    async createLead(req, res, next) {
        try {
            // Check if user has permission to create leads
            if (!(0, auth_1.canPerformAction)(req.user, 'leads', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create leads');
            }
            const { accountId, firstName, lastName, email, phoneNumber, company, jobTitle, source, value, expectedCloseDate, productId, productName, productIds, productNames, remark, businessVolume, supplierList, region, country, } = req.body;
            // The UI captures a single "contact person" (matching the account model)
            // which is split into first/last; a one-word name leaves lastName empty,
            // so only the contact person (firstName) and email are required.
            if (!firstName || !email) {
                throw new errorHandler_1.AppError(400, 'Contact person and email are required');
            }
            // A lead must belong to an account (the column is NOT NULL). Previously
            // accountId was dropped here, so creation failed with a not-null
            // violation (or, where the column was nullable, saved an orphaned lead).
            if (!accountId) {
                throw new errorHandler_1.AppError(400, 'An account is required to create a lead');
            }
            // The buying committee is optional: a lead can be created before it is mapped.
            const lead = await lead_service_1.default.createLead({
                accountId,
                firstName,
                lastName,
                email,
                phoneNumber,
                company,
                jobTitle,
                source,
                value: value !== undefined ? Number(value) : undefined,
                expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
                productId,
                productName,
                productIds,
                productNames,
                remark,
                businessVolume: businessVolume !== undefined ? Number(businessVolume) : undefined,
                supplierList: Array.isArray(supplierList) ? supplierList : undefined,
                region,
                country,
                ownerId: req.user.id,
            });
            logger_1.default.info(`Lead created: ${lead.email} by ${req.user.email}`);
            return res.status(201).json({
                success: true,
                data: lead,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getLeads(req, res, next) {
        try {
            const { page = 1, limit = 20, status, source, ownerId, search, fromDate, toDate, region, country } = req.query;
            // Sales Reps are restricted to their own leads; Admin/Manager see all.
            const scope = (0, auth_1.getOwnerScope)(req.user, 'leads');
            // If restricted user (scope = user.id), use that. If admin (scope = undefined), use ownerId filter if provided, else undefined.
            const effectiveOwnerId = scope || (ownerId && ownerId !== '' ? ownerId : undefined);
            const { data, total } = await lead_service_1.default.getLeads({
                page: Number(page),
                limit: Number(limit),
                status: status,
                source: source,
                ownerId: effectiveOwnerId,
                search: search,
                fromDate: fromDate,
                toDate: toDate,
                region: region,
                country: country,
            }, req.traceId);
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
    async getLead(req, res, next) {
        try {
            const { id } = req.params;
            const lead = await lead_service_1.default.getLeadById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'leads', lead.ownerId, 'read', lead.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only view your own leads');
            }
            return res.json({
                success: true,
                data: lead,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateLead(req, res, next) {
        try {
            const { id } = req.params;
            const lead = await lead_service_1.default.getLeadById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'leads', lead.ownerId, 'update', lead.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only update your own leads');
            }
            // Deal Stage Manager can only update status via dedicated endpoint
            if (req.user?.role === 'Deal Stage Manager') {
                throw new errorHandler_1.AppError(403, 'Deal Stage Manager can only update status via /status endpoint');
            }
            // Check if user has permission to update leads
            if (!(0, auth_1.canPerformAction)(req.user, 'leads', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update leads');
            }
            // Whitelist to prevent mass assignment (ownerId, assigneeIds, timestamps).
            const updates = (0, pick_1.default)(req.body, LEAD_UPDATABLE);
            const updatedLead = await lead_service_1.default.updateLead(id, updates);
            logger_1.default.info(`Lead updated: ${updatedLead.id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: updatedLead,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Assign a lead to one or more users (Admin/Manager only). The first id
    // becomes the primary owner; all ids are stored as assignees.
    async assignLead(req, res, next) {
        try {
            if (!(0, auth_1.canReassign)(req.user, 'leads')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to reassign leads');
            }
            const ids = Array.isArray(req.body.ownerIds)
                ? req.body.ownerIds
                : req.body.ownerId ? [req.body.ownerId] : [];
            if (!ids.length)
                throw new errorHandler_1.AppError(400, 'ownerIds is required');
            for (const id of ids)
                await user_service_1.default.getUserById(id); // 404 if any is invalid
            const lead = await lead_service_1.default.updateLead(req.params.id, { ownerId: ids[0], assigneeIds: ids });
            logger_1.default.info(`Lead ${lead.id} assigned to [${ids.join(', ')}] by ${req.user.email}`);
            return res.json({ success: true, data: lead });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteLead(req, res, next) {
        try {
            const { id } = req.params;
            const lead = await lead_service_1.default.getLeadById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'leads', lead.ownerId, 'delete', lead.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only delete your own leads');
            }
            // Check if user has permission to delete leads
            if (!(0, auth_1.canPerformAction)(req.user, 'leads', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete leads');
            }
            await lead_service_1.default.deleteLead(id);
            logger_1.default.info(`Lead deleted: ${id} by ${req.user.email}`);
            return res.json({
                success: true,
                data: { message: 'Lead deleted successfully' },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateLeadStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!status) {
                throw new errorHandler_1.AppError(400, 'Status is required');
            }
            const lead = await lead_service_1.default.getLeadById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'leads', lead.ownerId, 'update', lead.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only update your own leads');
            }
            const updatedLead = await lead_service_1.default.updateLeadStatus(id, status);
            logger_1.default.info(`Lead status updated to ${status}: ${id}`);
            return res.json({
                success: true,
                data: updatedLead,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async convertLeadToAccount(req, res, next) {
        try {
            const { id } = req.params;
            const lead = await lead_service_1.default.getLeadById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'leads', lead.ownerId, 'update', lead.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only convert your own leads');
            }
            const account = await lead_service_1.default.convertLeadToAccount(id);
            logger_1.default.info(`Lead converted to account: ${account.id} by ${req.user.email}`);
            return res.status(201).json({
                success: true,
                data: account,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async convertToOpportunity(req, res, next) {
        try {
            const { id } = req.params;
            // Ownership check: without this, any user could convert any lead by id.
            const lead = await lead_service_1.default.getLeadById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'leads', lead.ownerId, 'update', lead.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only convert your own leads');
            }
            const opportunity = await lead_service_1.default.convertLeadToOpportunity(id);
            logger_1.default.info(`Lead ${id} converted to opportunity ${opportunity.id} by ${req.user.email}`);
            return res.status(201).json({
                success: true,
                data: opportunity,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async markLost(req, res, next) {
        try {
            const { id } = req.params;
            const { lostReason } = req.body;
            if (!lostReason) {
                throw new errorHandler_1.AppError(400, 'lostReason is required');
            }
            // Ownership check: marking a lead lost mutates it, so verify access first.
            const existing = await lead_service_1.default.getLeadById(id);
            if (!(0, auth_1.canAccessRecord)(req.user, 'leads', existing.ownerId, 'update', existing.assigneeIds)) {
                throw new errorHandler_1.AppError(403, 'You can only update your own leads');
            }
            const lead = await lead_service_1.default.markLeadLost(id, lostReason);
            logger_1.default.info(`Lead ${id} marked lost (${lostReason}) by ${req.user.email}`);
            return res.json({
                success: true,
                data: lead,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async bulkImport(req, res, next) {
        try {
            // Bulk import creates leads, so it requires the create permission.
            if (!(0, auth_1.canPerformAction)(req.user, 'leads', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create leads');
            }
            const { leads } = req.body;
            if (!Array.isArray(leads)) {
                throw new errorHandler_1.AppError(400, 'Leads must be an array');
            }
            const result = await lead_service_1.default.bulkImportLeads(leads, req.user.id);
            logger_1.default.info(`Bulk import completed: ${result.success} success, ${result.failed} failed by ${req.user.email}`);
            return res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LeadController = LeadController;
exports.default = new LeadController();
//# sourceMappingURL=lead.controller.js.map