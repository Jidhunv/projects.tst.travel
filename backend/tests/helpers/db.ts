import { DataSource } from 'typeorm';

/**
 * A DataSource pointed at the test database.
 *
 * `synchronize` is safe here (and only here): the test database is disposable
 * and rebuilt from the entities, which also means these tests fail loudly if a
 * model stops being expressible as a schema. Production uses hand-applied
 * migrations — see docs/DEVELOPMENT.md.
 */
export const TestDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'crm_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'crm_test',
  synchronize: true,
  dropSchema: false,
  logging: false,
  entities: [__dirname + '/../../src/models/**/*.ts'],
});

export async function initTestDb(): Promise<DataSource> {
  if (!TestDataSource.isInitialized) await TestDataSource.initialize();
  return TestDataSource;
}

export async function closeTestDb(): Promise<void> {
  if (TestDataSource.isInitialized) await TestDataSource.destroy();
}

/**
 * Empty every table between tests so cases cannot leak into each other.
 * TRUNCATE ... CASCADE handles the foreign-key graph without needing an order.
 */
export async function resetTestDb(): Promise<void> {
  const tables = TestDataSource.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
  if (tables) await TestDataSource.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}
