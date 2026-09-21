/**
 * Plan limit guard against real usage (SPRINT-01 A3).
 *
 * One case per gated action: at limit − 1 allowed; at the limit refused with the
 * payload; a draft allowed at the limit; and existing over-limit records untouched.
 * Runs against a REAL PostgreSQL built from tests/db/test-schema.sql, and skips unless
 * GETHIRED_TEST_DB_HOST is set. NEVER point it at production: it inserts and deletes rows.
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

jest.mock('../middleware/firebaseApp.js', () => ({
  __esModule: true,
  firebaseConfig: {},
  firebaseAdmin: { auth: () => ({}) },
}));

const GB = 1073741824;
const CO = { trial: 'PLCO1', starter: 'PLCO2', growth: 'PLCO3', none: 'PLCO9' };

d('plan limit guard, enforce mode, real usage', () => {
  const guard = require('../services/planLimitGuard.js');
  const db = require('../db/dbQuery.js').default;
  const savedMode = process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE;
  let n = 0;
  const uid = (p) => p + (++n);

  async function wipe() {
    await db.query("DELETE FROM gethired.stored_media WHERE company_id LIKE 'PLCO%';");
    await db.query("DELETE FROM gethired.job_applicants WHERE job_id LIKE 'PLJOB%';");
    await db.query("DELETE FROM gethired.interview_template_question WHERE template_question_id LIKE 'PLQ%';");
    await db.query("DELETE FROM gethired.job_interview_template WHERE job_interview_template_id LIKE 'PLTPL%';");
    await db.query("DELETE FROM gethired.jobs WHERE job_id LIKE 'PLJOB%';");
    await db.query("DELETE FROM gethired.company_employees WHERE company_id LIKE 'PLCO%';");
  }
  async function job(companyId, statusId) {
    const id = uid('PLJOB');
    await db.query('INSERT INTO gethired.jobs (job_id, company_id, job_title, job_status_id) VALUES ($1,$2,$3,$4);', [id, companyId, 'Test job', statusId]);
    return id;
  }
  async function questions(jobId, companyId, count) {
    const tpl = uid('PLTPL');
    await db.query("INSERT INTO gethired.job_interview_template (job_interview_template_id, job_interview_template_name, job_id, company_id) VALUES ($1,'default',$2,$3);", [tpl, jobId, companyId]);
    for (let i = 0; i < count; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await db.query('INSERT INTO gethired.interview_template_question (template_question_id, template_question, job_interview_template_id) VALUES ($1,$2,$3);', [uid('PLQ'), 'Q', tpl]);
    }
  }
  async function member(companyId, status) {
    await db.query("INSERT INTO gethired.company_employees (employee_id, company_id, employee_uuid, assigned_at, assigned_by, status) VALUES ($1,$2,$3,now(),'test-uid',$4);", [uid('PLEMP'), companyId, uid('u'), status || 'active']);
  }
  async function applications(jobId, count) {
    for (let i = 0; i < count; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await db.query("INSERT INTO gethired.job_applicants (job_application_id, job_id, candidate_id) VALUES ($1,$2,'cand');", [uid('PLAPPL'), jobId]);
    }
  }
  async function stored(companyId, bytes) {
    await db.query("INSERT INTO gethired.stored_media (company_id, media_type, object_key, size_bytes) VALUES ($1,'candidate_video',$2,$3);", [companyId, uid('gs://pl/'), bytes]);
  }
  async function snapshot(companyId) {
    return (await db.query(
      `SELECT (SELECT string_agg(job_id || ':' || job_status_id, ',' ORDER BY job_id) FROM gethired.jobs WHERE company_id = $1) AS jobs,
              (SELECT COUNT(*)::int FROM gethired.company_employees WHERE company_id = $1) AS members,
              (SELECT COUNT(*)::int FROM gethired.interview_template_question q JOIN gethired.job_interview_template t ON t.job_interview_template_id = q.job_interview_template_id WHERE t.company_id = $1) AS questions`,
      [companyId])).rows[0];
  }

  beforeAll(async () => {
    delete process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE;
    delete process.env.SUBSCRIPTIONS_ENFORCEMENT_ENABLED;
    await wipe();
    await db.query("DELETE FROM gethired.companies_subscription WHERE company_id LIKE 'PLCO%';");
    await db.query("DELETE FROM gethired.companies WHERE company_id LIKE 'PLCO%';");
    await db.query('INSERT INTO gethired."subscription" (subscription_id, subscription_name) VALUES (1,\'Free Trial\'),(2,\'Starter\'),(3,\'Growth\'),(4,\'Business\') ON CONFLICT (subscription_id) DO NOTHING;');
    await db.query("INSERT INTO gethired.companies (company_id, company_name, company_logo, created_date, created_by) VALUES ('PLCO1','Trial co','l.png',now(),'t'),('PLCO2','Starter co','l.png',now(),'t'),('PLCO3','Growth co','l.png',now(),'t'),('PLCO9','No plan co','l.png',now(),'t');");
    await db.query("INSERT INTO gethired.companies_subscription (company_id, subscription_id, created_at, is_paid, payment_date) VALUES ('PLCO1',1,now(),true,now()),('PLCO2',2,now(),true,now()),('PLCO3',3,now(),true,now());");
  });

  beforeEach(wipe);

  afterAll(async () => {
    await wipe();
    await db.query("DELETE FROM gethired.companies_subscription WHERE company_id LIKE 'PLCO%';");
    await db.query("DELETE FROM gethired.companies WHERE company_id LIKE 'PLCO%';");
    if (typeof savedMode === 'undefined') delete process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE; else process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE = savedMode;
    await db.close();
  });

  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  // ── Publishing a job (Free Trial: 1 active job) ─────────────────────────────
  describe('publishing a job', () => {
    it('at limit − 1: allowed', async () => {
      const r = await guard.guardJobLive({ companyId: CO.trial, actorId: 'a', jobId: null, requestedStatusId: 2, questionsAdded: 0 });
      expect(r.allowed).toBe(true);
    });

    it('at the limit: refused, with the payload', async () => {
      await job(CO.trial, 2);
      const r = await guard.guardJobLive({ companyId: CO.trial, actorId: 'a', jobId: null, requestedStatusId: 2, questionsAdded: 0 });
      expect(r.allowed).toBe(false);
      expect(r.refusal).toMatchObject({ code: 'PLAN_LIMIT_REACHED', limitCode: 'ACTIVE_JOB_LIMIT_REACHED', entitlementKey: 'active_job_posts', used: 1, limit: 1, requested: 1, recommendedPlanSlug: 'starter', audience: 'employer' });
    });

    it('a draft is allowed at the limit', async () => {
      await job(CO.trial, 2);
      expect((await guard.guardJobLive({ companyId: CO.trial, actorId: 'a', jobId: null, requestedStatusId: 1, questionsAdded: 3 })).allowed).toBe(true);
    });

    it('editing the job that is already live is allowed at the limit', async () => {
      const live = await job(CO.trial, 2);
      expect((await guard.guardJobLive({ companyId: CO.trial, actorId: 'a', jobId: live, requestedStatusId: 2, questionsAdded: 0 })).allowed).toBe(true);
    });

    it('reopening an expired job at the limit is refused', async () => {
      await job(CO.trial, 2);
      const expired = await job(CO.trial, 3);
      const r = await guard.guardJobLive({ companyId: CO.trial, actorId: 'a', jobId: expired, requestedStatusId: 2, questionsAdded: 0 });
      expect(r.refusal.limitCode).toBe('ACTIVE_JOB_LIMIT_REACHED');
    });

    it('an employer already over the limit keeps every job and can still close one, but cannot add another', async () => {
      const a = await job(CO.trial, 2); await job(CO.trial, 2); await job(CO.trial, 2);
      const before = await snapshot(CO.trial);
      const spy = jest.spyOn(db, 'query');
      expect((await guard.guardJobLive({ companyId: CO.trial, actorId: 'a', jobId: null, requestedStatusId: 2, questionsAdded: 0 })).allowed).toBe(false);
      expect((await guard.guardJobLive({ companyId: CO.trial, actorId: 'a', jobId: a, requestedStatusId: 3, questionsAdded: 0 })).allowed).toBe(true);
      expect(spy.mock.calls.map((c) => c[0].trim().split(/\s+/)[0].toUpperCase()).filter((v) => v !== 'SELECT')).toEqual([]);
      expect(await snapshot(CO.trial)).toEqual(before);
    });
  });

  // ── Video questions (Growth: 5 per job) ───────────────────────────────────
  describe('video questions on a job', () => {
    it('a live job at limit − 1 may add one', async () => {
      const live = await job(CO.growth, 2); await questions(live, CO.growth, 4);
      expect((await guard.guardQuestionsOnJob({ companyId: CO.growth, actorId: 'a', jobId: live, questionsAdded: 1 })).allowed).toBe(true);
    });

    it('a live job at the limit is refused one more, with the payload', async () => {
      const live = await job(CO.growth, 2); await questions(live, CO.growth, 5);
      const r = await guard.guardQuestionsOnJob({ companyId: CO.growth, actorId: 'a', jobId: live, questionsAdded: 1 });
      expect(r.refusal).toMatchObject({ limitCode: 'VIDEO_QUESTION_LIMIT_REACHED', used: 5, limit: 5, requested: 1, recommendedPlanName: 'Premium' });
    });

    it('a draft job takes any number of questions', async () => {
      const draft = await job(CO.growth, 1); await questions(draft, CO.growth, 8);
      expect((await guard.guardQuestionsOnJob({ companyId: CO.growth, actorId: 'a', jobId: draft, questionsAdded: 3 })).allowed).toBe(true);
    });

    it('publishing a draft puts all its questions live: 5 allowed, 6 refused', async () => {
      const five = await job(CO.growth, 1); await questions(five, CO.growth, 5);
      const six = await job(CO.growth, 1); await questions(six, CO.growth, 6);
      expect((await guard.guardJobLive({ companyId: CO.growth, actorId: 'a', jobId: five, requestedStatusId: 2, questionsAdded: 0 })).allowed).toBe(true);
      const r = await guard.guardJobLive({ companyId: CO.growth, actorId: 'a', jobId: six, requestedStatusId: 2, questionsAdded: 0 });
      expect(r.refusal).toMatchObject({ limitCode: 'VIDEO_QUESTION_LIMIT_REACHED', used: 0, requested: 6, limit: 5 });
    });

    it('a live job already over the limit keeps its questions and can still be edited', async () => {
      const live = await job(CO.growth, 2); await questions(live, CO.growth, 7);
      const before = await snapshot(CO.growth);
      expect((await guard.guardJobLive({ companyId: CO.growth, actorId: 'a', jobId: live, requestedStatusId: 2, questionsAdded: 0 })).allowed).toBe(true);
      expect((await guard.guardQuestionsOnJob({ companyId: CO.growth, actorId: 'a', jobId: live, questionsAdded: 1 })).allowed).toBe(false);
      expect(await snapshot(CO.growth)).toEqual(before);
    });
  });

  // ── Team seats (Starter: 2) ────────────────────────────────────────────────
  describe('adding team members', () => {
    it('at limit − 1: one more allowed', async () => {
      await member(CO.starter);
      expect((await guard.guardTeamSeats({ companyId: CO.starter, actorId: 'a', requested: 1 })).allowed).toBe(true);
    });

    it('at the limit: refused, with the payload', async () => {
      await member(CO.starter); await member(CO.starter);
      const r = await guard.guardTeamSeats({ companyId: CO.starter, actorId: 'a', requested: 1 });
      expect(r.refusal).toMatchObject({ limitCode: 'EMPLOYER_USER_LIMIT_REACHED', used: 2, limit: 2, requested: 1, recommendedPlanSlug: 'growth' });
    });

    it('a request for more people than the free seats is refused whole', async () => {
      await member(CO.starter);
      expect((await guard.guardTeamSeats({ companyId: CO.starter, actorId: 'a', requested: 2 })).refusal.requested).toBe(2);
    });

    it('a suspended member does not hold a seat', async () => {
      await member(CO.starter); await member(CO.starter, 'suspended');
      expect((await guard.guardTeamSeats({ companyId: CO.starter, actorId: 'a', requested: 1 })).allowed).toBe(true);
    });

    it('a team already over the limit keeps every member', async () => {
      await member(CO.starter); await member(CO.starter); await member(CO.starter);
      const before = await snapshot(CO.starter);
      expect((await guard.guardTeamSeats({ companyId: CO.starter, actorId: 'a', requested: 1 })).allowed).toBe(false);
      expect(await snapshot(CO.starter)).toEqual(before);
    });
  });

  // ── Applications (Free Trial: 25) and their files (Free Trial: 1 GB) ─────────
  describe('a new application (the only candidate-facing refusal)', () => {
    const CANDIDATE_KEYS = ['code', 'error', 'message', 'status', 'success'];

    it('at limit − 1: allowed', async () => {
      const live = await job(CO.trial, 2); await applications(live, 24);
      expect((await guard.guardApplication({ companyId: CO.trial, jobId: live })).allowed).toBe(true);
    });

    it('a Free Trial job past 25 applicants: refused with 400 and the neutral candidate body', async () => {
      const live = await job(CO.trial, 2); await applications(live, 25);
      const r = await guard.guardApplication({ companyId: CO.trial, jobId: live });
      expect(r.allowed).toBe(false);
      expect(r.httpStatus).toBe(400);
      expect(Object.keys(r.refusal).sort()).toEqual(CANDIDATE_KEYS);
      expect(r.refusal.code).toBe('JOB_NOT_ACCEPTING_APPLICATIONS');
    });

    it('a Starter employer is allowed: a paid plan has no applicant cap', async () => {
      const live = await job(CO.starter, 2); await applications(live, 40);
      expect((await guard.guardApplication({ companyId: CO.starter, jobId: live })).allowed).toBe(true);
    });

    it('an employer with NO subscription row still receives applications (A3.1, RISK-01)', async () => {
      const noPlanJob = await job(CO.none, 2); await applications(noPlanJob, 30);
      const r = await guard.guardApplication({ companyId: CO.none, jobId: noPlanJob });
      expect(r).toMatchObject({ allowed: true, wouldBlock: false, refusal: null, httpStatus: null, reason: 'no_subscription_not_candidate_facing' });
    });

    it("a candidate is never refused for the employer's storage, even far over it", async () => {
      const live = await job(CO.trial, 2);
      await stored(CO.trial, 5 * GB);
      expect((await guard.guardApplication({ companyId: CO.trial, jobId: live })).allowed).toBe(true);
    });
  });

  // ── A no-plan employer's storage label is no_plan, but uploads are still refused ──
  it('an upload at a storage limit of 0 is refused on the limit, whatever the label says', async () => {
    const storageOnly = await guard.evaluatePlanLimit({
      companyId: CO.none, actorId: null, action: 'receive_application_files', entitlementKey: 'recruitment_storage_bytes',
      usage: { count: 0, confidence: 'confirmed', source: 'test' }, requested: 1000, audience: 'candidate',
    });
    expect(storageOnly.refusal).toMatchObject({ audience: 'candidate', limitCode: 'FILE_UPLOADS_PAUSED' });
    const noPlanJob = await job(CO.none, 2);
    const application = await guard.guardApplication({ companyId: CO.none, jobId: noPlanJob, incomingBytes: 1000 });
    expect(application.allowed).toBe(false);
    expect(application.refusal.audience).toBe('candidate');
  });

  // ── No subscription, and the explicit opt-out ────────────────────────────────
  it('an employer with no subscription row is asked to choose a plan', async () => {
    const r = await guard.guardJobLive({ companyId: CO.none, actorId: 'a', jobId: null, requestedStatusId: 2, questionsAdded: 0 });
    expect(r.refusal).toMatchObject({ reasonCode: 'no_subscription_found', limitCode: 'PLAN_REQUIRED' });
  });

  it('observe: the same refused action is allowed, and still logged as would-have-blocked', async () => {
    await job(CO.trial, 2);
    process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE = 'observe';
    try {
      const r = await guard.guardJobLive({ companyId: CO.trial, actorId: 'a', jobId: null, requestedStatusId: 2, questionsAdded: 0 });
      expect(r).toMatchObject({ allowed: true, wouldBlock: true, mode: 'observe', refusal: null });
      const lines = console.log.mock.calls.filter((c) => c[0] === '[planLimit]').map((c) => JSON.parse(c[1]));
      expect(lines).toEqual(expect.arrayContaining([expect.objectContaining({ mode: 'observe', entitlementKey: 'active_job_posts', wouldBlock: true, blocked: false })]));
    } finally {
      delete process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE;
    }
  });

  it('enforce logs the refusal too', async () => {
    await job(CO.trial, 2);
    await guard.guardJobLive({ companyId: CO.trial, actorId: 'a', jobId: null, requestedStatusId: 2, questionsAdded: 0 });
    const lines = console.log.mock.calls.filter((c) => c[0] === '[planLimit]').map((c) => JSON.parse(c[1]));
    expect(lines).toEqual(expect.arrayContaining([expect.objectContaining({ mode: 'enforce', wouldBlock: true, blocked: true })]));
  });
});
