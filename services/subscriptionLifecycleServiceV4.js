/**
 * Subscription Lifecycle Service V4
 * Tracks and derives subscription lifecycle states from DB records.
 * Node 14 / ESM safe: no ?. or ??
 * Never trusts client-supplied plan/price/billing cycle.
 */

import dbQuery from '../db/dbQuery';
import env from '../env';

const dbSchema = env.schema;

// ── Status derivation ──────────────────────────────────────────────────────────

/**
 * Given a companies_subscription row, derive the display-safe lifecycle status.
 * This is a derived/computed field — never stored in raw form to allow graceful
 * correction if DB data is off.
 */
function deriveLifecycleStatus(row) {
  if (!row) return 'unknown';

  var now = new Date();
  var subStatus = (row.sub_status || row.status || '').toLowerCase();
  var subscriptionId = row.subscription_id;
  var createdAt = row.created_at ? new Date(row.created_at) : null;
  var periodEnd = row.period_end ? new Date(row.period_end) : null;
  var billingCycle = (row.billing_cycle || 'monthly').toLowerCase();
  var isPaid = row.is_paid;

  // Free trial (subscription_id=1 or explicit trial status)
  if (subscriptionId === 1 || subStatus === 'trialing') {
    if (!createdAt) return 'trialing';
    var trialEnd = periodEnd || new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    var msLeft = trialEnd.getTime() - now.getTime();
    var daysLeft = msLeft / (1000 * 60 * 60 * 24);
    if (daysLeft <= 0) return 'trial_expired';
    if (daysLeft <= 2) return 'trial_ending';
    return 'trialing';
  }

  // Paid subscription
  if (isPaid) {
    if (!periodEnd) {
      // No period end recorded — treat as active (legacy row without lifecycle columns)
      return 'active';
    }
    var msRemain = periodEnd.getTime() - now.getTime();
    var daysRemain = msRemain / (1000 * 60 * 60 * 24);
    if (daysRemain < 0) {
      // Expired — check grace period
      var graceDays = 7;
      var graceCutoff = periodEnd.getTime() + graceDays * 24 * 60 * 60 * 1000;
      if (now.getTime() <= graceCutoff) return 'grace_period';
      return 'expired';
    }
    // Renewal due soon
    var warningDays = billingCycle === 'annual' ? 30 : 7;
    if (daysRemain <= warningDays) return 'renewal_due_soon';
    return 'active';
  }

  // Explicit status overrides
  if (subStatus === 'pending_payment') return 'pending_payment';
  if (subStatus === 'payment_failed') return 'payment_failed';
  if (subStatus === 'past_due') return 'past_due';
  if (subStatus === 'canceled' || subStatus === 'cancelled') return 'canceled';
  if (subStatus === 'expired') return 'expired';
  if (subStatus === 'reactivated') return 'active';

  return 'unknown';
}

/**
 * Get the latest subscription row for a company.
 * Returns the most recently created companies_subscription row.
 */
async function getLatestCompanySubscription(companyId) {
  var q = `
    SELECT cs.*, s.subscription_name, s.canonical_slug, s.price, s.annual_price,
           s.job_post, s.admin, s.video_response, s.with_customer_care, s.payment_occurence
    FROM ${dbSchema}.companies_subscription cs
    LEFT JOIN ${dbSchema}.subscription s ON s.subscription_id = cs.subscription_id
    WHERE cs.company_id = $1
    ORDER BY cs.created_at DESC
    LIMIT 1
  `;
  try {
    var res = await dbQuery.query(q, [companyId]);
    return (res.rows && res.rows.length > 0) ? res.rows[0] : null;
  } catch (err) {
    console.error('[subscriptionLifecycleV4] getLatestCompanySubscription error:', err && err.code);
    return null;
  }
}

/**
 * Full lifecycle summary for a company. Used by checkout return polling and notification triggering.
 */
async function getCompanyLifecycleSummary(companyId) {
  var row = await getLatestCompanySubscription(companyId);
  if (!row) {
    return {
      status: 'no_subscription_found',
      planSlug: null,
      billingCycle: null,
      periodStart: null,
      periodEnd: null,
      trialEndsAt: null,
      amountPaid: null,
      isPaid: false,
      subscriptionId: null,
    };
  }

  var status = deriveLifecycleStatus(row);
  var billingCycle = row.billing_cycle || 'monthly';
  var isFreeTrial = row.subscription_id === 1;
  var trialEndsAt = null;

  if (isFreeTrial && row.created_at) {
    var createdAt = new Date(row.created_at);
    var periodEnd = row.period_end ? new Date(row.period_end) : null;
    trialEndsAt = (periodEnd || new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)).toISOString();
  }

  return {
    status: status,
    planSlug: row.canonical_slug || row.plan_slug || null,
    billingCycle: billingCycle,
    periodStart: row.period_start ? new Date(row.period_start).toISOString() : null,
    periodEnd: row.period_end ? new Date(row.period_end).toISOString() : null,
    trialEndsAt: trialEndsAt,
    amountPaid: row.amount_paid || null,
    isPaid: row.is_paid || false,
    subscriptionId: row.subscription_id,
    subscriptionName: row.subscription_name,
  };
}

