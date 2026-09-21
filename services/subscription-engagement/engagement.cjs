'use strict';
const { evaluate, activation, configured } = require('./rules.cjs');
const { suppress, isAdmin } = require('./suppression.cjs');
const { recommend } = require('./catalog.cjs');
const { render } = require('./templates/catalog.cjs');
function decide(snapshot,event,recipients,history,configs,now) {
 now = now || new Date();
 const s = Object.assign({},snapshot,{activation:activation(snapshot)});
 const actions = [], suppressed = [];
 const rules = evaluate(s,event,now).map(r => configured(r,(configs || {})[r.key]));
 for (const recipient of recipients) {
  let emailChosen = false;
  for (const r of rules) {
   for (const channel of ['IN_APP_NOTIFICATION','EMAIL']) {
    if (!r.surfaces.includes(channel)) continue;
    const effective = Object.assign({},s,{periodKey:r.category === 'BILLING' && s.billingEpisode ? s.periodKey + ':' + s.billingEpisode : s.periodKey});
    let reason = suppress(r,effective,recipient,history,channel,now);
    if (!reason && channel === 'EMAIL' && emailChosen) reason = 'CHANNEL_COLLISION';
    if (channel === 'EMAIL' && !emailChosen && !suppress(r,s,recipient,[],channel,now)) emailChosen = true;
    if (reason) { suppressed.push({ruleKey:r.key,recipientUid:recipient.uid,channel,reason}); continue; }
    const content = render(r.templateKey,s,r);
    actions.push({rule:r,channel,recipientUid:recipient.uid,content,
      periodKey:effective.periodKey,
      dedupeKey:[s.companyId,recipient.uid,r.key,effective.periodKey,channel,
       (history || []).filter(h=>h.ruleKey===r.key && h.channel===channel && h.recipientUid===recipient.uid && h.periodKey===effective.periodKey && h.status!=='CANCELLED').length+1].join(':'),
      recommendation:isAdmin(recipient.role) ? recommend(s) : null });
    if (channel === 'EMAIL') emailChosen = true;
   }
  }
 }
 return { actions,suppressed,activation:s.activation };
}
function nudge(r,s,recipient) {
 const copy = render(r.templateKey,Object.assign({},s,{activation:activation(s)}),r);
 return { id:[s.companyId,r.key,s.periodKey].join(':'), kind:r.optional ? 'PLAN_UPGRADE' : 'ACCOUNT_NOTICE', trigger:r.key, priority:r.priority,
  presentation:{recommendedSurface:r.surfaces.includes('BILLING_ALERT') ? 'BILLING_ALERT' : r.surfaces.includes('LIMIT_MODAL') ? 'LIMIT_MODAL' : 'INLINE_CARD',dismissible:r.priority !== 'CRITICAL'},
  copy:{eyebrow:r.metric === 'storage' ? 'Recruitment Storage' : r.category,title:copy.title,body:copy.body},usage:r.usage || null,
  recommendation:isAdmin(recipient.role) ? recommend(s) : null,actions:[Object.assign({type:'PRIMARY'},copy.cta.primary)].concat(copy.cta.secondary ? [Object.assign({type:'SECONDARY'},copy.cta.secondary)] : []) };
}
function context(s,recipient,history,configs,now) {
 now=now || new Date();
 const snapshot=Object.assign({},s,{activation:activation(s)});
 const rules=evaluate(snapshot,null,now).map(r=>configured(r,(configs || {})[r.key]));
 const eligible=rules.filter(r=> {
  // Existing persisted alerts remain visible; frequency caps control creation and email, not critical visibility.
  const relevant=(history || []).filter(h=>h.ruleKey===r.key && h.recipientUid===recipient.uid);
  const reason=suppress(r,snapshot,recipient,[], 'IN_APP_NOTIFICATION',now);
  if(reason) return false;
  if(r.priority !== 'CRITICAL' && relevant.some(h=>(h.dismissedAt && now-new Date(h.dismissedAt)<r.cooldownHours*3600000)||(h.clickedAt && now-new Date(h.clickedAt)<86400000))) return false;
  return !r.eventOnly;
 });
 const top=eligible[0] ? nudge(eligible[0],snapshot,recipient) : null;
 return {banner:top && ['HIGH','CRITICAL'].includes(top.priority) ? top : null,dashboardCard:top && !['HIGH','CRITICAL'].includes(top.priority) ? top : null};
}
module.exports={decide,context,nudge};
