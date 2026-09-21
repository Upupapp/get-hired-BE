/**
 * dbQuery.withTransaction: one transaction on one pooled connection.
 *
 * services/teamAccess.service.js calls it from removeTeamMember and four other
 * functions, but it was never defined, so DELETE /api/company/removecompanyuser threw
 * "dbQuery.withTransaction is not a function". The live checks run against a REAL
 * PostgreSQL and skip unless GETHIRED_TEST_DB_HOST is set. NEVER point them at production.
 */

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

const db = require('../db/dbQuery.js').default;

it('exists, so the teamAccess callers no longer throw "not a function"', () => {
  expect(typeof db.withTransaction).toBe('function');
});

d('dbQuery.withTransaction against a real PostgreSQL', () => {
  const T = 'gethired.tx_probe_test';
  const count = async (where) => (await db.query(`SELECT COUNT(*)::int AS c FROM ${T} WHERE ${where};`)).rows[0].c;

  beforeAll(async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS ${T} (id int PRIMARY KEY);`);
    await db.query(`DELETE FROM ${T};`);
  });

  afterAll(async () => {
    await db.query(`DROP TABLE IF EXISTS ${T};`);
    await db.close();
  });

  it('commits when the callback resolves, and returns its value', async () => {
    const out = await db.withTransaction(async (client) => {
      await client.query(`INSERT INTO ${T} (id) VALUES (1);`);
      return 'done';
    });
    expect(out).toBe('done');
    expect(await count('id = 1')).toBe(1);
  });

  it('rolls back every statement and rethrows when the callback throws', async () => {
    await expect(db.withTransaction(async (client) => {
      await client.query(`INSERT INTO ${T} (id) VALUES (2);`);
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(await count('id = 2')).toBe(0);
  });

  it('rolls back earlier statements when a later statement fails', async () => {
    await expect(db.withTransaction(async (client) => {
      await client.query(`INSERT INTO ${T} (id) VALUES (3);`);
      await client.query(`INSERT INTO ${T} (id) VALUES (1);`); // duplicate key
    })).rejects.toMatchObject({ code: '23505' });
    expect(await count('id = 3')).toBe(0);
  });

  it('releases its connection every time: more transactions than the pool holds all finish', async () => {
    // The pool holds 10 connections. 25 transactions, half of them failing, only all
    // finish if every one returns its connection, including the ones that throw.
    const outcomes = [];
    for (let i = 0; i < 25; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      outcomes.push(await db.withTransaction(async (client) => {
        await client.query('SELECT 1;');
        if (i % 2) throw new Error('fail ' + i);
        return 'committed';
      }).catch(() => 'rolled back'));
    }
    expect(outcomes.filter((o) => o === 'committed')).toHaveLength(13);
    expect(outcomes.filter((o) => o === 'rolled back')).toHaveLength(12);
    await expect(db.withTransaction(async (client) => (await client.query('SELECT 42 AS n;')).rows[0].n)).resolves.toBe(42);
  }, 20000);
});
