/**
 * Subscription Guardrails Controller V4
 * New endpoints for employer subscription summary, pricing catalog, checkout intent.
 * Runs alongside legacy /api/subscription/* routes — does not replace them.
 * Node 14 / ESM safe: no ?. or ??
 */

import { getUserCompanyForRequest } from './companiesController';
import { getPricingCatalog, isValidPlanSlug, isValidBillingCycle, getAmountForCheckout, getAmountInCentavos, getPlanBySlug, getRecommendedUpgrade } from '../services/planCatalogServiceV4';
import { resolveCompanyPlan, checkEntitlement, getEnforcementMode } from '../services/subscriptionEntitlementServiceV4';
import { getCompanyUsageV4, buildEntitlementUsage } from '../services/subscriptionUsageServiceV4';
import { logCheckoutIntent, logValidationRejection } from '../services/subscriptionAuditLogServiceV4';
import { createPaymongoLink } from './paymentController';
import idGenerator from '../helpers/randomNumberForId';
import dbQuery from '../db/dbQuery';
import env from '../env';

const dbSchema = env.schema;

// ── GET /api/subscriptions/pricing-catalog ────────────────────────────────────
export async function getPricingCatalogEndpoint(req, res) {
  try {
    var uid = req.user && req.user.uid;
    var currentPlanSlug = null;

    // If authenticated, resolve current plan for highlighting
    if (uid) {
      try {
        var company = await getUserCompanyForRequest(req, uid);
        if (company && !Array.isArray(company) && company.companyId) {
          var planRow = await resolveCompanyPlan(company.companyId);
          if (planRow) {
            var dbId = planRow.subscription_id;
            currentPlanSlug = dbId === 1 ? 'free_trial' : dbId === 2 ? 'starter' : dbId === 3 ? 'growth' : dbId === 4 ? 'business' : null;
          }
        }
      } catch (_) { /* non-fatal */ }
    }

    var catalog = getPricingCatalog(currentPlanSlug);
    return res.status(200).json({ success: true, catalog: catalog });
  } catch (err) {
    console.error('[subscriptionGuardrailsV4] getPricingCatalog error:', err && err.message);
    return res.status(500).json({ success: false, message: 'We couldn\'t load the latest plan details. Please try again.' });
  }
}

