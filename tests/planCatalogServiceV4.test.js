/**
 * Plan catalog V4 — the catalog gh-fe's pricing page reads (Operating Order v2, SPRINT-01 A1).
 *
 * The entitlement field names asserted here are frozen: the frontend reads
 * recruitment_storage_bytes, video_questions_per_job, applicants,
 * featured_job_credits and contactSalesRequired by name. Renaming one breaks
 * the page silently, so a rename must fail this file first.
 *
 * Pure module: no DB, no network, no Firebase. Runs under the babel-jest
 * transform described in tests/sitemap.test.js.
 */

import {
  getAllPlans,
  getPlanBySlug,
  getEntitlements,
  getPricingCatalog,
  getAmountForCheckout,
  getAmountInCentavos,
  getRecommendedUpgrade,
  getBillingCycleMeta,
  isValidPlanSlug,
} from '../services/planCatalogServiceV4';

var GB = 1073741824;
var SELF_SERVE = ['free_trial', 'starter', 'growth', 'business'];
var FROZEN_ENTITLEMENT_FIELDS = ['recruitment_storage_bytes', 'video_questions_per_job', 'applicants', 'featured_job_credits'];

function catalogRow(slug) {
  return getPricingCatalog(null).plans.filter(function (p) { return p.slug === slug; })[0];
}

describe('prices are unchanged (DEC-03, Operating Order v2 §0)', function () {
  it.each([
    ['starter', 1490, 14900, 1242, 2980],
    ['growth', 3490, 34900, 2908, 6980],
    ['business', 6990, 69900, 5825, 13980],
  ])('%s: monthly %i, annual %i, effective %i, savings %i', function (slug, monthly, annual, effective, savings) {
    var plan = getPlanBySlug(slug);
    expect(plan.priceMonthlyPHP).toBe(monthly);
    expect(plan.priceAnnualPHP).toBe(annual);
    expect(plan.effectiveMonthlyPHP).toBe(effective);
    expect(plan.annualSavingsPHP).toBe(savings);
  });

  it('annual is 12 months for the price of 10 on every paid self-serve plan', function () {
    ['starter', 'growth', 'business'].forEach(function (slug) {
      var plan = getPlanBySlug(slug);
      expect(plan.priceAnnualPHP).toBe(plan.priceMonthlyPHP * 10);
    });
  });

  it('checkout charges the catalog amount in centavos', function () {
    expect(getAmountInCentavos('starter', 'monthly')).toBe(149000);
    expect(getAmountInCentavos('growth', 'monthly')).toBe(349000);
    expect(getAmountInCentavos('business', 'annual')).toBe(6990000);
  });

  it('renders the existing peso labels', function () {
    expect(catalogRow('growth').pricing.monthly.label).toBe('PHP 3,490/month');
    expect(catalogRow('growth').pricing.annual.dueTodayLabel).toBe('Billed today: PHP 34,900 for 12 months.');
  });
});

describe('the free trial is 7 days and its labels are unchanged (Operating Order v2 §0)', function () {
  it('durationDays is 7', function () {
    expect(getPlanBySlug('free_trial').durationDays).toBe(7);
  });

  it('the trial billing cycle still says 7 days', function () {
    var meta = getBillingCycleMeta('trial');
    expect(meta.durationDays).toBe(7);
    expect(meta.renewalLabel).toBe('7-day free trial');
  });

  it('is free and has no self-serve upgrade route of its own', function () {
    var row = catalogRow('free_trial');
    expect(row.pricing.monthly.label).toBe('Free');
    expect(row.upgradeRoute).toBeNull();
  });
});

describe('the fourth tier: slug business, shown as Premium (DEC-02, §0)', function () {
  it('keeps the slug and carries the product name', function () {
    var plan = getPlanBySlug('business');
    expect(plan.slug).toBe('business');
    expect(plan.name).toBe('Premium');
  });

  it('still resolves the legacy premium slug to business', function () {
    expect(isValidPlanSlug('premium')).toBe(true);
    expect(getPlanBySlug('premium').slug).toBe('business');
  });
});

