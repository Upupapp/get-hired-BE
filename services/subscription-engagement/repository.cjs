'use strict';
const crypto=require('crypto');
const {decide,context}=require('./engagement.cjs');
const {recommend,planFor}=require('./catalog.cjs');
const {activation}=require('./rules.cjs');
const {isAdmin,defaultPreferences}=require('./suppression.cjs');
const {validateEvent}=require('./events.cjs');
const id=()=>crypto.randomBytes(16).toString('hex');
function repository(db,schema) {
 if(!/^[a-z_][a-z0-9_]*$/i.test(schema)) throw new Error('Invalid schema');
 const t=n=>schema+'.'+n;
 const usageMeter=require('./usage-metering.cjs').metering(db,schema);
 async function enqueue(companyId,e) {
  const payload=validateEvent(e);
  const r=await db.query(`INSERT INTO ${t('engagement_events')} (id,company_id,event_key,type,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(company_id,event_key) DO NOTHING RETURNING id`,[id(),companyId,payload.key,payload.type,JSON.stringify(payload)]);
  return {queued:r.rows.length>0};
 }
 async function members(q,companyId) {
  const r=await q.query(`SELECT ce.employee_uuid AS uid, CASE WHEN c.created_by=ce.employee_uuid THEN 'BILLING_OWNER' ELSE COALESCE(m.role,'RECRUITER') END AS role, COALESCE(p.preferences,'{}'::jsonb) AS preferences
   FROM ${t('company_employees')} ce JOIN ${t('companies')} c ON c.company_id=ce.company_id
   JOIN ${t('user_credentials')} uc ON uc.uid=ce.employee_uuid AND uc.role=2 AND uc.is_archive=FALSE
   LEFT JOIN ${t('engagement_members')} m ON m.company_id=ce.company_id AND m.recipient_uid=ce.employee_uuid
   LEFT JOIN ${t('engagement_preferences')} p ON p.company_id=ce.company_id AND p.recipient_uid=ce.employee_uuid
   WHERE ce.company_id=$1`,[companyId]);
  return r.rows;
 }
 async function resolve(uid) {
  // Reject ambiguous multiple-company membership rather than choosing an arbitrary account.
  const r=await db.query(`SELECT company_id FROM ${t('company_employees')} ce JOIN ${t('user_credentials')} uc ON uc.uid=ce.employee_uuid WHERE ce.employee_uuid=$1 AND uc.role=2 AND uc.is_archive=FALSE`,[uid]);
  if(r.rows.length!==1) throw Object.assign(new Error('Employer context required'),{code:'FORBIDDEN',httpStatus:403});
  const companyId=r.rows[0].company_id;
  const recipient=(await members(db,companyId)).find(m=>m.uid===uid);
  if(!recipient) throw Object.assign(new Error('Employer membership required'),{code:'FORBIDDEN',httpStatus:403});
  return {companyId,recipient};
 }
 async function state(q,companyId) {
  const r=await q.query(`SELECT snapshot,timezone,upgraded_at,checkout_started_at,sales_active,manual_intervention,updated_at FROM ${t('engagement_accounts')} WHERE company_id=$1`,[companyId]);
  if(!r.rows.length) return null;
  const a=r.rows[0];
  return Object.assign({},a.snapshot,{companyId,timezone:a.timezone,upgradedAt:a.upgraded_at,checkoutActive:!!a.checkout_started_at && Date.now()-new Date(a.checkout_started_at)<2*3600000,
   checkoutAbandonedAt:a.checkout_started_at,salesActive:a.sales_active,manualIntervention:a.manual_intervention,updatedAt:a.updated_at});
 }
 async function history(q,companyId) {
  const r=await q.query(`SELECT rule_key AS "ruleKey",recipient_uid AS "recipientUid",period_key AS "periodKey",channel,status,created_at AS "createdAt",clicked_at AS "clickedAt",dismissed_at AS "dismissedAt" FROM ${t('engagement_deliveries')} WHERE company_id=$1 AND created_at>NOW()-INTERVAL '2 years'`,[companyId]); return r.rows;
 }
 async function configs(q) { const r=await q.query(`SELECT key,config FROM ${t('engagement_rules')}`); return Object.fromEntries(r.rows.map(x=>[x.key,x.config])); }
 async function analytics(q,companyId,uid,type,deliveryId,eventId,props) {
  await q.query(`INSERT INTO ${t('engagement_analytics')}(company_id,recipient_uid,event_type,delivery_id,event_id,properties) VALUES($1,$2,$3,$4,$5,$6)`,[companyId,uid,type,deliveryId,eventId,JSON.stringify(props || {})]);
 }
 async function refreshSnapshot(q,companyId) {
  // Authoritative counters only. Storage/video aggregates are supplied by the entitlement lane.
  const r=await q.query(`SELECT cs.* FROM ${t('companies_subscription')} cs WHERE company_id=$1 ORDER BY created_at DESC LIMIT 1`,[companyId]);
  if(!r.rows.length) return null;
  const sub=r.rows[0]; const old=await state(q,companyId) || {};
  const counts=await q.query(`SELECT (SELECT COUNT(*)::int FROM ${t('jobs')} WHERE company_id=$1 AND job_status_id=2) AS jobs,(SELECT COUNT(*)::int FROM ${t('company_employees')} ce JOIN ${t('user_credentials')} uc ON uc.uid=ce.employee_uuid WHERE ce.company_id=$1 AND uc.role=2 AND uc.is_archive=FALSE) AS users`,[companyId]);
  const version=sub.engagement_plan_version || 'legacy_v4';
  let plan=sub.plan_slug || ({1:'free_trial',2:'starter',3:'growth',4:version==='legacy_v4'?'business':'premium'}[sub.subscription_id]);
  if(version==='legacy_v4' && plan==='premium') plan='business';
  if(version==='pricing_2026_09' && plan==='business') plan='premium';
  const base={companyId,plan,planVersion:version}; const limits=planFor(base);
  if(!limits) throw Object.assign(new Error('Unknown plan version'),{code:'UNKNOWN_PLAN_VERSION'});
  const trialEndsAt=plan==='free_trial' ? new Date(sub.period_end || new Date(sub.created_at).getTime()+limits.trialDays*86400000).toISOString() : null;
  const oldUsage=Object.assign({},old.usage);
  for(const key of ['storage','video']) if(!old.usageObservedAt || !old.usageObservedAt[key] || Date.now()-new Date(old.usageObservedAt[key])>2*3600000) delete oldUsage[key];
  const snapshot=Object.assign({},old,base,{status:old.accountStatusOverride || old.billingRisk || sub.sub_status || (sub.is_paid?'active':'unknown'),billingCycle:sub.billing_cycle,trialEndsAt,
    trialStartedAt:sub.created_at,periodEnd:sub.period_end,periodKey:[version,plan,new Date(sub.period_start || sub.created_at).toISOString()].join(':'),
    usage:Object.assign({},oldUsage,counts.rows[0]),activationSignals:Object.assign({},old.activationSignals,{jobPublished:!!(old.activationSignals && old.activationSignals.jobPublished) || counts.rows[0].jobs>0}),
    refreshedAt:new Date().toISOString()});
  // Never carry an old override across a plan/version change.
  if(old.plan!==plan || old.planVersion!==version) delete snapshot.effectiveLimits;
  if(sub.billing_plan_version_id && sub.effective_entitlements) {const paid=await require('../paymongo-billing/subscription-domain.cjs').domain(schema).effective(q,companyId,new Date());snapshot.effectiveLimits=paid.entitlements;}
  await q.query(`INSERT INTO ${t('engagement_accounts')}(company_id,snapshot) VALUES($1,$2) ON CONFLICT(company_id) DO UPDATE SET snapshot=$2,updated_at=NOW()`,[companyId,JSON.stringify(snapshot)]);
  return snapshot;
 }
 async function processNext() {
  let processingId;
  try { return await db.transaction(async q=> {
   const r=await q.query(`SELECT * FROM ${t('engagement_events')} WHERE status='PENDING' AND available_at<=NOW() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`);
   if(!r.rows.length) return false;
   const e=r.rows[0];processingId=e.id;
   await q.query(`SELECT pg_advisory_xact_lock(hashtext($1))`,['engagement:'+e.company_id]);
   const prior=await state(q,e.company_id);
   let s=await refreshSnapshot(q,e.company_id);
   if(!s) {await q.query(`UPDATE ${t('engagement_events')} SET status='IGNORED' WHERE id=$1`,[e.id]);return true;}
   const payload=e.payload;
   if(['UPGRADE_STARTED'].includes(e.type)) await q.query(`UPDATE ${t('engagement_accounts')} SET checkout_started_at=NOW() WHERE company_id=$1`,[e.company_id]);
   if(['UPGRADE_COMPLETED','TRIAL_CONVERTED','PAYMENT_RECOVERED','SUBSCRIPTION_RENEWED'].includes(e.type)) {
    await q.query(`UPDATE ${t('engagement_accounts')} SET upgraded_at=CASE WHEN $2 THEN NOW() ELSE upgraded_at END,checkout_started_at=NULL WHERE company_id=$1`,[e.company_id,['UPGRADE_COMPLETED','TRIAL_CONVERTED'].includes(e.type)]);
    await q.query(`UPDATE ${t('notifications')} SET engagement_status='EXPIRED',expires_at=NOW() WHERE company_id=$1 AND template_key IS NOT NULL AND engagement_status<>'EXPIRED' AND ($2 OR category='BILLING')`,[e.company_id,['UPGRADE_COMPLETED','TRIAL_CONVERTED'].includes(e.type)]);
    await q.query(`UPDATE ${t('engagement_deliveries')} SET status='CANCELLED' WHERE company_id=$1 AND status='QUEUED'`,[e.company_id]);
    // Last authorized click within 30 days is a bounded attribution signal.
    await q.query(`UPDATE ${t('engagement_deliveries')} SET conversion_at=NOW(),converted_plan=$2 WHERE id=(SELECT id FROM ${t('engagement_deliveries')} WHERE company_id=$1 AND clicked_at>NOW()-INTERVAL '30 days' ORDER BY clicked_at DESC LIMIT 1)`,[e.company_id,s.plan]);
   }
   if(['PAYMENT_FAILED','PAYMENT_RETRY_FAILED','SUBSCRIPTION_PAST_DUE'].includes(e.type)) {s.billingEpisode=s.billingEpisode || payload.key;s.billingRisk=e.type==='SUBSCRIPTION_PAST_DUE'?'past_due':'payment_failed';s.status=s.billingRisk;}
   if(['PAYMENT_RECOVERED','UPGRADE_COMPLETED','TRIAL_CONVERTED','SUBSCRIPTION_RENEWED'].includes(e.type)) {delete s.billingRisk;delete s.billingEpisode;delete s.retryFailed;delete s.accountStatusOverride;s.status='active';}
   if(e.type==='SUBSCRIPTION_CANCELLED') {s.accountStatusOverride='cancelled';s.status='cancelled';}
   if(e.type==='PAYMENT_RETRY_FAILED') s.retryFailed=true;
   if(e.type==='PREMIUM_FEATURE_ATTEMPTED') s.enterpriseFeature=payload.feature;
   // Persist aggregate state but no addresses or candidate details.
   await q.query(`UPDATE ${t('engagement_accounts')} SET snapshot=$2 WHERE company_id=$1`,[e.company_id,JSON.stringify(s)]);
   s=Object.assign(s,await state(q,e.company_id));
   const recipients=await members(q,e.company_id);
   const h=await history(q,e.company_id); const c=await configs(q);
   const decisionType=e.type==='ACCOUNT_SNAPSHOT' && s.plan==='free_trial' && s.activationSignals.jobPublished && !(prior && prior.activationSignals && prior.activationSignals.jobPublished) ? 'TRIAL_ACTIVATED' : e.type;
   const outcome=decide(s,Object.assign({},payload,{type:decisionType}),recipients,h,c,new Date());
   // Clear messages whose underlying condition no longer applies.
   const activeKeys=require('./rules.cjs').evaluate(Object.assign({},s,{activation:activation(s)}),null,new Date()).map(x=>x.key);
   await q.query(`UPDATE ${t('notifications')} SET engagement_status='EXPIRED',expires_at=NOW() WHERE company_id=$1 AND template_key IS NOT NULL AND metadata->>'persistent'='true' AND NOT (metadata->>'ruleKey'=ANY($2::text[]))`,[e.company_id,activeKeys]);
   await q.query(`UPDATE ${t('engagement_deliveries')} SET status='CANCELLED' WHERE company_id=$1 AND status='QUEUED' AND content->>'persistent'='true' AND NOT(rule_key=ANY($2::text[]))`,[e.company_id,activeKeys]);
   await q.query(`UPDATE ${t('notifications')} SET engagement_status='DELIVERED',expires_at=NULL WHERE company_id=$1 AND priority='CRITICAL' AND metadata->>'persistent'='true' AND metadata->>'ruleKey'=ANY($2::text[]) AND engagement_status='EXPIRED'`,[e.company_id,activeKeys]);
   for(const a of outcome.actions) {
    const deliveryId=id(); const notificationId=a.channel==='IN_APP_NOTIFICATION'?id():null;
    const inserted=await q.query(`INSERT INTO ${t('engagement_deliveries')}(id,company_id,recipient_uid,rule_key,period_key,event_id,campaign_id,channel,template_key,dedupe_key,content) VALUES($1,$2,$3,$4,$5,$6,$4,$7,$8,$9,$10) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id`,[deliveryId,e.company_id,a.recipientUid,a.rule.key,a.periodKey,e.id,a.channel,a.rule.templateKey,a.dedupeKey,JSON.stringify(Object.assign({},a.content,{persistent:!a.rule.eventOnly,preference:a.rule.preference,priority:a.rule.priority}))]);
    if(!inserted.rows.length) continue;
    if(notificationId) {
     const metadata={ruleKey:a.rule.key,persistent:!a.rule.eventOnly,usage:a.rule.usage || null,recommendation:a.recommendation,planVersion:s.planVersion,currentPlan:s.plan,periodKey:s.periodKey,eventId:e.id,campaignId:a.rule.key};
     await q.query(`INSERT INTO ${t('notifications')}(id,recipient_uid,type,title,body,link_route,event_key,company_id,category,priority,template_key,surfaces,cta,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[notificationId,a.recipientUid,a.rule.key,a.content.title,a.content.body,a.content.cta.primary.url,a.dedupeKey,e.company_id,a.rule.category,a.rule.priority,a.rule.templateKey,JSON.stringify(a.rule.surfaces),JSON.stringify(a.content.cta),JSON.stringify(metadata)]);
     await q.query(`UPDATE ${t('engagement_deliveries')} SET notification_id=$2,status='DELIVERED',delivered_at=NOW() WHERE id=$1`,[deliveryId,notificationId]);
     await analytics(q,e.company_id,a.recipientUid,'notification_created',deliveryId,e.id);
     await analytics(q,e.company_id,a.recipientUid,'notification_delivered',deliveryId,e.id);
    } else await analytics(q,e.company_id,a.recipientUid,'email_queued',deliveryId,e.id);
    if(a.rule.surfaces.includes('SALES_SIGNAL') && isAdmin(recipients.find(m=>m.uid===a.recipientUid).role)) {
     await q.query(`INSERT INTO ${t('engagement_sales_signals')}(id,company_id,trigger,current_plan,usage_snapshot,contact_uid) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(company_id,trigger) DO NOTHING`,[id(),e.company_id,s.enterpriseFeature || 'CAPACITY',s.plan,JSON.stringify(s.usage),a.recipientUid]);
    }
   }
   for(const x of outcome.suppressed) await analytics(q,e.company_id,x.recipientUid,'message_suppressed',null,e.id,{ruleKey:x.ruleKey,channel:x.channel,reason:x.reason});
   const attribution=await q.query(`SELECT rule_key,channel,campaign_id,notification_id FROM ${t('engagement_deliveries')} WHERE company_id=$1 AND clicked_at>NOW()-INTERVAL '30 days' ORDER BY clicked_at DESC LIMIT 1`,[e.company_id]);
   const source=attribution.rows[0];
   const properties={currentPlan:s.plan,conversionSource:source ? source.rule_key.toUpperCase().replace(/\./g,'_')+'_'+source.channel : 'DIRECT',campaignId:source ? source.campaign_id : null,notificationId:source ? source.notification_id : null};
   await analytics(q,e.company_id,payload.actorUid,e.type.toLowerCase(),null,e.id,properties);
   await q.query(`UPDATE ${t('engagement_events')} SET status='PROCESSED',attempts=attempts+1 WHERE id=$1`,[e.id]);
   return true;
  }); } catch(error) {
   if(processingId) {
    await db.query(`UPDATE ${t('engagement_events')} SET attempts=attempts+1,status=CASE WHEN attempts>=4 THEN 'FAILED' ELSE 'PENDING' END,available_at=NOW()+(LEAST(3600,POWER(2,attempts)*30)::text || ' seconds')::interval WHERE id=$1 AND status='PENDING'`,[processingId]);
   }
   throw error;
  }
 }
 async function readContext(companyId,recipient) {
  const s=await state(db,companyId);
  if(!s || !s.refreshedAt || Date.now()-new Date(s.refreshedAt)>2*3600000) return {banner:null,dashboardCard:null,availability:'PENDING_EVALUATION'};
  const result=context(s,recipient,await history(db,companyId),await configs(db),new Date());
  let top=result.banner || result.dashboardCard;
  if(!isAdmin(recipient.role)) {
   const stored=await db.query(`SELECT id,type FROM ${t('notifications')} WHERE company_id=$1 AND recipient_uid=$2 AND surfaces ? 'LIMIT_MODAL' AND engagement_status NOT IN ('EXPIRED','DISMISSED') ORDER BY created_at DESC LIMIT 1`,[companyId,recipient.uid]);
   if(stored.rows.length) {
    const metric=stored.rows[0].type.split('.')[0];
    const type={jobs:'JOB_LIMIT_REACHED',users:'USER_LIMIT_REACHED',storage:'STORAGE_LIMIT_REACHED',video:'VIDEO_QUESTION_LIMIT_REACHED'}[metric];
    const rules=require('./rules.cjs').evaluate(Object.assign({},s,{activation:activation(s)}),{type,actorUid:recipient.uid},new Date());
    const rule=rules.find(r=>r.key===stored.rows[0].type && r.recipientRole==='ACTOR');
    if(rule) {top=require('./engagement.cjs').nudge(rule,s,recipient);top.id=stored.rows[0].id;result.banner=top;result.dashboardCard=null;}
   }
  }
  if(top) {
   const row=await db.query(`SELECT id FROM ${t('notifications')} WHERE company_id=$1 AND recipient_uid=$2 AND metadata->>'ruleKey'=$3 AND engagement_status<>'EXPIRED' ORDER BY created_at DESC LIMIT 1`,[companyId,recipient.uid,top.trigger]);
   top.id=row.rows.length ? row.rows[0].id : null;
  }
  return result;
 }
 async function recommendation(companyId,recipient) {
  if(!isAdmin(recipient.role)) throw Object.assign(new Error('Billing permission required'),{httpStatus:403,code:'FORBIDDEN'});
  const s=await state(db,companyId);
  if(!s || Date.now()-new Date(s.refreshedAt)>2*3600000) return {recommendedPlan:null,confidence:'UNAVAILABLE',reasonCodes:[]};
  const gated=context(s,recipient,await history(db,companyId),await configs(db),new Date());
  const rec=recommend(s);
  return Object.assign(rec,{eligible:!!(gated.banner || gated.dashboardCard),activation:activation(s),planVersion:s.planVersion});
 }
 async function list(companyId,recipient,filters) {
  const conditions=['recipient_uid=$1','(company_id=$2 OR company_id IS NULL)']; const values=[recipient.uid,companyId];
  // Restrict billing rows after a permission downgrade as well as at creation.
  if(!isAdmin(recipient.role)) conditions.push("category <> 'BILLING'");
  for(const key of ['category','priority','status']) if(filters[key]) {values.push(filters[key]);conditions.push((key==='status'?'engagement_status':key)+'=$'+values.length);}
  const where=conditions.join(' AND ');
  const count=await db.query(`SELECT COUNT(*)::int AS count FROM ${t('notifications')} WHERE ${where} AND is_read=FALSE AND engagement_status NOT IN ('EXPIRED','DISMISSED') AND (expires_at IS NULL OR expires_at>NOW())`,values);
  values.push(filters.limit, (filters.page-1)*filters.limit);
  const r=await db.query(`SELECT * FROM ${t('notifications')} WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values);
  return {items:r.rows.map(row=>({id:row.id,category:row.category,type:row.type,priority:row.priority,title:row.title,body:row.body,cta:row.cta || {primary:{label:'View',action:'NAVIGATE',url:row.link_route}},metadata:row.metadata || {},surfaces:row.surfaces || ['IN_APP_NOTIFICATION'],status:row.engagement_status,dismissible:row.priority!=='CRITICAL',createdAt:row.created_at,read:row.is_read})),unreadCount:count.rows[0].count,page:filters.page,limit:filters.limit};
 }
 async function interact(companyId,recipient,notificationId,action) {
  return db.transaction(async q=> {
   const columns={read:'read_at',dismiss:'dismissed_at',click:'clicked_at',seen:null};
   if(!Object.prototype.hasOwnProperty.call(columns,action)) throw new Error('Invalid action');
   const n=await q.query(`SELECT * FROM ${t('notifications')} WHERE id=$1 AND recipient_uid=$2 AND (company_id=$3 OR company_id IS NULL) FOR UPDATE`,[notificationId,recipient.uid,companyId]);
   if(!n.rows.length || (n.rows[0].category==='BILLING' && !isAdmin(recipient.role))) return false;
   const row=n.rows[0];
   if(columns[action] && row[columns[action]]) return true;
   if(row.engagement_status==='EXPIRED') return false;
   if(columns[action]) {
    const status=action==='read'?'READ':action==='click'?'CLICKED':'DISMISSED';
    const effective=action==='dismiss' && row.priority==='CRITICAL' ? row.engagement_status : status;
    await q.query(`UPDATE ${t('notifications')} SET ${columns[action]}=NOW(),engagement_status=$2,is_read=CASE WHEN $3 THEN TRUE ELSE is_read END WHERE id=$1`,[notificationId,effective,action!=='dismiss']);
    if(action!=='read') await q.query(`UPDATE ${t('engagement_deliveries')} SET ${columns[action]}=NOW() WHERE notification_id=$1`,[notificationId]);
   }
   await analytics(q,companyId,recipient.uid,'notification_'+({read:'read',dismiss:'dismissed',click:'clicked',seen:'seen'}[action]),null,null,{notificationId});
   return true;
  });
 }
 async function preferences(companyId,recipient,patch) {
  if(patch) {
   for(const [key,value] of Object.entries(patch)) if(!Object.prototype.hasOwnProperty.call(defaultPreferences,key) || typeof value!=='boolean' || (['ACCOUNT_CRITICAL','BILLING'].includes(key) && !value)) throw Object.assign(new Error('Invalid preference'),{httpStatus:400,code:'INVALID_PREFERENCE'});
   await db.query(`INSERT INTO ${t('engagement_preferences')}(company_id,recipient_uid,preferences) VALUES($1,$2,$3) ON CONFLICT(company_id,recipient_uid) DO UPDATE SET preferences=${t('engagement_preferences')}.preferences || $3::jsonb,updated_at=NOW()`,[companyId,recipient.uid,JSON.stringify(patch)]);
  }
  const r=await db.query(`SELECT preferences FROM ${t('engagement_preferences')} WHERE company_id=$1 AND recipient_uid=$2`,[companyId,recipient.uid]);
  return Object.assign({},defaultPreferences,r.rows[0] && r.rows[0].preferences,{ACCOUNT_CRITICAL:true,BILLING:true});
 }
 async function tick() {
  const r=await db.query(`SELECT DISTINCT company_id FROM ${t('companies_subscription')}`);
  const hour=new Date().toISOString().slice(0,13);
  for(const x of r.rows) {if(process.env.SUBSCRIPTION_USAGE_COLLECTION_ENABLED==='true')await trustedCollect(x.company_id);else await enqueue(x.company_id,{type:'ACCOUNT_SNAPSHOT',key:'schedule:'+hour});}
  return r.rows.length;
 }
 async function sinkNext(now) {
  now=now || new Date();
  return db.transaction(async q=> {
   const r=await q.query(`SELECT d.*,a.timezone FROM ${t('engagement_deliveries')} d JOIN ${t('engagement_accounts')} a ON a.company_id=d.company_id WHERE d.status='QUEUED' AND d.channel='EMAIL' AND d.available_at<=NOW() ORDER BY d.created_at FOR UPDATE OF d SKIP LOCKED LIMIT 1`);
   if(!r.rows.length) return false;
   const d=r.rows[0];
   const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:d.timezone || 'Asia/Manila',hour:'numeric',hourCycle:'h23'}).format(now));
   if(hour<8 || hour>=18) {await q.query(`UPDATE ${t('engagement_deliveries')} SET available_at=NOW()+INTERVAL '1 hour' WHERE id=$1`,[d.id]);return true;}
   const recipient=(await members(q,d.company_id)).find(m=>m.uid===d.recipient_uid);
   const s=await state(q,d.company_id);
   const rule=require('./rules.cjs').evaluate(Object.assign({},s,{activation:activation(s)}),null,now).find(x=>x.key===d.rule_key);
   const optional=d.template_key.startsWith('subscription.expansion.') || d.template_key==='upgrade.checkout_abandoned';
   let cancelled=!recipient || !isAdmin(recipient.role);
   if(d.content.persistent && !rule) cancelled=true;
   const preference=d.content.preference;
   if(!['ACCOUNT_CRITICAL','BILLING'].includes(preference) && Object.assign({},defaultPreferences,recipient && recipient.preferences)[preference]!==true) cancelled=true;
   if(optional && (!rule || require('./suppression.cjs').suppress(Object.assign({},rule,{enabled:true}),Object.assign({},s,{activation:activation(s)}),recipient,[],'EMAIL',now))) cancelled=true;
   if(rule && !['ACCOUNT_CRITICAL','BILLING'].includes(rule.preference) && Object.assign({},defaultPreferences,recipient && recipient.preferences)[rule.preference]!==true) cancelled=true;
   if(cancelled) {await q.query(`UPDATE ${t('engagement_deliveries')} SET status='CANCELLED' WHERE id=$1`,[d.id]);return true;}
   await q.query(`INSERT INTO ${t('engagement_email_sink')}(delivery_id,content) VALUES($1,$2) ON CONFLICT(delivery_id) DO NOTHING`,[d.id,JSON.stringify(d.content)]);
   await q.query(`UPDATE ${t('engagement_deliveries')} SET status='SANDBOXED',delivered_at=NOW(),attempts=attempts+1 WHERE id=$1`,[d.id]);
   await analytics(q,d.company_id,d.recipient_uid,'email_sandboxed',d.id,d.event_id);
   return true;
  });
 }
 async function trustedCollect(companyId) {const collected=await usageMeter.collect(companyId);if(!collected.storageComplete)await db.transaction(async q=>{await q.query(`SELECT pg_advisory_xact_lock(hashtext($1))`,['engagement:'+companyId]);await q.query(`UPDATE ${t('engagement_accounts')} SET snapshot=jsonb_set(jsonb_set(snapshot,'{usage}',COALESCE(snapshot->'usage','{}'::jsonb)-'storage'),'{usageObservedAt}',COALESCE(snapshot->'usageObservedAt','{}'::jsonb)-'storage'),updated_at=NOW() WHERE company_id=$1`,[companyId]);});const input={video:collected.video};if(collected.storageComplete)input.storage=collected.storage;await trustedUsage(companyId,input);return collected;}
 async function storageList(companyId,recipient) {if(!isAdmin(recipient.role))throw Object.assign(new Error('Billing permission required'),{httpStatus:403,code:'FORBIDDEN'});return usageMeter.list(companyId);}
 async function storageDelete(companyId,recipient,objectId) {if(!isAdmin(recipient.role))throw Object.assign(new Error('Billing permission required'),{httpStatus:403,code:'FORBIDDEN'});return usageMeter.requestDelete(companyId,objectId);}
 async function trustedUsage(companyId,input) {
  // Server-only adapter: no HTTP endpoint accepts counters or plan overrides.
  const usage={};
  for(const k of ['storage','video']) if(Object.prototype.hasOwnProperty.call(input,k)) {
   if(!Number.isSafeInteger(input[k]) || input[k]<0) throw new Error('Invalid aggregate usage'); usage[k]=input[k];
  }
  await db.transaction(async q=> {
   await q.query(`SELECT pg_advisory_xact_lock(hashtext($1))`,['engagement:'+companyId]);
   await q.query(`INSERT INTO ${t('engagement_accounts')}(company_id,snapshot) VALUES($1,'{}') ON CONFLICT(company_id) DO NOTHING`,[companyId]);
   await q.query(`UPDATE ${t('engagement_accounts')} SET snapshot=jsonb_set(jsonb_set(snapshot,'{usage}',COALESCE(snapshot->'usage','{}'::jsonb) || $2::jsonb),'{usageObservedAt}',COALESCE(snapshot->'usageObservedAt','{}'::jsonb) || $3::jsonb),updated_at=NOW() WHERE company_id=$1`,[companyId,JSON.stringify(usage),JSON.stringify(Object.fromEntries(Object.keys(usage).map(k=>[k,new Date().toISOString()]))) ]);
  });
  return enqueue(companyId,{type:'ACCOUNT_SNAPSHOT',key:'usage:'+id()});
 }
 async function trustedActivation(companyId,input) {
  const safe={};
  for(const k of ['jobPublished','aiJobCreated','videoConfigured']) if(input[k]===true) safe[k]=true;
  for(const k of ['applicantsReceived','applicantsReviewed']) if(input[k] !== undefined) {if(!Number.isSafeInteger(input[k]) || input[k]<0) throw new Error('Invalid aggregate');safe[k]=input[k];}
  await db.query(`INSERT INTO ${t('engagement_accounts')}(company_id,snapshot) VALUES($1,'{}') ON CONFLICT(company_id) DO NOTHING`,[companyId]);
  await db.query(`UPDATE ${t('engagement_accounts')} SET snapshot=jsonb_set(snapshot,'{activationSignals}',COALESCE(snapshot->'activationSignals','{}'::jsonb) || $2::jsonb) WHERE company_id=$1`,[companyId,JSON.stringify(safe)]);
  return enqueue(companyId,{type:'ACCOUNT_SNAPSHOT',key:'activation:'+id()});
 }
 async function deliveryEvent(companyId,deliveryId,type) {
  const types={email_sent:'sent_at',email_delivered:'delivered_at',email_opened:'opened_at',email_clicked:'clicked_at',email_bounced:null,email_failed:null,email_unsubscribed:null};
  if(!Object.prototype.hasOwnProperty.call(types,type)) throw new Error('Invalid delivery event');
  return db.transaction(async q=> {
   const r=await q.query(`SELECT * FROM ${t('engagement_deliveries')} WHERE id=$1 AND company_id=$2 AND channel='EMAIL' FOR UPDATE`,[deliveryId,companyId]);
   if(!r.rows.length) return false;
   const d=r.rows[0], column=types[type];
   if(column && d[column]) return true;
   if(column) await q.query(`UPDATE ${t('engagement_deliveries')} SET ${column}=NOW() WHERE id=$1`,[deliveryId]);
   else {const status={email_bounced:'BOUNCED',email_failed:'FAILED',email_unsubscribed:'UNSUBSCRIBED'}[type];if(d.status===status)return true;await q.query(`UPDATE ${t('engagement_deliveries')} SET status=$2 WHERE id=$1`,[deliveryId,status]);}
   await analytics(q,companyId,d.recipient_uid,type,d.id,d.event_id);
   return true;
  });
 }
 async function confirmedPayment(companyId,key,plan) {
  const prior=await state(db,companyId);
  const comparable=prior && prior.planVersion==='pricing_2026_09' && plan==='business' ? 'premium' : plan;
  const type=!prior ? 'PAYMENT_RECOVERED' : prior.plan==='free_trial' ? 'TRIAL_CONVERTED' : prior.plan!==comparable ? 'UPGRADE_COMPLETED' : prior.billingRisk ? 'PAYMENT_RECOVERED' : 'SUBSCRIPTION_RENEWED';
  return enqueue(companyId,{type,key:'confirmed-payment:'+key});
 }
 async function stats() {
  const r=await db.query(`SELECT channel,status,COUNT(*)::int AS count FROM ${t('engagement_deliveries')} GROUP BY channel,status`);
  const events=await db.query(`SELECT event_type,COUNT(*)::int AS count FROM ${t('engagement_analytics')} GROUP BY event_type`);
  return {deliveries:r.rows,events:events.rows};
 }
 return {enqueue,resolve,processNext,readContext,recommendation,list,interact,preferences,tick,sinkNext,trustedCollect,storageList,storageDelete,trustedUsage,stats,trustedActivation,deliveryEvent,confirmedPayment};
}
module.exports={repository};
