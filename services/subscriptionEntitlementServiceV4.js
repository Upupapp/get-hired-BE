/**
 * SubscriptionEntitlementService V4
 * Resolves employer's active plan, evaluates entitlement decisions.
 * Supports enforcement modes: off, observe, warn, enforce.
 * Node 14 / ESM safe: no ?. or ??
 */

import dbQuery from '../db/dbQuery';
import env from '../env';
import { getPlanByDbId, getPlanBySlug, getEntitlementLimit, getRecommendedUpgrade } from './planCatalogServiceV4';
import { getCompanyUsageV4, buildEntitlementUsage } from './subscriptionUsageServiceV4';

const dbSchema = env.schema;

// ── Enforcement mode ──────────────────────────────────────────────────────────
function getEnforcementMode() {
  var raw = (process.env.SUBSCRIPTIONS_ENFORCEMENT_MODE || '').toLowerCase().trim();
  // Legacy alias
  var legacyEnabled = process.env.SUBSCRIPTIONS_ENFORCEMENT_ENABLED;
  if (legacyEnabled === 'false' || legacyEnabled === '0') return 'off';
  if (legacyEnabled === 'true' || legacyEnabled === '1') return 'enforce';
  if (raw === 'off') return 'off';
  if (raw === 'observe') return 'observe';
  if (raw === 'warn') return 'warn';
  if (raw === 'enforce') return 'enforce';
  // Default: observe (safe for production)
  return 'observe';
}

// ── Plan resolution ───────────────────────────────────────────────────────────
export async function resolveCompanyPlan(companyId) {
  try {
    const q = `SELECT cs.company_id, cs.created_at, cs.is_paid, cs.payment_date,
      s.subscription_id, s.job_post, s.admin, s.video_response,
      s.with_customer_care, s.price, s.price_currency,
      s.subscription_name, s.payment_occurence
      FROM ${dbSchema}.companies_subscription cs
      LEFT JOIN ${dbSchema}."subscription" s ON s.subscription_id = cs.subscription_id
      WHERE cs.company_id = $1
      ORDER BY cs.created_at DESC
      LIMIT 1`;
    const result = await dbQuery.query(q, [companyId]);
    const row = (result.rows && result.rows[0]) || null;
    if (!row) return null;
    return row;
  } catch (err) {
    console.warn('[subscriptionEntitlementServiceV4] resolveCompanyPlan error:', err && err.message);
    return null;
  }
}

function deriveStatusFromRow(row) {
  if (!row) return { status: 'none', health: 'unknown', planCode: null };

  var dbId = row.subscription_id;
  var catalogPlan = getPlanByDbId(dbId);
  var planCode = catalogPlan ? catalogPlan.slug : null;
  // Legacy mapping: subscription_id=4 was 'premium', V4 renames to 'business'
  if (!planCode) {
    planCode = dbId === 1 ? 'free_trial' : dbId === 2 ? 'starter' : dbId === 3 ? 'growth' : dbId === 4 ? 'business' : 'enterprise';
  }

  var daysForPlan = dbId === 1 ? 7 : (row.payment_occurence === 'annually' ? 365 : 30);
  var createdAt = row.created_at ? new Date(row.created_at) : null;
  var periodEnd = createdAt ? new Date(createdAt.getTime() + daysForPlan * 24 * 60 * 60 * 1000) : null;
  var now = new Date();

  var status = 'none';
  var health = 'unknown';

  if (dbId === 1) {
    if (periodEnd && now > periodEnd) {
      status = 'trial_expired'; health = 'action_needed';
    } else if (periodEnd && (periodEnd - now) < 2 * 24 * 60 * 60 * 1000) {
      status = 'trial_ending'; health = 'action_needed';
    } else {
      status = 'trial_active'; health = 'healthy';
    }
  } else {
    if (!row.is_paid) {
      status = 'subscription_pending_payment'; health = 'payment_issue';
    } else if (periodEnd && now > periodEnd) {
      status = 'subscription_expired'; health = 'action_needed';
    } else {
      status = 'subscription_active'; health = 'healthy';
    }
  }

  var billingInterval = (row.payment_occurence === 'annually') ? 'annual' : 'monthly';

  return {
    status: status,
    health: health,
    planCode: planCode,
    planName: row.subscription_name || planCode,
    billingInterval: billingInterval,
    dbSubscriptionId: dbId,
    priceAmount: row.price || 0,
    priceCurrency: row.price_currency || 'PHP',
    startedAt: createdAt ? createdAt.toISOString() : null,
    currentPeriodStart: createdAt ? createdAt.toISOString() : null,
    currentPeriodEnd: periodEnd ? periodEnd.toISOString() : null,
    trialEndsAt: (status === 'trial_active' || status === 'trial_ending') ? (periodEnd ? periodEnd.toISOString() : null) : null,
    cancelAtPeriodEnd: false,
    planHealth: health,
  };
}

