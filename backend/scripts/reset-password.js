#!/usr/bin/env node
// Set a new password for a CRM user. Run from the backend folder:
//
//     node scripts/reset-password.js admin@tst.travel
//
// It asks for the new password (typed hidden, never printed or stored anywhere else),
// applies the same complexity rules as the app, clears any login lockout, and marks the
// password as already changed so you are not forced through the first-login screen.
// It uses the database in backend/.env, so run it on the server to fix the live system.

const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/reset-password.js <email>');
  process.exit(1);
}

let validate;
try {
  validate = require('../dist/utils/passwordValidator').PasswordValidator.validatePasswordComplexity;
} catch {
  console.error('Build the backend first (npm run build) so the password rules can be loaded.');
  process.exit(1);
}

// Prompt without echoing what is typed.
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = rl._writeToOutput;
    rl._writeToOutput = (s) => { if (s.includes(question)) write.call(rl, s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

(async () => {
  const client = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  await client.connect();
  try {
    const found = await client.query('SELECT id, "firstName", "isActive" FROM users WHERE LOWER(email) = $1', [email]);
    if (found.rows.length === 0) {
      console.error(`No user with the email ${email} in database "${process.env.DB_NAME}".`);
      process.exitCode = 1;
      return;
    }
    const user = found.rows[0];
    console.log(`Resetting the password for ${email} in database "${process.env.DB_NAME}".`);
    const pw = await askHidden('New password: ');
    const again = await askHidden('Type it again: ');
    if (pw !== again) { console.error('The two passwords do not match. Nothing was changed.'); process.exitCode = 1; return; }
    const check = validate(pw);
    if (!check.valid) { console.error('That password is not allowed:\n - ' + check.errors.join('\n - ')); process.exitCode = 1; return; }

    const hash = await bcrypt.hash(pw, 13);
    await client.query(
      'UPDATE users SET password = $1, "hasChangedPasswordOnFirstLogin" = TRUE, "passwordChangedAt" = NOW(), "resetToken" = NULL, "resetTokenExpiry" = NULL, "isActive" = TRUE, "updatedAt" = NOW() WHERE id = $2',
      [hash, user.id]
    );
    await client.query('UPDATE login_security SET "failedAttempts" = 0, "lockoutUntil" = NULL, "updatedAt" = NOW() WHERE "userId" = $1', [user.id]);
    console.log(`Done. ${user.firstName} can now sign in with the new password.${user.isActive ? '' : ' (The account was inactive and has been re-activated.)'}`);
  } finally {
    await client.end();
  }
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
