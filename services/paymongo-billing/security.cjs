'use strict';
const crypto=require('crypto');
function fail(code,status=400) {return Object.assign(new Error(code),{code,httpStatus:status});}
function verify(raw,header,secret,mode,nowSeconds) {
 if(!Buffer.isBuffer(raw) || !raw.length || raw.length>262144 || typeof secret!=='string' || !secret || !['test','live'].includes(mode) || typeof header!=='string') throw fail('PAYMONGO_WEBHOOK_INVALID');
 const fields={};
 for(const token of header.split(',')) {
  const match=/^\s*(t|te|li)=([^,]*)\s*$/.exec(token);
  if(!match || Object.prototype.hasOwnProperty.call(fields,match[1])) throw fail('PAYMONGO_WEBHOOK_INVALID');
  fields[match[1]]=match[2].trim();
 }
 if(!/^\d{10,12}$/.test(fields.t || '')) throw fail('PAYMONGO_WEBHOOK_INVALID');
 const timestamp=Number(fields.t);const now=nowSeconds===undefined?Math.floor(Date.now()/1000):nowSeconds;
 if(!Number.isSafeInteger(timestamp) || Math.abs(now-timestamp)>300) throw fail('PAYMONGO_WEBHOOK_INVALID');
 const signature=fields[mode==='live'?'li':'te'];
 if(!/^[a-f0-9]{64}$/i.test(signature || '')) throw fail('PAYMONGO_WEBHOOK_INVALID');
 const expected=crypto.createHmac('sha256',secret).update(fields.t+'.').update(raw).digest();
 if(!crypto.timingSafeEqual(expected,Buffer.from(signature,'hex'))) throw fail('PAYMONGO_WEBHOOK_INVALID');
 let payload;try{payload=JSON.parse(raw.toString('utf8'));}catch(e){throw fail('PAYMONGO_WEBHOOK_MALFORMED');}
 const event=payload && payload.data;const a=event && event.attributes;
 if(!event || !/^evt_[A-Za-z0-9_-]{1,200}$/.test(event.id || '') || event.type!=='event' || !a || typeof a.type!=='string' || a.type.length>100 || !/^[a-z_]+\.[a-z_.]+$/.test(a.type) || typeof a.livemode!=='boolean' || !a.data || typeof a.data.id!=='string' || !a.data.id.length || a.data.id.length>200) throw fail('PAYMONGO_WEBHOOK_MALFORMED');
 if(a.livemode!==(mode==='live')) throw fail('PAYMONGO_MODE_MISMATCH');
 return {id:event.id,type:a.type,livemode:a.livemode,hash:crypto.createHash('sha256').update(raw).digest('hex'),resource:a.data};
}
function assertRuntime(config) {
 if(!config.enabled) throw fail('PAYMONGO_BILLING_DISABLED',503);
 if(!['test','live'].includes(config.mode)) throw fail('PAYMONGO_CONFIGURATION_INVALID',503);
 if(config.mode==='live' && (config.nodeEnv!=='production' || config.liveAuthorized!==true)) throw fail('PAYMONGO_LIVE_BLOCKED',503);
 if(config.mode==='test' && (config.nodeEnv==='production' || !['localhost','127.0.0.1','::1'].includes(config.dbHost))) throw fail('PAYMONGO_DATABASE_MODE_MISMATCH',503);
}
function normalize(event) {
 const resource=event.resource;const attrs=resource.attributes || resource;
 let payment=resource;let reference=attrs.metadata && attrs.metadata.internal_payment_reference;
 let linkId=null,linkReference=null;
 if(event.type==='link.payment.paid') {
  linkId=resource.id;linkReference=attrs.reference_number || null;
  reference=reference || attrs.remarks || null;
  if(!Array.isArray(attrs.payments) || attrs.payments.length!==1) throw fail('PAYMONGO_PAYMENT_SNAPSHOT_REQUIRED',422);
  payment=attrs.payments[0].data || attrs.payments[0];
 }
 const p=payment.attributes || payment;
 if(!/^pay_[A-Za-z0-9_-]{1,200}$/.test(payment.id || '') || !Number.isSafeInteger(p.amount) || p.amount<1 || typeof p.currency!=='string') throw fail('PAYMONGO_WEBHOOK_MALFORMED');
 const metadata=p.metadata || {};
 reference=reference || metadata.internal_payment_reference || null;
 linkReference=linkReference || metadata.pm_reference_number || p.external_reference_number || null;
 if(reference && !/^GH_PAY_[a-f0-9]{32}$/.test(reference)) throw fail('PAYMENT_REFERENCE_INVALID',422);
 if(p.livemode!==undefined && p.livemode!==event.livemode) throw fail('PAYMONGO_MODE_MISMATCH',422);
 if(attrs.livemode!==undefined && attrs.livemode!==event.livemode) throw fail('PAYMONGO_MODE_MISMATCH',422);
 const expectedStatus=event.type==='payment.failed'?'failed':'paid';
 if(p.status!==expectedStatus) throw fail('PAYMONGO_PAYMENT_STATE_MISMATCH',422);
 const method=p.source && p.source.type;
 const safeMethod=['card','gcash','grab_pay','paymaya','qrph','dob','shopee_pay'].includes(method)?method:'other';
 return {paymentId:payment.id,linkId,linkReference,reference,intentId:p.payment_intent_id || null,amount:p.amount,currency:p.currency,status:p.status,livemode:event.livemode,method:safeMethod,
  safeFailureCategory:expectedStatus==='failed'?'PAYMENT_UNSUCCESSFUL':null};
}
module.exports={verify,normalize,assertRuntime,fail};
