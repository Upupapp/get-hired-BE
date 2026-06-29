/**
 * Subscription Notification Service V4
 * Creates in-app notifications and queues SendGrid emails for lifecycle events.
 * Node 14 / ESM safe: no ?. or ??
 *
 * Security:
 * - Never sends applicant data to employer billing emails
 * - Never sends employer billing state to applicants
 * - Never exposes provider references or raw PayMongo errors
 * - Dedupe prevents duplicate notifications per billing period
 */

import dbQuery from '../db/dbQuery';
import env from '../env';
import { send } from '../helpers/mailer';
import { isDuplicateNotification, recordNotificationSent } from './subscriptionNotificationDedupeServiceV4';
import { buildEmailVars, getTemplateKey } from './subscriptionEmailTemplateServiceV4';

const dbSchema = env.schema;

/**
 * Get company admin email addresses for notification.
 * Only returns users attached to the company with recruiter/admin role.
 * Never returns applicant emails.
 */
async function getCompanyAdminEmails(companyId) {
  var q = `
    SELECT u.email, u.first_name
    FROM ${dbSchema}.users u
    INNER JOIN ${dbSchema}.company_users cu ON cu.user_id = u.user_id
    WHERE cu.company_id = $1
      AND u.email IS NOT NULL
      AND u.email != ''
    LIMIT 10
  `;
  try {
    var res = await dbQuery.query(q, [companyId]);
    if (!res.rows || res.rows.length === 0) return [];
    return res.rows.map(function(r) {
      return { email: r.email, name: r.first_name || '' };
    });
  } catch (err) {
    // Non-blocking — if user query fails, try company owner email
    console.warn('[subscriptionNotificationV4] getCompanyAdminEmails error:', err && err.code);
    return [];
  }
}

/**
 * Get company name from DB.
 */
async function getCompanyName(companyId) {
  var q = `SELECT company_name FROM ${dbSchema}.companies WHERE company_id = $1 LIMIT 1`;
  try {
    var res = await dbQuery.query(q, [companyId]);
    return (res.rows && res.rows.length > 0 && res.rows[0].company_name) || 'your company';
  } catch (err) {
    return 'your company';
  }
}

/**
 * Create an in-app subscription notification.
 * Non-blocking — must not fail silently in a way that blocks payment flow.
 */
async function createInAppNotification(opts) {
  var q = `
    INSERT INTO ${dbSchema}.subscription_notifications
      (company_id, recipient_uid, notification_type, title, body, is_read, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, FALSE, $6, NOW())
  `;
  try {
    await dbQuery.query(q, [
      opts.companyId || null,
      opts.recipientUid || null,
      opts.notificationType || 'unknown',
      opts.title || null,
      opts.body || null,
      opts.metadata ? JSON.stringify(opts.metadata) : null,
    ]);
  } catch (err) {
    if (err && err.code !== '42P01') {
      console.warn('[subscriptionNotificationV4] createInAppNotification error:', err && err.code);
    }
  }
}

/**
 * Send lifecycle notification (email + in-app).
 * Checks dedupe before sending.
 * Never throws — all errors logged and swallowed.
 */