// ── GET /api/subscriptions/employer/summary ───────────────────────────────────
export async function getEmployerSubscriptionSummary(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    var companyId = company.companyId;
    var planRow = await resolveCompanyPlan(companyId);

    // Derive plan info
    var planCode = null;
    var planName = 'No plan';
    var planStatus = 'none';
    var billingCycle = 'monthly';
    var priceAmount = null;
    var priceCurrency = 'PHP';
    var periodStart = null;
    var periodEnd = null;
    var trialEndsAt = null;
    var planHealth = 'unknown';

    if (planRow) {
      var dbId = planRow.subscription_id;
      planCode = dbId === 1 ? 'free_trial' : dbId === 2 ? 'starter' : dbId === 3 ? 'growth' : dbId === 4 ? 'business' : 'enterprise';
      planName = planRow.subscription_name || planCode;
      priceAmount = planRow.price || 0;
      priceCurrency = planRow.price_currency || 'PHP';
      billingCycle = planRow.payment_occurence === 'annually' ? 'annual' : 'monthly';

      var daysForPlan = dbId === 1 ? 7 : (billingCycle === 'annual' ? 365 : 30);
      var createdAt = planRow.created_at ? new Date(planRow.created_at) : null;
      periodStart = createdAt ? createdAt.toISOString() : null;
      periodEnd = createdAt ? new Date(createdAt.getTime() + daysForPlan * 24 * 60 * 60 * 1000).toISOString() : null;
      var now = new Date();
      var endDate = periodEnd ? new Date(periodEnd) : null;

      if (dbId === 1) {
        if (endDate && now > endDate) { planStatus = 'trial_expired'; planHealth = 'action_needed'; }
        else if (endDate && (endDate - now) < 2 * 24 * 60 * 60 * 1000) { planStatus = 'trial_ending'; planHealth = 'action_needed'; trialEndsAt = periodEnd; }
        else { planStatus = 'trial_active'; planHealth = 'healthy'; trialEndsAt = periodEnd; }
      } else {
        if (!planRow.is_paid) { planStatus = 'subscription_pending_payment'; planHealth = 'payment_issue'; }
        else if (endDate && now > endDate) { planStatus = 'subscription_expired'; planHealth = 'action_needed'; }
        else { planStatus = 'subscription_active'; planHealth = 'healthy'; }
      }
    }

    // Usage
    var usageAll = await getCompanyUsageV4(companyId).catch(function() { return {}; });
    var catalogPlan = getPlanBySlug(planCode);
    var ents = catalogPlan ? catalogPlan.entitlements : { active_job_posts: 0, admin_users: 0, video_responses: 0 };

    var jobUsage = buildEntitlementUsage('active_job_posts', usageAll.active_job_posts, ents.active_job_posts);
    var adminUsage = buildEntitlementUsage('admin_users', usageAll.admin_users, ents.admin_users);
    var videoUsage = buildEntitlementUsage('video_responses', usageAll.video_responses, ents.video_responses);

    // Recommended upgrade
    var recommendedSlug = getRecommendedUpgrade(planCode);
    var recommendedPlan = recommendedSlug ? getPlanBySlug(recommendedSlug) : null;

    var mode = getEnforcementMode();

    var summary = {
      plan: {
        slug: planCode,
        name: planName,
        status: planStatus,
        billingCycle: billingCycle,
        currency: priceCurrency,
        priceAmount: priceAmount,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialEndsAt: trialEndsAt,
        planHealth: planHealth,
      },
      usage: {
        active_job_posts: jobUsage,
        admin_users: adminUsage,
        video_responses: videoUsage,
        customized_company_page: { included: true },
        video_interview_questions: { included: true },
        dedicated_support: { included: catalogPlan ? !!catalogPlan.entitlements.dedicated_support : false },
      },
      pricingDisplay: {
        upgradeLandingDefaultCycle: 'annual',
        monthlyAvailable: true,
        annualAvailable: true,
        annualCopy: 'Save 2 months with annual billing',
        mustDiscloseAnnualDueToday: true,
      },
      recommendedPlan: recommendedPlan ? {
        slug: recommendedPlan.slug,
        name: recommendedPlan.name,
        upgradeRoute: '/recruiter/subscription/upgrade/' + recommendedPlan.slug,
        defaultBillingCycle: 'annual',
      } : null,
      enforcementMode: mode,
      billingActions: buildBillingActions(planStatus, planCode),
    };

    return res.status(200).json({ success: true, summary: summary });
  } catch (err) {
    console.error('[subscriptionGuardrailsV4] getEmployerSubscriptionSummary error:', err && err.message);
    return res.status(500).json({ success: false, message: 'We couldn\'t load your subscription details. Please try again.' });
  }
}

function buildBillingActions(planStatus, planCode) {
  var actions = [];
  if (planStatus === 'none' || planStatus === 'trial_expired' || planStatus === 'subscription_expired') {
    actions.push({ type: 'choose_plan', label: 'Choose a plan', priority: 'high', route: '/recruiter/subscription' });
  } else if (planStatus === 'trial_active' || planStatus === 'trial_ending') {
    actions.push({ type: 'upgrade', label: 'Upgrade now', priority: 'high', route: '/recruiter/subscription/upgrade/growth' });
  } else if (planStatus === 'subscription_pending_payment') {
    actions.push({ type: 'fix_payment', label: 'Fix payment', priority: 'high', route: '/recruiter/subscription' });
  } else if (planStatus === 'subscription_active') {
    var nextSlug = getRecommendedUpgrade(planCode);
    var route = nextSlug ? '/recruiter/subscription/upgrade/' + nextSlug : '/recruiter/subscription';
    actions.push({ type: 'upgrade', label: 'Manage plan', priority: 'medium', route: route });
  }
  actions.push({ type: 'contact_support', label: 'Contact support', priority: 'low' });
  return actions;
}

