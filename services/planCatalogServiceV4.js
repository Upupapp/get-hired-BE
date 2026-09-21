/**
 * PlanCatalogService V4
 * Source of truth for plan definitions, pricing, entitlements.
 * Backend only — never trust frontend-supplied plan/price/billing-cycle.
 * Node 14 / ESM safe: no ?. or ??
 */

// ── Plan catalog ──────────────────────────────────────────────────────────────
// Annual rule: 12 months access for price of 10 months.
// Effective monthly = annual_price / 12 (rounded to nearest whole peso).
// Annual savings = (monthly_price * 12) - annual_price = monthly_price * 2.

var GB = 1073741824; // binary GiB — matches the brief's own figures (50 GB = 53687091200)

var PLAN_CATALOG = [
  {
    slug: 'free_trial',
    name: 'Free Trial',
    dbSubscriptionId: 1,
    durationDays: 7,
    priceMonthlyPHP: 0,
    priceAnnualPHP: 0,
    effectiveMonthlyPHP: 0,
    annualSavingsPHP: 0,
    billingCycles: ['trial'],
    entitlements: {
      active_job_posts: 1,
      admin_users: 1,
      applicants: 25,
      recruitment_storage_bytes: 1 * GB,
      video_questions_per_job: 1,
      video_responses: 5,
      featured_job_credits: 0,
      customized_company_page: true,
      video_interview_questions: true,
      dedicated_support: false,
    },
    audience: 'Try GetHired with limited hiring tools.',
    recommended: false,
    trial: true,
    enterprise: false,
  },
  {
    slug: 'starter',
    name: 'Starter',
    dbSubscriptionId: 2,
    durationDays: null, // subscription_period_end tracked per billing cycle
    priceMonthlyPHP: 1490,
    priceAnnualPHP: 14900,
    effectiveMonthlyPHP: 1242, // 14900/12 = 1241.67, rounded
    annualSavingsPHP: 2980,    // 1490*2
    billingCycles: ['monthly', 'annual'],
    entitlements: {
      active_job_posts: 5,
      admin_users: 2,
      applicants: null,
      recruitment_storage_bytes: 10 * GB,
      video_questions_per_job: 3,
      video_responses: 25,
      featured_job_credits: 0,
      customized_company_page: true,
      video_interview_questions: true,
      dedicated_support: false,
    },
    audience: 'For small employers hiring occasionally.',
    recommended: false,
    trial: false,
    enterprise: false,
  },
  {
    slug: 'growth',
    name: 'Growth',
    dbSubscriptionId: 3,
    durationDays: null,
    priceMonthlyPHP: 3490,
    priceAnnualPHP: 34900,
    effectiveMonthlyPHP: 2908, // 34900/12 = 2908.33, rounded
    annualSavingsPHP: 6980,    // 3490*2
    billingCycles: ['monthly', 'annual'],
    entitlements: {
      active_job_posts: 15,
      admin_users: 5,
      applicants: null,
      recruitment_storage_bytes: 50 * GB,
      video_questions_per_job: 5,
      video_responses: 100,
      featured_job_credits: 0,
      customized_company_page: true,
      video_interview_questions: true,
      dedicated_support: false,
    },
    audience: 'For active hiring teams.',
    recommended: true,
    trial: false,
    enterprise: false,
  },
  {
    slug: 'business',
    name: 'Premium', // slug stays 'business' (DEC-02); the product calls this tier Premium (Operating Order v2 §0)
    dbSubscriptionId: 4, // legacy slug 'premium' aliases here; the slug stays 'business' (DEC-02)
    durationDays: null,
    priceMonthlyPHP: 5990,
    priceAnnualPHP: 59900,
    effectiveMonthlyPHP: 4992, // 59900/12 = 4991.67, rounded
    annualSavingsPHP: 11980,   // 5990*2
    billingCycles: ['monthly', 'annual'],
    entitlements: {
      active_job_posts: 40,
      admin_users: 15,
      applicants: null,
      recruitment_storage_bytes: 200 * GB,
      video_questions_per_job: 10,
      video_responses: 400,
      featured_job_credits: 5,
      customized_company_page: true,
      video_interview_questions: true,
      dedicated_support: true,
    },
    audience: 'For frequent hiring and larger teams with dedicated support.',
    recommended: false,
    trial: false,
    enterprise: false,
  },
  {
    // Enterprise: every numeric limit is null = "no catalog limit; resolved from the
    // account's custom override". Never encode a fake-unlimited integer such as
    // 999999 — getWarningLevel() and buildEntitlementUsage() both already treat a
    // non-number limit as unlimited, so null flows through the existing meters.
    slug: 'enterprise',
    name: 'Enterprise',
    dbSubscriptionId: 5,
    durationDays: null,
    priceMonthlyPHP: null, // custom pricing — negotiated per account
    priceAnnualPHP: null,
    effectiveMonthlyPHP: null,
    annualSavingsPHP: 0,
    billingCycles: ['custom'],
    entitlements: {
      active_job_posts: null,
      admin_users: null,
      applicants: null,
      recruitment_storage_bytes: null, // contractual; 500 GB+ typical starting point
      video_questions_per_job: null,
      video_responses: null,
      featured_job_credits: null,
      customized_company_page: true,
      video_interview_questions: true,
      dedicated_support: true,
    },
    audience: 'For multi-brand and high-volume hiring with a custom agreement.',
    recommended: false,
    trial: false,
    enterprise: true,
  },
];

