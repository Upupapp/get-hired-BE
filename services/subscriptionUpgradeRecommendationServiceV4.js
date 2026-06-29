/**
 * Subscription Upgrade Recommendation Service V4
 * Resolves current plan, usage, trigger, and recommended plan server-side.
 * Node 14 / ESM safe: no ?. or ??
 *
 * Security: all company data resolved from companyId (JWT-derived), never client.
 * Never exposes applicant PII, raw payment data, or PayMongo secrets.
 */

import { getAllPlans, getPlanBySlug, getRecommendedUpgrade } from './planCatalogServiceV4';
import { getCompanyUsageV4 as getCompanyUsage } from './subscriptionUsageServiceV4';
import { getLatestCompanySubscription, deriveLifecycleStatus } from './subscriptionLifecycleServiceV4';

// Prompt priority constants (lower = higher priority)
var PRIORITY_PAYMENT_CRITICAL   = 0;
var PRIORITY_HARD_LIMIT         = 1;
var PRIORITY_TRIAL_EXPIRED      = 2;
var PRIORITY_TRIAL_ENDING       = 3;
var PRIORITY_USAGE_100          = 4;
var PRIORITY_USAGE_90           = 5;
var PRIORITY_USAGE_70           = 6;
var PRIORITY_VALUE_RECAP        = 7;
var PRIORITY_ANNUAL_SAVINGS     = 8;
var PRIORITY_GENERAL            = 9;

/**
 * Build the full upgrade recommendation payload for a company.
 * @param {string} companyId - from JWT, never trust client
 * @param {object} opts - { trigger, surface, currentUsage }
 */
async function getUpgradeRecommendation(companyId, opts) {
  opts = opts || {};
  var trigger = opts.trigger || 'pricing_page_viewed';
  var surface = opts.surface || 'subscription_page';

  try {
    // 1. Resolve current subscription from DB
    var subRow = await getLatestCompanySubscription(companyId);
    var lifecycleStatus = subRow ? deriveLifecycleStatus(subRow) : 'no_subscription_found';
    var currentPlanSlug = (subRow && (subRow.canonical_slug || subRow.plan_slug)) || 'free_trial';
    var currentPlan = getPlanBySlug(currentPlanSlug) || getPlanBySlug('free_trial');
    var billingCycle = (subRow && subRow.billing_cycle) || 'monthly';

    // 2. Critical state check: payment issues take priority — don't show upgrade over dunning
    var isPaymentCritical = lifecycleStatus === 'payment_failed'
      || lifecycleStatus === 'past_due'
      || lifecycleStatus === 'grace_period';

    if (isPaymentCritical) {
      return buildPaymentCriticalResponse(companyId, currentPlan, lifecycleStatus);
    }

    // 3. Get live usage
    var usage = null;
    try {
      usage = await getCompanyUsage(companyId);
    } catch (usageErr) {
      // Non-blocking — continue with null usage
      console.warn('[upgradeRecommendV4] usage lookup error:', usageErr && usageErr.code);
    }

    // 4. Determine upgrade trigger + priority
    var resolved = resolveUpgradeTrigger(currentPlan, lifecycleStatus, usage, trigger);

    // 5. Resolve recommended plan
    var recommendedSlug = resolved.recommendedSlug || getRecommendedUpgrade(currentPlanSlug);
    var recommendedPlan = getPlanBySlug(recommendedSlug);

    if (!recommendedPlan || recommendedPlan.enterprise) {
      return buildEnterpriseOrNoPlanResponse(companyId, currentPlan, resolved);
    }

    // 6. Build billing option metadata
    var billingOptions = buildBillingOptions(recommendedPlan);

    // 7. Build comparison data
    var comparison = buildComparison(currentPlan, recommendedPlan, usage);

    // 8. Analytics properties (no PII, no raw payment IDs)
    var analyticsProps = {
      trigger: resolved.trigger,
      currentPlan: currentPlan ? currentPlan.slug : 'unknown',
      recommendedPlan: recommendedPlan.slug,
      defaultBillingCycle: 'annual',
      lifecycleStatus: lifecycleStatus,
      surface: surface,
    };

    return {
      showPrompt: resolved.showPrompt,
      trigger: resolved.trigger,
      priority: resolved.priority,
      copyKey: resolved.copyKey,
      primaryCta: resolved.primaryCta || 'Upgrade plan',
      secondaryCta: resolved.secondaryCta || 'Not now — I\'ll review plans later.',
      currentPlan: {
        slug: currentPlan ? currentPlan.slug : 'free_trial',
        name: currentPlan ? currentPlan.name : 'Free Trial',
        billingCycle: billingCycle,
        lifecycleStatus: lifecycleStatus,
      },
      recommendedPlan: {
        slug: recommendedPlan.slug,
        name: recommendedPlan.name,
        route: '/recruiter/subscription/upgrade/' + recommendedPlan.slug,
        defaultBillingCycle: 'annual',
        monthlyPricePhp: recommendedPlan.priceMonthlyPHP,
        annualPricePhp: recommendedPlan.priceAnnualPHP,
        annualEffectiveMonthlyPhp: recommendedPlan.effectiveMonthlyPHP,
        annualSavingsPhp: recommendedPlan.annualSavingsPHP,
        annualDueTodayPhp: recommendedPlan.priceAnnualPHP,
        limits: {
          activeJobs: recommendedPlan.entitlements.active_job_posts,
          adminUsers: recommendedPlan.entitlements.admin_users,
          videoResponses: recommendedPlan.entitlements.video_responses,
        },
      },
      // Also expose Starter as affordable option when Growth is recommended
      starterOption: (recommendedPlan.slug === 'growth')
        ? buildStarterOption()
        : null,
      billingOptions: billingOptions,
      comparison: comparison,
      usageSnapshot: buildSafeUsageSnapshot(usage),
      analytics: {
        eventName: 'upgrade_prompt_shown',
        safeProperties: analyticsProps,
      },
    };

  } catch (err) {
    console.error('[upgradeRecommendV4] getUpgradeRecommendation error:', err && err.message && err.message.substring(0, 80));
    return { showPrompt: false, trigger: 'error', error: 'recommendation_unavailable' };
  }
}

