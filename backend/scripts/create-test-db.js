#!/usr/bin/env node
/**
 * Create the test database if it does not exist.
 *
 * The integration tests need a real Postgres database (the bugs they guard
 * against come from TypeORM and Postgres behaviour, which mocks cannot
 * reproduce). This is separate from the development database so a stray test
 * can never touch real data; tests/setup.ts refuses to run against crm_db.
 *
 * Usage: npm run test:setup
 */
require('dotenv').config();
const { Client } = require('pg');

const TEST_DB = process.env.TEST_DB_NAME || 'crm_test';

(async () => {
  if (TEST_DB === 'crm_db') {
    console.error('TEST_DB_NAME must not be the development database.');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'crm_user',
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  try {
    await client.connect();
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB]);

    if (rows.length) {
      console.log(`Test database "${TEST_DB}" already exists.`);
    } else {
      // The identifier cannot be parameterised; it is validated above and comes
      // from local configuration, not user input.
      await client.query(`CREATE DATABASE "${TEST_DB.replace(/"/g, '')}"`);
      console.log(`Created test database "${TEST_DB}".`);
    }

    console.log('Schema is built from the entities on first run. Now: npm test');
  } catch (error) {
    console.error(`Could not create "${TEST_DB}":`, error.message);
    console.error('Check DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD in backend/.env.');
    process.exit(1);
  } finally {
    await client.end();
  }
})();
