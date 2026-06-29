/**
 * Subscription Notification Dedupe Service V4
 * Prevents duplicate lifecycle emails/notifications per billing period.
 * Node 14 / ESM safe: no ?. or ??
 *
 * Dedupe key structure:
 *   {companyId}__{subscriptionId}__{notificationType}__{billingCycle}__{periodKey}
 * Where periodKey = YYYY-MM for monthly, YYYY for annual, YYYY-MM-DD for daily.
 */

import dbQuery from '../db/dbQuery';
import env from '../env';

const dbSchema = env.schema;

function buildDedupeKey(opts) {
  var companyId = opts.companyId || 'unknown';
  var subscriptionId = opts.subscriptionId || '0';
  var notificationType = opts.notificationType || 'unknown';
  var billingCycle = opts.billingCycle || 'monthly';
  var periodKey = opts.periodKey || getPeriodKey(billingCycle);
  return [companyId, subscriptionId, notificationType, billingCycle, periodKey].join('__');
}

function getPeriodKey(billingCycle, forDate) {
  var d = forDate ? new Date(forDate) : new Date();
  if (billingCycle === 'annual') {
    return String(d.getUTCFullYear());
  }
  // Monthly or daily notifications use YYYY-MM
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

/**
 * Check if a notification has already been sent.
 * Returns true if we should SKIP sending (already sent this period).
 */
async function isDuplicateNotification(opts) {
  var key = buildDedupeKey(opts);
  var q = `SELECT id FROM ${dbSchema}.subscription_notification_log WHERE dedupe_key = $1 LIMIT 1`;
  try {
    var res = await dbQuery.query(q, [key]);
    return res.rows && res.rows.length > 0;
  } catch (err) {
    if (err && err.code === '42P01') {
      // Table not yet migrated — non-blocking, allow send
      return false;
    }
    console.warn('[subscriptionNotificationDedupeV4] isDuplicate error:', err && err.code);
    return false; // Fail-open: allow notification if dedupe check fails
  }
}

/**
 * Record that a notification was sent (so duplicates are skipped).
 */
async function recordNotificationSent(opts, channel) {
  var key = buildDedupeKey(opts);
  var q = `
    INSERT INTO ${dbSchema}.subscription_notification_log
      (dedupe_key, company_id, notification_type, billing_cycle, sent_at, channel, status, created_at)
    VALUES ($1, $2, $3, $4, NOW(), $5, 'sent', NOW())
    ON CONFLICT (dedupe_key) DO NOTHING
  `;
  try {
    await dbQuery.query(q, [
      key,
      opts.companyId || null,
      opts.notificationType || null,
      opts.billingCycle || 'monthly',
      channel || 'email',
    ]);
  } catch (err) {
    if (err && err.code !== '42P01') {
      console.warn('[subscriptionNotificationDedupeV4] recordSent error:', err && err.code);
    }
  }
}

export { buildDedupeKey, getPeriodKey, isDuplicateNotification, recordNotificationSent };
