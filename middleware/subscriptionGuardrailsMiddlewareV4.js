/**
 * Subscription Guardrails Middleware V4
 * Provides (plan-limit refusals live in services/planLimitGuard.js, the one 402 emitter):
 * - validateCheckoutIntent: validates plan/billing-cycle, computes server-side price
 * - billingCycleDisclosure: ensures disclosure metadata on checkout responses
 *
 * Node 14 / ESM safe: no ?. or ??
 */

import { getUserCompanyForRequest } from '../controllers/companiesController';
import { getPlanBySlug, isValidPlanSlug, isValidBillingCycle, getAmountForCheckout, getAmountInCentavos, getBillingCycleMeta, getPlanByDbId } from '../services/planCatalogServiceV4';
import { logCheckoutIntent, logValidationRejection } from '../services/subscriptionAuditLogServiceV4';
import idGenerator from '../helpers/randomNumberForId';

// ── Checkout intent validation middleware ─────────────────────────────────────
/**
 * Validates plan slug + billing cycle, computes server-side price.
 * Attaches checkoutContext to req.
 */
export async function validateCheckoutIntent(req, res, next) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    var companyId = company.companyId;
    var body = req.body || {};

    // Validate plan slug
    var planSlug = body.planSlug;
    if (!planSlug || !isValidPlanSlug(planSlug)) {
      logValidationRejection({ companyId: companyId, actorId: uid, reasonCode: 'pricing_plan_invalid', route: req.path });
      return res.status(422).json({
        allowed: false,
        reasonCode: 'pricing_plan_invalid',
        userMessage: 'Invalid plan selection. Please choose a valid plan.',
      });
    }

    // Validate billing cycle
    var billingCycle = body.billingCycle;
    if (!billingCycle || !isValidBillingCycle(billingCycle)) {
      logValidationRejection({ companyId: companyId, actorId: uid, reasonCode: 'billing_cycle_invalid', route: req.path });
      return res.status(422).json({
        allowed: false,
        reasonCode: 'billing_cycle_invalid',
        userMessage: 'Invalid billing cycle. Please choose monthly or annual.',
      });
    }

    // Never trust client-supplied price
    var plan = getPlanBySlug(planSlug);
    var amountPHP = getAmountForCheckout(planSlug, billingCycle);
    var amountCentavos = getAmountInCentavos(planSlug, billingCycle);

    if (amountPHP === null || amountCentavos === null) {
      logValidationRejection({ companyId: companyId, actorId: uid, reasonCode: 'pricing_plan_invalid', route: req.path });
      return res.status(422).json({
        allowed: false,
        reasonCode: 'pricing_plan_invalid',
        userMessage: 'Could not resolve plan pricing. Please try again.',
      });
    }

    var cycleMeta = getBillingCycleMeta(billingCycle);
    var idempotencyKey = idGenerator(8, 'CKI');

    // Attach context for controller
    req.checkoutContext = {
      companyId: companyId,
      actorId: uid,
      planSlug: planSlug,
      billingCycle: billingCycle,
      plan: plan,
      amountPHP: amountPHP,
      amountCentavos: amountCentavos,
      cycleMeta: cycleMeta,
      idempotencyKey: idempotencyKey,
      dbSubscriptionId: plan.dbSubscriptionId,
    };

    next();
  } catch (err) {
    console.error('[validateCheckoutIntent] error:', err && err.message);
    return res.status(500).json({ message: 'Checkout validation error. Please try again.' });
  }
}

// ── Billing cycle disclosure middleware ───────────────────────────────────────
/**
 * Wraps checkout response to ensure disclosure metadata is present.
 * Attaches billingCycleDisclosure builder to req.
 */
export function billingCycleDisclosure(req, res, next) {
  req.buildBillingCycleDisclosure = function(checkoutUrl, checkoutIntentId) {
    var ctx = req.checkoutContext;
    if (!ctx) return {};
    var isAnnual = ctx.billingCycle === 'annual';
    return {
      selectedPlanSlug: ctx.planSlug,
      selectedBillingCycle: ctx.billingCycle,
      displayPrice: isAnnual
        ? 'PHP ' + (ctx.plan && ctx.plan.effectiveMonthlyPHP ? ctx.plan.effectiveMonthlyPHP.toLocaleString() : '') + '/mo effective'
        : 'PHP ' + (ctx.amountPHP ? ctx.amountPHP.toLocaleString() : '') + '/month',
      amountDueToday: ctx.amountPHP,
      dueTodayLabel: isAnnual
        ? 'Billed today: PHP ' + (ctx.amountPHP ? ctx.amountPHP.toLocaleString() : '') + ' for 12 months.'
        : 'Billed monthly: PHP ' + (ctx.amountPHP ? ctx.amountPHP.toLocaleString() : '') + '/month.',
      renewalLabel: (ctx.cycleMeta && ctx.cycleMeta.renewalLabel) || '',
      effectiveMonthlyPrice: isAnnual ? ((ctx.plan && ctx.plan.effectiveMonthlyPHP) || null) : null,
      annualSavingsAmount: isAnnual ? ((ctx.plan && ctx.plan.annualSavingsPHP) || null) : null,
      savingsCopy: isAnnual ? 'Save 2 months with annual billing' : null,
      copyKey: 'billing_cycle_' + ctx.billingCycle,
      disclosureVersion: 'v4',
      checkoutUrl: checkoutUrl || null,
      checkoutIntentId: checkoutIntentId || null,
    };
  };
  next();
}