var PLAN_BY_SLUG = {};
var PLAN_BY_DB_ID = {};
(function() {
  var i;
  for (i = 0; i < PLAN_CATALOG.length; i++) {
    PLAN_BY_SLUG[PLAN_CATALOG[i].slug] = PLAN_CATALOG[i];
    PLAN_BY_DB_ID[PLAN_CATALOG[i].dbSubscriptionId] = PLAN_CATALOG[i];
  }
})();

// ── Legacy slug compat ────────────────────────────────────────────────────────
// The old code used 'premium' for subscription_id=4. V4 renames to 'business'.
var LEGACY_SLUG_ALIASES = { premium: 'business' };

// ── Billing cycle metadata ────────────────────────────────────────────────────
var VALID_BILLING_CYCLES = ['monthly', 'annual'];

var BILLING_CYCLE_META = {
  monthly: {
    label: 'Monthly subscription package',
    renewalLabel: 'Paid monthly, recurring',
    durationDays: 30,
    disclosureKey: 'billing_cycle_monthly',
  },
  annual: {
    label: 'Annual subscription package',
    renewalLabel: 'Pay once today and get 12 months of GetHired access.',
    savingsCopy: 'Save 2 months with annual billing',
    durationDays: 365,
    disclosureKey: 'billing_cycle_annual',
  },
  trial: {
    label: 'Free Trial',
    renewalLabel: '7-day free trial',
    durationDays: 7,
    disclosureKey: 'billing_cycle_trial',
  },
};

// ── Recommended upgrade path ──────────────────────────────────────────────────
var UPGRADE_PATH = {
  none: 'growth',
  free_trial: 'growth',
  starter: 'growth',
  growth: 'business',
  business: 'business', // not 'enterprise': consumers build unlocks from numeric limits and a self-serve route
  enterprise: null,
  premium: 'business', // legacy alias
};

// ── Public exports ────────────────────────────────────────────────────────────

export function getPlanBySlug(slug) {
  var resolvedSlug = (LEGACY_SLUG_ALIASES[slug] || slug);
  return PLAN_BY_SLUG[resolvedSlug] || null;
}

export function getPlanByDbId(id) {
  return PLAN_BY_DB_ID[id] || null;
}

export function isValidPlanSlug(slug) {
  if (!slug) return false;
  var resolved = LEGACY_SLUG_ALIASES[slug] || slug;
  return !!PLAN_BY_SLUG[resolved];
}

export function isValidBillingCycle(cycle) {
  return VALID_BILLING_CYCLES.indexOf(cycle) !== -1;
}

export function getAmountForCheckout(slug, billingCycle) {
  var plan = getPlanBySlug(slug);
  if (!plan) return null;
  // Custom-priced plans (Enterprise) have no catalog amount and must never reach
  // self-serve checkout — the price is contractual, not published. Returning null
  // here also keeps getAmountInCentavos() from coercing null to 0, which would
  // otherwise create a zero-peso PayMongo charge.
  if (plan.enterprise) return null;
  if (billingCycle === 'annual') return plan.priceAnnualPHP;
  if (billingCycle === 'monthly') return plan.priceMonthlyPHP;
  return null;
}

