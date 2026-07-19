import { DataSource, Repository } from 'typeorm';
import { initTestDb, closeTestDb, resetTestDb, TestDataSource } from '../helpers/db';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import { Account } from '../../src/models/Account';
import { Product } from '../../src/models/Product';
import { ProductCategory } from '../../src/models/ProductCategory';

/**
 * Regression cover for the silent data loss found on 2026-07-19.
 *
 * These must hit a real database: every bug here came from TypeORM's behaviour
 * or from Postgres types, and a mocked repository would have reported success
 * for all of them.
 */
describe('update paths (integration)', () => {
  let db: DataSource;
  let users: Repository<User>;
  let roles: Repository<Role>;
  let accounts: Repository<Account>;
  let products: Repository<Product>;
  let categories: Repository<ProductCategory>;

  beforeAll(async () => {
    db = await initTestDb();
    users = db.getRepository(User);
    roles = db.getRepository(Role);
    accounts = db.getRepository(Account);
    products = db.getRepository(Product);
    categories = db.getRepository(ProductCategory);
  });

  afterAll(closeTestDb);
  beforeEach(resetTestDb);

  const makeRole = (name: string) => roles.save(roles.create({ name, description: name }));

  const makeUser = (email: string, role: Role) =>
    users.save(
      users.create({
        email,
        password: 'hashed-not-used-here',
        firstName: 'Test',
        lastName: 'User',
        roleId: role.id,
        isActive: true,
      })
    );

  describe('foreign keys change when only the FK column is assigned', () => {
    // The bug: loading an entity with its relation, then assigning just the FK,
    // let TypeORM write the STALE relation back on save(). Reassigning a user's
    // role or a product's category silently reverted.
    it('a user role reassignment persists', async () => {
      const [admin, rep] = await Promise.all([makeRole('Admin'), makeRole('Sales Rep')]);
      const user = await makeUser('role-change@test.local', admin);

      // Load with the relation populated, exactly as the service does.
      const loaded = await users.findOne({ where: { id: user.id }, relations: ['role'] });
      expect(loaded!.role.name).toBe('Admin');

      await users.update(user.id, { roleId: rep.id });

      const after = await users.findOne({ where: { id: user.id }, relations: ['role'] });
      expect(after!.roleId).toBe(rep.id);
      expect(after!.role.name).toBe('Sales Rep');
    });

    it('a product category reassignment persists', async () => {
      const [swCat, hwCat] = await categories.save([
        categories.create({ name: 'Software' }),
        categories.create({ name: 'Hardware' }),
      ]);
      const product = await products.save(
        products.create({ name: 'Widget', unitPrice: 10, categoryId: swCat.id })
      );

      await products.findOne({ where: { id: product.id }, relations: ['category'] });
      await products.update(product.id, { categoryId: hwCat.id });

      const after = await products.findOne({ where: { id: product.id }, relations: ['category'] });
      expect(after!.categoryId).toBe(hwCat.id);
      expect(after!.category.name).toBe('Hardware');
    });
  });

  describe('account fields that were being dropped', () => {
    let owner: User;

    beforeEach(async () => {
      owner = await makeUser('owner@test.local', await makeRole('Admin'));
    });

    it('persists email, remark and alternate phone', async () => {
      // All three were silently discarded: email and remark were missing from
      // the update whitelist, and alternatePhoneNumber had no column at all.
      const account = await accounts.save(
        accounts.create({ name: 'Acme', ownerId: owner.id })
      );

      await accounts.update(account.id, {
        email: 'ops@acme.test',
        remark: 'prefers email',
        alternatePhoneNumber: '+1-555-0002',
      });

      const after = await accounts.findOneBy({ id: account.id });
      expect(after!.email).toBe('ops@acme.test');
      expect(after!.remark).toBe('prefers email');
      expect(after!.alternatePhoneNumber).toBe('+1-555-0002');
    });

    it('enforces the unique email constraint', async () => {
      await accounts.save(accounts.create({ name: 'One', ownerId: owner.id, email: 'dup@test.local' }));
      await expect(
        accounts.save(accounts.create({ name: 'Two', ownerId: owner.id, email: 'dup@test.local' }))
      ).rejects.toThrow();
    });

    it('allows many accounts with no email, since null does not collide', async () => {
      await accounts.save(accounts.create({ name: 'A', ownerId: owner.id }));
      await accounts.save(accounts.create({ name: 'B', ownerId: owner.id }));
      expect(await accounts.count()).toBe(2);
    });
  });

  describe('numeric columns come back as strings', () => {
    // The invoice total was computed as amount + tax, which concatenated:
    // 2000 + '50.00' produced '200050.00' instead of 2050.
    it('a numeric column reads back as a string, so arithmetic needs coercion', async () => {
      const product = await products.save(products.create({ name: 'Priced', unitPrice: 50 }));
      const loaded = await products.findOneBy({ id: product.id });

      expect(typeof loaded!.unitPrice).toBe('string');

      // The bug, reproduced:
      expect((2000 as any) + loaded!.unitPrice).toBe('200050.00');
      // The fix:
      expect(2000 + Number(loaded!.unitPrice)).toBe(2050);
    });
  });
});