// ── POST /api/subscriptions/checkout-intent ───────────────────────────────────
// validateCheckoutIntent middleware runs first (attached in route file).
export async function createCheckoutIntent(req, res) {
  var ctx = req.checkoutContext;
  if (!ctx) {
    return res.status(500).json({ message: 'Checkout context missing. Please try again.' });
  }

  try {
    // Check for duplicate in-flight checkout intent (idempotency)
    // Using cart_id prefix pattern consistent with existing cart_table
    var existingQ = `SELECT cart_id, created_at FROM ${dbSchema}.cart_table
      WHERE company_id = $1 AND subscription_id = $2 AND status = 'pending'
      ORDER BY created_at DESC LIMIT 1`;
    var existingRows = await dbQuery.query(existingQ, [ctx.companyId, ctx.dbSubscriptionId]);
    var existingCart = (existingRows.rows && existingRows.rows[0]) || null;

    // If a pending cart exists for this plan within last 15 minutes, reuse it
    if (existingCart) {
      var cartAge = Date.now() - new Date(existingCart.created_at).getTime();
      if (cartAge < 15 * 60 * 1000) {
        logCheckoutIntent({ companyId: ctx.companyId, actorId: ctx.actorId, planSlug: ctx.planSlug, billingCycle: ctx.billingCycle, amountPHP: ctx.amountPHP, checkoutIntentId: existingCart.cart_id, idempotencyKey: ctx.idempotencyKey, reasonCode: 'idempotency_duplicate_ignored' });
        var disclosure = req.buildBillingCycleDisclosure ? req.buildBillingCycleDisclosure(null, existingCart.cart_id) : {};
        return res.status(200).json({ success: true, status: 'pending', checkoutIntentId: existingCart.cart_id, disclosure: disclosure, reasonCode: 'idempotency_duplicate_ignored' });
      }
    }

    var cartId = idGenerator(6, 'SUBS');
    var now = new Date();

    // Insert cart with billing_cycle (column may not exist yet — see migration notes)
    // Use a graceful INSERT that falls back if billing_cycle column doesn't exist
    var insertOk = false;
    try {
      var insertQ = `INSERT INTO ${dbSchema}.cart_table
        (cart_id, company_id, created_at, subscription_id, price, status)
        VALUES($1, $2, $3, $4, $5, 'pending') returning cart_id`;
      var insertResult = await dbQuery.query(insertQ, [cartId, ctx.companyId, now, ctx.dbSubscriptionId, ctx.amountCentavos]);
      insertOk = !!(insertResult.rows && insertResult.rows[0]);
    } catch (insertErr) {
      console.error('[subscriptionGuardrailsV4] cart insert error:', insertErr && insertErr.message);
      return res.status(500).json({ message: 'We couldn\'t prepare checkout right now. Please try again.' });
    }

    if (!insertOk) {
      return res.status(500).json({ message: 'We couldn\'t prepare checkout right now. Please try again.' });
    }

    // Create PayMongo link using server-side amount
    var description = ctx.companyId + '-' + ctx.planSlug + '-' + ctx.billingCycle;
    var link;
    try {
      link = await createPaymongoLink(cartId, description, ctx.amountCentavos);
    } catch (payErr) {
      console.error('[subscriptionGuardrailsV4] PayMongo link error:', payErr && payErr.message);
      return res.status(502).json({ message: 'We couldn\'t prepare checkout right now. Please try again later.' });
    }

    var checkoutUrl = (link && link.attributes && link.attributes.checkout_url) || null;

    logCheckoutIntent({ companyId: ctx.companyId, actorId: ctx.actorId, planSlug: ctx.planSlug, billingCycle: ctx.billingCycle, amountPHP: ctx.amountPHP, checkoutIntentId: cartId, idempotencyKey: ctx.idempotencyKey, reasonCode: 'checkout_created' });

    var disclosure = req.buildBillingCycleDisclosure ? req.buildBillingCycleDisclosure(checkoutUrl, cartId) : {};

    return res.status(200).json({
      success: true,
      status: 'pending',
      checkoutIntentId: cartId,
      checkoutUrl: checkoutUrl,
      disclosure: disclosure,
    });
  } catch (err) {
    console.error('[subscriptionGuardrailsV4] createCheckoutIntent error:', err && err.message);
    return res.status(500).json({ message: 'We couldn\'t prepare checkout right now. Please try again.' });
  }
}

// ── GET /api/subscriptions/checkout-intent/:id/status ────────────────────────
export async function getCheckoutIntentStatus(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    var companyId = company.companyId;
    var intentId = req.params.id;

    if (!intentId) return res.status(400).json({ message: 'Missing checkout intent ID.' });

    // Only return status for carts owned by this company (BOLA guard)
    var q = `SELECT cart_id, company_id, status, created_at, subscription_id FROM ${dbSchema}.cart_table
      WHERE cart_id = $1 AND company_id = $2 LIMIT 1`;
    var result = await dbQuery.query(q, [intentId, companyId]);
    var row = (result.rows && result.rows[0]) || null;

    if (!row) {
      return res.status(404).json({ message: 'Checkout intent not found.' });
    }

    var statusMap = { pending: 'pending', paid: 'confirmed', failed: 'failed', expired: 'expired' };
    var displayStatus = statusMap[row.status] || 'unknown_retry';

    return res.status(200).json({
      success: true,
      checkoutIntentId: row.cart_id,
      status: displayStatus,
      planSlug: null, // not stored on cart currently; backlog item
    });
  } catch (err) {
    console.error('[subscriptionGuardrailsV4] getCheckoutIntentStatus error:', err && err.message);
    return res.status(500).json({ message: 'Could not check status. Please try again.' });
  }
}
