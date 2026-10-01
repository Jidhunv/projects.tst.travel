import { Account } from '../models/Account';
import { Contact } from '../models/Contact';
import { AccountStakeholder } from '../models/AccountStakeholder';
interface AccountFilters {
    status?: string;
    type?: string;
    ownerId?: string;
    teamScope?: boolean;
    selfId?: string;
    supervisedAccountIds?: string[];
    memberAccountIds?: string[];
    city?: string;
    region?: string;
    country?: string;
    page?: number;
    limit?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
}
export declare class AccountService {
    private accountRepository;
    private contactRepository;
    private stakeholderRepository;
    createAccount(data: {
        name: string;
        industry?: string;
        size?: string;
        website?: string;
        phoneNumber?: string;
        alternatePhoneNumber?: string;
        email?: string;
        remark?: string;
        type?: string;
        contactPerson?: string;
        city?: string;
        region?: string;
        country?: string;
        ownerId: string;
        createdBy?: string;
    }): Promise<Account>;
    getAccountById(id: string): Promise<Account>;
    getAccounts(filters?: AccountFilters): Promise<{
        data: Account[];
        total: number;
    }>;
    updateAccount(id: string, data: Partial<Account>): Promise<Account>;
    getAccountTeamIds(accountId: string): Promise<string[]>;
    setAccountTeams(accountId: string, teamIds: string[]): Promise<void>;
    getAccountIdsForTeams(teamIds: string[]): Promise<string[]>;
    deleteAccount(id: string): Promise<void>;
    addContact(accountId: string, data: {
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber?: string;
        jobTitle?: string;
        role?: string;
    }): Promise<Contact>;
    getAccountContacts(accountId: string): Promise<Contact[]>;
    updateContact(accountId: string, contactId: string, data: Partial<Contact>): Promise<Contact>;
    deleteContact(accountId: string, contactId: string): Promise<void>;
    setPrimaryContact(accountId: string, contactId: string): Promise<Contact>;
    getStakeholders(accountId: string): Promise<AccountStakeholder[]>;
    upsertStakeholders(accountId: string, stakeholders: Array<{
        role: string;
        name?: string;
        designationId?: string;
    }>): Promise<AccountStakeholder[]>;
    getOnboardingStatus(accountId: string): Promise<{
        complete: boolean;
        missingRoles: string[];
    }>;
}
declare const _default: AccountService;
export default _default;
//# sourceMappingURL=account.service.d.ts.map