'use strict';
const {emailPolicy}=require('./email-policy.cjs');
// Provider is injected. Construction never initializes or contacts SendGrid.
// The local worker always uses the durable sink, regardless of this adapter.
async function deliverEmail({delivery,recipient,env,provider,sink}) {
 const policy=emailPolicy(recipient,env);
 if(!policy.allowed) {
  if(policy.sandboxed) {await sink(delivery.id,delivery.content);return {status:'SANDBOXED'};}
  return {status:'SUPPRESSED',reason:policy.reason};
 }
 if(!provider || typeof provider.send!=='function' || !env.EMAIL_SENDER) return {status:'FAILED',retryable:false,reason:'TRANSPORT_NOT_CONFIGURED'};
 let origin;
 try {origin=new URL(env.EMAIL_APP_ORIGIN);if(origin.protocol!=='https:') throw Error('HTTPS required');}catch(e){return {status:'FAILED',retryable:false,reason:'INVALID_APP_ORIGIN'};}
 const html=delivery.content.html.replace(/href="(\/recruiter\/[^"<>]*)"/g,(_,path)=>'href="'+origin.origin+path+'"');
 try {
  await provider.send({to:recipient.trim(),from:env.EMAIL_SENDER,subject:delivery.content.subject,html,
   customArgs:{engagementDeliveryId:delivery.id},headers:{'X-GetHired-Engagement':delivery.id}});
  return {status:'SENT'}; // Provider acceptance is not delivery confirmation.
 }catch(e) {
  const status=Number(e.code || e.statusCode);
  // Never automatically retry an ambiguous timeout: provider may have accepted it.
  const retryable=status===429 || status>=500;
  return {status:status ? 'FAILED' : 'UNKNOWN',retryable,reason:status ? 'PROVIDER_'+status : 'AMBIGUOUS_PROVIDER_RESULT'};
 }
}
module.exports={deliverEmail};