// ── Structured decision builder ───────────────────────────────────────────────
function buildDecision(opts) {
  var mode = getEnforcementMode();
  var allowed = opts.allowed;
  var reasonCode = opts.reasonCode || 'allowed';
  var entitlementKey = opts.entitlementKey || null;
  var usageData = opts.usageData || null;
  var limit = opts.limit;
  var planInfo = opts.planInfo || null;
  var companyId = opts.companyId || null;
  var actorId = opts.actorId || null;
  var action = opts.action || null;

  // In off/observe mode, never hard-block
  if (mode === 'off' || mode === 'observe') {
    allowed = true;
    reasonCode = mode === 'off' ? 'enforcement_off' : (allowed ? 'enforcement_observe_allowed' : reasonCode);
  }

  var planSlug = (planInfo && planInfo.planCode) || null;
  var recommendedSlug = getRecommendedUpgrade(planSlug);
  var recommendedPlan = recommendedSlug ? getPlanBySlug(recommendedSlug) : null;

  var used = (usageData && usageData.used) || 0;
  var usedLimit = typeof limit === 'number' ? limit : null;
  var remaining = (usedLimit !== null && usedLimit >= 0) ? Math.max(0, usedLimit - used) : null;
  var percentUsed = (usedLimit !== null && usedLimit > 0) ? parseFloat(((used / usedLimit) * 100).toFixed(2)) : null;
  var warningLevel = usageData && usageData.warningLevel ? usageData.warningLevel : 'none';

  var upgradeRoute = recommendedPlan ? ('/recruiter/subscription/upgrade/' + recommendedPlan.slug) : '/recruiter/subscription';

  return {
    allowed: allowed,
    mode: mode,
    enforcementEnabled: mode === 'enforce',
    action: action,
    companyId: companyId,
    actorId: actorId,
    plan: planInfo ? {
      slug: planInfo.planCode,
      name: planInfo.planName,
      billingCycle: planInfo.billingInterval,
      status: planInfo.status,
      trialEndsAt: planInfo.trialEndsAt || null,
      currentPeriodStart: planInfo.currentPeriodStart || null,
      currentPeriodEnd: planInfo.currentPeriodEnd || null,
    } : null,
    entitlement: entitlementKey ? {
      key: entitlementKey,
      used: used,
      limit: usedLimit !== null && usedLimit < 0 ? 'unlimited' : usedLimit,
      remaining: remaining,
      percentUsed: percentUsed,
      warningLevel: warningLevel,
      countSource: (usageData && usageData.countSource) || 'unknown',
      countConfidence: (usageData && usageData.countConfidence) || 'unavailable',
    } : null,
    pricingDisplay: {
      upgradeLandingDefaultCycle: 'annual',
      monthlyAvailable: true,
      annualAvailable: true,
      annualCopy: 'Save 2 months with annual billing',
      mustDiscloseAnnualDueToday: true,
    },
    reasonCode: reasonCode,
    copyKey: 'subscription.' + reasonCode,
    userMessage: opts.userMessage || (allowed ? 'Allowed.' : 'This action requires a plan upgrade.'),
    developerMessage: opts.developerMessage || '',
    preserveWork: {
      canSaveDraft: true,
      draftSaved: false,
      safeReturnRoute: '/recruiter/jobs',
    },
    upgrade: recommendedPlan ? {
      recommendedPlanSlug: recommendedPlan.slug,
      cta: 'Upgrade plan',
      route: upgradeRoute,
      defaultBillingCycle: 'annual',
      unlocks: [
        (recommendedPlan.entitlements.active_job_posts < 0 ? 'Unlimited' : recommendedPlan.entitlements.active_job_posts) + ' active job posts',
        (recommendedPlan.entitlements.admin_users < 0 ? 'Unlimited' : recommendedPlan.entitlements.admin_users) + ' admin users',
        (recommendedPlan.entitlements.video_responses < 0 ? 'Unlimited' : recommendedPlan.entitlements.video_responses) + ' video responses',
        recommendedPlan.entitlements.dedicated_support ? 'Dedicated support' : null,
      ].filter(Boolean),
    } : null,
    audit: {
      shouldLog: true,
      wouldHaveBlocked: !opts.allowed && (mode === 'off' || mode === 'observe'),
    },
  };
}