// ── Trigger resolution ─────────────────────────────────────────────────────────

function resolveUpgradeTrigger(currentPlan, lifecycleStatus, usage, rawTrigger) {
  var slug = currentPlan ? currentPlan.slug : 'free_trial';

  // Trial states
  if (lifecycleStatus === 'trial_expired') {
    return { showPrompt: true, trigger: 'trial_expired', priority: PRIORITY_TRIAL_EXPIRED,
      recommendedSlug: 'growth', copyKey: 'trial_expired',
      primaryCta: 'Choose a plan', secondaryCta: null };
  }
  if (lifecycleStatus === 'trial_ending') {
    return { showPrompt: true, trigger: 'trial_ending', priority: PRIORITY_TRIAL_ENDING,
      recommendedSlug: 'growth', copyKey: 'trial_ending',
      primaryCta: 'Upgrade now', secondaryCta: 'Not now — I\'ll review plans later.' };
  }

  // Usage-based triggers (check 100% → 90% → 70%)
  if (usage) {
    var jobUsage = usage.active_job_posts;
    var videoUsage = usage.video_responses;
    var adminUsage = usage.admin_users;

    // 100% / hard limit
    if (isAtLimit(jobUsage) || rawTrigger === 'active_job_limit') {
      return triggerForSlug(slug, 'active_job_limit', PRIORITY_HARD_LIMIT, 'job_limit_reached');
    }
    if (isAtLimit(adminUsage) || rawTrigger === 'admin_limit') {
      return triggerForSlug(slug, 'admin_limit', PRIORITY_HARD_LIMIT, 'admin_limit_reached');
    }
    if (isAtLimit(videoUsage) || rawTrigger === 'video_limit') {
      return triggerForSlug(slug, 'video_response_limit', PRIORITY_HARD_LIMIT, 'video_limit_reached');
    }

    // 90% warning
    if (isNear90(jobUsage)) {
      return triggerForSlug(slug, 'active_job_near_90', PRIORITY_USAGE_90, 'job_near_90');
    }
    if (isNear90(videoUsage)) {
      return triggerForSlug(slug, 'video_near_90', PRIORITY_USAGE_90, 'video_near_90');
    }

    // 70% gentle nudge
    if (isNear70(jobUsage)) {
      return triggerForSlug(slug, 'active_job_near_70', PRIORITY_USAGE_70, 'job_near_70');
    }
    if (isNear70(videoUsage)) {
      return triggerForSlug(slug, 'video_near_70', PRIORITY_USAGE_70, 'video_near_70');
    }
  }

  // Value milestones from explicit trigger
  if (rawTrigger === 'first_applicant_received') {
    return { showPrompt: true, trigger: rawTrigger, priority: PRIORITY_VALUE_RECAP,
      recommendedSlug: 'growth', copyKey: 'first_applicant',
      primaryCta: 'Upgrade plan', secondaryCta: 'Not now — I\'ll review plans later.' };
  }
  if (rawTrigger === 'first_video_response') {
    return { showPrompt: true, trigger: rawTrigger, priority: PRIORITY_VALUE_RECAP,
      recommendedSlug: 'growth', copyKey: 'first_video_response',
      primaryCta: 'Upgrade plan', secondaryCta: 'Not now — I\'ll review plans later.' };
  }

  // Annual savings nudge (low priority)
  if (slug !== 'free_trial') {
    return { showPrompt: true, trigger: 'annual_savings_prompt', priority: PRIORITY_ANNUAL_SAVINGS,
      recommendedSlug: getRecommendedUpgrade(slug) || 'growth',
      copyKey: 'annual_savings_general',
      primaryCta: 'See annual plans', secondaryCta: 'Not now — I\'ll review plans later.' };
  }

  // General suggestion
  return { showPrompt: rawTrigger !== 'pricing_page_viewed', trigger: rawTrigger,
    priority: PRIORITY_GENERAL, recommendedSlug: 'growth',
    copyKey: 'general_upgrade', primaryCta: 'Upgrade plan',
    secondaryCta: 'Not now — I\'ll review plans later.' };
}

