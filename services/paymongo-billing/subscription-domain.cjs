'use strict';
const crypto=require('crypto');
const {fail}=require('./security.cjs');
const id=()=>crypto.randomBytes(16).toString('hex');
function termEnd(start,cycle) {
 const s=new Date(start),month=s.getUTCMonth()+(cycle==='annual'?12:1);
 const day=s.getUTCDate();s.setUTCDate(1);s.setUTCMonth(month);
 const last=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0)).getUTCDate();s.setUTCDate(Math.min(day,last));return s;
}
function domain(schema) {
 const t=n=>schema+'.'+n;
 async function current(q,companyId) {
  const r=await q.query(`SELECT cs.*,ctid::text AS row_tid FROM ${t('companies_subscription')} cs WHERE company_id=$1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,[companyId]);return r.rows[0] || null;
 }
 async function effective(q,companyId,now) {
  const s=await current(q,companyId);if(!s)return null;
  let caps=s.effective_entitlements;
  if(!caps && s.billing_plan_version_id) {const p=await q.query(`SELECT entitlements FROM ${t('billing_plan_versions')} WHERE id=$1`,[s.billing_plan_version_id]);caps=p.rows[0] && p.rows[0].entitlements;}
  if(!caps) return {planCode:s.plan_slug || null,planVersionId:null,billingCycle:s.billing_cycle,status:s.sub_status,periodStart:s.period_start,periodEnd:s.period_end,entitlements:null,billingRevision:s.billing_revision};
  const addons=await q.query(`SELECT COALESCE(SUM(bytes),0)::text AS bytes FROM ${t('subscription_storage_addons')} WHERE company_id=$1 AND status='ACTIVE' AND period_start<=$2 AND period_end>$2`,[companyId,now || new Date()]);
  const bytes=Number(addons.rows[0].bytes);const result=Object.assign({},caps);
  if(Number.isSafeInteger(result.storage)) result.storage+=bytes;
  return {planCode:s.plan_slug,planVersionId:s.billing_plan_version_id,billingCycle:s.billing_cycle,billingMode:'UPFRONT',status:s.sub_status,periodStart:s.period_start,periodEnd:s.period_end,entitlements:result,addonStorageBytes:bytes,billingRevision:s.billing_revision};
 }
 async function fulfill(q,attempt,version,now) {
  const before=await current(q,attempt.company_id);
  const revision=before ? before.billing_revision : 0;
  if(attempt.purchase_type!=='STORAGE_ADDON' && revision!==attempt.source_revision) throw fail('PAYMENT_SUBSCRIPTION_CHANGED',422);
  if(attempt.purchase_type==='STORAGE_ADDON') {
   if(!before || !before.is_paid || ['cancelled','canceled','suspended'].includes(before.sub_status) || !before.period_end || new Date(before.period_end)<=now) throw fail('ADDON_NOT_AVAILABLE',422);
   const active=await q.query(`SELECT id FROM ${t('subscription_storage_addons')} WHERE company_id=$1 AND package_code=$2 AND status='ACTIVE' AND period_end>$3`,[attempt.company_id,attempt.addon_code,now]);
   if(active.rows.length)throw fail('ADDON_ALREADY_ACTIVE',422);
   const p=await q.query(`SELECT * FROM ${t('billing_storage_packages')} WHERE code=$1`,[attempt.addon_code]);
   await q.query(`INSERT INTO ${t('subscription_storage_addons')}(id,attempt_id,company_id,package_code,bytes,amount_minor,period_start,period_end) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id(),attempt.id,attempt.company_id,attempt.addon_code,p.rows[0].bytes,attempt.expected_amount_minor,now,termEnd(now,'monthly')]);
   return {event:'STORAGE_ADDON_ACTIVATED',engagementEvent:'STORAGE_ADDON_ACTIVATED',before,after:await effective(q,attempt.company_id,now)};
  }
  let caps=version.entitlements;
  if(attempt.approved_order_id) {
   const order=await q.query(`SELECT * FROM ${t('billing_approved_orders')} WHERE id=$1 AND company_id=$2 AND status='APPROVED' FOR UPDATE`,[attempt.approved_order_id,attempt.company_id]);
   if(!order.rows.length || new Date(order.rows[0].expires_at)<now) throw fail('ENTERPRISE_ORDER_NOT_APPROVED',422);
   caps=order.rows[0].custom_entitlements;
   await q.query(`UPDATE ${t('billing_approved_orders')} SET status='PAID' WHERE id=$1`,[attempt.approved_order_id]);
  }
  const start=attempt.purchase_type==='SUBSCRIPTION_RENEWAL' && before && before.period_end && new Date(before.period_end)>now ? new Date(before.period_end) : now;
  const end=termEnd(start,attempt.billing_cycle);
  const trial=before && (before.subscription_id===1 || before.plan_slug==='free_trial');
  const params=[version.legacy_subscription_id || (before && before.subscription_id) || null,version.plan_code,version.id,attempt.billing_cycle,start,end,JSON.stringify(caps),attempt.expected_amount_minor,attempt.id,version.catalog_version,trial,attempt.company_id];
  if(before) {
   params.push(before.row_tid);
   await q.query(`UPDATE ${t('companies_subscription')} SET subscription_id=$1,plan_slug=$2,billing_plan_version_id=$3,billing_cycle=$4::varchar,period_start=$5::timestamptz,period_end=$6,effective_entitlements=$7,
    agreed_monthly_minor=CASE WHEN $4::varchar='monthly' THEN $8::bigint ELSE NULL END,agreed_annual_minor=CASE WHEN $4::varchar='annual' THEN $8::bigint ELSE NULL END,billing_payment_attempt_id=$9,
    engagement_plan_version=$10,trial_converted_at=CASE WHEN $11 THEN $5::timestamptz ELSE trial_converted_at END,is_paid=TRUE,sub_status='active',payment_date=$5::timestamptz,billing_revision=billing_revision+1,created_at=$5::timestamptz
    WHERE company_id=$12 AND ctid=$13::tid`,params);
  }else await q.query(`INSERT INTO ${t('companies_subscription')}(subscription_id,plan_slug,billing_plan_version_id,billing_cycle,period_start,period_end,effective_entitlements,agreed_monthly_minor,agreed_annual_minor,billing_payment_attempt_id,engagement_plan_version,trial_converted_at,company_id,is_paid,sub_status,created_at,payment_date,billing_revision)
   VALUES($1,$2,$3,$4::varchar,$5::timestamptz,$6,$7,CASE WHEN $4::varchar='monthly' THEN $8::bigint ELSE NULL END,CASE WHEN $4::varchar='annual' THEN $8::bigint ELSE NULL END,$9,$10,CASE WHEN $11 THEN $5::timestamptz ELSE NULL END,$12,TRUE,'active',$5::timestamptz,$5::timestamptz,1)`,params);
  const after=await effective(q,attempt.company_id,now);
  const event=trial?'TRIAL_CONVERTED':attempt.purchase_type==='SUBSCRIPTION_UPGRADE'?'SUBSCRIPTION_UPGRADED':attempt.purchase_type==='SUBSCRIPTION_RENEWAL'?'SUBSCRIPTION_RENEWED':'SUBSCRIPTION_ACTIVATED';
  return {event,engagementEvent:trial?'TRIAL_CONVERTED':event==='SUBSCRIPTION_RENEWED'?'SUBSCRIPTION_RENEWED':'UPGRADE_COMPLETED',before,after};
 }
 return {current,effective,fulfill};
}
module.exports={domain,termEnd};
