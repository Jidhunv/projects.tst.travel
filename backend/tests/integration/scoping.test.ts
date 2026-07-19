import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import { Account } from '../../src/models/Account';
import { Contract } from '../../src/models/Contract';
import contractService from '../../src/services/contract.service';
import invoiceService from '../../src/services/invoice.service';

/**
 * "self" scope for contracts, projects, tickets and invoices is derived from the
 * parent account (they have no owner column), so the filtering happens in SQL.
 * These tests exercise the real services against a real database — the only way
 * to catch a scope filter that silently matches everything, or nothing.
 *
 * setup.ts forces DB_NAME to the test database before this imports anything.
 */
describe('self-scope filtering (integration)', () => {
  let mine: Account;
  let theirs: Account;
  let me: User;
  let them: User;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    await AppDataSource.synchronize();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  beforeEach(async () => {
    const tables = AppDataSource.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
    await AppDataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);

    const roles = AppDataSource.getRepository(Role);
    const users = AppDataSource.getRepository(User);
    const accounts = AppDataSource.getRepository(Account);
    const contracts = AppDataSource.getRepository(Contract);

    const role = await roles.save(roles.create({ name: 'Sales Rep', description: 'test role' }));
    const mkUser = (email: string) =>
      users.save(
        users.create({
          email,
          password: 'x',
          firstName: 'T',
          lastName: 'U',
          roleId: role.id,
          isActive: true,
        })
      );

    me = await mkUser('me@test.local');
    them = await mkUser('them@test.local');

    mine = await accounts.save(accounts.create({ name: 'My Account', ownerId: me.id }));
    theirs = await accounts.save(accounts.create({ name: 'Their Account', ownerId: them.id }));

    const mkContract = (number: string, account: Account, createdById?: string) =>
      contracts.save(
        contracts.create({
          contractNumber: number,
          title: number,
          type: 'Fixed',
          value: 100,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          accountId: account.id,
          createdById,
        })
      );

    await mkContract('MINE-1', mine);
    await mkContract('MINE-2', mine);
    await mkContract('THEIRS-1', theirs);
    // Owned by their account, but created by me: the personal link.
    await mkContract('CREATED-BY-ME', theirs, me.id);
  });

  const numbers = (rows: Contract[]) => rows.map((c) => c.contractNumber).sort();

  describe('contracts', () => {
    it('returns everything when unscoped (the "all" case)', async () => {
      const { data, total } = await contractService.getContracts({ limit: 50 });
      expect(total).toBe(4);
      expect(numbers(data)).toEqual(['CREATED-BY-ME', 'MINE-1', 'MINE-2', 'THEIRS-1']);
    });

    it('returns only my account plus what I created when scoped to me', async () => {
      const { data, total } = await contractService.getContracts({ scopeUserId: me.id, limit: 50 });
      expect(numbers(data)).toEqual(['CREATED-BY-ME', 'MINE-1', 'MINE-2']);
      expect(total).toBe(3);
    });

    it('excludes my records when scoped to the other user', async () => {
      const { data } = await contractService.getContracts({ scopeUserId: them.id, limit: 50 });
      expect(numbers(data)).toEqual(['CREATED-BY-ME', 'THEIRS-1']);
    });

    it('returns nothing for a user linked to no records', async () => {
      const { data, total } = await contractService.getContracts({
        scopeUserId: '00000000-0000-0000-0000-000000000000',
        limit: 50,
      });
      expect(data).toHaveLength(0);
      expect(total).toBe(0);
    });

    it('reports a total consistent with the scoped rows, so paging is not misleading', async () => {
      // A filter applied after counting would page over the wrong set.
      const { data, total } = await contractService.getContracts({
        scopeUserId: me.id,
        limit: 2,
        page: 1,
      });
      expect(data).toHaveLength(2);
      expect(total).toBe(3);
    });

    it('combines the scope with other filters rather than replacing them', async () => {
      const { data } = await contractService.getContracts({
        scopeUserId: me.id,
        accountId: mine.id,
        limit: 50,
      });
      expect(numbers(data)).toEqual(['MINE-1', 'MINE-2']);
    });
  });

  describe('invoices', () => {
    beforeEach(async () => {
      const contracts = AppDataSource.getRepository(Contract);
      const [mineContract] = await contracts.find({ where: { contractNumber: 'MINE-1' } });
      const [theirsContract] = await contracts.find({ where: { contractNumber: 'THEIRS-1' } });

      await invoiceService.createInvoice({
        invoiceNumber: 'INV-MINE',
        contractId: mineContract.id,
        accountId: mine.id,
        amount: 100,
        tax: 10,
        invoiceDate: new Date('2026-02-01'),
        dueDate: new Date('2026-03-01'),
      });
      await invoiceService.createInvoice({
        invoiceNumber: 'INV-THEIRS',
        contractId: theirsContract.id,
        accountId: theirs.id,
        amount: 200,
        tax: 20,
        invoiceDate: new Date('2026-02-01'),
        dueDate: new Date('2026-03-01'),
      });
    });

    it('scopes to invoices whose account I own', async () => {
      const { data, total } = await invoiceService.getInvoices({ accountOwnerId: me.id, limit: 50 });
      expect(data.map((i) => i.invoiceNumber)).toEqual(['INV-MINE']);
      expect(total).toBe(1);
    });

    it('returns both when unscoped', async () => {
      const { total } = await invoiceService.getInvoices({ limit: 50 });
      expect(total).toBe(2);
    });

    it('computes totalAmount as amount + tax on create', async () => {
      const { data } = await invoiceService.getInvoices({ accountOwnerId: me.id, limit: 50 });
      expect(Number(data[0].totalAmount)).toBe(110);
    });

    it('recomputes totalAmount when only the amount changes', async () => {
      // Regression: this used to string-concatenate, giving 200010.00.
      const { data } = await invoiceService.getInvoices({ accountOwnerId: me.id, limit: 50 });
      const updated = await invoiceService.updateInvoice(data[0].id, { amount: 2000 } as any);
      expect(Number(updated.totalAmount)).toBe(2010);
    });

    it('honours a tax of zero rather than treating it as absent', async () => {
      // A falsy check (`data.tax ||`) skipped this case entirely.
      const { data } = await invoiceService.getInvoices({ accountOwnerId: me.id, limit: 50 });
      const updated = await invoiceService.updateInvoice(data[0].id, { tax: 0 } as any);
      expect(Number(updated.totalAmount)).toBe(100);
    });
  });
});
