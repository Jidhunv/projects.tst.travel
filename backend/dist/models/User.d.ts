import { Role } from './Role';
import { Lead } from './Lead';
import { Account } from './Account';
import { Opportunity } from './Opportunity';
import { Activity } from './Activity';
export declare class User {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    isActive: boolean;
    resetToken: string;
    resetTokenExpiry: Date;
    hasChangedPasswordOnFirstLogin: boolean;
    passwordChangedAt: Date;
    emailNotificationsEnabled: boolean;
    emailNotificationPreferences: {
        leads?: boolean;
        opportunities?: boolean;
        tickets?: boolean;
        contracts?: boolean;
        account?: boolean;
    };
    role: Role;
    roleId: string;
    teamId: string;
    leads: Lead[];
    accounts: Account[];
    opportunities: Opportunity[];
    activities: Activity[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=User.d.ts.map