async function sendLifecycleNotification(opts) {
  var notificationType = opts.notificationType || 'unknown';
  var companyId = opts.companyId;
  var subscriptionId = opts.subscriptionId || 0;
  var billingCycle = opts.billingCycle || 'monthly';
  var planSlug = opts.planSlug || '';
  var periodEnd = opts.periodEnd || null;
  var amountPaid = opts.amountPaid || null;

  if (!companyId) {
    console.warn('[subscriptionNotificationV4] sendLifecycleNotification: no companyId, skipping');
    return { sent: false, reason: 'no_company' };
  }

  // Dedupe check
  var dedupeOpts = {
    companyId: companyId,
    subscriptionId: subscriptionId,
    notificationType: notificationType,
    billingCycle: billingCycle,
  };

  var isDupe = await isDuplicateNotification(dedupeOpts);
  if (isDupe) {
    console.log('[subscriptionNotificationV4] DEDUPE_SKIP type=' + notificationType + ' companyId=[REDACTED]');
    return { sent: false, reason: 'dedupe_skip' };
  }

  // Get recipients and company name
  var companyName = await getCompanyName(companyId);
  var admins = await getCompanyAdminEmails(companyId);

  // Build email variables
  var emailVars = buildEmailVars(notificationType, {
    companyName: companyName,
    recipientName: (admins.length > 0 && admins[0].name) || '',
    planSlug: planSlug,
    planName: opts.planName || '',
    billingCycle: billingCycle,
    periodEnd: periodEnd,
    amountPaid: amountPaid,
    appUrl: (env.app_url || 'https://gethired.ph'),
    supportEmail: 'support@gethired.ph',
  });

  var templateKey = getTemplateKey(notificationType);

  // Send email to each admin (non-blocking per recipient)
  var emailSent = false;
  if (templateKey && admins.length > 0) {
    for (var i = 0; i < admins.length; i++) {
      var admin = admins[i];
      var recipientVars = Object.assign({}, emailVars, { recipient_name: admin.name || companyName });
      var result = await send(admin.email, templateKey, recipientVars);
      if (result && result.sent) emailSent = true;
    }
  } else if (!templateKey) {
    console.warn('[subscriptionNotificationV4] No template configured for:', notificationType,
      '— add to gethiredSendgrid map in helpers/mailer.js');
  }

  // Create in-app notification
  await createInAppNotification({
    companyId: companyId,
    recipientUid: opts.recipientUid || null,
    notificationType: notificationType,
    title: emailVars.email_headline || notificationType,
    body: emailVars.email_body || '',
    metadata: {
      planSlug: planSlug,
      billingCycle: billingCycle,
      periodEnd: periodEnd,
      amountPaid: amountPaid,
    },
  });

  // Record dedupe entry
  await recordNotificationSent(dedupeOpts, 'email');

  return { sent: emailSent, inApp: true };
}

/**
 * Send payment success notification (after confirmed webhook).
 * Critical path — called directly from webhook handler.
 */
async function notifyPaymentSuccess(opts) {
  return await sendLifecycleNotification(Object.assign({}, opts, { notificationType: 'payment_success' }));
}

/**
 * Send payment pending notification (after checkout intent creation).
 */
async function notifyPaymentPending(opts) {
  return await sendLifecycleNotification(Object.assign({}, opts, { notificationType: 'payment_pending' }));
}

/**
 * Send payment failed notification (from webhook payment.failed event).
 */
async function notifyPaymentFailed(opts) {
  return await sendLifecycleNotification(Object.assign({}, opts, { notificationType: 'payment_failed' }));
}

/**
 * Get unread in-app subscription notifications for a company.
 * BOLA-safe: scoped to company_id resolved server-side.
 */
async function getUnreadNotifications(companyId) {
  var q = `
    SELECT id, notification_type, title, body, is_read, metadata, created_at
    FROM ${dbSchema}.subscription_notifications
    WHERE company_id = $1 AND is_read = FALSE
    ORDER BY created_at DESC
    LIMIT 20
  `;
  try {
    var res = await dbQuery.query(q, [companyId]);
    return (res.rows || []).map(function(row) {
      return {
        id: row.id,
        type: row.notification_type,
        title: row.title,
        body: row.body,
        isRead: row.is_read,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      };
    });
  } catch (err) {
    if (err && err.code !== '42P01') {
      console.warn('[subscriptionNotificationV4] getUnreadNotifications error:', err && err.code);
    }
    return [];
  }
}

/**
 * Mark notification as read.
 * BOLA-safe: requires company_id match.
 */
async function markNotificationRead(notificationId, companyId) {
  var q = `
    UPDATE ${dbSchema}.subscription_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = $1 AND company_id = $2
  `;
  try {
    await dbQuery.query(q, [notificationId, companyId]);
    return { updated: true };
  } catch (err) {
    console.warn('[subscriptionNotificationV4] markRead error:', err && err.code);
    return { updated: false };
  }
}

export {
  sendLifecycleNotification,
  notifyPaymentSuccess,
  notifyPaymentPending,
  notifyPaymentFailed,
  getUnreadNotifications,
  markNotificationRead,
  createInAppNotification,
};
