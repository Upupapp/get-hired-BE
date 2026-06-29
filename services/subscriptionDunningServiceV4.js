/**
 * Subscription Dunning Service V4
 * Calculates dunning state, overdue sequences, and grace period logic.
 * Node 14 / ESM safe: no ?. or ??
 *
 * NOTE: This system does not run autonomous cron jobs — GetHired does not
 * have a scheduler infrastructure yet. Dunning triggers are:
 * (a) On-demand when employer visits subscription page (observe mode)
 * (b) Webhook-triggered when payment events arrive
 * (c) Scheduled job backlog: GETHIRED_SUBSCRIPTION_GUARDRAILS_BACKLOG_V4.md
 *
 * The service calculates what dunning notifications SHOULD have been sent
 * and fires any missing ones in observe mode. This catches up if the system
 * was offline during a reminder window.
 */

import { getLatestCompanySubscription } from './subscriptionLifecycleServiceV4';
import { sendLifecycleNotification } from './subscriptionNotificationServiceV4';

// Grace period in days (default — annual grace period is a product decision/backlog)
var DEFAULT_GRACE_DAYS = 7;

/**
 * Calculate dunning state for a subscription row.
 * Returns what notifications should fire, if any.
 */
function calculateDunningState(row) {
  if (!row) return { state: 'no_subscription', notifications: [] };

  var now = new Date();
  var subscriptionId = row.subscription_id;
  var isPaid = row.is_paid;
  var billingCycle = (row.billing_cycle || 'monthly').toLowerCase();
  var periodEnd = row.period_end ? new Date(row.period_end) : null;
  var createdAt = row.created_at ? new Date(row.created_at) : null;

  // Free trial
  if (subscriptionId === 1) {
    if (!createdAt) return { state: 'trial_no_date', notifications: [] };
    var trialEnd = periodEnd || new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    var trialMsLeft = trialEnd.getTime() - now.getTime();
    var trialDaysLeft = trialMsLeft / (1000 * 60 * 60 * 24);

    if (trialDaysLeft <= 0) return { state: 'trial_expired', notifications: ['trial_expired'] };
    if (trialDaysLeft <= 1) return { state: 'trial_ending_1d', notifications: ['trial_ending_1d'] };
    if (trialDaysLeft <= 2) return { state: 'trial_ending_2d', notifications: ['trial_ending_2d'] };
    return { state: 'trialing', notifications: [] };
  }

  // Paid subscription — check period
  if (!periodEnd) {
    return { state: 'active_no_period', notifications: [] };
  }

  var msLeft = periodEnd.getTime() - now.getTime();
  var daysLeft = msLeft / (1000 * 60 * 60 * 24);

  if (daysLeft > 0) {
    // Still within period — check renewal warnings
    if (billingCycle === 'annual') {
      if (daysLeft <= 7) return { state: 'annual_renewal_7d', notifications: ['annual_renewal_due_soon'] };
      if (daysLeft <= 14) return { state: 'annual_renewal_14d', notifications: ['annual_renewal_due_soon'] };
      if (daysLeft <= 30) return { state: 'annual_renewal_30d', notifications: ['annual_renewal_due_soon'] };
    } else {
      if (daysLeft <= 3) return { state: 'monthly_renewal_3d', notifications: ['monthly_renewal_due_soon'] };
      if (daysLeft <= 7) return { state: 'monthly_renewal_7d', notifications: ['monthly_renewal_due_soon'] };
    }
    return { state: 'active', notifications: [] };
  }

  // Past period end — overdue / grace
  var daysOverdue = Math.abs(daysLeft);

  if (!isPaid || row.sub_status === 'payment_failed' || row.sub_status === 'past_due') {
    // Dunning sequence based on days overdue
    if (daysOverdue >= DEFAULT_GRACE_DAYS) {
      return { state: 'grace_ended', notifications: ['subscription_expired'] };
    }
    if (daysOverdue >= 5) {
      return { state: 'overdue_5d', notifications: ['payment_overdue_5d', 'payment_grace_final'] };
    }
    if (daysOverdue >= 3) {
      return { state: 'overdue_3d', notifications: ['payment_overdue_3d'] };
    }
    if (daysOverdue >= 1) {
      return { state: 'overdue_1d', notifications: ['payment_overdue_1d'] };
    }
    return { state: 'payment_due', notifications: ['payment_failed'] };
  }

  // Paid but period expired — needs renewal
  return { state: 'renewal_due', notifications: [billingCycle === 'annual' ? 'annual_renewal_due_today' : 'monthly_renewal_due_today'] };
}

/**
 * Run dunning check for a company.
 * Fires any due notifications (dedupe prevents duplicates).
 * Non-blocking — never throws.
 */
async function runDunningCheckForCompany(companyId, opts) {
  try {
    var row = await getLatestCompanySubscription(companyId);
    if (!row) return { checked: false, reason: 'no_subscription' };

    var dunning = calculateDunningState(row);
    var notifications = dunning.notifications || [];

    if (notifications.length === 0) {
      return { checked: true, state: dunning.state, notificationsSent: 0 };
    }

    var billingCycle = (row.billing_cycle || 'monthly').toLowerCase();
    var planSlug = row.canonical_slug || row.plan_slug || null;
    var periodEnd = row.period_end || null;
    var amountPaid = row.amount_paid || null;
    var planName = row.subscription_name || planSlug || '';

    var sent = 0;
    for (var i = 0; i < notifications.length; i++) {
      var result = await sendLifecycleNotification({
        companyId: companyId,
        subscriptionId: row.subscription_id,
        notificationType: notifications[i],
        billingCycle: billingCycle,
        planSlug: planSlug,
        planName: planName,
        periodEnd: periodEnd,
        amountPaid: amountPaid,
        recipientUid: (opts && opts.recipientUid) || null,
      });
      if (result && result.sent) sent++;
    }

    return { checked: true, state: dunning.state, notificationsSent: sent };
  } catch (err) {
    console.warn('[subscriptionDunningV4] runDunningCheck error:', err && err.code);
    return { checked: false, reason: 'error' };
  }
}

/**
 * Grace period end date calculation.
 */
function calculateGracePeriodEnd(periodEnd, billingCycle) {
  var end = periodEnd ? new Date(periodEnd) : new Date();
  var graceDays = DEFAULT_GRACE_DAYS;
  return new Date(end.getTime() + graceDays * 24 * 60 * 60 * 1000);
}

/**
 * Is company in grace period?
 */
function isInGracePeriod(row) {
  if (!row || !row.period_end) return false;
  var now = new Date();
  var periodEnd = new Date(row.period_end);
  if (now.getTime() <= periodEnd.getTime()) return false;
  var graceCutoff = calculateGracePeriodEnd(row.period_end, row.billing_cycle);
  return now.getTime() <= graceCutoff.getTime();
}

export { calculateDunningState, runDunningCheckForCompany, calculateGracePeriodEnd, isInGracePeriod };
