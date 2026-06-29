/**
 * Subscription Lifecycle Controller V4
 * Endpoints for billing status, checkout return polling, and notification management.
 * Node 14 / ESM safe: no ?. or ??
 *
 * Security: All endpoints are BOLA-safe — company resolved from JWT, never client.
 */

import { getUserCompanyForRequest } from './companiesController';
import { getCompanyLifecycleSummary } from '../services/subscriptionLifecycleServiceV4';
import { runDunningCheckForCompany } from '../services/subscriptionDunningServiceV4';
import { getUnreadNotifications, markNotificationRead } from '../services/subscriptionNotificationServiceV4';
import env from '../env';
import dbQuery from '../db/dbQuery';

const dbSchema = env.schema;

// ── GET /api/subscriptions/lifecycle/status ─────────────────────────────────
// Returns derived lifecycle state for the authenticated employer's company.
// Safe for checkout return page polling — never activates subscription from here.
export async function getLifecycleStatus(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    var companyId = company.companyId;
    var summary = await getCompanyLifecycleSummary(companyId);

    return res.status(200).json({
      success: true,
      lifecycle: {
        status: summary.status,
        planSlug: summary.planSlug,
        billingCycle: summary.billingCycle,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        trialEndsAt: summary.trialEndsAt,
        amountPaid: summary.amountPaid,
        isPaid: summary.isPaid,
        subscriptionId: summary.subscriptionId,
        subscriptionName: summary.subscriptionName,
        // Checkout return copy — billing cycle specific
        statusCopy: buildStatusCopy(summary),
      },
    });
  } catch (err) {
    console.error('[subscriptionLifecycleV4] getLifecycleStatus error:', err && err.message && err.message.substring(0, 80));
    return res.status(500).json({ success: false, message: 'We couldn\'t load your subscription status. Please try again.' });
  }
}

// ── GET /api/subscriptions/checkout-intent/:id/status (enhanced from Command 1) ──
// Polls for payment confirmation on a specific checkout intent.
// Safe for checkout return page — uses server-side payment records.
export async function getCheckoutReturnStatus(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    var companyId = company.companyId;
    var intentId = req.params.id;

    if (!intentId) return res.status(400).json({ message: 'Intent ID required.' });

    // Look up cart record (BOLA: WHERE company_id = $2)
    var cartQ = `
      SELECT cart_id, company_id, subscription_id, billing_cycle, status, transaction_id, created_at
      FROM ${dbSchema}.cart_table
      WHERE cart_id = $1 AND company_id = $2
      LIMIT 1
    `;
    var cartRes = await dbQuery.query(cartQ, [intentId, companyId]);
    if (!cartRes.rows || cartRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Checkout intent not found.' });
    }

    var cart = cartRes.rows[0];
    var cartStatus = (cart.status || '').toLowerCase();
    var billingCycle = (cart.billing_cycle || 'monthly').toLowerCase();
    var isAnnual = billingCycle === 'annual';

    // Map cart status to checkout return state
    var returnStatus = 'checking_payment';
    var userMessage = 'Checking payment status…';

    if (cartStatus === 'paid') {
      returnStatus = 'payment_success_confirmed';
      userMessage = isAnnual
        ? 'Payment confirmed. Your annual GetHired subscription is active for 12 months.'
        : 'Payment confirmed. Your monthly GetHired subscription is active.';
    } else if (cartStatus === 'failed') {
      returnStatus = 'payment_failed';
      userMessage = 'Your payment did not go through. Please try again or use a different payment method.';
    } else if (cartStatus === 'expired') {
      returnStatus = 'payment_expired';
      userMessage = 'Your payment link has expired. Generate a new link to complete your subscription.';
    } else if (cartStatus === 'pending' || cartStatus === '') {
      returnStatus = 'payment_pending';
      userMessage = isAnnual
        ? 'Your annual payment is pending. We\'ll activate your 12-month access once payment is confirmed.'
        : 'Your monthly payment is pending. We\'ll update your subscription once payment is confirmed.';
    } else {
      returnStatus = 'payment_unknown_retry';
      userMessage = 'We couldn\'t determine your payment status. Please wait a moment and check again.';
    }

    return res.status(200).json({
      success: true,
      checkoutIntentId: intentId,
      returnStatus: returnStatus,
      billingCycle: billingCycle,
      userMessage: userMessage,
      // For confirmed success, also return lifecycle summary
      lifecycle: returnStatus === 'payment_success_confirmed'
        ? await getCompanyLifecycleSummary(companyId)
        : null,
    });
  } catch (err) {
    console.error('[subscriptionLifecycleV4] getCheckoutReturnStatus error:', err && err.message && err.message.substring(0, 80));
    return res.status(500).json({ success: false, message: 'We couldn\'t check your payment status. Please try again.' });
  }
}

// ── GET /api/subscriptions/notifications ────────────────────────────────────
export async function getSubscriptionNotifications(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    var notifications = await getUnreadNotifications(company.companyId);
    return res.status(200).json({ success: true, notifications: notifications });
  } catch (err) {
    return res.status(500).json({ success: false, notifications: [] });
  }
}

// ── POST /api/subscriptions/notifications/:id/read ──────────────────────────
export async function markNotificationAsRead(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    var notifId = parseInt(req.params.id, 10);
    if (!notifId) return res.status(400).json({ message: 'Notification ID required.' });

    var result = await markNotificationRead(notifId, company.companyId);
    return res.status(200).json({ success: result.updated });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
}

// ── POST /api/subscriptions/dunning/check ───────────────────────────────────
// Trigger a dunning check for the authenticated employer (runs on subscription page visit).
export async function triggerDunningCheck(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    var result = await runDunningCheckForCompany(company.companyId, { recipientUid: uid });
    return res.status(200).json({ success: true, dunning: result });
  } catch (err) {
    return res.status(200).json({ success: false }); // Non-blocking — always 200
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildStatusCopy(summary) {
  var status = summary.status;
  var isAnnual = summary.billingCycle === 'annual';
  var copies = {
    trialing: 'Your free trial is active.',
    trial_ending: 'Your free trial ends soon. Upgrade to keep hiring without interruption.',
    trial_expired: 'Your free trial has ended. Choose a plan to continue publishing jobs.',
    active: 'Your subscription is active.',
    renewal_due_soon: isAnnual
      ? 'Your annual GetHired subscription renews soon. Review your plan anytime.'
      : 'Your monthly GetHired subscription renews soon. Review your plan anytime.',
    pending_payment: isAnnual
      ? 'Your annual payment is pending. We\'ll activate your 12-month access once payment is confirmed.'
      : 'Your monthly payment is pending. We\'ll update your subscription once payment is confirmed.',
    payment_failed: 'Your payment did not go through. Please update your payment method.',
    past_due: 'Your subscription payment is overdue. Please settle your payment to avoid limits on new hiring activity.',
    grace_period: 'You\'re in a grace period. Settle your payment to keep publishing jobs.',
    expired: 'Your subscription has expired. Renew or choose a plan to continue publishing jobs.',
    canceled: 'Your subscription has been canceled. Reactivate to resume hiring.',
    no_subscription_found: 'No active subscription found.',
    unknown: 'We couldn\'t determine your subscription status.',
  };
  return copies[status] || copies.unknown;
}
