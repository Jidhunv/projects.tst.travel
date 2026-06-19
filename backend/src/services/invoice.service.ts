import { AppDataSource } from '../config/database';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { AppError } from '../middleware/errorHandler';

interface InvoiceFilters {
  accountId?: string;
  contractId?: string;
  projectId?: string;
  status?: string;
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

    const [data, total] = await query
      .orderBy('invoice.invoiceDate', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id);
    Object.assign(invoice, data);
    if (data.amount || data.tax) {
      invoice.totalAmount = (data.amount || invoice.amount) + (data.tax || invoice.tax);
    }
    return await this.invoiceRepository.save(invoice);
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
