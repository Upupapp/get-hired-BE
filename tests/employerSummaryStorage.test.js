/**
 * GET /api/subscriptions/employer/summary — the recruitment_storage usage block
 * (GetHired operating order, SPRINT-01 A2).
 *
 * The block must match its sibling meters (key, used, limit, remaining, percentUsed,
 * warningLevel, countSource, countConfidence) with `used` in bytes, plus
 * storageStatus for the 70/80/90/100 bands that warningLevel does not have.
 *
 * The integration cases run against a REAL PostgreSQL with
 * db/20260913_stored_media.sql applied, and are skipped unless GETHIRED_TEST_DB_HOST
 * is set. The "table missing" case needs no database and always runs.
 *
 * NEVER point these at a production database: they insert and delete rows.
 */

const HAS_DB = !!process.env.GETHIRED_TEST_DB_HOST;
const d = HAS_DB ? describe : describe.skip;

if (HAS_DB) {
  process.env.is_staging = 'false';
  process.env.DB_HOST = process.env.GETHIRED_TEST_DB_HOST;
  process.env.DB_PORT = process.env.GETHIRED_TEST_DB_PORT;
  process.env.DB_USER = process.env.GETHIRED_TEST_DB_USER;
  process.env.DB_DATABASE = process.env.GETHIRED_TEST_DB_NAME;
  process.env.SCHEMA = process.env.GETHIRED_TEST_DB_SCHEMA || 'gethired';
} else {
  // Without a test database, aim the pool at a closed local port, so a query that
  // slipped past the spy below fails instead of reaching whatever a .env names.
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = '1';
}

// The controller's import graph reaches Firebase Admin (hard-throws without a
// service account), PayMongo and mail. None of it is under test here.
jest.mock('../middleware/firebaseApp.js', () => ({
  __esModule: true,
  firebaseConfig: {},
  firebaseAdmin: { auth: () => ({}) },
}));
jest.mock('../controllers/companiesController', () => ({
  __esModule: true,
  getUserCompanyForRequest: jest.fn(),
}));
jest.mock('../controllers/paymentController', () => ({
  __esModule: true,
  createPaymongoLink: jest.fn(),
}));
jest.mock('../services/subscriptionAuditLogServiceV4', () => ({
  __esModule: true,
  logCheckoutIntent: jest.fn(),
  logValidationRejection: jest.fn(),
}));
jest.mock('../services/subscriptionEntitlementServiceV4', () => ({
  __esModule: true,
  resolveCompanyPlan: jest.fn(),
  checkEntitlement: jest.fn(),
  getEnforcementMode: jest.fn(() => 'observe'),
}));
jest.mock('../services/subscriptionUsageServiceV4', () => {
  const actual = jest.requireActual('../services/subscriptionUsageServiceV4');
  return Object.assign({}, actual, { __esModule: true, getCompanyUsageV4: jest.fn() });
});

const { getUserCompanyForRequest } = require('../controllers/companiesController');
const { resolveCompanyPlan } = require('../services/subscriptionEntitlementServiceV4');
const { getCompanyUsageV4 } = require('../services/subscriptionUsageServiceV4');
const ctrl = require('../controllers/subscriptionGuardrailsControllerV4.js');
const dbQuery = require('../db/dbQuery.js').default;

const GB = 1073741824;
const BLOCK_KEYS = ['countConfidence', 'countSource', 'key', 'limit', 'percentUsed',
  'remaining', 'storageStatus', 'used', 'warningLevel'];

function planRow(subscriptionId, name, price) {
  return {
    subscription_id: subscriptionId,
    subscription_name: name,
    price: price,
    price_currency: 'PHP',
    payment_occurence: 'monthly',
    created_at: new Date().toISOString(),
    is_paid: true,
  };
}

// Calls the handler as Express would, and returns the response as a client sees it
// (JSON round-trip), so a limit left `undefined` shows up as a missing key.
async function summaryFor(companyId, row) {
  getUserCompanyForRequest.mockResolvedValue({ companyId: companyId });
  resolveCompanyPlan.mockResolvedValue(row);
  getCompanyUsageV4.mockResolvedValue({
    active_job_posts: { count: 3, source: 'jobs.status', confidence: 'confirmed' },
    admin_users: { count: 2, source: 'company_employees.not_suspended', confidence: 'confirmed' },
    video_responses: { count: 12, source: 'video_responses.job_ids', confidence: 'confirmed' },
  });
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  };
  await ctrl.getEmployerSubscriptionSummary({ user: { uid: 'test-uid' } }, res);
  return res;
}

afterAll(async () => {
  if (HAS_DB) await dbQuery.close();
});

