import { PasswordValidator } from '../../src/utils/passwordValidator';
import fs from 'fs';
import path from 'path';

describe('password complexity policy', () => {
  const ok = (p: string) => PasswordValidator.validatePasswordComplexity(p).valid;

  it('accepts a password meeting every rule', () => {
    expect(ok('ValidPassw0rd!')).toBe(true);
  });

  it.each([
    ['too short', 'Ab1!xyz'],
    ['no uppercase', 'validpassw0rd!'],
    ['no lowercase', 'VALIDPASSW0RD!'],
    ['no digit', 'ValidPassword!'],
    ['no special character', 'ValidPassw0rd'],
    ['empty', ''],
  ])('rejects a password with %s', (_label, password) => {
    expect(ok(password)).toBe(false);
  });

  it('rejects an over-long password, so bcrypt is not fed unbounded input', () => {
    expect(ok('A1!' + 'a'.repeat(200))).toBe(false);
  });

  it('explains every rule the password breaks', () => {
    const { errors } = PasswordValidator.validatePasswordComplexity('a');
    expect(errors.length).toBeGreaterThan(1);
  });
});

describe('policy coverage', () => {
  // Regression: createUser was the one password-setting route that skipped the
  // policy, so an admin could create an account with a password the user could
  // never have set themselves. This asserts the call is present rather than
  // re-testing the rules, which the suite above already covers.
  it('is applied when a user is created', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/controllers/user.controller.ts'),
      'utf8'
    );
    const createUser = source.slice(
      source.indexOf('async createUser'),
      source.indexOf('async getUsers')
    );
    expect(createUser).toContain('validatePasswordComplexity');
  });
});