// Amount in centavos for PayMongo (1 PHP = 100 centavos)
export function getAmountInCentavos(slug, billingCycle) {
  var amount = getAmountForCheckout(slug, billingCycle);
  if (amount === null) return null;
  return Math.round(amount * 100);
}

export function getEntitlements(slug) {
  var plan = getPlanBySlug(slug);
  if (!plan) return null;
  return plan.entitlements;
}

export function getEntitlementLimit(slug, entitlementKey) {
  var ents = getEntitlements(slug);
  if (!ents) return null;
  if (typeof ents[entitlementKey] === 'undefined') return null;
  return ents[entitlementKey];
}

export function getRecommendedUpgrade(slug) {
  var resolved = (LEGACY_SLUG_ALIASES[slug] || slug) || 'none';
  return UPGRADE_PATH[resolved] || UPGRADE_PATH['none'];
}

export function getBillingCycleMeta(cycle) {
  return BILLING_CYCLE_META[cycle] || null;
}

export function getAllPlans() {
  return PLAN_CATALOG.slice();
}

// Renders a peso label, or a fallback when the amount is null (custom pricing).
// ES2019 only — no ?. or ?? anywhere in this file (esm@3.2.25 cannot parse them).
function pricingLabel(amount, customText, zeroText, render) {
  if (amount === null || typeof amount === 'undefined') return customText;
  if (amount === 0) return zeroText;
  return render(amount.toLocaleString());
}

// Pricing catalog display shape for GET /api/subscriptions/pricing-catalog
export function getPricingCatalog(currentPlanSlug) {
  var current = currentPlanSlug ? (LEGACY_SLUG_ALIASES[currentPlanSlug] || currentPlanSlug) : null;
  return {
    annualCopy: 'Save 2 months with annual billing',
    mustDiscloseAnnualDueToday: true,
    upgradeLandingDefaultCycle: 'annual',
    monthlyAvailable: true,
    annualAvailable: true,
    plans: PLAN_CATALOG.map(function(p) {
      return {
        slug: p.slug,
        name: p.name,
        audience: p.audience,
        recommended: p.recommended,
        trial: p.trial,
        enterprise: p.enterprise,
        current: current ? (p.slug === current) : false,
        // pricingLabel() guards every label: a custom-priced plan carries null amounts, and
        // null.toLocaleString() would throw and take the whole pricing endpoint
        // down rather than just that one row.
        pricing: {
          monthly: {
            amount: p.priceMonthlyPHP,
            currency: 'PHP',
            label: pricingLabel(p.priceMonthlyPHP, 'Custom pricing', 'Free', function(v) { return 'PHP ' + v + '/month'; }),
            renewalLabel: p.enterprise ? 'Billed per your agreement' : 'Paid monthly, recurring',
          },
          annual: {
            amount: p.priceAnnualPHP,
            currency: 'PHP',
            dueTodayLabel: pricingLabel(p.priceAnnualPHP, 'Custom pricing', 'Free', function(v) { return 'Billed today: PHP ' + v + ' for 12 months.'; }),
            effectiveMonthlyLabel: pricingLabel(p.effectiveMonthlyPHP, 'Custom pricing', 'Free', function(v) { return 'PHP ' + v + '/mo effective'; }),
            savingsCopy: p.annualSavingsPHP > 0 ? 'Save 2 months with annual billing' : null,
            annualSavingsAmount: p.annualSavingsPHP,
            renewalLabel: p.priceAnnualPHP === 0 ? 'Free trial' : (p.enterprise ? 'Billed per your agreement' : 'Pay once today and get 12 months of GetHired access.'),
          },
        },
        entitlements: p.entitlements,
        upgradeRoute: (p.slug === 'free_trial' || p.enterprise) ? null : '/recruiter/subscription/upgrade/' + p.slug,
        contactSalesRequired: !!p.enterprise,
        defaultBillingCycle: 'annual',
      };
    }),
  };
}
