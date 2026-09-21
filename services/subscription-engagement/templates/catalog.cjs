'use strict';
const templates = {
 'trial.started': ['Your GetHired trial has started', 'Start hiring with GetHired', 'Create Your First Job', '/recruiter/jobs'],
 'trial.activated': ['Your first job is live', 'Review applicants and set up screening', 'Continue Hiring', '/recruiter/dashboard'],
 'trial.day_3': ['Need help getting started?', 'Make the most of your trial', 'Create Your First Job', '/recruiter/jobs'],
 'trial.7_days_remaining': ['7 days left in your GetHired trial', 'Review your hiring progress', 'Compare Plans'],
 'trial.3_days_remaining': ['Your GetHired trial ends in 3 days', 'Review your plan before the trial ends', 'Choose a Plan'],
 'trial.1_day_remaining': ['Your GetHired trial ends within one day', 'Check the exact end time below', 'Choose a Plan'],
 'trial.expired': ['Your GetHired trial has ended', 'Review your subscription options', 'Choose a Plan'],
 'trial.converted': ['Your paid GetHired plan is active', 'Thank you for choosing GetHired', 'Continue Hiring', '/recruiter/dashboard'],
 'subscription.storage.70': ['Recruitment Storage usage notice', 'Review your available capacity', 'Manage Storage', '/recruiter/subscription/storage'],
 'subscription.storage.80': ["You’re approaching your storage limit", 'Review your Recruitment Storage', 'Manage Storage', '/recruiter/subscription/storage'],
 'subscription.storage.90': ["Your Recruitment Storage is almost full", 'Plan capacity for continued hiring', 'Manage Storage', '/recruiter/subscription/storage'],
 'subscription.storage.full': ['Your Recruitment Storage is full', 'Review storage capacity and available actions', 'Manage Storage', '/recruiter/subscription/storage'],
 'subscription.job_capacity': ['Review your active job capacity', 'Your hiring activity is approaching a plan limit', 'Compare Plans'],
 'subscription.user_capacity': ['Review your team capacity', 'Your team is approaching a plan limit', 'Compare Plans'],
 'subscription.video_limit': ['Review your Video Screening question capacity', 'Your screening setup is approaching a plan limit', 'Compare Plans'],
 'subscription.feature_gate': ['This feature requires a different plan', 'Review plans for the action you attempted', 'Compare Plans'],
 'subscription.expansion.starter_growth': ['Your hiring activity is growing', 'Review a plan with more hiring capacity', 'Compare Growth'],
 'subscription.expansion.growth_premium': ['Need more hiring capacity?', 'Review a plan that fits your usage', 'View Premium'],
 'subscription.expansion.enterprise': ['Let’s tailor GetHired to your hiring operation', 'Review custom capacity with GetHired', 'Talk to GetHired', '/recruiter/subscription/enterprise'],
 'subscription.upgrade_completed': ['Your GetHired upgrade is complete', 'Your confirmed plan is active', 'Continue Hiring', '/recruiter/dashboard'],
 'subscription.downgrade_scheduled': ['Your plan change is scheduled', 'Review the effective date and capacity changes', 'Review Subscription'],
 'subscription.cancellation_requested': ['Your cancellation request was received', 'Review the effective date in your subscription', 'Review Subscription'],
 'subscription.cancelled': ['Your subscription is cancelled', 'Review account access and subscription options', 'Review Subscription'],
 'billing.payment_failed': ['Your GetHired payment did not go through', 'Review your payment method', 'Update Payment Method'],
 'billing.payment_retry_failed': ['Your GetHired payment retry did not go through', 'Review your payment method', 'Update Payment Method'],
 'billing.past_due': ['Your GetHired subscription is past due', 'Review your account status', 'Review Billing'],
 'billing.payment_recovered': ['Your GetHired payment is confirmed', 'Your payment issue has been resolved', 'Review Subscription'],
 'billing.annual_renewal_30': ['Your annual GetHired subscription renews within 30 days', 'Review your renewal date', 'Review Subscription'],
 'billing.annual_renewal_7': ['Your annual GetHired subscription renews within 7 days', 'Review your renewal date', 'Review Subscription'],
 'billing.storage_addon_activated': ['Your Recruitment Storage add-on is active', 'Your confirmed storage capacity is available', 'Manage Storage', '/recruiter/subscription/storage'],
 'billing.renewed': ['Your GetHired subscription has renewed', 'Review your confirmed subscription', 'Review Subscription'],
 'upgrade.checkout_abandoned': ['Your GetHired plan change is unfinished', 'Continue only if a different plan fits your needs', 'Review Plans'],
 'enterprise.sales_handoff': ['Enterprise capacity signal', 'Internal review only', 'Review Account']
};
function escape(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function render(key, s, rule) {
 const t = templates[key];
 if (!t) throw new Error('Unknown template');
 let body = rule.body || 'Review your GetHired subscription for details and available actions.';
 if (key.startsWith('trial.')) {
  const active = s.activation !== 'NOT_ACTIVATED';
  body = 'Your ' + s.plan + ' account';
  if (s.trialEndsAt) body += ' has a trial end time of ' + new Date(s.trialEndsAt).toISOString() + ' (' + (s.timezone || 'Asia/Manila') + ').';
  body += active ? ' Keep your hiring moving. ' : ' Need help getting started? ';
  body += 'Current active jobs: ' + ((s.usage && s.usage.jobs) || 0) + '. ';
  if(key==='trial.started') {const p=require('../catalog.cjs').planFor(s);if(p) body += 'This '+p.trialDays+'-day trial includes '+p.jobs+' active job and '+p.users+' account user'+(p.storage ? ', '+p.storage/1000000000+' GB Recruitment Storage and '+p.video+' Video Screening question per job' : '')+'. ';}
  body += s.restrictionCopy || 'Review the subscription page for the actions available after expiry. This notice does not delete your existing data.';
 }
 if(key.startsWith('billing.annual_renewal_') && s.periodEnd) body='Your subscription renewal date is ' + new Date(s.periodEnd).toISOString() + '. Review the subscription page for your actual renewal amount and terms.';
 if(key==='subscription.expansion.starter_growth' || key==='subscription.expansion.growth_premium') {
  const recommendation=require('../catalog.cjs').recommend(s);
  const p=require('../catalog.cjs').catalogs[s.planVersion][recommendation.recommendedPlan];
  if(p) body='Based on your current usage, ' + recommendation.recommendedPlan + ' offers ' + p.jobs + ' active jobs, ' + p.users + ' team members, ' + p.storage/1000000000 + ' GB Recruitment Storage and ' + p.video + ' Video Screening questions per job. Review plans to decide whether this capacity fits your needs.';
 }
 const first = { label: t[2], action: 'NAVIGATE', url: t[3] || '/recruiter/subscription' };
 if (key.startsWith('trial.') && s.activation === 'NOT_ACTIVATED' && !['trial.expired','trial.converted'].includes(key)) {
  first.label = 'Create Your First Job'; first.url = '/recruiter/jobs';
 }
 const secondary = rule.metric === 'storage' ? { label: 'Compare Plans', action: 'NAVIGATE', url: '/recruiter/subscription' } : null;
 const footer = rule.preference === 'ACCOUNT_CRITICAL' || rule.preference === 'BILLING' ? 'GetHired account service notice.' : 'Manage communication preferences in your GetHired account.';
 const html = '<!doctype html><html><body><div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#172b4d"><p>' + escape(t[1]) + '</p><h1>' + escape(t[0]) + '</h1><p>' + escape(body) + '</p><p><a href="' + escape(first.url) + '">' + escape(first.label) + '</a></p><p>' + escape(footer) + '</p><a href="/recruiter/subscription/preferences">Communication preferences</a></div></body></html>';
 return { templateKey: key, subject: t[0], preheader: t[1], title: t[0], body, heading: t[0], cta: { primary: first, secondary }, footer, html };
}
module.exports = { templates, render };
