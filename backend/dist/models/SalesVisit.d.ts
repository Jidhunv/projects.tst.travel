import { Account } from './Account';
import { User } from './User';
import { FollowupEntry } from './FollowupEntry';
export declare class SalesVisit {
    id: string;
    account: Account;
    accountId: string;
    companyName: string;
    visitType: string;
    discussion: string;
    visitDate: Date;
    followups: FollowupEntry[];
    followupDate: Date;
    followupCompleted: boolean;
    followupNotes: string;
    createdBy: User;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=SalesVisit.d.ts.map