function triggerForSlug(currentSlug, trigger, priority, copyKey) {
  var recommendedSlug = 'growth';
  if (currentSlug === 'growth') recommendedSlug = 'business';
  if (currentSlug === 'business') recommendedSlug = 'business'; // Enterprise backlog
  var primaryCta = 'Upgrade plan';
  if (priority === PRIORITY_HARD_LIMIT) primaryCta = 'Upgrade to unlock';
  return { showPrompt: true, trigger: trigger, priority: priority,
    recommendedSlug: recommendedSlug, copyKey: copyKey, primaryCta: primaryCta,
    secondaryCta: 'Keep as draft' };
}

// ── Usage helpers ──────────────────────────────────────────────────────────────

function isAtLimit(usageObj) {
  if (!usageObj) return false;
  return usageObj.percentUsed !== null && usageObj.percentUsed >= 100;
}
function isNear90(usageObj) {
  if (!usageObj) return false;
  return usageObj.percentUsed !== null && usageObj.percentUsed >= 90 && usageObj.percentUsed < 100;
}
function isNear70(usageObj) {
  if (!usageObj) return false;
  return usageObj.percentUsed !== null && usageObj.percentUsed >= 70 && usageObj.percentUsed < 90;
}

// ── Billing options builder ────────────────────────────────────────────────────

function buildBillingOptions(plan) {
  return {
    annual: {
      available: true,
      tabLabel: 'Annual subscription package',
      displayPrice: '₱' + plan.effectiveMonthlyPHP.toLocaleString() + '/mo effective',
      amountDueToday: '₱' + plan.priceAnnualPHP.toLocaleString() + ' billed today',
      helper: 'Save 2 months with annual billing.',
      savingsAmount: plan.annualSavingsPHP,
      savingsCopy: 'Save ₱' + plan.annualSavingsPHP.toLocaleString() + ' vs monthly over 12 months',
    },
    monthly: {
      available: true,
      tabLabel: 'Monthly subscription package',
      displayPrice: '₱' + plan.priceMonthlyPHP.toLocaleString() + '/month',
      helper: 'Paid monthly, recurring.',
    },
  };
}