describe('capacities are the brief\'s (owner ruling "1 capacioty adopt the brief")', function () {
  it.each([
    //  slug          jobs  users  applicants  storage     videoQ  featured
    ['free_trial',   1,    1,     25,         1 * GB,     1,      0],
    ['starter',      5,    2,     null,       10 * GB,    3,      0],
    ['growth',       15,   5,     null,       50 * GB,    5,      0],
    ['business',     40,   15,    null,       200 * GB,   10,     5],
  ])('%s', function (slug, jobs, users, applicants, storage, videoQ, featured) {
    var e = getEntitlements(slug);
    expect(e.active_job_posts).toBe(jobs);
    expect(e.admin_users).toBe(users);
    expect(e.applicants).toBe(applicants);
    expect(e.recruitment_storage_bytes).toBe(storage);
    expect(e.video_questions_per_job).toBe(videoQ);
    expect(e.featured_job_credits).toBe(featured);
  });

  it('stores storage in binary bytes, matching the brief\'s own 50 GB figure', function () {
    expect(getEntitlements('growth').recruitment_storage_bytes).toBe(53687091200);
  });
});

describe('frozen field names (gh-fe reads them)', function () {
  it('every plan carries every frozen entitlement field, even when null', function () {
    getAllPlans().forEach(function (plan) {
      FROZEN_ENTITLEMENT_FIELDS.forEach(function (field) {
        expect(Object.prototype.hasOwnProperty.call(plan.entitlements, field)).toBe(true);
      });
    });
  });

  it('every pricing-catalog row carries contactSalesRequired as a boolean', function () {
    getPricingCatalog(null).plans.forEach(function (row) {
      expect(typeof row.contactSalesRequired).toBe('boolean');
    });
  });
});

describe('the enterprise plan (owner ruling "3. add")', function () {
  it('exists, and every numeric limit is null rather than a fake-unlimited integer', function () {
    var plan = getPlanBySlug('enterprise');
    expect(plan.enterprise).toBe(true);
    Object.keys(plan.entitlements).forEach(function (key) {
      var v = plan.entitlements[key];
      if (typeof v !== 'boolean') expect(v).toBeNull();
    });
  });

  it('no plan anywhere encodes unlimited as a sentinel integer', function () {
    getAllPlans().forEach(function (plan) {
      Object.keys(plan.entitlements).forEach(function (key) {
        var v = plan.entitlements[key];
        if (typeof v === 'number' && key !== 'recruitment_storage_bytes') expect(v).toBeLessThan(999999);
      });
    });
  });

  it('builds the pricing catalog without throwing on null prices', function () {
    expect(function () { getPricingCatalog('growth'); }).not.toThrow();
    var row = catalogRow('enterprise');
    expect(row.pricing.monthly.amount).toBeNull();
    expect(row.pricing.monthly.label).toBe('Custom pricing');
    expect(row.pricing.annual.dueTodayLabel).toBe('Custom pricing');
  });

  it('requires contact sales and offers no self-serve upgrade route', function () {
    var row = catalogRow('enterprise');
    expect(row.contactSalesRequired).toBe(true);
    expect(row.upgradeRoute).toBeNull();
  });

  it('never reaches checkout: amount null, and centavos null rather than a zero-peso charge', function () {
    expect(getAmountForCheckout('enterprise', 'monthly')).toBeNull();
    expect(getAmountForCheckout('enterprise', 'annual')).toBeNull();
    expect(getAmountInCentavos('enterprise', 'monthly')).toBeNull();
  });

  it('self-serve plans do not require contact sales', function () {
    SELF_SERVE.forEach(function (slug) {
      expect(catalogRow(slug).contactSalesRequired).toBe(false);
    });
  });
});

describe('upgrade path stays self-serve', function () {
  // subscriptionEntitlementServiceV4 builds "N active job posts" unlock strings and a
  // /recruiter/subscription/upgrade/<slug> route from the recommended plan. A null-limit
  // plan there renders "null active job posts" and a route the frontend skips.
  it('never recommends enterprise through the self-serve upgrade path', function () {
    SELF_SERVE.concat(['premium', null]).forEach(function (slug) {
      expect(getRecommendedUpgrade(slug)).not.toBe('enterprise');
    });
  });

  it('every recommended plan has numeric limits the unlock copy can print', function () {
    SELF_SERVE.forEach(function (slug) {
      var next = getRecommendedUpgrade(slug);
      if (!next) return;
      var e = getEntitlements(next);
      ['active_job_posts', 'admin_users', 'video_responses'].forEach(function (key) {
        expect(typeof e[key]).toBe('number');
      });
    });
  });
});
