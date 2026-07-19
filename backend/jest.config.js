/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Integration tests share one Postgres database, so they must not interleave.
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // TypeORM entities use decorators and emit a lot of noise on import.
  silent: false,
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/middleware/**/*.ts',
    'src/services/**/*.ts',
  ],
};
