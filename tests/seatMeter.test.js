/**
 * Seat meter — who holds a paid seat.
 *
 * countAdminUsers() used to count every company_employees row, so a SUSPENDED member
 * still occupied a seat, and an employer who suspended someone to make room still hit
 * the limit. It feeds enforcement (admin_users) as well as messaging.
 *
 * Integration test against a real PostgreSQL. Skipped unless GETHIRED_TEST_DB_HOST is set.
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

// subscriptionUsageServiceV4 imports controllers/jobsController -> uploader -> firebaseApp,
// which hard-throws at module scope without a service account.
jest.mock('../middleware/firebaseApp.js', () => ({
  __esModule: true,
  firebaseConfig: {},
  firebaseAdmin: { auth: () => ({}) },
}));

const usage = require('../services/subscriptionUsageServiceV4.js');
const db = HAS_DB ? require('../db/dbQuery.js').default : null;

d('countAdminUsers — seat semantics', () => {
  const S = 'SCO1';

  beforeAll(async () => {
    await db.query("DELETE FROM gethired.company_employees WHERE company_id LIKE 'SCO%';");
    await db.query("DELETE FROM gethired.companies WHERE company_id LIKE 'SCO%';");
    await db.query(
      "INSERT INTO gethired.companies (company_id, company_name, company_logo, created_date, created_by) VALUES ('SCO1','Seat co','logo.png',now(),'test-uid'),('SCO2','Other co','logo.png',now(),'test-uid');"
    );
  });

  beforeEach(async () => {
    await db.query("DELETE FROM gethired.company_employees WHERE company_id LIKE 'SCO%';");
  });

  afterAll(async () => {
    await db.query("DELETE FROM gethired.company_employees WHERE company_id LIKE 'SCO%';");
    await db.query("DELETE FROM gethired.companies WHERE company_id LIKE 'SCO%';");
    await db.close();
  });

  // assigned_at and assigned_by are NOT NULL in the repo DDL (db/company_ddl.sql); status is
  // NOT NULL DEFAULT 'active' (db/20260813d_...). Pass status undefined to take the default.
  async function member(id, status, company) {
    if (typeof status === 'undefined') {
      await db.query(
        "INSERT INTO gethired.company_employees (employee_id, company_id, employee_uuid, assigned_at, assigned_by) VALUES ($1,$2,$3,now(),'test-uid');",
        [id, company || S, 'u-' + id]
      );
      return;
    }
    await db.query(
      "INSERT INTO gethired.company_employees (employee_id, company_id, employee_uuid, assigned_at, assigned_by, status) VALUES ($1,$2,$3,now(),'test-uid',$4);",
      [id, company || S, 'u-' + id, status]
    );
  }

  it('counts active members', async () => {
    await member('E1', 'active');
    await member('E2', 'active');
    const r = await usage.countAdminUsers(S);
    expect(r.count).toBe(2);
    expect(r.confidence).toBe('confirmed');
  });

  it('a suspended member frees their seat', async () => {
    await member('E1', 'active');
    await member('E2', 'suspended');
    expect((await usage.countAdminUsers(S)).count).toBe(1);
  });

  it('a member added without a status takes the column default and holds a seat', async () => {
    await member('E1', 'active');
    await member('E2', undefined);
    expect((await usage.countAdminUsers(S)).count).toBe(2);
  });

  it('a removed member is simply absent — removeTeamMember deletes the row', async () => {
    await member('E1', 'active');
    await member('E2', 'active');
    await db.query("DELETE FROM gethired.company_employees WHERE employee_id='E2';");
    expect((await usage.countAdminUsers(S)).count).toBe(1);
  });

  it('does not count another company’s members', async () => {
    await member('E1', 'active');
    await member('E9', 'active', 'SCO2');
    expect((await usage.countAdminUsers(S)).count).toBe(1);
  });

  it('reactivating a suspended member takes the seat back', async () => {
    await member('E1', 'active');
    await member('E2', 'suspended');
    await db.query("UPDATE gethired.company_employees SET status='active' WHERE employee_id='E2';");
    expect((await usage.countAdminUsers(S)).count).toBe(2);
  });
});
