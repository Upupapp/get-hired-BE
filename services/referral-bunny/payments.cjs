'use strict';
const {record}=require('./retry.cjs');
const crypto=require('crypto');
const fail=(code)=>Object.assign(new Error(code),{code});
function cents(value){if(!/^\d+(?:\.0+)?$/.test(String(value)))throw fail('INVALID_INVOICE_AMOUNT');const n=Number(value);if(!Number.isSafeInteger(n)||n>10000000000)throw fail('INVALID_INVOICE_AMOUNT');return n;}
function paymentBody(row,first){
 const gross=cents(row.gross_minor),paid=cents(row.paid_minor),total=cents(row.total_minor),tax=cents(row.tax_minor),subtotal=cents(row.subtotal_minor),discount=cents(row.discount_minor);
 if(gross!==cents(row.expected_amount_minor)||gross!==paid||gross!==total||subtotal-discount+tax!==total||tax>=gross||discount>subtotal)throw fail('INVOICE_AMOUNT_MISMATCH');
 if(row.currency!=='PHP'||row.invoice_currency!==row.currency||row.attempt_currency!==row.currency)throw fail('CURRENCY_MISMATCH');
 if(!row.referred_at||!row.user_created_at||!row.company_created_at||new Date(row.referred_at)>new Date(row.paid_at)||new Date(row.user_created_at)<new Date(row.referred_at)||new Date(row.company_created_at)<new Date(row.referred_at))throw fail('EXISTING_CUSTOMER');
 if(first && (!Number.isFinite(+new Date(row.user_created_at)) || +new Date(row.paid_at)<+new Date(row.user_created_at) || +new Date(row.paid_at)>+new Date(row.user_created_at)+30*86400000))throw fail('ATTRIBUTION_EXPIRED');
 return {event_id:'gh-payment-'+crypto.createHash('sha256').update(row.provider_payment_id).digest('hex'),type:'payment',customer_id:row.company_id,invoice_id:row.invoice_id,membership_id:row.membership_id,currency:row.currency,amount_minor:gross-tax,occurred_at:new Date(row.paid_at).toISOString(),referred_at:new Date(row.referred_at).toISOString(),signed_up_at:new Date(row.user_created_at).toISOString(),first_payment:first,self_referral:false};
}
function payments(db,schema,connector,config,transport){
 if(!/^[a-z_][a-z0-9_]*$/i.test(schema))throw fail('INVALID_SCHEMA');const t=n=>schema+'.'+n;
 function enabled(){if(!config.enabled)throw fail('PAYMENT_CONNECTOR_DISABLED');if(!/^https:\/\//.test(config.rbOrigin)||new URL(config.rbOrigin).origin!==config.rbOrigin)throw fail('INVALID_RECEIVER_ORIGIN');}
 async function signed(context,path,body){const timestamp=String(Math.floor(Date.now()/1000));return transport(config.rbOrigin+'/api/program-connections/'+encodeURIComponent(context.connection_id)+path,body,{'Content-Type':'application/json','Accept':'application/json','X-RB-Timestamp':timestamp,'X-RB-Signature':crypto.createHmac('sha256',context.secret).update(timestamp+'.'+body).digest('hex')});}
 async function prepare(limit=100){
  enabled();const context=await connector.paymentContext();
  return db.transaction(async q=>{
   const lock=await q.query(`SELECT * FROM ${t('referral_bunny_platform')} WHERE id=1 FOR UPDATE`);
   if(lock.rows[0].generation!==context.generation||lock.rows[0].disconnected_at||!lock.rows[0].payments_authorized)throw fail('CONNECTION_CHANGED');
   const rows=(await q.query(`SELECT i.id::text AS invoice_id,i.company_id,i.currency AS invoice_currency,
      (i.subtotal_amount*100)::text AS subtotal_minor,(i.discount_amount*100)::text AS discount_minor,
      (i.tax_amount*100)::text AS tax_minor,(i.total_amount*100)::text AS total_minor,(i.amount_paid*100)::text AS paid_minor,
      p.gross_minor,p.currency,p.paid_at,p.provider_payment_id,a.purchase_type,a.currency AS attempt_currency,a.expected_amount_minor,
      COALESCE(bound.uid,r.uid) AS uid,COALESCE(bound.membership_id,r.membership_id) AS membership_id,
      COALESCE(bound.referred_at,r.referred_at) AS referred_at,bound.first_invoice_id,
      u.email,u.created_date AS user_created_at,c.created_at AS company_created_at,
      EXISTS(SELECT 1 FROM ${t('invoices')} prior WHERE prior.company_id=i.company_id AND prior.status='paid' AND prior.amount_paid>0
        AND (prior.billing_attempt_id IS NULL OR EXISTS(SELECT 1 FROM ${t('payment_attempts')} pa WHERE pa.id=prior.billing_attempt_id AND pa.livemode=TRUE))
        AND (prior.paid_at<p.paid_at OR (prior.paid_at=p.paid_at AND prior.id::text<i.id::text)))
      OR EXISTS(SELECT 1 FROM ${t('payment_transactions')} old WHERE old.company_id=i.company_id AND old.livemode=TRUE AND old.status IN ('PAID','REFUNDED','PARTIALLY_REFUNDED') AND old.paid_at<p.paid_at) AS has_prior_paid
    FROM ${t('invoices')} i
    JOIN ${t('payment_attempts')} a ON a.id=i.billing_attempt_id AND a.company_id=i.company_id
    JOIN ${t('payment_transactions')} p ON p.attempt_id=a.id AND p.company_id=i.company_id AND p.provider_payment_id=i.transaction_id
    JOIN ${t('companies')} c ON c.company_id=i.company_id
    LEFT JOIN ${t('referral_bunny_customers')} bound ON bound.company_id=c.company_id AND bound.connection_id=$1
    LEFT JOIN ${t('referral_bunny_attributions')} r ON r.uid=c.created_by AND r.connection_id=$1 AND r.program_id=$2
    JOIN ${t('user_credentials')} u ON u.uid=COALESCE(bound.uid,r.uid) AND u.role=2 AND u.is_archive=FALSE
    WHERE to_jsonb(c)->>'account_usage' IS DISTINCT FROM 'internal' AND i.status='paid' AND i.amount_due=0 AND p.status IN (${config.refundsEnabled ? "'PAID','REFUNDED','PARTIALLY_REFUNDED'" : "'PAID'"}) AND ${config.refundsEnabled ? `(p.refund_minor=0 OR p.refund_minor=(SELECT COALESCE(SUM(r.amount_minor),0) FROM ${t('referral_bunny_provider_refunds')} r WHERE r.provider_payment_id=p.provider_payment_id AND r.livemode=TRUE))` : 'p.refund_minor=0'} AND a.status='PAID'
      AND p.livemode=TRUE AND a.livemode=TRUE AND p.provider='PAYMONGO' AND a.paymongo_payment_id=p.provider_payment_id
      AND a.purchase_type IN ('SUBSCRIPTION_START','SUBSCRIPTION_RENEWAL')
      AND EXISTS(SELECT 1 FROM ${t('payment_webhook_events')} e WHERE e.provider='paymongo' AND e.attempt_id=a.id AND e.provider_payment_id=p.provider_payment_id AND e.status='processed' AND e.livemode=TRUE)
      AND EXISTS(SELECT 1 FROM ${t('billing_fulfillments')} f WHERE f.attempt_id=a.id AND f.company_id=i.company_id)
      AND NOT EXISTS(SELECT 1 FROM ${t('referral_bunny_payments')} d WHERE d.connection_id=$1 AND (d.invoice_id=i.id::text OR d.provider_payment_id=p.provider_payment_id))
    ORDER BY p.paid_at,i.id LIMIT $3`,[context.connection_id,context.program_id,Math.min(100,Math.max(1,limit))])).rows;
   let queued=0,held=0;
   for(const row of rows){
    // Re-read binding so first purchase and renewals in this same batch stay ordered.
    const binding=(await q.query(`SELECT * FROM ${t('referral_bunny_customers')} WHERE connection_id=$1 AND company_id=$2`,[context.connection_id,row.company_id])).rows[0];
    if(binding)Object.assign(row,{uid:binding.uid,membership_id:binding.membership_id,referred_at:binding.referred_at});
    let payload=null,reason=null;
    try{
      if(!binding && (row.purchase_type!=='SUBSCRIPTION_START'||row.has_prior_paid))throw fail('PRIOR_PAYMENT_OR_MISSING_START');
      const body=paymentBody(row,!binding);
      const member=await signed(context,'/referrals/validate',JSON.stringify({membership_id:row.membership_id}));
      const fingerprint=crypto.createHmac('sha256',context.secret).update(String(row.email).trim().toLowerCase()).digest('hex');
      if(member.membershipId!==row.membership_id||!member.emailFingerprint||fingerprint===member.emailFingerprint)throw fail('REFERRAL_INELIGIBLE');
      if(!binding && (+new Date(row.user_created_at)-+new Date(row.referred_at)>Number(member.windowDays)*86400000 || !Number.isInteger(member.windowDays)))throw fail('ATTRIBUTION_EXPIRED');
      payload=JSON.stringify(body);
    }catch(e){if(!['INVALID_INVOICE_AMOUNT','INVOICE_AMOUNT_MISMATCH','CURRENCY_MISMATCH','EXISTING_CUSTOMER','PRIOR_PAYMENT_OR_MISSING_START','REFERRAL_INELIGIBLE','ATTRIBUTION_EXPIRED'].includes(e.code))throw e;reason=e.code;}
    const id=crypto.createHash('sha256').update(context.connection_id+':'+row.invoice_id).digest('hex');
    await q.query(`INSERT INTO ${t('referral_bunny_payments')}(id,connection_id,company_id,invoice_id,provider_payment_id,occurred_at,payload,status,reason,gross_minor) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,context.connection_id,row.company_id,row.invoice_id,row.provider_payment_id,row.paid_at,payload,payload?'pending':'held',reason,Number(row.gross_minor)]);
    if(payload){queued++;if(!binding)await q.query(`INSERT INTO ${t('referral_bunny_customers')}(connection_id,company_id,uid,membership_id,referred_at,first_invoice_id) VALUES($1,$2,$3,$4,$5,$6)`,[context.connection_id,row.company_id,row.uid,row.membership_id,row.referred_at,row.invoice_id]);}else held++;
   }
   return {queued,held};
  });
 }
 async function deliverNext(){
  enabled();const context=await connector.paymentContext();
  return db.transaction(async q=>{
   const lock=(await q.query(`SELECT * FROM ${t('referral_bunny_platform')} WHERE id=1 FOR UPDATE`)).rows[0];
   if(lock.generation!==context.generation||lock.disconnected_at||!lock.payments_authorized)throw fail('CONNECTION_CHANGED');
   const row=(await q.query(`SELECT d.* FROM ${t('referral_bunny_payments')} d WHERE d.connection_id=$1 AND d.status IN ('pending','failed') AND (d.next_attempt_at IS NULL OR d.next_attempt_at<=NOW())
      AND NOT EXISTS(SELECT 1 FROM ${t('referral_bunny_payments')} prior WHERE prior.connection_id=d.connection_id AND prior.company_id=d.company_id AND prior.status<>'delivered' AND (prior.occurred_at<d.occurred_at OR (prior.occurred_at=d.occurred_at AND prior.invoice_id<d.invoice_id)))
      ORDER BY d.occurred_at,d.invoice_id LIMIT 1 FOR UPDATE`,[context.connection_id])).rows[0];
   if(!row)return {processed:false};
   // A known refund or changed invoice must be reconciled before sending a reward.
   const current=(await q.query(`SELECT p.gross_minor,(i.tax_amount*100)::text AS tax_minor FROM ${t('payment_transactions')} p
      JOIN ${t('invoices')} i ON i.billing_attempt_id=p.attempt_id AND i.transaction_id=p.provider_payment_id AND i.company_id=p.company_id
      JOIN ${t('companies')} c ON c.company_id=p.company_id
      WHERE to_jsonb(c)->>'account_usage' IS DISTINCT FROM 'internal' AND p.provider_payment_id=$1 AND p.livemode=TRUE AND p.status IN (${config.refundsEnabled ? "'PAID','REFUNDED','PARTIALLY_REFUNDED'" : "'PAID'"})
      AND ${config.refundsEnabled ? `(p.refund_minor=0 OR p.refund_minor=(SELECT COALESCE(SUM(r.amount_minor),0) FROM ${t('referral_bunny_provider_refunds')} r WHERE r.provider_payment_id=p.provider_payment_id AND r.livemode=TRUE))` : 'p.refund_minor=0'}
      AND i.id::text=$2 AND i.status='paid' AND i.amount_due=0 AND i.amount_paid*100=p.gross_minor AND i.total_amount*100=p.gross_minor`,[row.provider_payment_id,row.invoice_id])).rows[0];
   if(!current || cents(current.gross_minor)-cents(current.tax_minor)!==JSON.parse(row.payload).amount_minor){
      await q.query(`UPDATE ${t('referral_bunny_payments')} SET status='held',reason='PAYMENT_CHANGED' WHERE id=$1`,[row.id]);return {processed:true,delivered:false};
   }
   if(config.refundsEnabled){
    const incomplete=(await q.query(`SELECT 1 FROM ${t('referral_bunny_provider_refunds')} r LEFT JOIN ${t('referral_bunny_refunds')} d ON d.refund_id=r.refund_id AND d.connection_id=$1
      WHERE r.provider_payment_id=$2 AND r.livemode=TRUE AND (d.id IS NULL OR d.status='held') LIMIT 1`,[context.connection_id,row.provider_payment_id])).rows.length;
    if(incomplete)return {processed:true,delivered:false,reason:'REFUND_NOT_PREPARED'};
   }
   let delivered=false,error;
   try{const result=await signed(context,'/events',row.payload);if(result.received!==true)throw fail('INVALID_RESPONSE');delivered=true;}catch(e){error=e;}
   return record(q,t('referral_bunny_payments'),row,delivered,error);
  });
 }
 return {prepare,deliverNext};
}
module.exports={payments,paymentBody};
