/**
 * Plan limit guard: the parts that need no database (SPRINT-01 A3).
 *
 * The enforcement-mode default, the refuse/allow boundary, the refusal payload the
 * frontend's subscription-limit-modal reads, candidate redaction, and the upload
 * byte estimate. Runs everywhere.
 */

// The guard's import graph reaches Firebase Admin, which throws at import without a
// service account. Nothing here touches it.
jest.mock('../middleware/firebaseApp.js', () => ({
  __esModule: true,
  firebaseConfig: {},
  firebaseAdmin: { auth: () => ({}) },
}));

const guard = require('../services/planLimitGuard');
const { getEnforcementMode } = require('../services/subscriptionEntitlementServiceV4');

const GB = 1073741824;
// SubscriptionLimitModalData in get-hired-FE (subscription-limit-modal.component.ts).
const FE_MODAL_KEYS = ['entitlementKey', 'used', 'limit', 'warningLevel', 'userMessage', 'upgradeRoute',
  'recommendedPlanSlug', 'recommendedPlanName', 'unlocks'];

function decision(used, limit, extra) {
  return Object.assign({
    reasonCode: 'allowed',
    entitlement: { used: used, limit: limit, countConfidence: 'confirmed' },
  }, extra || {});
}

describe('enforcement mode', () => {
  const saved = { mode: process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE, legacy: process.env.SUBSCRIPTIONS_ENFORCEMENT_ENABLED };
  afterEach(() => {
    if (typeof saved.mode === 'undefined') delete process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE; else process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE = saved.mode;
    if (typeof saved.legacy === 'undefined') delete process.env.SUBSCRIPTIONS_ENFORCEMENT_ENABLED; else process.env.SUBSCRIPTIONS_ENFORCEMENT_ENABLED = saved.legacy;
  });

  it('is enforce when SUBSCRIPTIONS_ENFORCEMENT_MODE is unset', () => {
    delete process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE;
    delete process.env.SUBSCRIPTIONS_ENFORCEMENT_ENABLED;
    expect(getEnforcementMode()).toBe('enforce');
  });

  it('is enforce for an unrecognised value', () => {
    process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE = 'banana';
    expect(getEnforcementMode()).toBe('enforce');
  });

  it.each([['observe', 'observe'], [' OBSERVE ', 'observe'], ['off', 'off'], ['warn', 'warn'], ['enforce', 'enforce']])(
    'honours an explicit %j', (value, expected) => {
      delete process.env.SUBSCRIPTIONS_ENFORCEMENT_ENABLED;
      process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE = value;
      expect(getEnforcementMode()).toBe(expected);
    });
});

describe('the refuse/allow boundary: used + requested > limit', () => {
  it.each([
    ['limit − 1, adding one', 4, 5, 1, false],
    ['at the limit, adding one', 5, 5, 1, true],
    ['already over the limit, adding one', 7, 5, 1, true],
    ['room for two, adding three', 3, 5, 3, true],
    ['room for two, adding two', 3, 5, 2, false],
    ['over the limit, adding nothing', 7, 5, 0, false],
  ])('%s', (_label, used, limit, requested, wouldBlock) => {
    expect(guard.judgePlanLimit(decision(used, limit), requested).wouldBlock).toBe(wouldBlock);
  });

  it('a null limit is unlimited', () => {
    expect(guard.judgePlanLimit(decision(10000, null), 1)).toEqual({ wouldBlock: false, reason: 'unlimited' });
  });

  it('fails open when usage was not measured', () => {
    const d = decision(99, 1);
    d.entitlement.countConfidence = 'unavailable';
    expect(guard.judgePlanLimit(d, 1)).toEqual({ wouldBlock: false, reason: 'usage_unmeasured' });
    expect(guard.judgePlanLimit({ reasonCode: 'usage_unavailable', entitlement: null }, 1).wouldBlock).toBe(false);
  });

  it('refuses when the employer has no subscription at all', () => {
    expect(guard.judgePlanLimit({ reasonCode: 'no_subscription_found', entitlement: null }, 1))
      .toEqual({ wouldBlock: true, reason: 'no_subscription_found' });
  });
});