// ── Main entitlement check ────────────────────────────────────────────────────
export async function checkEntitlement(companyId, actorId, action, entitlementKey) {
  try {
    var planRow = await resolveCompanyPlan(companyId);
    var planInfo = deriveStatusFromRow(planRow);
    var planCode = planInfo.planCode;

    if (!planCode) {
      return buildDecision({
        allowed: false,
        reasonCode: 'no_subscription_found',
        action: action,
        companyId: companyId,
        actorId: actorId,
        entitlementKey: entitlementKey,
        userMessage: 'No active subscription found. Please choose a plan.',
        developerMessage: 'No plan row found for company ' + companyId,
        planInfo: planInfo,
      });
    }

    // Determine limit from catalog
    var limit = getEntitlementLimit(planCode, entitlementKey);

    // Get usage
    var usageAll = await getCompanyUsageV4(companyId);
    var usageResult = (usageAll && usageAll[entitlementKey]) || { count: 0, confidence: 'unavailable', source: 'unknown', warningLevel: 'none' };
    var usageData = buildEntitlementUsage(entitlementKey, usageResult, limit);

    var mode = getEnforcementMode();
    var allowed;
    var reasonCode;
    var userMessage;
    var developerMessage;

    if (typeof limit === 'boolean') {
      // Boolean entitlement (included/not included)
      allowed = limit === true;
      reasonCode = allowed ? 'allowed' : (entitlementKey + '_not_included');
      userMessage = allowed ? 'Included in your plan.' : 'This feature is not included in your current plan.';
      developerMessage = planCode + ' ' + entitlementKey + ' = ' + limit;
    } else if (typeof limit === 'number' && limit >= 0) {
      var used = usageData.used;
      var wl = usageData.warningLevel;
      if (wl === 'at_limit') {
        allowed = false;
        reasonCode = entitlementKey + '_limit_reached';
        userMessage = 'You have reached your plan\'s limit for this feature. Upgrade to continue.';
        developerMessage = planCode + ' ' + entitlementKey + ' used=' + used + ' limit=' + limit;
      } else if (wl === 'near_90') {
        allowed = true;
        reasonCode = entitlementKey + '_limit_near_90';
        userMessage = 'You are close to your plan limit. Consider upgrading soon.';
        developerMessage = planCode + ' ' + entitlementKey + ' used=' + used + ' limit=' + limit + ' (90%)';
      } else if (wl === 'near_70') {
        allowed = true;
        reasonCode = entitlementKey + '_limit_near_70';
        userMessage = '';
        developerMessage = planCode + ' ' + entitlementKey + ' used=' + used + ' limit=' + limit + ' (70%)';
      } else {
        allowed = true;
        reasonCode = 'allowed';
        userMessage = 'Allowed.';
        developerMessage = planCode + ' ' + entitlementKey + ' usage ' + used + '/' + limit;
      }
    } else {
      // Unlimited (-1)
      allowed = true;
      reasonCode = 'allowed';
      userMessage = 'Allowed.';
      developerMessage = planCode + ' ' + entitlementKey + ' unlimited';
    }

    return buildDecision({
      allowed: allowed,
      reasonCode: reasonCode,
      action: action,
      companyId: companyId,
      actorId: actorId,
      entitlementKey: entitlementKey,
      limit: typeof limit === 'number' ? limit : null,
      usageData: usageData,
      planInfo: planInfo,
      userMessage: userMessage,
      developerMessage: developerMessage,
    });
  } catch (err) {
    console.error('[subscriptionEntitlementServiceV4] checkEntitlement error:', err && err.message);
    return buildDecision({
      allowed: true, // fail open — do not block on error
      reasonCode: 'usage_unavailable',
      action: action,
      companyId: companyId,
      actorId: actorId,
      entitlementKey: entitlementKey,
      userMessage: 'Allowed.',
      developerMessage: 'Entitlement check error: ' + (err && err.message),
    });
  }
}

export { getEnforcementMode };
