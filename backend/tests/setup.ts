import dotenv from 'dotenv';
import path from 'path';

// Load the real .env for DB credentials, then force the test database.
// Everything below points at crm_test, never crm_db, so a stray test can never
// touch development data.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

process.env.DB_NAME = process.env.TEST_DB_NAME || 'crm_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-used-in-production';

// Guard against a misconfigured run pointing at the real database.
if (process.env.DB_NAME === 'crm_db') {
  throw new Error('Refusing to run tests against crm_db. Set TEST_DB_NAME.');
}