describe('recruitment_storage when stored_media cannot be read', () => {
  it('answers 200 with an unavailable count, never a 500 or a confident zero', async () => {
    const querySpy = jest.spyOn(dbQuery, 'query')
      .mockRejectedValueOnce(Object.assign(new Error('relation "gethired.stored_media" does not exist'), { code: '42P01' }));
    const errSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const res = await summaryFor('A2CO-NOTABLE', planRow(3, 'Growth', 3490));
      expect(res.statusCode).toBe(200);
      const block = res.body.summary.usage.recruitment_storage;
      expect(Object.keys(block).sort()).toEqual(BLOCK_KEYS);
      expect(block.countConfidence).toBe('unavailable');
      expect(block.used).toBe(0);
      expect(block.limit).toBe(50 * GB);
      expect(block.storageStatus).toBeNull();
      // The storage count is the handler's only database call; everything else is mocked.
      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(res.body.summary.usage.active_job_posts.used).toBe(3);
    } finally {
      querySpy.mockRestore();
      errSpy.mockRestore();
    }
  });

  it('any other database failure answers 200 with countConfidence "error", distinguishable from unavailable', async () => {
    const querySpy = jest.spyOn(dbQuery, 'query')
      .mockRejectedValueOnce(Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' }));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await summaryFor('A2CO-NOTABLE', planRow(3, 'Growth', 3490));
      expect(res.statusCode).toBe(200);
      const block = res.body.summary.usage.recruitment_storage;
      expect(Object.keys(block).sort()).toEqual(BLOCK_KEYS);
      expect(block.countConfidence).toBe('error');
      expect(block.storageStatus).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      // The rest of the summary still answers.
      expect(res.body.summary.usage.active_job_posts.used).toBe(3);
      expect(res.body.summary.plan.slug).toBe('growth');
    } finally {
      querySpy.mockRestore();
      errSpy.mockRestore();
    }
  });
});

d('recruitment_storage block (real PostgreSQL)', () => {
  async function media(companyId, objectKey, bytes, status) {
    await dbQuery.query(
      `INSERT INTO gethired.stored_media (company_id, media_type, object_key, size_bytes, status)
       VALUES ($1, 'candidate_video', $2, $3, $4);`,
      [companyId, objectKey, bytes, status || 'active']
    );
  }

  beforeAll(async () => {
    await dbQuery.query("DELETE FROM gethired.stored_media WHERE company_id LIKE 'A2CO%';");
    await dbQuery.query("DELETE FROM gethired.companies WHERE company_id LIKE 'A2CO%';");
    await dbQuery.query(
      "INSERT INTO gethired.companies(company_id, company_name, company_logo, created_date, created_by) VALUES " +
        "('A2CO1','Growth co','logo.png',now(),'test-uid'),('A2CO2','Other co','logo.png',now(),'test-uid')," +
        "('A2CO3','Premium co','logo.png',now(),'test-uid'),('A2CO4','Enterprise co','logo.png',now(),'test-uid');"
    );
    await media('A2CO1', 'gs://a2/one.mp4', 30 * GB);
    await media('A2CO1', 'gs://a2/two.mp4', 10 * GB);
    await media('A2CO1', 'gs://a2/unlinked.mp4', 5 * GB, 'deleted');
    await media('A2CO2', 'gs://a2/one.mp4', 7 * GB);
    await media('A2CO3', 'gs://a2/full.mp4', 200 * GB);
    await media('A2CO4', 'gs://a2/big.mp4', 600 * GB);
  });

  afterAll(async () => {
    await dbQuery.query("DELETE FROM gethired.stored_media WHERE company_id LIKE 'A2CO%';");
    await dbQuery.query("DELETE FROM gethired.companies WHERE company_id LIKE 'A2CO%';");
  });

  it('reports bytes in the sibling meters\' shape: active links only, this employer only', async () => {
    const res = await summaryFor('A2CO1', planRow(3, 'Growth', 3490));
    expect(res.statusCode).toBe(200);
    const usage = res.body.summary.usage;
    expect(Object.keys(usage.recruitment_storage).sort()).toEqual(BLOCK_KEYS);
    expect(usage.recruitment_storage).toEqual({
      key: 'recruitment_storage',
      used: 40 * GB,
      limit: 50 * GB,
      remaining: 10 * GB,
      percentUsed: 80,
      warningLevel: 'near_70',
      storageStatus: 'warning',
      countSource: 'stored_media.active',
      countConfidence: 'confirmed',
    });
    // The sibling meters are untouched by the new block.
    expect(usage.active_job_posts.key).toBe('active_job_posts');
    expect(usage.active_job_posts.used).toBe(3);
    expect(usage.admin_users.used).toBe(2);
    expect(usage.video_responses.used).toBe(12);

    if (process.env.GETHIRED_SAMPLE_OUT) {
      require('fs').writeFileSync(process.env.GETHIRED_SAMPLE_OUT, JSON.stringify(res.body, null, 2) + '\n');
    }
  });

  it('a Premium employer at exactly 200 GB is full', async () => {
    const block = (await summaryFor('A2CO3', planRow(4, 'Premium', 6990))).body.summary.usage.recruitment_storage;
    expect(block.used).toBe(200 * GB);
    expect(block.limit).toBe(200 * GB);
    expect(block.remaining).toBe(0);
    expect(block.percentUsed).toBe(100);
    expect(block.warningLevel).toBe('at_limit');
    expect(block.storageStatus).toBe('full');
  });

  it('Enterprise (null limit) is unlimited: nulls, not zeros, and never full', async () => {
    const block = (await summaryFor('A2CO4', planRow(5, 'Enterprise', 0))).body.summary.usage.recruitment_storage;
    expect(block.used).toBe(600 * GB);
    expect(block).toHaveProperty('limit', null);
    expect(block.remaining).toBeNull();
    expect(block.percentUsed).toBeNull();
    expect(block.warningLevel).toBe('none');
    expect(block.storageStatus).toBe('normal');
  });

  it('with no plan the limit is 0 and still present, like the sibling meters', async () => {
    const res = await summaryFor('A2CO-NOPLAN', null);
    const block = res.body.summary.usage.recruitment_storage;
    expect(res.statusCode).toBe(200);
    expect(block).toHaveProperty('limit', 0);
    expect(block.used).toBe(0);
    expect(block.warningLevel).toBe(res.body.summary.usage.active_job_posts.warningLevel);
    expect(block.storageStatus).toBe('full');
  });
});
