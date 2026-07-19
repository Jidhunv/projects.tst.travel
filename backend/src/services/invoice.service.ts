import { AppDataSource } from '../config/database';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { AppError } from '../middleware/errorHandler';

interface InvoiceFilters {
  accountId?: string;
  contractId?: string;
  projectId?: string;
  status?: string;
  // Restrict to invoices whose account is owned by this user. Invoices have no
  // owner column of their own, so "self" scope is derived from the account.
  accountOwnerId?: string;
  page?: number;
  limit?: number;
}

export class InvoiceService {
  private invoiceRepository = AppDataSource.getRepository(Invoice);
  private paymentRepository = AppDataSource.getRepository(Payment);

  async createInvoice(data: {
    invoiceNumber: string;
    contractId: string;
    accountId: string;
    projectId?: string;
    amount: number;
    tax?: number;
    invoiceDate: Date;
    dueDate: Date;
    billingCycle?: string;
    description?: string;
  }): Promise<Invoice> {
    // Check if invoice number already exists
    const existing = await this.invoiceRepository.findOne({
      where: { invoiceNumber: data.invoiceNumber },
    });
    if (existing) {
      throw new AppError(409, 'Invoice number already exists');
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

  async getInvoiceById(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['contract', 'project', 'account', 'payments'],
    });
    if (!invoice) {
      throw new AppError(404, 'Invoice not found');
    }
    return invoice;
  }

  async getInvoices(filters: InvoiceFilters = {}): Promise<{ data: Invoice[]; total: number }> {
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

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id);
    const updates: any = { ...data };
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
  async recordPayment(invoiceId: string, data: {
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
    transactionReference?: string;
  }): Promise<Payment> {
    const invoice = await this.getInvoiceById(invoiceId);

    // Calculate remaining balance
    const totalPaid = invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    const remaining = parseFloat(invoice.totalAmount.toString()) - totalPaid;

    if (data.amount > remaining) {
      throw new AppError(400, `Payment exceeds remaining balance of ${remaining}`);
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
    } else if (newTotal > 0) {
      invoice.status = 'Partially Paid';
    }
    await this.invoiceRepository.save(invoice);

    return savedPayment;
  }

  async getPayments(invoiceId: string): Promise<Payment[]> {
    return await this.paymentRepository.find({
      where: { invoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  // Get financial summary for account/contract
  async getFinancialSummary(contractId: string): Promise<{
    contractValue: number;
    totalBilled: number;
    totalPaid: number;
    outstandingBalance: number;
  }> {
    const invoices = await this.invoiceRepository.find({
      where: { contractId },
      relations: ['payments'],
    });

    const contract = await AppDataSource.getRepository('Contract').findOne({
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

  async deleteInvoice(id: string): Promise<void> {
    const invoice = await this.getInvoiceById(id);
    if (invoice.status !== 'Draft') {
      throw new AppError(400, 'Can only delete draft invoices');
    }
    await this.invoiceRepository.remove(invoice);
  }
}

export default new InvoiceService();
