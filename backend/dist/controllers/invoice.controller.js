"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceController = void 0;
const invoice_service_1 = __importDefault(require("../services/invoice.service"));
const account_service_1 = __importDefault(require("../services/account.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
// totalAmount is derived from amount + tax by the service; accepting it from
// the client would let the stored total disagree with its components.
const INVOICE_UPDATABLE = [
    'invoiceNumber',
    'amount',
    'tax',
    'invoiceDate',
    'dueDate',
    'billingCycle',
    'description',
    'notes',
    'status',
    'accountId',
    'contractId',
    'projectId',
];
class InvoiceController {
    async createInvoice(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'invoices', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create invoices');
            }
            const { invoiceNumber, contractId, accountId, projectId, amount, tax, invoiceDate, dueDate, billingCycle, description } = req.body;
            if (!invoiceNumber || !contractId || !accountId || !amount || !invoiceDate || !dueDate) {
                throw new errorHandler_1.AppError(400, 'Required fields: invoiceNumber, contractId, accountId, amount, invoiceDate, dueDate');
            }
            // At "self" scope, only allow invoicing against an account the user owns.
            if ((0, auth_1.getOwnerScope)(req.user, 'invoices') !== undefined) {
                const account = await account_service_1.default.getAccountById(accountId);
                if (account.ownerId !== req.user.id) {
                    throw new errorHandler_1.AppError(403, 'You can only create invoices for your own accounts');
                }
            }
            const invoice = await invoice_service_1.default.createInvoice({
                invoiceNumber,
                contractId,
                accountId,
                projectId,
                amount: Number(amount),
                tax: tax ? Number(tax) : undefined,
                invoiceDate: new Date(invoiceDate),
                dueDate: new Date(dueDate),
                billingCycle,
                description,
            });
            logger_1.default.info(`Invoice created: ${invoice.invoiceNumber} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: invoice });
        }
        catch (error) {
            next(error);
        }
    }
    async getInvoices(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'invoices', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view invoices');
            }
            const { page = 1, limit = 20, accountId, contractId, projectId, status } = req.query;
            const { data, total } = await invoice_service_1.default.getInvoices({
                page: Number(page),
                limit: Number(limit),
                accountId: accountId,
                contractId: contractId,
                projectId: projectId,
                status: status,
                // undefined at "all" scope; the user's id at "self" scope.
                accountOwnerId: (0, auth_1.getOwnerScope)(req.user, 'invoices'),
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
    async getInvoice(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'invoices', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view invoices');
            }
            const invoice = await invoice_service_1.default.getInvoiceById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'invoices', 'view', invoice.account?.ownerId);
            return res.json({ success: true, data: invoice });
        }
        catch (error) {
            next(error);
        }
    }
    async updateInvoice(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'invoices', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update invoices');
            }
            const existing = await invoice_service_1.default.getInvoiceById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'invoices', 'update', existing.account?.ownerId);
            const invoice = await invoice_service_1.default.updateInvoice(req.params.id, (0, pick_1.default)(req.body, INVOICE_UPDATABLE));
            logger_1.default.info(`Invoice updated: ${invoice.id} by ${req.user?.email}`);
            return res.json({ success: true, data: invoice });
        }
        catch (error) {
            next(error);
        }
    }
    async recordPayment(req, res, next) {
        try {
            // Recording a payment mutates the invoice, so it requires update rights.
            if (!(0, auth_1.canPerformAction)(req.user, 'invoices', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to record payments');
            }
            const target = await invoice_service_1.default.getInvoiceById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'invoices', 'record payments on', target.account?.ownerId);
            const { amount, paymentDate, paymentMethod, transactionReference } = req.body;
            if (!amount || !paymentDate || !paymentMethod) {
                throw new errorHandler_1.AppError(400, 'Required fields: amount, paymentDate, paymentMethod');
            }
            const payment = await invoice_service_1.default.recordPayment(req.params.id, {
                amount: Number(amount),
                paymentDate: new Date(paymentDate),
                paymentMethod,
                transactionReference,
            });
            logger_1.default.info(`Payment recorded on invoice ${req.params.id}: ${amount} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: payment });
        }
        catch (error) {
            next(error);
        }
    }
    async getPayments(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'invoices', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view invoices');
            }
            const parent = await invoice_service_1.default.getInvoiceById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'invoices', 'view', parent.account?.ownerId);
            const payments = await invoice_service_1.default.getPayments(req.params.id);
            return res.json({ success: true, data: payments });
        }
        catch (error) {
            next(error);
        }
    }
    async getFinancialSummary(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'invoices', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view invoices');
            }
            const summary = await invoice_service_1.default.getFinancialSummary(req.params.contractId);
            return res.json({ success: true, data: summary });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteInvoice(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'invoices', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete invoices');
            }
            const doomed = await invoice_service_1.default.getInvoiceById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'invoices', 'delete', doomed.account?.ownerId);
            await invoice_service_1.default.deleteInvoice(req.params.id);
            logger_1.default.info(`Invoice deleted: ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Invoice deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.InvoiceController = InvoiceController;
exports.default = new InvoiceController();
//# sourceMappingURL=invoice.controller.js.map