'use strict';
const {record}=require('./retry.cjs');
const crypto=require('crypto');
const {verify}=require('../paymongo-billing/security.cjs');
const fail=(code,status=422)=>Object.assign(new Error(code),{code,httpStatus:status});
const TYPES=['payment.refunded','payment.refund.updated','refund.succeeded'];
function normalized(event){
 if(!TYPES.includes(event.type))return [];
 const resource=event.resource,a=resource.attributes || {};let list;
 if(a.livemode!==undefined&&a.livemode!==event.livemode)throw fail('REFUND_RESOURCE_INVALID');
 if(resource.type==='refund')list=[resource];
 else if(resource.type==='payment' && /^pay_[\w-]+$/.test(resource.id) && Array.isArray(a.refunds))list=a.refunds.map(r=>({...(r.data||r),attributes:{...((r.data||r).attributes||r),payment_id:resource.id}}));
 else throw fail('REFUND_RESOURCE_INVALID');
 if(list.length>100)throw fail('REFUND_RESOURCE_INVALID');
 return list.map(r=>{const x=r.attributes || {};if(!['pending','processing','failed','succeeded'].includes(x.status))throw fail('REFUND_STATE_INVALID');
  if(x.status!=='succeeded')return null;
  if(!/^ref_[\w-]{1,200}$/.test(r.id||'')||!/^pay_[\w-]{1,200}$/.test(x.payment_id||'')||!Number.isSafeInteger(x.amount)||x.amount<1||x.amount>10000000000||x.currency!=='PHP'||(x.livemode!==undefined&&x.livemode!==event.livemode))throw fail('REFUND_RESOURCE_INVALID');
  const stamp=x.updated_at || x.created_at;if(!Number.isSafeInteger(stamp)||stamp<1||stamp>Date.now()/1000+300)throw fail('REFUND_TIME_INVALID');
  return {id:r.id,paymentId:x.payment_id,amount:x.amount,currency:x.currency,livemode:event.livemode,occurredAt:new Date(stamp*1000)};
 }).filter(Boolean);
}
function refundIntake(db,schema,config){
 if(!/^[a-z_][a-z0-9_]*$/i.test(schema))throw fail('INVALID_SCHEMA');const t=n=>schema+'.'+n;
 async function webhook(raw,header){
  if(!config.enabled)throw fail('REFUND_INTAKE_DISABLED',503);
  const event=verify(raw,header,config.webhookSecret,config.mode);const refunds=normalized(event);
  return db.transaction(async q=>{
   // The singleton also serializes sender snapshots against newly received refunds.
   await q.query(`SELECT id FROM ${t('referral_bunny_platform')} WHERE id=1 FOR UPDATE`);
   const old=(await q.query(`SELECT payload_hash FROM ${t('referral_bunny_refund_events')} WHERE event_id=$1`,[event.id])).rows[0];
   if(old){if(old.payload_hash!==event.hash)throw fail('REFUND_EVENT_CONFLICT',409);return {received:true,duplicate:true};}
   for(const r of refunds){
    const existing=(await q.query(`SELECT * FROM ${t('referral_bunny_provider_refunds')} WHERE refund_id=$1 AND livemode=$2`,[r.id,r.livemode])).rows[0];
    if(existing){if(existing.provider_payment_id!==r.paymentId||Number(existing.amount_minor)!==r.amount||existing.currency!==r.currency)throw fail('REFUND_ID_CONFLICT',409);continue;}
    await q.query(`INSERT INTO ${t('referral_bunny_provider_refunds')}(refund_id,livemode,provider_payment_id,amount_minor,currency,occurred_at,event_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,[r.id,r.livemode,r.paymentId,r.amount,r.currency,r.occurredAt,event.id]);
   }
   await q.query(`INSERT INTO ${t('referral_bunny_refund_events')}(event_id,payload_hash) VALUES($1,$2)`,[event.id,event.hash]);return {received:true,recorded:refunds.length};
  });
 }
 return {webhook};
}
function proportional(net,gross,cumulative){
 const n=BigInt(net),g=BigInt(gross),c=BigInt(cumulative);if(g<=0n||c<0n||c>g||n<=0n||n>g)throw fail('REFUND_AMOUNT_INVALID');
 return Number((n*c+g/2n)/g);
}
function refunds(db,schema,connector,config,transport){
 if(!/^[a-z_][a-z0-9_]*$/i.test(schema))throw fail('INVALID_SCHEMA');const t=n=>schema+'.'+n;
 async function context(q){if(!config.enabled)throw fail('REFUND_DELIVERY_DISABLED',503);if(!/^https:\/\/[^/?#]+$/.test(config.rbOrigin||''))throw fail('INVALID_REFERRAL_ORIGIN',503);const c=await connector.paymentContext();const lock=(await q.query(`SELECT * FROM ${t('referral_bunny_platform')} WHERE id=1 FOR UPDATE`)).rows[0];if(lock.generation!==c.generation||lock.disconnected_at||!lock.payments_authorized)throw fail('CONNECTION_CHANGED');return c;}
 async function prepare(limit=20){return db.transaction(async q=>{
  const c=await context(q);const sources=(await q.query(`SELECT r.*,p.id AS payment_delivery_id,p.payload AS payment_payload,p.gross_minor AS original_gross,p.status AS payment_status,t.gross_minor AS transaction_gross
    FROM ${t('referral_bunny_provider_refunds')} r JOIN ${t('referral_bunny_payments')} p ON p.provider_payment_id=r.provider_payment_id AND p.connection_id=$1 AND p.payload IS NOT NULL
    JOIN ${t('payment_transactions')} t ON t.provider_payment_id=r.provider_payment_id AND t.livemode=TRUE AND t.company_id=p.company_id
    WHERE r.livemode=TRUE AND NOT EXISTS(SELECT 1 FROM ${t('referral_bunny_refunds')} d WHERE d.connection_id=$1 AND d.refund_id=r.refund_id)
    ORDER BY r.occurred_at,r.refund_id LIMIT $2`,[c.connection_id,Math.min(100,Math.max(1,limit))])).rows;
  let queued=0,held=0;
  for(const r of sources){const payment=JSON.parse(r.payment_payload),gross=Number(r.original_gross || r.transaction_gross),amount=Number(r.amount_minor);
   const prior=(await q.query(`SELECT COALESCE(SUM(gross_minor),0)::text AS gross,COALESCE(SUM(net_minor),0)::text AS net,COUNT(*)::int AS count,COUNT(*) FILTER(WHERE status='held')::int AS held FROM ${t('referral_bunny_refunds')} WHERE payment_delivery_id=$1`,[r.payment_delivery_id])).rows[0];
   let reason=null,net=0,payload=null;
   try{
    if(prior.held)throw fail('EARLIER_REFUND_HELD');
    if(payment.currency!==r.currency||new Date(r.occurred_at)<new Date(payment.occurred_at))throw fail('REFUND_PAYMENT_MISMATCH');
    net=proportional(payment.amount_minor,gross,Number(prior.gross)+amount)-Number(prior.net);
    payload=JSON.stringify({event_id:'gh-refund-'+crypto.createHash('sha256').update(r.refund_id).digest('hex'),type:'refund',customer_id:payment.customer_id,invoice_id:payment.invoice_id,currency:payment.currency,amount_minor:net,occurred_at:new Date(r.occurred_at).toISOString()});
   }catch(e){reason=e.code||'REFUND_AMOUNT_INVALID';}
   const id=crypto.createHash('sha256').update(c.connection_id+':'+r.refund_id).digest('hex');
   await q.query(`INSERT INTO ${t('referral_bunny_refunds')}(id,connection_id,refund_id,payment_delivery_id,gross_minor,net_minor,ordinal,payload,status,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,c.connection_id,r.refund_id,r.payment_delivery_id,amount,net,prior.count+1,payload,reason?'held':'pending',reason]);
   reason?held++:queued++;
   // A previously held original may now proceed only when its refund evidence is complete.
   if(!reason && r.payment_status==='held')await q.query(`UPDATE ${t('referral_bunny_payments')} SET status='pending',reason=NULL WHERE id=$1 AND reason='PAYMENT_CHANGED'`,[r.payment_delivery_id]);
  }return {queued,held};
 });}
 async function deliverNext(){return db.transaction(async q=>{
  const c=await context(q);const row=(await q.query(`SELECT d.* FROM ${t('referral_bunny_refunds')} d JOIN ${t('referral_bunny_payments')} p ON p.id=d.payment_delivery_id
    WHERE d.connection_id=$1 AND d.status IN ('pending','failed') AND (d.next_attempt_at IS NULL OR d.next_attempt_at<=NOW()) AND p.status='delivered'
    AND NOT EXISTS(SELECT 1 FROM ${t('referral_bunny_refunds')} earlier WHERE earlier.payment_delivery_id=d.payment_delivery_id AND earlier.ordinal<d.ordinal AND earlier.status<>'delivered')
    ORDER BY d.created_at,d.ordinal LIMIT 1 FOR UPDATE OF d`,[c.connection_id])).rows[0];if(!row)return {processed:false};
  let delivered=Number(row.net_minor)===0,error;
  if(!delivered){const timestamp=String(Math.floor(Date.now()/1000));try{const result=await transport(config.rbOrigin+'/api/program-connections/'+encodeURIComponent(c.connection_id)+'/events',row.payload,{'Content-Type':'application/json','Accept':'application/json','X-RB-Timestamp':timestamp,'X-RB-Signature':crypto.createHmac('sha256',c.secret).update(timestamp+'.'+row.payload).digest('hex')});delivered=result.received===true;}catch(e){error=e;} }
  return record(q,t('referral_bunny_refunds'),row,delivered,error,Number(row.net_minor)===0);
 });}
 return {prepare,deliverNext};
}
module.exports={refundIntake,refunds,normalized,proportional};
