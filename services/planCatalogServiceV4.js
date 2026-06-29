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
      video_responses: 5,
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
      active_job_posts: 2,
      admin_users: 1,
      video_responses: 25,
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
      active_job_posts: 6,
      admin_users: 3,
      video_responses: 100,
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
    name: 'Business',
    dbSubscriptionId: 4, // maps to 'premium' in legacy code; V4 renames to 'business'
    durationDays: null,
    priceMonthlyPHP: 6990,
    priceAnnualPHP: 69900,
    effectiveMonthlyPHP: 5825, // 69900/12 = 5825
    annualSavingsPHP: 13980,   // 6990*2
    billingCycles: ['monthly', 'annual'],
    entitlements: {
      active_job_posts: 20,
      admin_users: 8,
      video_responses: 400,
      customized_company_page: true,
      video_interview_questions: true,
      dedicated_support: true,
    },
    audience: 'For frequent hiring and larger teams with dedicated support.',
    recommended: false,
    trial: false,
    enterprise: false,
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
  business: 'business',
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
        pricing: {
          monthly: {
            amount: p.priceMonthlyPHP,
            currency: 'PHP',
            label: p.priceMonthlyPHP === 0 ? 'Free' : 'PHP ' + p.priceMonthlyPHP.toLocaleString() + '/month',
            renewalLabel: 'Paid monthly, recurring',
          },
          annual: {
            amount: p.priceAnnualPHP,
            currency: 'PHP',
            dueTodayLabel: p.priceAnnualPHP === 0 ? 'Free' : 'Billed today: PHP ' + p.priceAnnualPHP.toLocaleString() + ' for 12 months.',
            effectiveMonthlyLabel: p.effectiveMonthlyPHP === 0 ? 'Free' : 'PHP ' + p.effectiveMonthlyPHP.toLocaleString() + '/mo effective',
            savingsCopy: p.annualSavingsPHP > 0 ? 'Save 2 months with annual billing' : null,
            annualSavingsAmount: p.annualSavingsPHP,
            renewalLabel: p.priceAnnualPHP === 0 ? 'Free trial' : 'Pay once today and get 12 months of GetHired access.',
          },
        },
        entitlements: p.entitlements,
        upgradeRoute: p.slug === 'free_trial' ? null : '/recruiter/subscription/upgrade/' + p.slug,
        defaultBillingCycle: 'annual',
      };
    }),
  };
}
