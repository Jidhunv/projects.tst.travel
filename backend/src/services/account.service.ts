import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Contact } from '../models/Contact';
import { AppError } from '../middleware/errorHandler';

interface AccountFilters {
  status?: string;
  type?: string;
  ownerId?: string;
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
    if (where.ownerId) {
      query.andWhere('account.ownerId = :ownerId', { ownerId: where.ownerId });
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

    Object.assign(account, data);
    return await this.accountRepository.save(account);
  }

  async deleteAccount(id: string): Promise<void> {
    const account = await this.getAccountById(id);
    await this.accountRepository.remove(account);
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
