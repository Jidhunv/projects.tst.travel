// Turns a pg_dump --schema-only file into a script that can be run again and again.
// Usage: node scripts/make-idempotent-schema.js <dump.sql> <out.sql>
//
// Each statement is rewritten so a second run changes nothing:
//   CREATE TABLE / INDEX / SEQUENCE   -> ... IF NOT EXISTS
//   CREATE FUNCTION / TRIGGER         -> CREATE OR REPLACE ...
//   CREATE TYPE ... AS ENUM           -> wrapped so an existing type is skipped
//   ALTER TABLE ... ADD CONSTRAINT    -> wrapped so an existing constraint is skipped
// Anything else (SET, SELECT set_config, ALTER ... SET DEFAULT) is already re-runnable.
// Tables whose names are listed in SKIP_TABLES are left out.

const fs = require('fs');

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error('Usage: node scripts/make-idempotent-schema.js <dump.sql> <out.sql>');
  process.exit(1);
}

// Verification artefacts that are not part of the app's schema.
const SKIP_TABLES = ['schema_verification_log'];

const lines = fs.readFileSync(inFile, 'utf8').split(/\r?\n/);

// Group lines into statements. A statement ends with a line that finishes with ';'
// while not inside a $$ ... $$ body (function bodies contain semicolons).
const statements = [];
let buf = [];
let inDollar = false;
for (const line of lines) {
  if (buf.length === 0 && (line.trim() === '' || line.startsWith('--'))) {
    statements.push({ text: line, passthrough: true });
    continue;
  }
  buf.push(line);
  const dollars = (line.match(/\$\$/g) || []).length;
  if (dollars % 2 === 1) inDollar = !inDollar;
  if (!inDollar && line.trimEnd().endsWith(';')) {
    statements.push({ text: buf.join('\n'), passthrough: false });
    buf = [];
  }
}
if (buf.length) statements.push({ text: buf.join('\n'), passthrough: false });

const skipped = [];
const out = [];


for (const st of statements) {
  if (st.passthrough) {
    out.push(st.text);
    continue;
  }
  const t = st.text;
  // Any statement that mentions a skipped object (its table, sequence, defaults, functions) is left out.
  const hit = SKIP_TABLES.find((n) => t.includes(n));
  if (hit) {
    skipped.push(hit);
    continue;
  }
  if (/^CREATE SEQUENCE\s/.test(t)) {
    out.push(t.replace(/^CREATE SEQUENCE\s/, 'CREATE SEQUENCE IF NOT EXISTS '));
  } else if (/^CREATE TABLE\s/.test(t)) {
    out.push(t.replace(/^CREATE TABLE\s/, 'CREATE TABLE IF NOT EXISTS '));
  } else if (/^CREATE (UNIQUE )?INDEX\s/.test(t)) {
    out.push(t.replace(/^CREATE (UNIQUE )?INDEX\s/, (m) => m.replace(/\s$/, ' IF NOT EXISTS ')));
  } else if (/^CREATE FUNCTION\s/.test(t)) {
    out.push(t.replace(/^CREATE FUNCTION\s/, 'CREATE OR REPLACE FUNCTION '));
  } else if (/^CREATE TRIGGER\s/.test(t)) {
    out.push(t.replace(/^CREATE TRIGGER\s/, 'CREATE OR REPLACE TRIGGER '));
  } else if (/^CREATE TYPE\s/.test(t)) {
    // No IF NOT EXISTS for enums: skip the duplicate_object error when the type is already there.
    out.push(`DO $$\nBEGIN\n  ${t.replace(/;\s*$/, ';')}\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;`);
  } else if (/ADD CONSTRAINT/.test(t) && /^ALTER TABLE/.test(t)) {
    // A primary key that already exists raises invalid_table_definition ("multiple primary keys").
    out.push(`DO $$\nBEGIN\n  ${t.replace(/;\s*$/, ';')}\nEXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;\nEND $$;`);
  } else {
    out.push(t);
  }
}

const header = [
  '-- ============================================================================',
  '-- CRM database schema (create if not exists)',
  '-- Generated from the renamed schema by scripts/make-idempotent-schema.js.',
  '-- Tables: prospects (Prospects page), leads (Leads page, formerly accounts),',
  '-- prospect_status_history (formerly lead_status_history).',
  '--',
  '-- Safe to run on an empty database to build the schema, and safe to run again:',
  '-- existing tables, indexes, constraints, types and functions are left alone.',
  '-- It creates structure only. It never drops, truncates or changes existing data.',
  '-- Existing tables are NOT altered to match this file; use the migration scripts',
  '-- for that. Run with psql -v ON_ERROR_STOP=1.',
  `-- Left out on purpose: ${[...new Set(skipped)].join(', ') || 'none'} (verification artefacts).`,
  '-- ============================================================================',
  '',
].join('\n');

fs.writeFileSync(outFile, header + out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
console.log(`wrote ${outFile}: ${statements.filter((s) => !s.passthrough).length} statements, skipped ${skipped.length}`);
