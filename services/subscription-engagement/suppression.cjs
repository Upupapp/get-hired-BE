'use strict';
const admins = ['BILLING_OWNER','ACCOUNT_ADMIN'];
const defaultPreferences = { ACCOUNT_CRITICAL:true, BILLING:true, USAGE_ALERTS:true, PRODUCT_GUIDANCE:false, UPGRADE_RECOMMENDATIONS:false, MARKETING:false };
function isAdmin(role) { return admins.includes(role); }
function suppress(rule,s,recipient,history,channel,now) {
 if (!rule.enabled) return 'RULE_DISABLED';
 if (rule.recipientRole === 'ADMIN' && !isAdmin(recipient.role)) return 'ROLE';
 if (rule.recipientRole === 'ACTOR' && recipient.uid !== rule.actorUid) return 'ROLE';
 if (channel === 'EMAIL' && !isAdmin(recipient.role)) return 'ROLE';
 if (rule.optional && s.plan === 'enterprise') return 'PLAN_SATISFIED';
 if (rule.activationRequired && s.activation === 'NOT_ACTIVATED') return 'NOT_ACTIVATED';
 if (rule.optional) {
  if (['cancelled','canceled','suspended'].includes(s.status)) return 'ACCOUNT_STATE';
  if (s.checkoutActive || s.upgradePending || s.salesActive || s.manualIntervention) return 'INTERVENTION';
  if (s.upgradedAt && now - new Date(s.upgradedAt) < 14 * 86400000) return 'RECENT_UPGRADE';
  if (['payment_failed','past_due','grace_period'].includes(s.status)) return 'PAYMENT_RISK';
 }
 const prefs = Object.assign({}, defaultPreferences,recipient.preferences);
 if (channel === 'EMAIL' && !['ACCOUNT_CRITICAL','BILLING'].includes(rule.preference) && prefs[rule.preference] !== true) return 'PREFERENCE';
 const matching = (history || []).filter(h => h.ruleKey === rule.key && h.channel === channel && h.recipientUid === recipient.uid && h.status !== 'CANCELLED' && (!h.periodKey || h.periodKey === s.periodKey));
 if (matching.length >= rule.maxOccurrences) return 'PERIOD_DEDUPE';
 const latest = (history || []).filter(h => h.ruleKey === rule.key && h.channel === channel && h.recipientUid === recipient.uid);
 if (latest.some(h => now - new Date(h.createdAt) < rule.cooldownHours * 3600000)) return 'COOLDOWN';
 if (rule.priority !== 'CRITICAL' && (history || []).some(h => h.ruleKey === rule.key && h.recipientUid === recipient.uid && ((h.dismissedAt && now - new Date(h.dismissedAt) < rule.cooldownHours * 3600000) || (h.clickedAt && now - new Date(h.clickedAt) < 24 * 3600000)))) return 'INTERACTION_COOLDOWN';
 return null;
}
module.exports = { suppress, isAdmin, defaultPreferences };
