import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
interface InvoiceFilters {
    accountId?: string;
    contractId?: string;
    projectId?: string;
    status?: string;
    accountOwnerId?: string;
    page?: number;
    limit?: number;
}
export declare class InvoiceService {
    private invoiceRepository;
    private paymentRepository;
    createInvoice(data: {
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
    }): Promise<Invoice>;
    getInvoiceById(id: string): Promise<Invoice>;
    getInvoices(filters?: InvoiceFilters): Promise<{
        data: Invoice[];
        total: number;
    }>;
    updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice>;
    recordPayment(invoiceId: string, data: {
        amount: number;
        paymentDate: Date;
        paymentMethod: string;
        transactionReference?: string;
    }): Promise<Payment>;
    getPayments(invoiceId: string): Promise<Payment[]>;
    getFinancialSummary(contractId: string): Promise<{
        contractValue: number;
        totalBilled: number;
        totalPaid: number;
        outstandingBalance: number;
    }>;
    deleteInvoice(id: string): Promise<void>;
}
declare const _default: InvoiceService;
export default _default;
//# sourceMappingURL=invoice.service.d.ts.map