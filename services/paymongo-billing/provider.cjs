'use strict';
const {fail,assertRuntime}=require('./security.cjs');
function provider(http,config) {
 function options() {
  assertRuntime(config);
  const prefix=config.mode==='live'?'sk_live_':'sk_test_';
  if(typeof config.secretKey!=='string' || !config.secretKey.startsWith(prefix)) throw fail('PAYMONGO_KEY_MODE_MISMATCH',503);
  return {headers:{Authorization:'Basic '+Buffer.from(config.secretKey+':').toString('base64'),Accept:'application/json','Content-Type':'application/json'},timeout:10000,maxRedirects:0};
 }
 async function createLink(attempt) {
  // Preserve the existing legacy API family; new /payment_links migration requires separate approval.
  const amount=Number(attempt.expected_amount_minor);if(!Number.isSafeInteger(amount)||amount<100)throw fail('PAYMONGO_CHECKOUT_RESPONSE_INVALID',502);
  const body={data:{attributes:{amount,currency:'PHP',description:'GetHired purchase',remarks:attempt.internal_reference}}};
  try {
   const result=await http.post('https://api.paymongo.com/v1/links',body,options());
   const data=result.data && result.data.data;const a=data && (data.attributes || data);
   if(!data || !/^link_[A-Za-z0-9_-]+$/.test(data.id || '') || a.livemode!==(config.mode==='live') || Number(a.amount)!==amount || a.currency!=='PHP') throw fail('PAYMONGO_CHECKOUT_RESPONSE_INVALID',502);
   const url=new URL(a.checkout_url || a.url);
   if(url.protocol!=='https:' || url.hostname!=='pm.link') throw fail('PAYMONGO_CHECKOUT_RESPONSE_INVALID',502);
   return {linkId:data.id,referenceNumber:a.reference_number || null,checkoutUrl:url.href};
  }catch(e) {
   if(e.code && e.httpStatus) throw e;
   // Response is never logged/stored. Ambiguous create results are not automatically retried.
   throw fail('PAYMENT_CHECKOUT_FAILED',502);
  }
 }
 async function retrieveLink(linkId) {
  if(!/^link_[A-Za-z0-9_-]+$/.test(linkId)) throw fail('PAYMENT_REFERENCE_INVALID');
  try {const r=await http.get('https://api.paymongo.com/v1/links/'+encodeURIComponent(linkId),options());return r.data.data;}catch(e){throw fail('PAYMONGO_RECONCILIATION_PROVIDER_FAILED',502);}
 }
 return {createLink,retrieveLink};
}
module.exports={provider};
