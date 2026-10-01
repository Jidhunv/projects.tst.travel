import { User } from './User';
export declare class Expense {
    id: string;
    location: string;
    days: number;
    accountIds: string[];
    companyNames: string[];
    travelCost: number;
    reason: string;
    status: string;
    approvedBy: User;
    approvedById: string;
    approvedAt: Date;
    approvalNotes: string;
    owner: User;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Expense.d.ts.map