/**
 * Calculate period end date based on billing cycle.
 * Monthly = 30 days, Annual = 365 days (not 12 months, to avoid DST ambiguity).
 */
function calculatePeriodEnd(startDate, billingCycle) {
  var start = startDate ? new Date(startDate) : new Date();
  var days = billingCycle === 'annual' ? 365 : 30;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Activate subscription lifecycle columns after confirmed payment.
 * Called from the webhook handler after createCompanySubscription succeeds.
 * Uses company_id + subscription_id to scope the update — never trusts client.
 */
async function activateSubscriptionLifecycle(opts) {
  var companyId = opts.companyId;
  var subscriptionId = opts.subscriptionId;
  var billingCycle = opts.billingCycle || 'monthly';
  var amountPaid = opts.amountPaid || null;
  var providerReference = opts.providerReference || null;
  var planSlug = opts.planSlug || null;
  var now = new Date();
  var periodEnd = calculatePeriodEnd(now, billingCycle);

  var q = `
    UPDATE ${dbSchema}.companies_subscription
    SET billing_cycle      = $1,
        period_start       = $2,
        period_end         = $3,
        amount_paid        = $4,
        plan_slug          = $5,
        provider_reference = $6,
        sub_status         = 'active',
        payment_date       = $7,
        is_paid            = TRUE
    WHERE company_id = $8 AND subscription_id = $9
    ORDER BY created_at DESC
    LIMIT 1
  `;

  // PostgreSQL UPDATE doesn't support LIMIT directly in all versions.
  // Use a subquery approach for safety:
  var safeQ = `
    UPDATE ${dbSchema}.companies_subscription
    SET billing_cycle      = $1,
        period_start       = $2,
        period_end         = $3,
        amount_paid        = $4,
        plan_slug          = $5,
        provider_reference = $6,
        sub_status         = 'active',
        payment_date       = $7,
        is_paid            = TRUE
    WHERE (company_id, created_at) = (
      SELECT company_id, created_at
      FROM ${dbSchema}.companies_subscription
      WHERE company_id = $8 AND subscription_id = $9
      ORDER BY created_at DESC
      LIMIT 1
    )
  `;

  try {
    await dbQuery.query(safeQ, [
      billingCycle,
      now.toISOString(),
      periodEnd.toISOString(),
      amountPaid,
      planSlug,
      providerReference,
      now.toISOString(),
      companyId,
      subscriptionId,
    ]);

    // Log lifecycle event
    await logLifecycleEvent({
      companyId: companyId,
      subscriptionId: subscriptionId,
      planSlug: planSlug,
      billingCycle: billingCycle,
      eventType: 'subscription_activated',
      previousStatus: 'pending_payment',
      newStatus: 'active',
      amount: amountPaid,
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      providerReference: providerReference,
    });

    return { activated: true, periodEnd: periodEnd.toISOString() };
  } catch (err) {
    console.error('[subscriptionLifecycleV4] activateSubscriptionLifecycle error:', err && err.code);
    return { activated: false, error: err && err.code };
  }
}

/**
 * Log a lifecycle transition event.
 */
async function logLifecycleEvent(opts) {
  var q = `
    INSERT INTO ${dbSchema}.subscription_lifecycle_events
      (company_id, subscription_id, plan_slug, billing_cycle, event_type,
       previous_status, new_status, amount, period_start, period_end,
       provider_reference, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
  `;
  try {
    await dbQuery.query(q, [
      opts.companyId || null,
      opts.subscriptionId || null,
      opts.planSlug || null,
      opts.billingCycle || null,
      opts.eventType || 'unknown',
      opts.previousStatus || null,
      opts.newStatus || null,
      opts.amount || null,
      opts.periodStart || null,
      opts.periodEnd || null,
      opts.providerReference || null,
      opts.metadata ? JSON.stringify(opts.metadata) : null,
    ]);
  } catch (err) {
    // Non-blocking — lifecycle event logging must never break the payment flow
    if (err && err.code !== '42P01') {
      console.warn('[subscriptionLifecycleV4] logLifecycleEvent non-blocking error:', err.code);
    }
  }
}

/**
 * Mark a subscription as pending_payment (after checkout intent creation).
 */
async function markSubscriptionPending(companyId, cartId, billingCycle) {
  // Non-blocking — does not create the subscription row; only updates if one exists
  var q = `
    UPDATE ${dbSchema}.companies_subscription
    SET sub_status   = 'pending_payment',
        billing_cycle = $1
    WHERE (company_id, created_at) = (
      SELECT company_id, created_at
      FROM ${dbSchema}.companies_subscription
      WHERE company_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    )
  `;
  try {
    await dbQuery.query(q, [billingCycle || 'monthly', companyId]);
  } catch (err) {
    // Non-blocking
    console.warn('[subscriptionLifecycleV4] markSubscriptionPending non-blocking error:', err && err.code);
  }
}

export {
  deriveLifecycleStatus,
  getLatestCompanySubscription,
  getCompanyLifecycleSummary,
  calculatePeriodEnd,
  activateSubscriptionLifecycle,
  logLifecycleEvent,
  markSubscriptionPending,
};
