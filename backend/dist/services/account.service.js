"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountService = void 0;
const database_1 = require("../config/database");
const Account_1 = require("../models/Account");
const Contact_1 = require("../models/Contact");
const AccountStakeholder_1 = require("../models/AccountStakeholder");
const constants_1 = require("../utils/constants");
const errorHandler_1 = require("../middleware/errorHandler");
class AccountService {
    constructor() {
        this.accountRepository = database_1.AppDataSource.getRepository(Account_1.Account);
        this.contactRepository = database_1.AppDataSource.getRepository(Contact_1.Contact);
        this.stakeholderRepository = database_1.AppDataSource.getRepository(AccountStakeholder_1.AccountStakeholder);
    }
    async createAccount(data) {
        // Check for duplicate account name (case-insensitive)
        const existingAccount = await this.accountRepository
            .createQueryBuilder('account')
            .where('LOWER(account.name) = LOWER(:name)', { name: data.name })
            .getOne();
        if (existingAccount) {
            throw new errorHandler_1.AppError(409, `Account "${data.name}" already exists`);
        }
        // email is a unique column; report a clash as a 409 rather than letting the
        // constraint surface as an unhandled 500.
        if (data.email) {
            const clash = await this.accountRepository.findOne({ where: { email: data.email } });
            if (clash) {
                throw new errorHandler_1.AppError(409, `An account with the email "${data.email}" already exists`);
            }
        }
        const account = this.accountRepository.create({
            ...data,
            type: data.type || 'Prospect',
            status: 'Prospect',
        });
        return await this.accountRepository.save(account);
    }
    async getAccountById(id) {
        const account = await this.accountRepository.findOne({
            where: { id },
            relations: ['owner', 'creator', 'contacts', 'opportunities'],
        });
        if (!account) {
            throw new errorHandler_1.AppError(404, 'Account not found');
        }
        return account;
    }
    async getAccounts(filters = {}) {
        const { page = 1, limit = 20, search, fromDate, toDate, ...where } = filters;
        const skip = (page - 1) * limit;
        const query = this.accountRepository
            .createQueryBuilder('account')
            .leftJoinAndSelect('account.owner', 'owner')
            .leftJoinAndSelect('account.creator', 'creator')
            .leftJoinAndSelect('account.contacts', 'contacts');
        if (search) {
            query.where('(account.name ILIKE :search OR account.website ILIKE :search OR account.contactPerson ILIKE :search OR account.city ILIKE :search)', { search: `%${search}%` });
        }
        if (where.status) {
            query.andWhere('account.status = :status', { status: where.status });
        }
        if (where.type) {
            query.andWhere('account.type = :type', { type: where.type });
        }
        if (where.teamScope) {
            // Visibility follows the account -> team link (see AccountFilters).
            const clauses = [];
            const params = {};
            if (where.selfId) {
                clauses.push('account.assigneeIds LIKE :tsSelfLike');
                params.tsSelfLike = `%${where.selfId}%`;
            }
            if (where.supervisedAccountIds && where.supervisedAccountIds.length) {
                clauses.push('account.id IN (:...tsSupIds)');
                params.tsSupIds = where.supervisedAccountIds;
            }
            if (where.selfId) {
                // Creator sees own accounts that are untethered, or linked to a team
                // they are still a member of.
                const ownParts = ['account.id NOT IN (SELECT "accountId" FROM account_teams)'];
                if (where.memberAccountIds && where.memberAccountIds.length) {
                    ownParts.push('account.id IN (:...tsMemIds)');
                    params.tsMemIds = where.memberAccountIds;
                }
                clauses.push(`(account.ownerId = :tsSelf AND (${ownParts.join(' OR ')}))`);
                params.tsSelf = where.selfId;
            }
            query.andWhere(clauses.length ? `(${clauses.join(' OR ')})` : '1=0', params);
        }
        else if (where.ownerId) {
            query.andWhere('(account.ownerId = :ownerId OR account.assigneeIds LIKE :ownerIdLike)', {
                ownerId: where.ownerId,
                ownerIdLike: `%${where.ownerId}%`,
            });
        }
        if (where.city) {
            query.andWhere('account.city ILIKE :city', { city: `%${where.city}%` });
        }
        if (where.region) {
            query.andWhere('account.region ILIKE :region', { region: `%${where.region}%` });
        }
        if (where.country) {
            query.andWhere('account.country ILIKE :country', { country: `%${where.country}%` });
        }
        if (fromDate) {
            query.andWhere('account.createdAt >= :fromDate', { fromDate: new Date(`${fromDate}T00:00:00.000Z`) });
        }
        if (toDate) {
            query.andWhere('account.createdAt <= :toDate', { toDate: new Date(`${toDate}T23:59:59.999Z`) });
        }
        const [data, total] = await query
            .orderBy('account.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async updateAccount(id, data) {
        const account = await this.getAccountById(id);
        // Check for duplicate account name (case-insensitive) if name is being changed
        if (data.name && data.name.toLowerCase() !== account.name.toLowerCase()) {
            const existingAccount = await this.accountRepository
                .createQueryBuilder('account')
                .where('LOWER(account.name) = LOWER(:name)', { name: data.name })
                .andWhere('account.id != :id', { id })
                .getOne();
            if (existingAccount) {
                throw new errorHandler_1.AppError(409, `Account "${data.name}" already exists`);
            }
        }
        // Same for the unique email column, ignoring this account's own row.
        if (data.email && data.email !== account.email) {
            const clash = await this.accountRepository
                .createQueryBuilder('account')
                .where('account.email = :email', { email: data.email })
                .andWhere('account.id != :id', { id })
                .getOne();
            if (clash) {
                throw new errorHandler_1.AppError(409, `An account with the email "${data.email}" already exists`);
            }
        }
        // Column-level update: the getById above eager-loads relations, and save()
        // gives a loaded relation precedence over its FK column -- so changing only
        // the FK would be silently overwritten by the stale relation object.
        // update() writes exactly the columns given.
        await this.accountRepository.update(id, data);
        // If account name changed, sync it to all related leads and opportunities
        // (both carry a denormalized "company" snapshot column).
        if (data.name && data.name !== account.name) {
            const leadRepository = database_1.AppDataSource.getRepository('Lead');
            await leadRepository
                .createQueryBuilder()
                .update()
                .set({ company: data.name })
                .where('accountId = :accountId', { accountId: id })
                .execute();
            const oppRepository = database_1.AppDataSource.getRepository('Opportunity');
            await oppRepository
                .createQueryBuilder()
                .update()
                .set({ company: data.name })
                .where('accountId = :accountId', { accountId: id })
                .execute();
        }
        return await this.getAccountById(id);
    }
    // --- Explicit account -> team assignment (account_teams join) ---
    async getAccountTeamIds(accountId) {
        const rows = await this.accountRepository.query('SELECT "teamId" FROM account_teams WHERE "accountId" = $1', [accountId]);
        return rows.map((r) => r.teamId);
    }
    // Replace the account's team assignments with the given set.
    async setAccountTeams(accountId, teamIds) {
        const unique = [...new Set((teamIds || []).filter(Boolean))];
        await this.accountRepository.query('DELETE FROM account_teams WHERE "accountId" = $1', [accountId]);
        for (const tid of unique) {
            await this.accountRepository.query('INSERT INTO account_teams ("accountId", "teamId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [accountId, tid]);
        }
    }
    // Ids of accounts explicitly assigned to any of the given teams.
    async getAccountIdsForTeams(teamIds) {
        if (!teamIds.length)
            return [];
        const rows = await this.accountRepository.query('SELECT DISTINCT "accountId" FROM account_teams WHERE "teamId" = ANY($1)', [teamIds]);
        return rows.map((r) => r.accountId);
    }
    async deleteAccount(id) {
        const account = await this.getAccountById(id);
        try {
            await this.accountRepository.remove(account);
        }
        catch (err) {
            // Postgres foreign-key violation: the account still has related records
            // (leads, opportunities, contracts, projects, invoices, tickets) that
            // reference it. Surface a clear 409 instead of a generic 500.
            if (err?.code === '23503') {
                throw new errorHandler_1.AppError(409, 'This account still has related records (leads, opportunities, contracts, projects, invoices or tickets). Delete or reassign those first, then delete the account.');
            }
            throw err;
        }
    }
    async addContact(accountId, data) {
        const account = await this.getAccountById(accountId);
        const contact = this.contactRepository.create({
            ...data,
            account,
            isPrimary: false,
        });
        return await this.contactRepository.save(contact);
    }
    async getAccountContacts(accountId) {
        await this.getAccountById(accountId);
        return await this.contactRepository.find({
            where: { accountId },
            order: { createdAt: 'DESC' },
        });
    }
    async updateContact(accountId, contactId, data) {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, accountId },
        });
        if (!contact) {
            throw new errorHandler_1.AppError(404, 'Contact not found');
        }
        Object.assign(contact, data);
        return await this.contactRepository.save(contact);
    }
    async deleteContact(accountId, contactId) {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, accountId },
        });
        if (!contact) {
            throw new errorHandler_1.AppError(404, 'Contact not found');
        }
        await this.contactRepository.remove(contact);
    }
    async setPrimaryContact(accountId, contactId) {
        // Unset previous primary
        await this.accountRepository
            .createQueryBuilder()
            .update(Contact_1.Contact)
            .set({ isPrimary: false })
            .where('accountId = :accountId', { accountId })
            .execute();
        // Set new primary
        return await this.updateContact(accountId, contactId, { isPrimary: true });
    }
    // --- Buying-committee onboarding (8 fixed roles per account) ---
    async getStakeholders(accountId) {
        return this.stakeholderRepository.find({
            where: { accountId },
            relations: ['designation'],
        });
    }
    // Bulk upsert: one entry per role in the payload. Missing roles in the
    // payload are left untouched (partial saves are fine - completeness is
    // evaluated separately by isOnboardingComplete).
    async upsertStakeholders(accountId, stakeholders) {
        for (const s of stakeholders) {
            if (!constants_1.STAKEHOLDER_ROLES.includes(s.role)) {
                throw new errorHandler_1.AppError(400, `Invalid stakeholder role: ${s.role}`);
            }
            const existing = await this.stakeholderRepository.findOne({
                where: { accountId, role: s.role },
            });
            if (existing) {
                existing.name = s.name ?? existing.name;
                existing.designationId = s.designationId ?? existing.designationId;
                await this.stakeholderRepository.save(existing);
            }
            else {
                await this.stakeholderRepository.save(this.stakeholderRepository.create({
                    accountId,
                    role: s.role,
                    name: s.name,
                    designationId: s.designationId,
                }));
            }
        }
        return this.getStakeholders(accountId);
    }
    // Onboarding is complete once every fixed role has both a name and a
    // designation filled in. Used to gate lead creation against an account.
    async getOnboardingStatus(accountId) {
        const stakeholders = await this.getStakeholders(accountId);
        const byRole = new Map(stakeholders.map((s) => [s.role, s]));
        const missingRoles = constants_1.STAKEHOLDER_ROLES.filter((role) => {
            const s = byRole.get(role);
            return !s || !s.name || !s.name.trim() || !s.designationId;
        });
        return { complete: missingRoles.length === 0, missingRoles };
    }
}
exports.AccountService = AccountService;
exports.default = new AccountService();
//# sourceMappingURL=account.service.js.map