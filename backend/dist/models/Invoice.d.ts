import { Contract } from './Contract';
import { Project } from './Project';
import { Account } from './Account';
import { Payment } from './Payment';
export declare class Invoice {
    id: string;
    invoiceNumber: string;
    contract: Contract;
    contractId: string;
    project: Project;
    projectId: string;
    account: Account;
    accountId: string;
    amount: number;
    tax: number;
    totalAmount: number;
    invoiceDate: Date;
    dueDate: Date;
    status: string;
    billingCycle: string;
    description: string;
    notes: string;
    documentPath: string;
    payments: Payment[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Invoice.d.ts.map