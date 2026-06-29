/**
 * SubscriptionAuditLogService V4
 * Structured audit logging for subscription decisions, limit checks, checkout intents.
 * Non-blocking — errors are swallowed; never fails a request.
 * Node 14 / ESM safe: no ?. or ??
 */

export function logSubscriptionDecision(decision) {
  if (!decision || !decision.audit || !decision.audit.shouldLog) return;

  var entry = {
    ts: new Date().toISOString(),
    companyId: decision.companyId || null,
    actorId: decision.actorId || null,
    action: decision.action || null,
    entitlementKey: (decision.entitlement && decision.entitlement.key) || null,
    planSlug: (decision.plan && decision.plan.slug) || null,
    billingCycle: (decision.plan && decision.plan.billingCycle) || null,
    used: (decision.entitlement && decision.entitlement.used) || null,
    limit: (decision.entitlement && decision.entitlement.limit) || null,
    mode: decision.mode || null,
    allowed: decision.allowed,
    reasonCode: decision.reasonCode || null,
    wouldHaveBlocked: (decision.audit && decision.audit.wouldHaveBlocked) || false,
  };

  try {
    console.log('[subscriptionAudit]', JSON.stringify(entry));
  } catch (err) {
    // swallow — audit logging must never crash a request
  }
}

export function logCheckoutIntent(opts) {
  var entry = {
    ts: new Date().toISOString(),
    companyId: opts.companyId || null,
    actorId: opts.actorId || null,
    action: 'checkout_intent',
    planSlug: opts.planSlug || null,
    billingCycle: opts.billingCycle || null,
    amountPHP: opts.amountPHP || null,
    checkoutIntentId: opts.checkoutIntentId || null,
    idempotencyKey: opts.idempotencyKey || null,
    reasonCode: opts.reasonCode || null,
    disclosureVersion: opts.disclosureVersion || 'v4',
  };

  try {
    console.log('[subscriptionAudit:checkout]', JSON.stringify(entry));
  } catch (err) {
    // swallow
  }
}

export function logValidationRejection(opts) {
  var entry = {
    ts: new Date().toISOString(),
    companyId: opts.companyId || null,
    actorId: opts.actorId || null,
    action: 'validation_rejection',
    rejectionReason: opts.reasonCode || null,
    route: opts.route || null,
    // Never log: tokens, secrets, CV contents, applicant PII
  };

  try {
    console.log('[subscriptionAudit:rejection]', JSON.stringify(entry));
  } catch (err) {
    // swallow
  }
}
