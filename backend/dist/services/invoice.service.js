"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const database_1 = require("../config/database");
const Invoice_1 = require("../models/Invoice");
const Payment_1 = require("../models/Payment");
const errorHandler_1 = require("../middleware/errorHandler");
class InvoiceService {
    constructor() {
        this.invoiceRepository = database_1.AppDataSource.getRepository(Invoice_1.Invoice);
        this.paymentRepository = database_1.AppDataSource.getRepository(Payment_1.Payment);
    }
    async createInvoice(data) {
        // Check if invoice number already exists
        const existing = await this.invoiceRepository.findOne({
            where: { invoiceNumber: data.invoiceNumber },
        });
        if (existing) {
            throw new errorHandler_1.AppError(409, 'Invoice number already exists');
        }
        const tax = data.tax || 0;
        const totalAmount = data.amount + tax;
        const invoice = this.invoiceRepository.create({
            ...data,
            tax,
            totalAmount,
            status: 'Draft',
            billingCycle: data.billingCycle || 'Monthly',
        });
        return await this.invoiceRepository.save(invoice);
    }
    async getInvoiceById(id) {
        const invoice = await this.invoiceRepository.findOne({
            where: { id },
            relations: ['contract', 'project', 'account', 'payments'],
        });
        if (!invoice) {
            throw new errorHandler_1.AppError(404, 'Invoice not found');
        }
        return invoice;
    }
    async getInvoices(filters = {}) {
        const { page = 1, limit = 20, ...where } = filters;
        const skip = (page - 1) * limit;
        const query = this.invoiceRepository
            .createQueryBuilder('invoice')
            .leftJoinAndSelect('invoice.contract', 'contract')
            .leftJoinAndSelect('invoice.project', 'project')
            .leftJoinAndSelect('invoice.account', 'account')
            .leftJoinAndSelect('invoice.payments', 'payments');
        if (where.accountId) {
            query.andWhere('invoice.accountId = :accountId', { accountId: where.accountId });
        }
        if (where.contractId) {
            query.andWhere('invoice.contractId = :contractId', { contractId: where.contractId });
        }
        if (where.projectId) {
            query.andWhere('invoice.projectId = :projectId', { projectId: where.projectId });
        }
        if (where.status) {
            query.andWhere('invoice.status = :status', { status: where.status });
        }
        if (where.accountOwnerId) {
            query.andWhere('account.ownerId = :accountOwnerId', { accountOwnerId: where.accountOwnerId });
        }
        const [data, total] = await query
            .orderBy('invoice.invoiceDate', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async updateInvoice(id, data) {
        const invoice = await this.getInvoiceById(id);
        const updates = { ...data };
        if (data.amount !== undefined || data.tax !== undefined) {
            // Postgres returns numeric columns as strings, so coerce before adding --
            // otherwise 2000 + '50.00' concatenates to '200050.00' instead of 2050.
            const amount = Number(data.amount ?? invoice.amount);
            const tax = Number(data.tax ?? invoice.tax);
            updates.totalAmount = amount + tax;
        }
        // Column-level update: the getById above eager-loads relations, and save()
        // gives a loaded relation precedence over its FK column -- so changing only
        // the FK would be silently overwritten by the stale relation object.
        // update() writes exactly the columns given.
        await this.invoiceRepository.update(id, updates);
        return await this.getInvoiceById(id);
    }
    // Payment tracking
    async recordPayment(invoiceId, data) {
        const invoice = await this.getInvoiceById(invoiceId);
        // Calculate remaining balance
        const totalPaid = invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
        const remaining = parseFloat(invoice.totalAmount.toString()) - totalPaid;
        if (data.amount > remaining) {
            throw new errorHandler_1.AppError(400, `Payment exceeds remaining balance of ${remaining}`);
        }
        const payment = this.paymentRepository.create({
            invoice,
            invoiceId,
            ...data,
        });
        const savedPayment = await this.paymentRepository.save(payment);
        // Update invoice status
        const newTotal = totalPaid + data.amount;
        if (newTotal >= parseFloat(invoice.totalAmount.toString())) {
            invoice.status = 'Paid';
        }
        else if (newTotal > 0) {
            invoice.status = 'Partially Paid';
        }
        await this.invoiceRepository.save(invoice);
        return savedPayment;
    }
    async getPayments(invoiceId) {
        return await this.paymentRepository.find({
            where: { invoiceId },
            order: { createdAt: 'DESC' },
        });
    }
    // Get financial summary for account/contract
    async getFinancialSummary(contractId) {
        const invoices = await this.invoiceRepository.find({
            where: { contractId },
            relations: ['payments'],
        });
        const contract = await database_1.AppDataSource.getRepository('Contract').findOne({
            where: { id: contractId },
        });
        let totalBilled = 0;
        let totalPaid = 0;
        invoices.forEach((inv) => {
            totalBilled += parseFloat(inv.totalAmount.toString());
            inv.payments.forEach((p) => {
                totalPaid += parseFloat(p.amount.toString());
            });
        });
        return {
            contractValue: contract ? parseFloat(contract.value.toString()) : 0,
            totalBilled,
            totalPaid,
            outstandingBalance: totalBilled - totalPaid,
        };
    }
    async deleteInvoice(id) {
        const invoice = await this.getInvoiceById(id);
        if (invoice.status !== 'Draft') {
            throw new errorHandler_1.AppError(400, 'Can only delete draft invoices');
        }
        await this.invoiceRepository.remove(invoice);
    }
}
exports.InvoiceService = InvoiceService;
exports.default = new InvoiceService();
//# sourceMappingURL=invoice.service.js.map