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

  it.each([
    ['observe', 'true', 'observe'],
    ['off', '1', 'off'],
    ['enforce', 'false', 'enforce'],
  ])('an explicit MODE=%s wins over the legacy ENABLED=%s (A3.1)', (mode, legacy, expected) => {
    process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE = mode;
    process.env.SUBSCRIPTIONS_ENFORCEMENT_ENABLED = legacy;
    expect(getEnforcementMode()).toBe(expected);
  });

  it.each([
    [undefined, 'false', 'off'],
    [undefined, 'true', 'enforce'],
    ['banana', '0', 'off'],
  ])('the legacy flag is read only when MODE is unset or unrecognised (MODE=%s, ENABLED=%s)', (mode, legacy, expected) => {
    if (typeof mode === 'undefined') delete process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE; else process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE = mode;
    process.env.SUBSCRIPTIONS_ENFORCEMENT_ENABLED = legacy;
    expect(getEnforcementMode()).toBe(expected);
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
    ['a zero limit (no plan), adding one byte', 0, 0, 1, true],
    ['a zero limit (no plan), adding nothing', 0, 0, 0, false],
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

  it('an employer with no subscription is refused; a candidate NEVER is for that (A3.1, RISK-01)', () => {
    const none = { reasonCode: 'no_subscription_found', entitlement: null };
    expect(guard.judgePlanLimit(none, 1)).toEqual({ wouldBlock: true, reason: 'no_subscription_found' });
    expect(guard.judgePlanLimit(none, 1, 'employer')).toEqual({ wouldBlock: true, reason: 'no_subscription_found' });
    expect(guard.judgePlanLimit(none, 1, 'candidate')).toEqual({ wouldBlock: false, reason: 'no_subscription_not_candidate_facing' });
  });
});

describe('refusal payloads', () => {
  const employer = guard.buildEmployerRefusal({ entitlementKey: 'active_job_posts', used: 1, limit: 1, requested: 1, currentSlug: 'free_trial' });
  const candidate = guard.buildCandidateRefusal();

  it('employers get HTTP 402 (403 is already an authorization failure to the frontend); candidates get 400', () => {
    expect(guard.PLAN_LIMIT_HTTP_STATUS).toBe(402);
    expect(guard.CANDIDATE_REFUSAL_HTTP_STATUS).toBe(400);
  });

  it('a candidate refusal is a human message and a neutral code, and nothing else (A3.1)', () => {
    expect(Object.keys(candidate).sort()).toEqual(['code', 'error', 'message', 'status', 'success']);
    expect(candidate).toEqual({
      success: false,
      status: 'error',
      code: 'JOB_NOT_ACCEPTING_APPLICATIONS',
      error: "This job isn't accepting new applications right now. Please check back later.",
      message: "This job isn't accepting new applications right now. Please check back later.",
    });
    const text = JSON.stringify(candidate);
    expect(text).not.toMatch(/PLAN_LIMIT|enforce|plan|upgrade|trial|starter|growth|premium|business|enterprise|limit|storage|subscription/i);
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
});

describe('the error that carries a refusal through a service', () => {
  it('round-trips, and sends the status it carries: 400 for a candidate, 402 by default', () => {
    const refusal = guard.buildCandidateRefusal();
    const err = guard.planLimitError(refusal, guard.CANDIDATE_REFUSAL_HTTP_STATUS);
    expect(guard.isPlanLimitError(err)).toBe(true);
    expect(guard.isPlanLimitError(new Error('other'))).toBe(false);
    const res = { status: jest.fn(function () { return this; }), json: jest.fn(function () { return this; }) };
    guard.sendPlanLimitRefusal(res, err.refusal, err.httpStatus);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(refusal);
    expect(guard.planLimitError({ userMessage: 'x' }).httpStatus).toBe(402);
  });
});
