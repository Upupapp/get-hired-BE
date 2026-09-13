/**
 * db/20260913_stored_media.sql must be additive and safe to run twice.
 *
 * Deploys run no migrations, so this file is applied by hand, and it may be applied
 * again. A second run must change nothing and lose nothing, and no statement may
 * alter, drop or rewrite an existing table or row.
 *
 * The static checks need no database. The live check runs against a REAL PostgreSQL
 * and is skipped unless GETHIRED_TEST_DB_HOST is set.
 *
 * NEVER point this at a production database: it inserts and deletes rows.
 */

const fs = require('fs');
const path = require('path');

const HAS_DB = !!process.env.GETHIRED_TEST_DB_HOST;
const d = HAS_DB ? describe : describe.skip;

if (HAS_DB) {
  process.env.is_staging = 'false';
  process.env.DB_HOST = process.env.GETHIRED_TEST_DB_HOST;
  process.env.DB_PORT = process.env.GETHIRED_TEST_DB_PORT;
  process.env.DB_USER = process.env.GETHIRED_TEST_DB_USER;
  process.env.DB_DATABASE = process.env.GETHIRED_TEST_DB_NAME;
  process.env.SCHEMA = 'gethired';
}

const SQL = fs.readFileSync(path.join(__dirname, '..', 'db', '20260913_stored_media.sql'), 'utf8');

function statements(sql) {
  return sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// True when every statement only creates something new, idempotently.
function isAdditiveAndIdempotent(sql) {
  const stmts = statements(sql);
  if (stmts.length === 0) return false;
  return stmts.every((s) => {
    if (!/^CREATE (TABLE|(UNIQUE )?INDEX) IF NOT EXISTS /i.test(s)) return false;
    // Referential actions on the NEW table's own foreign keys are declarations, not writes.
    const body = s.replace(/ON (DELETE|UPDATE) (CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION)/gi, '');
    return !/\b(ALTER|DROP|UPDATE|DELETE|TRUNCATE|INSERT|RENAME)\b/i.test(body);
  });
}

describe('stored_media migration is additive and idempotent (static)', () => {
  it('contains only CREATE … IF NOT EXISTS statements that touch no existing table', () => {
    expect(statements(SQL).length).toBeGreaterThan(0);
    expect(isAdditiveAndIdempotent(SQL)).toBe(true);
  });

  it.each([
    ['a non-idempotent create', 'CREATE TABLE gethired.x (id int);'],
    ['an ALTER of an existing table', 'CREATE TABLE IF NOT EXISTS gethired.x (id int); ALTER TABLE gethired.jobs ADD COLUMN y int;'],
    ['a DROP', 'DROP INDEX IF EXISTS gethired.jobs_idx;'],
    ['a data rewrite', 'CREATE INDEX IF NOT EXISTS i ON gethired.x (id); UPDATE gethired.jobs SET y = 1;'],
  ])('control: the check rejects %s', (_label, bad) => {
    expect(isAdditiveAndIdempotent(bad)).toBe(false);
  });
});

d('stored_media migration against a real PostgreSQL', () => {
  const db = require('../db/dbQuery.js').default;

  afterAll(async () => {
    await db.query("DELETE FROM gethired.stored_media WHERE company_id = 'MIGCO1';");
    await db.query("DELETE FROM gethired.companies WHERE company_id = 'MIGCO1';");
    await db.close();
  });

  it('a second run succeeds and keeps existing rows, constraints and indexes', async () => {
    await db.query(SQL); // creates the table, or is a no-op if already applied

    await db.query("DELETE FROM gethired.stored_media WHERE company_id = 'MIGCO1';");
    await db.query("DELETE FROM gethired.companies WHERE company_id = 'MIGCO1';");
    await db.query("INSERT INTO gethired.companies(company_id, company_name) VALUES ('MIGCO1', 'Migration test');");
    await db.query(
      "INSERT INTO gethired.stored_media (company_id, media_type, object_key, size_bytes) VALUES ('MIGCO1', 'candidate_cv', 'gs://mig/cv.pdf', 1234);"
    );

    const shape = async () => (await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM pg_indexes WHERE schemaname = 'gethired' AND tablename = 'stored_media') AS indexes,
         (SELECT COUNT(*)::int FROM pg_constraint WHERE conrelid = 'gethired.stored_media'::regclass) AS constraints,
         (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_schema = 'gethired' AND table_name = 'stored_media') AS columns;`
    )).rows[0];

    const before = await shape();
    await expect(db.query(SQL)).resolves.toBeDefined(); // the second run
    const after = await shape();

    expect(after).toEqual(before);
    expect(before.indexes).toBeGreaterThan(0);
    const { rows } = await db.query("SELECT size_bytes::int AS b FROM gethired.stored_media WHERE company_id = 'MIGCO1';");
    expect(rows).toEqual([{ b: 1234 }]);
  });
});
