"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractController = void 0;
const contract_service_1 = __importDefault(require("../services/contract.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
// approvedBy/approvedDate are set by the approve endpoint; createdById at
// creation; documentPath by upload. None may be set by the client.
const CONTRACT_UPDATABLE = [
    'title',
    'type',
    'value',
    'startDate',
    'endDate',
    'renewalDate',
    'paymentTerms',
    'slaTerms',
    'remarks',
    'status',
    'accountId',
    'opportunityId',
    'contractNumber',
];
class ContractController {
    async createContract(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'contracts', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create contracts');
            }
            const { contractNumber, title, type, value, startDate, endDate, accountId, opportunityId, paymentTerms, slaTerms, remarks } = req.body;
            if (!contractNumber || !title || !type || !value || !startDate || !endDate || !accountId) {
                throw new errorHandler_1.AppError(400, 'Required fields: contractNumber, title, type, value, startDate, endDate, accountId');
            }
            const contract = await contract_service_1.default.createContract({
                contractNumber,
                title,
                type,
                value: Number(value),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                accountId,
                opportunityId,
                paymentTerms,
                slaTerms,
                remarks,
                createdById: req.user?.id,
            });
            logger_1.default.info(`Contract created: ${contract.contractNumber} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: contract });
        }
        catch (error) {
            next(error);
        }
    }
    async getContracts(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'contracts', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view contracts');
            }
            const { page = 1, limit = 20, accountId, status, search } = req.query;
            const { data, total } = await contract_service_1.default.getContracts({
                page: Number(page),
                limit: Number(limit),
                accountId: accountId,
                status: status,
                search: search,
                // undefined at "all" scope; the user's id at "self" scope.
                scopeUserId: (0, auth_1.getOwnerScope)(req.user, 'contracts'),
            });
            return res.json({
                success: true,
                data,
                meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getContract(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'contracts', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view contracts');
            }
            const contract = await contract_service_1.default.getContractById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'contracts', 'view', contract.account?.ownerId, [contract.createdById]);
            return res.json({ success: true, data: contract });
        }
        catch (error) {
            next(error);
        }
    }
    async updateContract(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'contracts', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update contracts');
            }
            const record = await contract_service_1.default.getContractById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'contracts', 'update', record.account?.ownerId, [record.createdById]);
            const contract = await contract_service_1.default.updateContract(req.params.id, (0, pick_1.default)(req.body, CONTRACT_UPDATABLE));
            logger_1.default.info(`Contract updated: ${contract.id} by ${req.user?.email}`);
            return res.json({ success: true, data: contract });
        }
        catch (error) {
            next(error);
        }
    }
    async approveContract(req, res, next) {
        try {
            // Approving mutates the contract, so it requires update rights.
            if (!(0, auth_1.canPerformAction)(req.user, 'contracts', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to approve contracts');
            }
            const record = await contract_service_1.default.getContractById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'contracts', 'approve', record.account?.ownerId, [record.createdById]);
            const contract = await contract_service_1.default.approveContract(req.params.id, req.user?.email || 'Unknown');
            logger_1.default.info(`Contract approved: ${contract.id} by ${req.user?.email}`);
            return res.json({ success: true, data: contract });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteContract(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'contracts', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete contracts');
            }
            const record = await contract_service_1.default.getContractById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'contracts', 'delete', record.account?.ownerId, [record.createdById]);
            await contract_service_1.default.deleteContract(req.params.id);
            logger_1.default.info(`Contract deleted: ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Contract deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ContractController = ContractController;
exports.default = new ContractController();
//# sourceMappingURL=contract.controller.js.map