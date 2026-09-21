'use strict';
const crypto=require('crypto');
const {verify,normalize,assertRuntime,fail}=require('./security.cjs');
const {domain}=require('./subscription-domain.cjs');
const {isAdmin}=require('../subscription-engagement/suppression.cjs');
const id=()=>crypto.randomBytes(16).toString('hex');
function billing(db,schema,config,provider) {
 if(!/^[a-z_][a-z0-9_]*$/i.test(schema)) throw fail('PAYMONGO_CONFIGURATION_INVALID',503);
 const t=n=>schema+'.'+n;const subscriptions=domain(schema);
 const clock=()=>config.clock?new Date(config.clock()):new Date();
 const log=(code,props)=> {if(config.log)config.log(code,props || {});};
 async function audit(q,companyId,uid,attemptId,event,props,paymentId) {
  await q.query(`INSERT INTO ${t('billing_audit_events')}(company_id,actor_uid,attempt_id,provider_payment_id,event_type,properties) VALUES($1,$2,$3,$4,$5,$6)`,[companyId,uid,attemptId,paymentId || null,event,JSON.stringify(props || {})]);
 }
 async function resolve(uid) {
  assertRuntime(config);
  const r=await db.query(`SELECT ce.company_id,CASE WHEN c.created_by=$1 THEN 'BILLING_OWNER' ELSE COALESCE(m.role,'RECRUITER') END AS role FROM ${t('company_employees')} ce JOIN ${t('companies')} c ON c.company_id=ce.company_id JOIN ${t('user_credentials')} u ON u.uid=ce.employee_uuid AND u.role=2 AND u.is_archive=FALSE LEFT JOIN ${t('engagement_members')} m ON m.company_id=ce.company_id AND m.recipient_uid=ce.employee_uuid WHERE ce.employee_uuid=$1`,[uid]);
  if(r.rows.length!==1 || !isAdmin(r.rows[0].role)) throw fail('BILLING_FORBIDDEN',403);
  return {companyId:r.rows[0].company_id,uid,role:r.rows[0].role};
 }
 async function lock(q,companyId) {await q.query('SELECT pg_advisory_xact_lock(hashtext($1))',['billing:'+companyId]);}
 async function engage(q,companyId,type,key) {
  // The event and financial mutation commit together. No email provider in webhook processing.
  await q.query(`INSERT INTO ${t('engagement_events')}(id,company_id,event_key,type,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(company_id,event_key) DO NOTHING`,[id(),companyId,key,type,JSON.stringify({type,key})]);
 }
 async function plan(q,planId) {const r=await q.query(`SELECT * FROM ${t('billing_plan_versions')} WHERE id=$1`,[planId]);return r.rows[0] || null;}
 function money(value) {const n=Number(value);if(!Number.isSafeInteger(n)||n<100||n>999999999999) throw fail('BILLING_PRICE_NOT_APPROVED',422);return n;}
 async function price(q,context,input) {
  const current=await subscriptions.current(q,context.companyId);
  if(current && current.is_paid && !current.billing_plan_version_id)throw fail('BILLING_AGREEMENT_REQUIRED',422);
  const cycle=input.billingCycle || 'monthly';if(!['monthly','annual'].includes(cycle)) throw fail('INVALID_BILLING_CYCLE',422);
  const revision=current ? current.billing_revision : 0;
  if(input.packageCode) {
   const p=await q.query(`SELECT * FROM ${t('billing_storage_packages')} WHERE code=$1 AND available=TRUE`,[input.packageCode]);
   if(!p.rows.length || cycle!=='monthly' || !current || !current.is_paid || !current.period_end || new Date(current.period_end)<=clock() || ['canceled','cancelled','suspended'].includes(current.sub_status)) throw fail('ADDON_NOT_AVAILABLE',422);
   const existing=await q.query(`SELECT id FROM ${t('subscription_storage_addons')} WHERE company_id=$1 AND package_code=$2 AND status='ACTIVE' AND period_end>$3`,[context.companyId,input.packageCode,clock()]);
   if(existing.rows.length) throw fail('ADDON_ALREADY_ACTIVE',409);
   return {purchaseType:'STORAGE_ADDON',version:null,amount:money(p.rows[0].monthly_minor),addon:input.packageCode,cycle,revision,order:null};
  }
  if(input.enterpriseOrderId) {
   const r=await q.query(`SELECT * FROM ${t('billing_approved_orders')} WHERE id=$1 AND company_id=$2 AND status='APPROVED' AND expires_at>$3`,[input.enterpriseOrderId,context.companyId,clock()]);
   if(!r.rows.length) throw fail('ENTERPRISE_ORDER_NOT_APPROVED',422);
   const order=r.rows[0],version=await plan(q,order.plan_version_id);
   if(!version || version.plan_code!=='enterprise' || version.self_serve || input.planCode!=='enterprise' || cycle!==order.billing_cycle) throw fail('ENTERPRISE_ORDER_NOT_APPROVED',422);
   return {purchaseType:'ENTERPRISE_INVOICE',version,amount:money(order.amount_minor),cycle,revision,order:order.id,addon:null};
  }
  if(!['starter','growth','premium'].includes(input.planCode)) throw fail('INVALID_PLAN',422);
  const operation=input.operation || 'change';if(!['change','renewal'].includes(operation)) throw fail('UPGRADE_NOT_ALLOWED',422);
  let version,amount,purchaseType;
  if(operation==='renewal') {
   if(!current || !current.billing_plan_version_id) throw fail('BILLING_AGREEMENT_REQUIRED',422);
   version=await plan(q,current.billing_plan_version_id);
   if(!version || version.plan_code!==input.planCode) throw fail('UPGRADE_NOT_ALLOWED',422);
   const agreed=cycle==='annual'?current.agreed_annual_minor:current.agreed_monthly_minor;
   if(agreed===null || agreed===undefined) throw fail('BILLING_AGREEMENT_REQUIRED',422);
   amount=money(agreed);purchaseType='SUBSCRIPTION_RENEWAL';
  }else {
   version=await plan(q,(config.catalogVersion || 'pricing_2026_09_21')+':'+input.planCode);
   if(!version || !version.available || !version.self_serve) throw fail('INVALID_PLAN',422);
   const codes=['free_trial','starter','growth','premium','enterprise'];
   let currentCode=current && current.plan_slug;
   if(currentCode==='business') currentCode='premium';
   if(currentCode===input.planCode && current && current.is_paid) throw fail('SUBSCRIPTION_ALREADY_ACTIVE',409);
   if(current && current.is_paid && codes.indexOf(currentCode)>=codes.indexOf(input.planCode)) throw fail('UPGRADE_NOT_ALLOWED',422);
   amount=money(cycle==='annual'?version.annual_minor:version.monthly_minor);
   purchaseType=current && current.is_paid?'SUBSCRIPTION_UPGRADE':'SUBSCRIPTION_START';
  }
  return {purchaseType,version,amount,cycle,revision,order:null,addon:null};
 }
 function request(input) {
  const allowed=['planCode','billingCycle','operation','packageCode','enterpriseOrderId','idempotencyKey'];
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(k=>!allowed.includes(k))) throw fail('PAYMENT_REQUEST_INVALID',400);
  if(input.packageCode && (input.planCode || input.enterpriseOrderId)) throw fail('PAYMENT_REQUEST_INVALID',400);
  if(input.idempotencyKey!==undefined && (typeof input.idempotencyKey!=='string'||!/^[-A-Za-z0-9_]{8,100}$/.test(input.idempotencyKey))) throw fail('PAYMENT_REQUEST_INVALID',400);
  if(input.operation==='renewal' && !input.idempotencyKey) throw fail('PAYMENT_IDEMPOTENCY_KEY_REQUIRED',400);
 }
 function checkoutDto(a) {return {paymentAttemptId:a.id,provider:'PAYMONGO',checkoutUrl:a.checkout_url || null,status:['CREATED','CHECKOUT_CREATING','CHECKOUT_CREATED','CHECKOUT_UNKNOWN'].includes(a.status)?'PENDING':a.status,expiresAt:a.expires_at,amountMinor:Number(a.expected_amount_minor),currency:a.currency,billingCycle:a.billing_cycle,purchaseType:a.purchase_type};}
 async function checkout(context,input) {
  assertRuntime(config);request(input);
  const prepared=await db.transaction(async q=> {
   await lock(q,context.companyId);
   if(input.idempotencyKey) {
    const existing=await q.query(`SELECT * FROM ${t('payment_attempts')} WHERE company_id=$1 AND initiated_by_uid=$2 AND client_key=$3`,[context.companyId,context.uid,input.idempotencyKey]);
    if(existing.rows.length) {
     const a=existing.rows[0];
     if(a.request_hash!==crypto.createHash('sha256').update(JSON.stringify(Object.keys(input).sort().map(k=>[k,input[k]]))).digest('hex')) throw fail('PAYMENT_IDEMPOTENCY_CONFLICT',409);
     return {attempt:a,create:false};
    }
   }
   const p=await price(q,context,input);
   const fingerprint=crypto.createHash('sha256').update(JSON.stringify([p.purchaseType,p.version && p.version.id,p.addon,p.cycle,p.amount,p.revision,p.order])).digest('hex');
   await q.query(`UPDATE ${t('payment_attempts')} SET status='EXPIRED',updated_at=NOW() WHERE company_id=$1 AND fingerprint=$2 AND expires_at<$3 AND status IN ('CREATED','CHECKOUT_CREATED','PENDING')`,[context.companyId,fingerprint,clock()]);
   const existing=await q.query(`SELECT * FROM ${t('payment_attempts')} WHERE company_id=$1 AND fingerprint=$2 AND status IN ('CREATED','CHECKOUT_CREATING','CHECKOUT_CREATED','PENDING','CHECKOUT_UNKNOWN') ORDER BY created_at DESC LIMIT 1`,[context.companyId,fingerprint]);
   if(existing.rows.length)return {attempt:existing.rows[0],create:false};
   const attemptId=id(),reference='GH_PAY_'+id();
   const r=await q.query(`INSERT INTO ${t('payment_attempts')}(id,company_id,initiated_by_uid,purchase_type,plan_version_id,addon_code,approved_order_id,billing_cycle,expected_amount_minor,source_revision,fingerprint,internal_reference,status,livemode,expires_at,client_key,request_hash)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'CHECKOUT_CREATING',$13,$14,$15,$16) RETURNING *`,[attemptId,context.companyId,context.uid,p.purchaseType,p.version && p.version.id,p.addon,p.order,p.cycle,p.amount,p.revision,fingerprint,reference,config.mode==='live',new Date(+clock()+30*60000),input.idempotencyKey || null,crypto.createHash('sha256').update(JSON.stringify(Object.keys(input).sort().map(k=>[k,input[k]]))).digest('hex')]);
   await audit(q,context.companyId,context.uid,attemptId,'PAYMENT_ATTEMPT_CREATED',{amountMinor:p.amount,currency:'PHP',purchaseType:p.purchaseType});
   return {attempt:r.rows[0],create:true};
  });
  if(!prepared.create)return checkoutDto(prepared.attempt);
  try {
   const result=await provider.createLink(prepared.attempt);
   const updated=await db.transaction(async q=> {
    await lock(q,context.companyId);
    const r=await q.query(`UPDATE ${t('payment_attempts')} SET paymongo_link_id=$2,paymongo_reference_number=$3,checkout_url=$4,status=CASE WHEN status='CHECKOUT_CREATING' THEN 'PENDING' ELSE status END,updated_at=NOW() WHERE id=$1 RETURNING *`,[prepared.attempt.id,result.linkId,result.referenceNumber,result.checkoutUrl]);
    if(prepared.attempt.purchase_type!=='STORAGE_ADDON') await engage(q,context.companyId,'UPGRADE_STARTED','checkout:'+prepared.attempt.id);
    await audit(q,context.companyId,context.uid,prepared.attempt.id,'CHECKOUT_CREATED',{});
    return r.rows[0];
   });
   return checkoutDto(updated);
  }catch(e) {
   await db.query(`UPDATE ${t('payment_attempts')} SET status='CHECKOUT_UNKNOWN',failure_category='CHECKOUT_RECONCILIATION_REQUIRED',updated_at=NOW() WHERE id=$1 AND status='CHECKOUT_CREATING'`,[prepared.attempt.id]);
   await db.query(`INSERT INTO ${t('billing_reconciliation')}(id,attempt_id,reason) VALUES($1,$2,'CHECKOUT_CREATION_UNKNOWN')`,[id(),prepared.attempt.id]);
   throw fail('PAYMENT_CHECKOUT_FAILED',502);
  }
 }
 async function locate(q,n) {
  const rows=await q.query(`SELECT * FROM ${t('payment_attempts')} WHERE livemode=$1 AND (paymongo_payment_id=$2 OR paymongo_link_id=$3 OR internal_reference=$4 OR paymongo_reference_number=$5 OR paymongo_intent_id=$6)`,[n.livemode,n.paymentId,n.linkId,n.reference,n.linkReference,n.intentId]);
  if(rows.rows.length!==1) throw fail('PAYMENT_REFERENCE_INVALID',422);
  await lock(q,rows.rows[0].company_id);
  const locked=await q.query(`SELECT * FROM ${t('payment_attempts')} WHERE id=$1 FOR UPDATE`,[rows.rows[0].id]);
  const a=locked.rows[0];
  if(n.reference && a.internal_reference!==n.reference || n.linkId && a.paymongo_link_id && a.paymongo_link_id!==n.linkId || n.linkReference && a.paymongo_reference_number && a.paymongo_reference_number!==n.linkReference || n.intentId && a.paymongo_intent_id && a.paymongo_intent_id!==n.intentId) throw fail('PAYMENT_REFERENCE_INVALID',422);
  if(!n.reference && !n.linkId && !n.linkReference && !n.intentId && a.paymongo_payment_id!==n.paymentId) throw fail('PAYMENT_REFERENCE_INVALID',422);
  return a;
 }
 async function review(q,event,code,attemptId) {
  await q.query(`UPDATE ${t('payment_webhook_events')} SET status='needs_reconciliation',last_error_code=$2,attempt_id=$3,updated_at=NOW() WHERE provider='paymongo' AND event_id=$1`,[event.id,code,attemptId || null]);
  await q.query(`INSERT INTO ${t('billing_reconciliation')}(id,event_id,attempt_id,reason) VALUES($1,$2,$3,$4) ON CONFLICT(event_id) DO NOTHING`,[id(),event.id,attemptId || null,code]);
  if(attemptId)await q.query(`UPDATE ${t('payment_attempts')} SET failure_category='RECONCILIATION_REQUIRED' WHERE id=$1 AND status<>'PAID'`,[attemptId]);
  log(code==='PAYMENT_AMOUNT_MISMATCH'?'PAYMONGO_AMOUNT_MISMATCH':'PAYMONGO_RECONCILIATION_REQUIRED',{eventId:event.id,code});
  return {httpStatus:202,status:'REVIEW',code};
 }
 async function invoice(q,a,n,version,result) {
  const seq=await q.query(`SELECT nextval('${schema}.invoice_number_seq')::text AS n`);
  const num=seq.rows[0].n;const number='GTH-'+clock().getUTCFullYear()+'-'+num.padStart(6,'0');
  const r=await q.query(`INSERT INTO ${t('invoices')}(billing_attempt_id,company_id,subscription_id,transaction_id,invoice_number,invoice_sequence,status,currency,subtotal_amount,total_amount,amount_paid,amount_due,plan_slug,plan_name,billing_cycle,billing_period_start,billing_period_end,issued_at,paid_at,payment_reference,payment_method_label,line_items_json)
   VALUES($1,$2,$3,$4,$5,$6,'paid','PHP',$7::numeric/100,$7::numeric/100,$7::numeric/100,0,$8,$8,$9,$10,$11,$12,$12,$4,$13,$14) RETURNING id`,[a.id,a.company_id,version && version.legacy_subscription_id,n.paymentId,number,num,n.amount,version ? version.plan_code : 'Storage add-on',a.billing_cycle,result.after.periodStart,result.after.periodEnd,clock(),n.method,JSON.stringify([{description:version ? version.plan_code+' subscription' : a.addon_code,quantity:1,amountMinor:n.amount,currency:'PHP'}])]);
  await q.query(`INSERT INTO ${t('invoice_events')}(invoice_id,company_id,event_type,event_source,metadata_json) VALUES($1,$2,'payment_confirmed','paymongo',$3)`,[r.rows[0].id,a.company_id,JSON.stringify({paymentAttemptId:a.id,amountMinor:n.amount})]);
 }
 async function process(event) {
  assertRuntime(config);let attemptId;
  try {
   return await db.transaction(async q=> {
    await q.query(`INSERT INTO ${t('payment_webhook_events')}(provider,event_id,event_type,provider_object_id,livemode,payload_hash,status) VALUES('paymongo',$1,$2,$3,$4,$5,'received') ON CONFLICT(provider,event_id) DO NOTHING`,[event.id,event.type,event.resource.id,event.livemode,event.hash]);
    const ledger=await q.query(`SELECT * FROM ${t('payment_webhook_events')} WHERE provider='paymongo' AND event_id=$1 FOR UPDATE`,[event.id]);
    const l=ledger.rows[0];
    if(l.payload_hash!==event.hash || l.livemode!==event.livemode) throw fail('PAYMONGO_EVENT_ID_CONFLICT',409);
    if(['processed','ignored'].includes(l.status)) {log('PAYMONGO_WEBHOOK_DUPLICATE',{eventId:event.id});return {httpStatus:200,status:'DUPLICATE',code:'PAYMENT_ALREADY_PROCESSED'};}
    await q.query(`UPDATE ${t('payment_webhook_events')} SET status='processing',internal_attempt_count=internal_attempt_count+1,updated_at=NOW() WHERE provider='paymongo' AND event_id=$1`,[event.id]);
    if(!['link.payment.paid','payment.paid','payment.failed'].includes(event.type)) {
     await q.query(`UPDATE ${t('payment_webhook_events')} SET status='ignored',processed_at=NOW() WHERE provider='paymongo' AND event_id=$1`,[event.id]);return {httpStatus:200,status:'IGNORED'};
    }
    let n,a;
    try {n=normalize(event);await q.query(`UPDATE ${t('payment_webhook_events')} SET safe_event=$2 WHERE provider='paymongo' AND event_id=$1`,[event.id,JSON.stringify(n)]);a=await locate(q,n);}catch(e){return review(q,event,e.code || 'PAYMENT_REFERENCE_INVALID',null);}
    attemptId=a.id;
    await lock(q,a.company_id);
    await q.query(`UPDATE ${t('payment_webhook_events')} SET safe_event=$2,attempt_id=$3,local_company_id=$4 WHERE provider='paymongo' AND event_id=$1`,[event.id,JSON.stringify(n),a.id,a.company_id]);
    if(Number(a.expected_amount_minor)!==n.amount) return review(q,event,'PAYMENT_AMOUNT_MISMATCH',a.id);
    if(n.currency!==a.currency || n.currency!=='PHP') return review(q,event,'PAYMENT_CURRENCY_MISMATCH',a.id);
    if(a.livemode!==event.livemode) return review(q,event,'PAYMONGO_MODE_MISMATCH',a.id);
    if(a.status==='PAID') {
     if(n.status==='paid' && a.paymongo_payment_id!==n.paymentId) return review(q,event,'PAYMENT_SECOND_SUCCESS_REVIEW',a.id);
     await q.query(`UPDATE ${t('payment_webhook_events')} SET status='processed',processed_at=NOW() WHERE provider='paymongo' AND event_id=$1`,[event.id]);return {httpStatus:200,status:'DUPLICATE',code:'PAYMENT_ALREADY_PROCESSED'};
    }
    if(['CANCELLED','EXPIRED','REVIEW'].includes(a.status) || new Date(a.expires_at)<clock()) return review(q,event,'PAYMENT_ATTEMPT_EXPIRED',a.id);
    if(n.status==='failed') {
     const alreadyFailed=a.status==='FAILED';
     await q.query(`UPDATE ${t('payment_attempts')} SET status='FAILED',paymongo_payment_id=$2,paymongo_intent_id=COALESCE(paymongo_intent_id,$3),failure_category='PAYMENT_UNSUCCESSFUL',failed_at=$4,updated_at=NOW() WHERE id=$1`,[a.id,n.paymentId,n.intentId,clock()]);
     if(!alreadyFailed || a.paymongo_payment_id!==n.paymentId) await engage(q,a.company_id,alreadyFailed?'PAYMENT_RETRY_FAILED':'PAYMENT_FAILED','failure:'+a.id+':'+n.paymentId);
     await audit(q,a.company_id,a.initiated_by_uid,a.id,'PAYMENT_FAILED',{amountMinor:n.amount,currency:n.currency,safeFailureCategory:'PAYMENT_UNSUCCESSFUL'},n.paymentId);
     log('PAYMONGO_PAYMENT_FAILED',{attemptId:a.id});
    }else {
     const version=a.plan_version_id?await plan(q,a.plan_version_id):null;
     if(a.purchase_type!=='STORAGE_ADDON' && !version) return review(q,event,'INVALID_PLAN',a.id);
     // Cross-attempt payment reuse cannot grant a second order.
     const existing=await q.query(`SELECT attempt_id FROM ${t('payment_transactions')} WHERE livemode=$1 AND provider_payment_id=$2`,[event.livemode,n.paymentId]);
     if(existing.rows.length && existing.rows[0].attempt_id!==a.id)return review(q,event,'PAYMENT_REFERENCE_INVALID',a.id);
     const fulfillmentKey=a.purchase_type==='STORAGE_ADDON'?'addon:'+a.id:[a.purchase_type,a.plan_version_id,a.source_revision,a.approved_order_id || ''].join(':');
     const fulfilled=await q.query(`SELECT attempt_id FROM ${t('billing_fulfillments')} WHERE company_id=$1 AND fulfillment_key=$2`,[a.company_id,fulfillmentKey]);
     if(fulfilled.rows.length) return review(q,event,'PAYMENT_DUPLICATE_FULFILLMENT',a.id);
     // Validate current revision/approved order before any irreversible financial/domain inserts.
     const before=await subscriptions.current(q,a.company_id);
     if(a.purchase_type!=='STORAGE_ADDON' && (before ? before.billing_revision : 0)!==a.source_revision) return review(q,event,'PAYMENT_SUBSCRIPTION_CHANGED',a.id);
     await q.query('SAVEPOINT fulfillment_validation');
     let result;try{result=await subscriptions.fulfill(q,a,version,clock());}catch(e){if(e.httpStatus===422){await q.query('ROLLBACK TO SAVEPOINT fulfillment_validation');return review(q,event,e.code,a.id);}throw e;}
     await q.query('RELEASE SAVEPOINT fulfillment_validation');
     await q.query(`INSERT INTO ${t('payment_transactions')}(id,attempt_id,company_id,provider_payment_id,livemode,gross_minor,currency,status,payment_method_summary,paid_at) VALUES($1,$2,$3,$4,$5,$6,$7,'PAID',$8,$9)`,[id(),a.id,a.company_id,n.paymentId,event.livemode,n.amount,n.currency,n.method,clock()]);
     await q.query(`INSERT INTO ${t('billing_fulfillments')}(attempt_id,company_id,fulfillment_key) VALUES($1,$2,$3)`,[a.id,a.company_id,fulfillmentKey]);
     await invoice(q,a,n,version,result);
     await q.query(`UPDATE ${t('payment_attempts')} SET status='PAID',paymongo_payment_id=$2,paymongo_intent_id=COALESCE(paymongo_intent_id,$3),paid_at=$4,failure_category=NULL,updated_at=NOW() WHERE id=$1`,[a.id,n.paymentId,n.intentId,clock()]);
     await q.query(`INSERT INTO ${t('subscription_billing_history')}(id,company_id,attempt_id,event_type,previous_snapshot,new_snapshot) VALUES($1,$2,$3,$4,$5,$6)`,[id(),a.company_id,a.id,result.event,JSON.stringify(result.before),JSON.stringify(result.after)]);
     await engage(q,a.company_id,result.engagementEvent,'fulfillment:'+a.id);
     await audit(q,a.company_id,a.initiated_by_uid,a.id,'PAYMENT_CONFIRMED',{amountMinor:n.amount,currency:n.currency,purchaseType:a.purchase_type},n.paymentId);
     await audit(q,a.company_id,a.initiated_by_uid,a.id,result.event,{planVersionId:a.plan_version_id},n.paymentId);
     log('PAYMONGO_PAYMENT_CONFIRMED',{attemptId:a.id});
    }
    await q.query(`UPDATE ${t('payment_webhook_events')} SET status='processed',processed_at=NOW(),last_error_code=NULL,provider_payment_id=$2,local_transaction_id=$2 WHERE provider='paymongo' AND event_id=$1`,[event.id,n.paymentId]);
    await q.query(`UPDATE ${t('billing_reconciliation')} SET status='RESOLVED',resolved_at=NOW() WHERE event_id=$1`,[event.id]);
    return {httpStatus:200,status:'PROCESSED'};
   });
  }catch(e) {
   // Transaction rolled back entirely. Persist a retryable diagnostic, never a raw provider payload/error.
   if(e.code==='PAYMONGO_EVENT_ID_CONFLICT') throw e;
   await db.query(`INSERT INTO ${t('payment_webhook_events')}(provider,event_id,event_type,provider_object_id,livemode,payload_hash,status,last_error_code,internal_attempt_count) VALUES('paymongo',$1,$2,$3,$4,$5,'failed','PAYMONGO_PROCESSING_FAILED',1)
    ON CONFLICT(provider,event_id) DO UPDATE SET status=CASE WHEN ${t('payment_webhook_events')}.status IN ('processed','ignored') THEN ${t('payment_webhook_events')}.status ELSE 'failed' END,last_error_code='PAYMONGO_PROCESSING_FAILED',internal_attempt_count=${t('payment_webhook_events')}.internal_attempt_count+1,updated_at=NOW()`,[event.id,event.type,event.resource.id,event.livemode,event.hash]);
   log('PAYMONGO_PROCESSING_FAILED',{eventId:event.id,attemptId});throw fail('PAYMONGO_PROCESSING_FAILED',503);
  }
 }
 async function webhook(raw,header) {
  assertRuntime(config);let event;
  try {event=verify(raw,header,config.webhookSecret,config.mode,Math.floor(+clock()/1000));}catch(e){log('PAYMONGO_WEBHOOK_INVALID',{code:e.code});throw e;}
  log('PAYMONGO_WEBHOOK_RECEIVED',{eventId:event.id,type:event.type});return process(event);
 }
 async function status(context,attemptId) {
  assertRuntime(config);
  const r=await db.query(`SELECT * FROM ${t('payment_attempts')} WHERE id=$1 AND company_id=$2 AND livemode=$3`,[attemptId,context.companyId,config.mode==='live']);
  if(!r.rows.length)throw fail('PAYMENT_ATTEMPT_NOT_FOUND',404);
  const a=r.rows[0];
  const dto=checkoutDto(a);delete dto.checkoutUrl;
  if(new Date(a.expires_at)<clock() && ['CREATED','CHECKOUT_CREATING','CHECKOUT_CREATED','PENDING'].includes(a.status))dto.status='EXPIRED';
  if(dto.status==='REVIEW')dto.status='PENDING';
  dto.safeFailureCategory=a.failure_category || null;
  if(a.status==='PAID')dto.subscription=await db.transaction(q=>subscriptions.effective(q,context.companyId,clock()));
  return dto;
 }
 async function effective(context) {assertRuntime(config);return db.transaction(q=>subscriptions.effective(q,context.companyId,clock()));}
 async function history(context) {
  assertRuntime(config);
  const r=await db.query(`SELECT i.id,i.invoice_number,i.issued_at,i.plan_slug,i.status,i.currency,(i.total_amount*100)::text AS amount_minor,i.payment_method_label,i.billing_cycle FROM ${t('invoices')} i WHERE company_id=$1 ORDER BY issued_at DESC LIMIT 100`,[context.companyId]);
  return {items:r.rows.map(x=>({id:x.id,reference:x.invoice_number,date:x.issued_at,plan:x.plan_slug,description:x.plan_slug || 'GetHired purchase',amountMinor:Number(x.amount_minor),currency:x.currency,status:x.status.toUpperCase(),paymentMethodSummary:x.payment_method_label,billingCycle:x.billing_cycle}))};
 }
 async function reconcile(attemptId,operator) {
  assertRuntime(config);if(!operator || operator.authorized!==true || !operator.uid)throw fail('BILLING_FORBIDDEN',403);
  const r=await db.query(`SELECT * FROM ${t('payment_attempts')} WHERE id=$1 AND livemode=$2`,[attemptId,config.mode==='live']);
  if(!r.rows.length)throw fail('PAYMENT_ATTEMPT_NOT_FOUND',404);
  const a=r.rows[0];if(!a.paymongo_link_id)throw fail('PAYMENT_REFERENCE_INVALID',422);
  const resource=await provider.retrieveLink(a.paymongo_link_id);
  if(!resource || resource.id!==a.paymongo_link_id)throw fail('PAYMENT_REFERENCE_INVALID',422);
  const attrs=resource.attributes || resource;
  if(attrs.livemode!==a.livemode || attrs.remarks!==a.internal_reference)throw fail('PAYMENT_REFERENCE_INVALID',422);
  if(attrs.status!=='paid' || !attrs.payments || !attrs.payments.length)return {status:'PENDING'};
  const normalized=normalize({type:'link.payment.paid',livemode:a.livemode,resource});
  const eventId='evt_reconcile_'+crypto.createHash('sha256').update(a.id+normalized.paymentId).digest('hex');
  const result=await process({id:eventId,type:'link.payment.paid',livemode:a.livemode,resource,hash:crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex')});
  await audit(db,a.company_id,operator.uid,a.id,'PAYMENT_RECONCILED',{result:result.status},normalized.paymentId);
  return result;
 }
 async function preview(context,input) {assertRuntime(config);request(input);return db.transaction(async q=>{await lock(q,context.companyId);const p=await price(q,context,input);return {planVersionId:p.version && p.version.id,purchaseType:p.purchaseType,amountMinor:p.amount,currency:'PHP',billingCycle:p.cycle,billingMode:'UPFRONT',entitlements:p.version && p.version.entitlements,proration:false};});}
 async function observability(operator) {
  assertRuntime(config);if(!operator || !operator.authorized)throw fail('BILLING_FORBIDDEN',403);
  const counts=await db.query(`SELECT status,COUNT(*)::int AS count FROM ${t('payment_webhook_events')} WHERE provider='paymongo' GROUP BY status`);
  const reviews=await db.query(`SELECT reason,COUNT(*)::int AS count FROM ${t('billing_reconciliation')} WHERE status='OPEN' GROUP BY reason`);
  return {webhooks:counts.rows,reconciliation:reviews.rows};
 }
 return {resolve,checkout,preview,webhook,status,effective,history,reconcile,observability};
}
module.exports={billing};