describe('one refusal payload', () => {
  const employer = guard.buildEmployerRefusal({ entitlementKey: 'active_job_posts', used: 1, limit: 1, requested: 1, currentSlug: 'free_trial' });
  const candidate = guard.buildCandidateRefusal('applicants');

  it('uses HTTP 402 (403 is already an authorization failure to the frontend)', () => {
    expect(guard.PLAN_LIMIT_HTTP_STATUS).toBe(402);
  });

  it('employer and candidate refusals have exactly the same keys', () => {
    expect(Object.keys(candidate).sort()).toEqual(Object.keys(employer).sort());
  });

  it('carries every field the frontend limit modal reads', () => {
    FE_MODAL_KEYS.forEach((key) => expect(employer).toHaveProperty(key));
    expect(employer).toMatchObject({
      success: false,
      code: 'PLAN_LIMIT_REACHED',
      limitCode: 'ACTIVE_JOB_LIMIT_REACHED',
      reasonCode: 'active_job_posts_limit_reached',
      audience: 'employer',
      entitlementKey: 'active_job_posts',
      used: 1,
      limit: 1,
      requested: 1,
      warningLevel: 'at_limit',
      recommendedPlanSlug: 'starter',
      recommendedPlanName: 'Starter',
      upgradeRoute: '/recruiter/subscription/upgrade/starter',
      contactSalesRequired: false,
      preserveWork: { canSaveDraft: true, draftSaved: false },
    });
    expect(employer.unlocks[0]).toBe('5 active jobs');
    // Existing error readers show errBody.error || errBody.message.
    expect(employer.error).toBe(employer.userMessage);
    expect(employer.message).toBe(employer.userMessage);
  });

  it('recommends the cheapest plan that fits what was refused, not just the next one', () => {
    const storage = guard.buildEmployerRefusal({ entitlementKey: 'recruitment_storage_bytes', used: 1 * GB, limit: 1 * GB, requested: 20 * GB, currentSlug: 'free_trial' });
    expect(storage.recommendedPlanSlug).toBe('growth');
    expect(storage.unlocks[0]).toBe('50 GB Recruitment Storage');
    const seats = guard.buildEmployerRefusal({ entitlementKey: 'admin_users', used: 5, limit: 5, requested: 1, currentSlug: 'growth' });
    expect(seats.recommendedPlanName).toBe('Premium');
  });

  it('the top self-serve plan at its limit points to sales, with no fake upgrade', () => {
    const top = guard.buildEmployerRefusal({ entitlementKey: 'active_job_posts', used: 40, limit: 40, requested: 1, currentSlug: 'business' });
    expect(top).toMatchObject({ recommendedPlanSlug: null, recommendedPlanName: null, unlocks: [], contactSalesRequired: true, upgradeRoute: '/recruiter/subscription' });
  });

  it('an employer with no subscription is asked to choose a plan', () => {
    const none = guard.buildEmployerRefusal({ entitlementKey: 'active_job_posts', used: 0, limit: null, requested: 1, reasonCode: 'no_subscription_found', currentSlug: null });
    expect(none).toMatchObject({ limitCode: 'PLAN_REQUIRED', reasonCode: 'no_subscription_found', userMessage: 'Choose a plan to continue.', contactSalesRequired: false });
  });

  it.each(['applicants', 'recruitment_storage_bytes'])('a candidate refusal (%s) carries no plan detail', (key) => {
    const r = guard.buildCandidateRefusal(key);
    expect(r).toMatchObject({
      audience: 'candidate', reasonCode: 'employer_capacity', entitlementKey: null, used: null, limit: null, requested: null,
      warningLevel: null, upgradeRoute: null, recommendedPlanSlug: null, recommendedPlanName: null, unlocks: [], preserveWork: null,
    });
    expect(r.userMessage).not.toMatch(/plan|upgrade|trial|starter|growth|premium|business|enterprise|limit|storage/i);
  });
});

describe('measureApplicationUploadBytes', () => {
  const dataUrl = (mime, n) => 'data:' + mime + ';base64,' + Buffer.alloc(n, 1).toString('base64');

  it('adds measured uploads, re-attached files at their stated size, and recorded answers', () => {
    expect(guard.measureApplicationUploadBytes({
      resume: [{ file: dataUrl('application/pdf', 2048), size: 1 }],
      coverLetter: [{ fileurl: 'https://storage.example/old.pdf', size: 5000 }],
      governmentFiles: [],
      interviewAnswers: [{ questionId: 'Q1', answerFile: dataUrl('video/webm', 3000) }],
    })).toBe(10048);
  });

  it('counts nothing it cannot measure, so the gate fails open', () => {
    expect(guard.measureApplicationUploadBytes({
      resume: [{ fileurl: 'https://storage.example/x.pdf', size: 'abc' }, { filename: 'no file at all' }, null],
      interviewAnswers: [{ questionId: 'Q1', answerFile: '' }],
    })).toBe(0);
    expect(guard.measureApplicationUploadBytes(undefined)).toBe(0);
  });
});

describe('the error that carries a refusal through a service', () => {
  it('round-trips, and sends 402 with the refusal as the body', () => {
    const refusal = guard.buildCandidateRefusal('applicants');
    const err = guard.planLimitError(refusal);
    expect(guard.isPlanLimitError(err)).toBe(true);
    expect(guard.isPlanLimitError(new Error('other'))).toBe(false);
    const res = { status: jest.fn(function () { return this; }), json: jest.fn(function () { return this; }) };
    guard.sendPlanLimitRefusal(res, err.refusal);
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(refusal);
  });
});