function buildStarterOption() {
  var starter = getPlanBySlug('starter');
  if (!starter) return null;
  return {
    slug: starter.slug,
    name: starter.name,
    route: '/recruiter/subscription/upgrade/starter',
    monthlyPricePhp: starter.priceMonthlyPHP,
    annualPricePhp: starter.priceAnnualPHP,
    annualEffectiveMonthlyPhp: starter.effectiveMonthlyPHP,
    limits: {
      activeJobs: starter.entitlements.active_job_posts,
      adminUsers: starter.entitlements.admin_users,
      videoResponses: starter.entitlements.video_responses,
    },
  };
}

// ── Comparison builder ─────────────────────────────────────────────────────────

function buildComparison(currentPlan, recommendedPlan, usage) {
  var currentEnts = (currentPlan && currentPlan.entitlements) || { active_job_posts: 1, admin_users: 1, video_responses: 5, dedicated_support: false };
  var recEnts = recommendedPlan.entitlements;
  return {
    activeJobs: {
      current: currentEnts.active_job_posts < 0 ? 'Unlimited' : currentEnts.active_job_posts,
      recommended: recEnts.active_job_posts < 0 ? 'Unlimited' : recEnts.active_job_posts,
      used: usage && usage.active_job_posts ? (usage.active_job_posts.used || 0) : null,
    },
    adminUsers: {
      current: currentEnts.admin_users < 0 ? 'Unlimited' : currentEnts.admin_users,
      recommended: recEnts.admin_users < 0 ? 'Unlimited' : recEnts.admin_users,
    },
    videoResponses: {
      current: currentEnts.video_responses < 0 ? 'Unlimited' : currentEnts.video_responses,
      recommended: recEnts.video_responses < 0 ? 'Unlimited' : recEnts.video_responses,
    },
    customizedCompanyPage: {
      current: currentEnts.customized_company_page || false,
      recommended: recEnts.customized_company_page || false,
    },
    videoInterviewQuestions: {
      current: currentEnts.video_interview_questions || false,
      recommended: recEnts.video_interview_questions || false,
    },
    dedicatedSupport: {
      current: currentEnts.dedicated_support || false,
      recommended: recEnts.dedicated_support || false,
    },
  };
}

function buildSafeUsageSnapshot(usage) {
  if (!usage) return null;
  return {
    active_job_posts_percent: usage.active_job_posts ? (usage.active_job_posts.percentUsed || 0) : 0,
    video_responses_percent: usage.video_responses ? (usage.video_responses.percentUsed || 0) : 0,
    admin_users_percent: usage.admin_users ? (usage.admin_users.percentUsed || 0) : 0,
  };
}

// ── Special response builders ──────────────────────────────────────────────────

function buildPaymentCriticalResponse(companyId, currentPlan, lifecycleStatus) {
  return {
    showPrompt: false,
    trigger: 'payment_critical',
    priority: PRIORITY_PAYMENT_CRITICAL,
    copyKey: 'payment_critical_' + lifecycleStatus,
    currentPlan: { slug: currentPlan ? currentPlan.slug : 'unknown', name: currentPlan ? currentPlan.name : 'Unknown', lifecycleStatus: lifecycleStatus },
    recommendedPlan: null,
    billingOptions: null,
    comparison: null,
    usageSnapshot: null,
    analytics: {
      eventName: 'payment_critical_state_shown',
      safeProperties: { trigger: 'payment_critical', lifecycleStatus: lifecycleStatus },
    },
  };
}

function buildEnterpriseOrNoPlanResponse(companyId, currentPlan, resolved) {
  return {
    showPrompt: false,
    trigger: resolved.trigger || 'enterprise_contact',
    priority: PRIORITY_GENERAL,
    copyKey: 'enterprise_contact',
    currentPlan: { slug: currentPlan ? currentPlan.slug : 'business', name: currentPlan ? currentPlan.name : 'Business' },
    recommendedPlan: null,
    isEnterprise: true,
    billingOptions: null,
    comparison: null,
    analytics: { eventName: 'enterprise_threshold_shown', safeProperties: {} },
  };
}

export { getUpgradeRecommendation };
