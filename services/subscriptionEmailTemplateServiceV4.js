/**
 * Subscription Email Template Service V4
 * Centralizes lifecycle email template keys and variable builders.
 * Node 14 / ESM safe: no ?. or ??
 *
 * Template IDs are managed in helpers/mailer.js > gethiredSendgrid map.
 * Subscription templates are added as subscription_* keys.
 * Mark as null until SendGrid templates are created — mailer.send() skips null templates.
 *
 * COPY RULES:
 * - Annual emails must show full annual amount. Effective monthly is supporting copy only.
 * - Monthly emails must show monthly recurring amount.
 * - Never show fake urgency, fake scarcity, or threats.
 * - Tone: calm, professional, helpful, direct, reassuring.
 */

// ── Template key registry ──────────────────────────────────────────────────────
// Map keys (notification_type) to SendGrid template keys (in gethiredSendgrid map).
// These must be added to helpers/mailer.js > gethiredSendgrid map with real template IDs.
var TEMPLATE_KEYS = {
  trial_started:              'subscription_trial_started',
  trial_ending_2d:            'subscription_trial_ending',
  trial_ending_1d:            'subscription_trial_ending',
  trial_ends_today:           'subscription_trial_ending',
  trial_expired:              'subscription_trial_expired',
  monthly_renewal_due_soon:   'subscription_renewal_reminder',
  annual_renewal_due_soon:    'subscription_renewal_reminder',
  monthly_renewal_due_today:  'subscription_renewal_reminder',
  annual_renewal_due_today:   'subscription_renewal_reminder',
  payment_pending:            'subscription_payment_pending',
  payment_pending_24h:        'subscription_payment_pending',
  payment_link_expired:       'subscription_payment_link_expired',
  payment_failed:             'subscription_payment_failed',
  payment_overdue_1d:         'subscription_payment_overdue',
  payment_overdue_3d:         'subscription_payment_overdue',
  payment_overdue_5d:         'subscription_payment_overdue',
  payment_grace_final:        'subscription_payment_grace_final',
  payment_success:            'subscription_payment_success',
  subscription_reactivated:   'subscription_reactivated',
  subscription_expired:       'subscription_expired',
};

// ── Annual billing copy rules ─────────────────────────────────────────────────
function buildAnnualDueTodayLabel(planSlug) {
  var amounts = { starter: '₱14,900', growth: '₱34,900', business: '₱69,900' };
  var label = amounts[planSlug] || 'annual amount';
  return 'Billed today: ' + label + ' for 12 months.';
}

function buildEffectiveMonthlyLabel(planSlug) {
  var rates = { starter: '₱1,242/month', growth: '₱2,908/month', business: '₱5,825/month' };
  return 'Equivalent to ' + (rates[planSlug] || 'effective monthly rate') + '.';
}

function buildMonthlyLabel(planSlug) {
  var rates = { starter: '₱1,490/month', growth: '₱3,490/month', business: '₱6,990/month' };
  return rates[planSlug] || 'monthly subscription';
}

// ── Variable builders by notification type ────────────────────────────────────

