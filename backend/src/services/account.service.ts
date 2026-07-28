import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Contact } from '../models/Contact';
import { AppError } from '../middleware/errorHandler';

interface AccountFilters {
  status?: string;
  type?: string;
  ownerId?: string;
  // "team" scope: visibility follows the account -> team link. An account is
  // visible if ANY holds:
  //   * the caller is an assigned user (selfId within assigneeIds), or
  //   * the account is linked to a team the caller SUPERVISES
  //     (id in supervisedAccountIds), or
  //   * the caller is the creator/owner AND the account is either linked to no
  //     team, or linked to a team the caller is a MEMBER of (id in
  //     memberAccountIds).
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
}

export class AccountService {
  private accountRepository = AppDataSource.getRepository(Account);
  private contactRepository = AppDataSource.getRepository(Contact);

  async createAccount(data: {
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
  }): Promise<Account> {
    // Check for duplicate account name (case-insensitive)
    const existingAccount = await this.accountRepository
      .createQueryBuilder('account')
      .where('LOWER(account.name) = LOWER(:name)', { name: data.name })
      .getOne();

    if (existingAccount) {
      throw new AppError(409, `Account "${data.name}" already exists`);
    }

    // email is a unique column; report a clash as a 409 rather than letting the
    // constraint surface as an unhandled 500.
    if (data.email) {
      const clash = await this.accountRepository.findOne({ where: { email: data.email } });
      if (clash) {
        throw new AppError(409, `An account with the email "${data.email}" already exists`);
      }
    }

    const account = this.accountRepository.create({
      ...data,
      type: data.type || 'Prospect',
      status: 'Prospect',
    });

    return await this.accountRepository.save(account);
  }

  async getAccountById(id: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['owner', 'contacts', 'opportunities'],
    });

    if (!account) {
      throw new AppError(404, 'Account not found');
    }

    return account;
  }

  async getAccounts(filters: AccountFilters = {}): Promise<{ data: Account[]; total: number }> {
    const { page = 1, limit = 20, search, ...where } = filters;
    const skip = (page - 1) * limit;

    const query = this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.owner', 'owner')
      .leftJoinAndSelect('account.contacts', 'contacts');

    if (search) {
      query.where(
        '(account.name ILIKE :search OR account.website ILIKE :search OR account.contactPerson ILIKE :search OR account.city ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (where.status) {
      query.andWhere('account.status = :status', { status: where.status });
    }
    if (where.type) {
      query.andWhere('account.type = :type', { type: where.type });
    }
    if (where.teamScope) {
      // Visibility follows the account -> team link (see AccountFilters).
      const clauses: string[] = [];
      const params: any = {};
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
    } else if (where.ownerId) {
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

    const [data, total] = await query
      .orderBy('account.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<Account> {
    const account = await this.getAccountById(id);

    // Check for duplicate account name (case-insensitive) if name is being changed
    if (data.name && data.name.toLowerCase() !== account.name.toLowerCase()) {
      const existingAccount = await this.accountRepository
        .createQueryBuilder('account')
        .where('LOWER(account.name) = LOWER(:name)', { name: data.name })
        .andWhere('account.id != :id', { id })
        .getOne();

      if (existingAccount) {
        throw new AppError(409, `Account "${data.name}" already exists`);
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
        throw new AppError(409, `An account with the email "${data.email}" already exists`);
      }
    }

    // Column-level update: the getById above eager-loads relations, and save()
    // gives a loaded relation precedence over its FK column -- so changing only
    // the FK would be silently overwritten by the stale relation object.
    // update() writes exactly the columns given.
    await this.accountRepository.update(id, data as any);
    return await this.getAccountById(id);
  }

  // --- Explicit account -> team assignment (account_teams join) ---

  async getAccountTeamIds(accountId: string): Promise<string[]> {
    const rows: Array<{ teamId: string }> = await this.accountRepository.query(
      'SELECT "teamId" FROM account_teams WHERE "accountId" = $1',
      [accountId]
    );
    return rows.map((r) => r.teamId);
  }

  // Replace the account's team assignments with the given set.
  async setAccountTeams(accountId: string, teamIds: string[]): Promise<void> {
    const unique = [...new Set((teamIds || []).filter(Boolean))];
    await this.accountRepository.query('DELETE FROM account_teams WHERE "accountId" = $1', [accountId]);
    for (const tid of unique) {
      await this.accountRepository.query(
        'INSERT INTO account_teams ("accountId", "teamId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [accountId, tid]
      );
    }
  }

  // Ids of accounts explicitly assigned to any of the given teams.
  async getAccountIdsForTeams(teamIds: string[]): Promise<string[]> {
    if (!teamIds.length) return [];
    const rows: Array<{ accountId: string }> = await this.accountRepository.query(
      'SELECT DISTINCT "accountId" FROM account_teams WHERE "teamId" = ANY($1)',
      [teamIds]
    );
    return rows.map((r) => r.accountId);
  }

  async deleteAccount(id: string): Promise<void> {
    const account = await this.getAccountById(id);
    try {
      await this.accountRepository.remove(account);
    } catch (err: any) {
      // Postgres foreign-key violation: the account still has related records
      // (leads, opportunities, contracts, projects, invoices, tickets) that
      // reference it. Surface a clear 409 instead of a generic 500.
      if (err?.code === '23503') {
        throw new AppError(
          409,
          'This account still has related records (leads, opportunities, contracts, projects, invoices or tickets). Delete or reassign those first, then delete the account.'
        );
      }
      throw err;
    }
  }

  async addContact(
    accountId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string;
      jobTitle?: string;
      role?: string;
    }
  ): Promise<Contact> {
    const account = await this.getAccountById(accountId);

    const contact = this.contactRepository.create({
      ...data,
      account,
      isPrimary: false,
    });

    return await this.contactRepository.save(contact);
  }

  async getAccountContacts(accountId: string): Promise<Contact[]> {
    await this.getAccountById(accountId);

    return await this.contactRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateContact(
    accountId: string,
    contactId: string,
    data: Partial<Contact>
  ): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, accountId },
    });

    if (!contact) {
      throw new AppError(404, 'Contact not found');
    }

    Object.assign(contact, data);
    return await this.contactRepository.save(contact);
  }

  async deleteContact(accountId: string, contactId: string): Promise<void> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, accountId },
    });

    if (!contact) {
      throw new AppError(404, 'Contact not found');
    }

    await this.contactRepository.remove(contact);
  }

  async setPrimaryContact(accountId: string, contactId: string): Promise<Contact> {
    // Unset previous primary
    await this.accountRepository
      .createQueryBuilder()
      .update(Contact)
      .set({ isPrimary: false })
      .where('accountId = :accountId', { accountId })
      .execute();

    // Set new primary
    return await this.updateContact(accountId, contactId, { isPrimary: true });
  }
}

export default new AccountService();
