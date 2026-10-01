import { Account } from './Account';
import { Opportunity } from './Opportunity';
import { Project } from './Project';
import { Invoice } from './Invoice';
import { User } from './User';
export declare class Contract {
    id: string;
    contractNumber: string;
    title: string;
    type: string;
    value: number;
    startDate: Date;
    endDate: Date;
    renewalDate: Date;
    paymentTerms: string;
    slaTerms: string;
    status: string;
    approvedBy: string;
    approvedDate: Date;
    documentPath: string;
    remarks: string;
    account: Account;
    accountId: string;
    opportunity: Opportunity;
    opportunityId: string;
    projects: Project[];
    invoices: Invoice[];
    createdBy: User;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Contract.d.ts.map