function buildEmailVars(notificationType, opts) {
  var companyName = opts.companyName || 'your company';
  var recipientName = opts.recipientName || '';
  var planName = opts.planName || 'GetHired';
  var planSlug = opts.planSlug || '';
  var billingCycle = opts.billingCycle || 'monthly';
  var isAnnual = billingCycle === 'annual';
  var periodEnd = opts.periodEnd || null;
  var amountPaid = opts.amountPaid || null;
  var supportEmail = opts.supportEmail || 'support@gethired.ph';
  var appUrl = opts.appUrl || 'https://gethired.ph';
  var subscriptionUrl = appUrl + '/recruiter/subscription';
  var upgradeUrl = appUrl + '/recruiter/subscription/upgrade/' + (planSlug || 'growth');

  var base = {
    recipient_name: recipientName,
    company_name: companyName,
    plan_name: planName,
    billing_cycle: billingCycle,
    is_annual: isAnnual,
    support_email: supportEmail,
    subscription_url: subscriptionUrl,
    upgrade_url: upgradeUrl,
    app_url: appUrl,
    data_preservation: 'Your existing jobs, applicants, messages, and company page are still available.',
  };

  // Annual-specific fields — always disclose full amount due today
  if (isAnnual && amountPaid) {
    base.amount_due_today = '₱' + Number(amountPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    base.amount_due_today_label = buildAnnualDueTodayLabel(planSlug);
    base.effective_monthly_label = buildEffectiveMonthlyLabel(planSlug);
    base.billing_summary = base.amount_due_today_label + ' ' + base.effective_monthly_label;
    base.renewal_label = 'Annual renewal';
  } else if (!isAnnual) {
    base.amount_due_today = buildMonthlyLabel(planSlug);
    base.billing_summary = base.amount_due_today + ', paid monthly.';
    base.renewal_label = 'Monthly renewal';
    base.effective_monthly_label = null;
  }

  if (periodEnd) {
    var d = new Date(periodEnd);
    base.period_end_label = d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    base.period_end_iso = d.toISOString().split('T')[0];
  }

  // Type-specific overrides
  switch (notificationType) {
    case 'trial_started':
      base.email_subject = 'Your GetHired free trial has started';
      base.email_headline = 'Welcome to your 7-day free trial';
      base.email_body = 'Your free trial is active. Explore GetHired and start building your employer profile.';
      base.cta_label = 'Go to dashboard';
      base.cta_url = appUrl + '/recruiter/dashboard';
      break;

    case 'trial_ending_2d':
    case 'trial_ending_1d':
    case 'trial_ends_today':
      var daysLabel = notificationType === 'trial_ends_today' ? 'today' : (notificationType === 'trial_ending_1d' ? 'tomorrow' : 'in 2 days');
      base.email_subject = 'Your GetHired free trial ends ' + daysLabel;
      base.email_headline = 'Your free trial ends ' + daysLabel;
      base.email_body = 'Upgrade now to keep your job posts active and continue hiring without interruption. Your trial data is preserved.';
      base.cta_label = 'Upgrade plan';
      base.cta_url = upgradeUrl;
      break;

    case 'trial_expired':
      base.email_subject = 'Your GetHired free trial has ended';
      base.email_headline = 'Your free trial has ended';
      base.email_body = 'Your active job posts are paused. Choose a plan to resume hiring. Your applicants, messages, and company page are all still here.';
      base.cta_label = 'Choose a plan';
      base.cta_url = subscriptionUrl;
      break;

    case 'monthly_renewal_due_soon':
      base.email_subject = 'Your GetHired subscription renews soon';
      base.email_headline = 'Subscription renewal reminder';
      base.email_body = 'Your monthly GetHired subscription renews on ' + (base.period_end_label || 'the renewal date') + '. No action needed if your payment method is up to date.';
      base.cta_label = 'Review plan';
      base.cta_url = subscriptionUrl;
      break;

    case 'annual_renewal_due_soon':
      base.email_subject = 'Your annual GetHired subscription renews soon';
      base.email_headline = 'Annual subscription renewal reminder';
      base.email_body = 'Your annual GetHired subscription renews on ' + (base.period_end_label || 'the renewal date') + '. ' + (base.amount_due_today_label || '') + ' No action needed if your payment method is up to date.';
      base.cta_label = 'Review plan';
      base.cta_url = subscriptionUrl;
      break;

    case 'payment_pending':
    case 'payment_pending_24h':
      base.email_subject = isAnnual ? 'Your annual GetHired payment is pending' : 'Your GetHired payment is pending';
      base.email_headline = 'Payment pending';
      base.email_body = isAnnual
        ? 'Your annual payment is pending. We\'ll activate your 12-month GetHired access once payment is confirmed. ' + (base.billing_summary || '')
        : 'Your monthly payment is pending. We\'ll update your subscription once payment is confirmed.';
      base.cta_label = 'Check payment status';
      base.cta_url = subscriptionUrl;
      break;

    case 'payment_link_expired':
      base.email_subject = 'Your GetHired payment link has expired';
      base.email_headline = 'Payment link expired';
      base.email_body = 'Your payment link has expired. Generate a new link to complete your subscription.';
      base.cta_label = 'Generate new payment link';
      base.cta_url = subscriptionUrl;
      break;

    case 'payment_failed':
      base.email_subject = 'Action needed: your GetHired payment did not go through';
      base.email_headline = 'Payment unsuccessful';
      base.email_body = 'Your payment did not go through. Please update your payment method to keep your subscription active. Your existing jobs and applicants are still available.';
      base.cta_label = 'Update payment method';
      base.cta_url = subscriptionUrl;
      break;

    case 'payment_overdue_1d':
    case 'payment_overdue_3d':
    case 'payment_overdue_5d':
      base.email_subject = 'Your GetHired payment is overdue';
      base.email_headline = 'Payment overdue';
      base.email_body = 'Your subscription payment is overdue. Please settle your payment to avoid limits on new hiring activity. Your existing jobs, applicants, messages, and company page are still available.';
      base.cta_label = 'Settle payment';
      base.cta_url = subscriptionUrl;
      break;

    case 'payment_grace_final':
      base.email_subject = 'Final notice: your GetHired subscription grace period is ending';
      base.email_headline = 'Grace period ending';
      base.email_body = 'This is your final reminder to settle your payment. Once your grace period ends, limits on new hiring activity may apply. Your data remains safe.';
      base.cta_label = 'Renew now';
      base.cta_url = subscriptionUrl;
      break;

    case 'payment_success':
      base.email_subject = isAnnual ? 'Payment confirmed — your annual GetHired subscription is active' : 'Payment confirmed — your GetHired subscription is active';
      base.email_headline = 'Payment confirmed';
      base.email_body = isAnnual
        ? 'Payment confirmed. Your annual GetHired subscription is active for 12 months. ' + (base.billing_summary || '')
        : 'Payment confirmed. Your monthly GetHired subscription is active.';
      base.cta_label = 'Go to dashboard';
      base.cta_url = appUrl + '/recruiter/dashboard';
      break;

    case 'subscription_reactivated':
      base.email_subject = 'Your GetHired subscription is active again';
      base.email_headline = 'Subscription reactivated';
      base.email_body = 'Great news — your payment was confirmed and your GetHired subscription is active again. Your jobs, applicants, and company page are all restored.';
      base.cta_label = 'Go to dashboard';
      base.cta_url = appUrl + '/recruiter/dashboard';
      break;

    case 'subscription_expired':
      base.email_subject = 'Your GetHired subscription has expired';
      base.email_headline = 'Subscription expired';
      base.email_body = 'Your GetHired subscription has expired. Renew or choose a plan to continue publishing jobs. Your data is safely preserved.';
      base.cta_label = 'Renew plan';
      base.cta_url = subscriptionUrl;
      break;

    default:
      base.email_subject = 'GetHired subscription update';
      base.email_headline = 'Subscription update';
      base.email_body = 'There has been a change to your GetHired subscription. Visit your subscription page for details.';
      base.cta_label = 'View subscription';
      base.cta_url = subscriptionUrl;
  }

  return base;
}

function getTemplateKey(notificationType) {
  return TEMPLATE_KEYS[notificationType] || null;
}

export { buildEmailVars, getTemplateKey, TEMPLATE_KEYS, buildAnnualDueTodayLabel, buildMonthlyLabel };
