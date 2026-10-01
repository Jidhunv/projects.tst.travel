import { User } from './User';
import { Account } from './Account';
export declare class Lead {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    company: string;
    jobTitle: string;
    source: string;
    status: string;
    score: number;
    value: number;
    expectedCloseDate: Date;
    productId: string;
    productName: string;
    productIds: string[];
    productNames: string[];
    businessVolume: number;
    supplierList: string[];
    region: string;
    country: string;
    tier: string;
    lostReason: string;
    remark: string;
    owner: User;
    ownerId: string;
    account: Account;
    accountId: string;
    tags: string;
    assigneeIds: string[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Lead.d.ts.map