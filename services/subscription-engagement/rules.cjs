'use strict';
const { planFor, recommend } = require('./catalog.cjs');
const cooldown = { INFO: 168, NOTICE: 120, WARNING: 72, HIGH: 24, CRITICAL: 24 };
const defaults = { enabled: true, maxOccurrences: 1 };
function activation(s) {
 const a = s.activationSignals || {};
 if (a.applicantsReviewed > 0 || (s.usage && s.usage.jobs >= 3)) return 'HIGH_INTENT';
 if (a.jobPublished || a.applicantsReceived > 0 || a.aiJobCreated || a.videoConfigured) return 'ACTIVATED';
 return 'NOT_ACTIVATED';
}
function evaluate(s, event, now) {
 now = now || new Date();
 const plan = planFor(s);
 if (!plan) return [];
 const result = [];
 function add(key, templateKey, priority, rank, extra) {
  result.push(Object.assign({ key, templateKey, priority, rank, cooldownHours: cooldown[priority], maxOccurrences: 1,
   category: 'SUBSCRIPTION', preference: 'USAGE_ALERTS', activationRequired: false,
   surfaces: ['IN_APP_NOTIFICATION','INLINE_CARD','EMAIL'], recipientRole: 'ADMIN', optional: false }, extra || {}));
 }
 const billing = ['payment_failed','past_due','grace_period'].includes(s.status);
 if (billing) add(s.retryFailed ? 'billing.payment_retry_failed' : 'billing.' + s.status, s.retryFailed ? 'billing.payment_retry_failed' : s.status === 'payment_failed' ? 'billing.payment_failed' : 'billing.past_due', s.status === 'past_due' ? 'CRITICAL' : 'HIGH', 0, { category: 'BILLING', preference: 'BILLING', surfaces: ['IN_APP_NOTIFICATION','BILLING_ALERT','EMAIL'] });
 if (!['cancelled','canceled','suspended'].includes(s.status)) {
  for (const metric of ['storage','jobs','users','video']) {
   const used = s.usage && s.usage[metric]; const limit = plan[metric];
   if (!Number.isFinite(used) || used < 0 || typeof limit !== 'number' || limit < 0) continue;
   const pct = limit === 0 ? (used > 0 ? 100 : 0) : used / limit * 100;
   const threshold = metric === 'storage' ? (pct >= 100 ? 100 : pct >= 90 ? 90 : pct >= 80 ? 80 : pct >= 70 ? 70 : null) : (pct >= 100 ? 100 : pct >= 80 ? 80 : metric === 'jobs' && pct >= 50 ? 50 : null);
   if (threshold === null) continue;
   const priority = threshold === 100 ? 'CRITICAL' : threshold === 90 ? 'HIGH' : threshold === 80 ? 'WARNING' : threshold === 70 ? 'NOTICE' : 'INFO';
   const template = metric === 'storage' ? 'subscription.storage.' + (threshold === 100 ? 'full' : threshold) : 'subscription.' + ({ jobs: 'job_capacity', users: 'user_capacity', video: 'video_limit' }[metric]);
   const attempted = event && event.type === ({ storage:'STORAGE_LIMIT_REACHED', jobs:'JOB_LIMIT_REACHED', users:'USER_LIMIT_REACHED', video:'VIDEO_QUESTION_LIMIT_REACHED' }[metric]);
   add(metric + '.' + threshold, template, priority, threshold === 100 ? 1 : 2, { metric, threshold, usage: { used, limit, unit: metric === 'storage' ? 'BYTES' : 'COUNT', percentage: Math.round(pct * 100) / 100 },
    body: 'You have used ' + used + ' of ' + limit + ' ' + (metric === 'storage' ? 'bytes of Recruitment Storage' : metric === 'video' ? 'Video Screening questions on the busiest job' : metric) + ' on your ' + s.plan + ' plan.',
    activationRequired: threshold < 100, optional: threshold < 100,
    recipientRole: attempted ? 'ACTOR' : 'ADMIN', actorUid: event && event.actorUid,
    surfaces: ['IN_APP_NOTIFICATION', attempted ? 'LIMIT_MODAL' : 'INLINE_CARD', 'EMAIL'] });
  }
 }
 if (s.plan === 'free_trial' && s.trialEndsAt && !['canceled','cancelled','suspended'].includes(s.status)) {
  if (!event || event.type === 'ACCOUNT_SNAPSHOT') {
   const age = s.trialStartedAt ? (now - new Date(s.trialStartedAt)) / 86400000 : Infinity;
   if (age < 1) add('trial.started','trial.started','INFO',3,{preference:'ACCOUNT_CRITICAL',eventOnly:true});
   if (age >= 3 && age < 4 && s.activation === 'NOT_ACTIVATED') add('trial.day_3','trial.day_3','INFO',4,{preference:'PRODUCT_GUIDANCE',eventOnly:true});
  }
  const days = (new Date(s.trialEndsAt) - now) / 86400000;
  const mark = days <= 0 ? 'expired' : days <= 1 ? '1_day_remaining' : days <= 3 ? '3_days_remaining' : days <= 7 ? '7_days_remaining' : null;
  if (mark) add('trial.' + mark, 'trial.' + mark, mark === 'expired' ? 'CRITICAL' : mark === '1_day_remaining' ? 'HIGH' : mark === '3_days_remaining' ? 'WARNING' : 'NOTICE', 3, { preference: 'ACCOUNT_CRITICAL' });
 }
 if (s.billingCycle === 'annual' && s.periodEnd && !billing && !['cancelled','canceled','suspended'].includes(s.status)) {
  const days = (new Date(s.periodEnd) - now) / 86400000;
  const mark = days > 0 && days <= 7 ? 7 : days > 7 && days <= 30 ? 30 : null;
  if (mark) add('renewal.' + mark, 'billing.annual_renewal_' + mark, 'NOTICE', 3, { category: 'BILLING', preference: 'BILLING' });
 }
 const mapping = {
  TRIAL_STARTED:['trial.started','INFO','ACCOUNT_CRITICAL'], TRIAL_ACTIVATED:['trial.activated','INFO','PRODUCT_GUIDANCE'], TRIAL_DAY_3:['trial.day_3','INFO','PRODUCT_GUIDANCE'],
  TRIAL_CONVERTED:['trial.converted','NOTICE','ACCOUNT_CRITICAL'], UPGRADE_COMPLETED:['subscription.upgrade_completed','NOTICE','ACCOUNT_CRITICAL'],
  PAYMENT_FAILED:['billing.payment_failed','HIGH','BILLING'], PAYMENT_RETRY_FAILED:['billing.payment_retry_failed','HIGH','BILLING'],
  PAYMENT_RECOVERED:['billing.payment_recovered','NOTICE','BILLING'], SUBSCRIPTION_PAST_DUE:['billing.past_due','CRITICAL','BILLING'],
  STORAGE_ADDON_ACTIVATED:['billing.storage_addon_activated','NOTICE','BILLING'], SUBSCRIPTION_RENEWED:['billing.renewed','NOTICE','BILLING'], DOWNGRADE_REQUESTED:['subscription.downgrade_scheduled','NOTICE','BILLING'],
  CANCELLATION_REQUESTED:['subscription.cancellation_requested','NOTICE','BILLING'], SUBSCRIPTION_CANCELLED:['subscription.cancelled','NOTICE','BILLING']
 };
 if (event && mapping[event.type]) {
  const m = mapping[event.type];
  // Payment failures are persistent rules; avoid emitting a second equivalent alert.
  const already = result.some(r => r.templateKey === m[0]);
  if (!already) add(m[0], m[0], m[1], ['UPGRADE_COMPLETED','TRIAL_CONVERTED','PAYMENT_RECOVERED','SUBSCRIPTION_RENEWED'].includes(event.type) ? -1 : m[2] === 'BILLING' ? 0 : 3, { preference: m[2], category: m[2] === 'BILLING' ? 'BILLING' : 'SUBSCRIPTION', eventOnly: true });
 }
 if (event && event.type === 'PREMIUM_FEATURE_ATTEMPTED') add('feature.' + event.feature, 'subscription.feature_gate', 'NOTICE', 4, { recipientRole:'ACTOR', actorUid: event.actorUid, optional:true, activationRequired:true, surfaces:['CONTEXTUAL_NUDGE','IN_APP_NOTIFICATION'] });
 const rec = recommend(s);
 if (rec.recommendedPlan && !billing) {
  const suffix = rec.recommendedPlan === 'enterprise' ? 'enterprise' : s.plan === 'starter' ? 'starter_growth' : 'growth_premium';
  if (s.plan !== 'free_trial' && (s.planVersion !== 'legacy_v4' || rec.recommendedPlan === 'enterprise')) add('expansion.' + rec.recommendedPlan, 'subscription.expansion.' + suffix, 'INFO', 5, { optional: true, activationRequired:true, preference:'UPGRADE_RECOMMENDATIONS', recommendation:rec, surfaces:['IN_APP_NOTIFICATION','INLINE_CARD','EMAIL'].concat(rec.recommendedPlan === 'enterprise' ? ['SALES_SIGNAL'] : []) });
 }
 if (s.checkoutAbandonedAt && now - new Date(s.checkoutAbandonedAt) >= 86400000 && rec.recommendedPlan) add('checkout.abandoned','upgrade.checkout_abandoned','INFO',5,{optional:true,activationRequired:true,preference:'UPGRADE_RECOMMENDATIONS'});
 return result.sort((a,b) => a.rank - b.rank || cooldown[a.priority] - cooldown[b.priority]);
}
function configured(rule, config) {
 const c = config || defaults;
 // Configuration changes cadence/enablement only, never authorization, priority or required-notice policy.
 return Object.assign({}, rule, { enabled: rule.priority === 'CRITICAL' || c.enabled !== false,
  cooldownHours: Number.isFinite(c.cooldownHours) ? Math.max(24, Math.min(720, c.cooldownHours)) : rule.cooldownHours,
  maxOccurrences: Number.isInteger(c.maxOccurrences) ? Math.max(1, Math.min(10,c.maxOccurrences)) : rule.maxOccurrences });
}
module.exports = { evaluate, activation, configured, cooldown };
