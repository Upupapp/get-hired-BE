'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {billing}=require('../services/paymongo-billing/service.cjs');
const {provision}=require('../services/paymongo-billing/trial.cjs');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const engagement=read('db/subscription_engagement_migration.sql');
const migration=read('db/paymongo_billing_migration.sql');
async function fixture(){
 const pg=new PGlite();
 await pg.exec(read('tests/fixtures/gethired-production-billing-schema.sql'));
 await pg.exec(`INSERT INTO gethired.industry VALUES(1,'Synthetic industry');
 INSERT INTO gethired.access_roles(id,role_name) VALUES(2,'Employer');
 INSERT INTO gethired.user_credentials(uid,email,password,role) VALUES('synthetic-owner','owner@example.invalid','not-a-real-password',2);
 INSERT INTO gethired.users(uid) VALUES('synthetic-owner');
 INSERT INTO gethired.companies(company_id,company_name,created_at,created_by)
 SELECT 'legacy-'||n,'Synthetic company '||n,'2026-09-01','synthetic-owner' FROM generate_series(1,16) n;
 INSERT INTO gethired.companies_subscription(company_id,subscription_id,created_at)
 SELECT 'legacy-'||n,2,'2026-09-01' FROM generate_series(1,16) n;
 INSERT INTO gethired.notifications(id,recipient_uid,type,title,body,event_key)
 VALUES('legacy-notice','synthetic-owner','info','Synthetic notice','Preserve this','synthetic-event');
 INSERT INTO gethired.payment_webhook_events(event_id,event_type,status) VALUES('legacy-event','payment.paid','received');
 INSERT INTO gethired.invoices(company_id,invoice_number,total_amount,status) VALUES('legacy-1','SYNTHETIC-001',1490,'draft');`);
 return pg;
}
async function snapshot(pg){
 const result={};
 for(const table of ['companies_subscription','notifications','payment_webhook_events','invoices']){
  const columns=(await pg.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='gethired' AND table_name=$1 ORDER BY ordinal_position`,[table])).rows.map(r=>r.column_name);
  result[table]={columns,rows:(await pg.query(`SELECT ${columns.join(',')} FROM gethired.${table} ORDER BY id`)).rows};
 }
 return result;
}
async function unchanged(pg,before){
 for(const [table,{columns,rows}] of Object.entries(before)) assert.deepEqual((await pg.query(`SELECT ${columns.join(',')} FROM gethired.${table} ORDER BY id`)).rows,rows,table);
}
async function count(pg,table){return (await pg.query(`SELECT COUNT(*)::int n FROM gethired.${table}`)).rows[0].n;}

test('production schema: repeatable migrations preserve legacy records and do not fabricate financial evidence',async()=>{
 const pg=await fixture();try{
  const before=await snapshot(pg);
  for(let pass=0;pass<2;pass++){
   await pg.exec(engagement);await pg.exec(migration);await unchanged(pg,before);
   assert.equal(await count(pg,'billing_plan_versions'),10);
   const compiled=require('esbuild').transformSync(read('services/planCatalogServiceV4.js'),{format:'cjs'}).code;
   const module={exports:{}};require('node:vm').runInNewContext(compiled,{module,exports:module.exports});
   for(const [billingCode,catalogCode] of [['starter','starter'],['growth','growth'],['premium','business']]){
    const catalog=module.exports.getPlanBySlug(catalogCode);
    const plan=(await pg.query('SELECT * FROM gethired.billing_plan_versions WHERE id=$1',['pricing_2026_09_21_v2:'+billingCode])).rows[0];
    assert.equal(Number(plan.monthly_minor),catalog.priceMonthlyPHP*100);
    assert.equal(Number(plan.annual_minor),catalog.priceAnnualPHP*100);
    for(const [billingKey,catalogKey] of [['jobs','active_job_posts'],['users','admin_users'],['storage','recruitment_storage_bytes'],['video','video_responses']])assert.equal(plan.entitlements[billingKey],catalog.entitlements[catalogKey],billingCode+':'+catalogKey);
   }

   for(const table of ['payment_attempts','payment_transactions','billing_fulfillments','subscription_billing_history','engagement_events']) assert.equal(await count(pg,table),0,table);
  }
  const rows=(await pg.query('SELECT is_paid,payment_date,amount_paid,provider_reference,billing_plan_version_id,billing_revision FROM gethired.companies_subscription')).rows;
  assert.equal(rows.length,16);
  for(const row of rows){assert.equal(row.is_paid,true);assert.ok(row.payment_date);assert.equal(row.amount_paid,null);assert.equal(row.provider_reference,null);assert.equal(row.billing_plan_version_id,null);assert.equal(row.billing_revision,0);}
  let calls=0;
  const s=billing(pg,'gethired',{enabled:true,mode:'test',nodeEnv:'test',dbHost:'localhost'},{createLink:async()=>{calls++;}});
  await assert.rejects(()=>s.checkout({companyId:'legacy-1',uid:'synthetic-owner'},{planCode:'growth'}),{code:'BILLING_AGREEMENT_REQUIRED'});
  assert.equal(calls,0);
  await assert.rejects(()=>pg.query("INSERT INTO gethired.billing_plan_versions(id,plan_code,catalog_version,monthly_minor,entitlements) VALUES('bad','starter','bad',-1,'{}')"),{code:'23514'});
 }finally{await pg.close();}
});

test('production schema: each migration rolls back completely on an injected failure and can retry',async()=>{
 const pg=await fixture();try{
  const before=await snapshot(pg);
  for(const [sql,table] of [[engagement,'engagement_accounts'],[migration,'payment_attempts']]){
   await assert.rejects(()=>pg.exec(sql.replace(/COMMIT;\s*$/,"SELECT 1/0; COMMIT;")),{code:'22012'});
   await pg.exec('ROLLBACK');await unchanged(pg,before);
   assert.equal((await pg.query('SELECT to_regclass($1) name',['gethired.'+table])).rows[0].name,null);
   await pg.exec(sql);
  }
 }finally{await pg.close();}
});

test('production schema: trial, signed mocked payment, duplicate delivery and immutable terms work with real constraints',async()=>{
 const pg=await fixture();try{
  await pg.exec(engagement);await pg.exec(migration);
  await pg.exec(`INSERT INTO gethired.companies(company_id,company_name,created_at,created_by) VALUES('trial-company','Synthetic trial',NOW(),'synthetic-owner');
  INSERT INTO gethired.company_employees(employee_id,company_id,employee_uuid,assigned_at,assigned_by) VALUES('synthetic-employee','trial-company','synthetic-owner',NOW(),'synthetic-owner');`);
  const trial=await provision(pg,'gethired','trial-company',1);
  assert.equal(trial.is_paid,false);assert.equal(trial.payment_date,null);
  await provision(pg,'gethired','trial-company',1);
  assert.equal(await count(pg,'companies_subscription'),17);
  const now=new Date();let attempt;
  const config={enabled:true,mode:'test',nodeEnv:'test',dbHost:'localhost',webhookSecret:crypto.randomBytes(32).toString('hex'),clock:()=>now};
  const s=billing(pg,'gethired',config,{createLink:async a=>{attempt=a;return {linkId:'synthetic-link',referenceNumber:'synthetic-reference',checkoutUrl:'https://example.invalid/checkout'};}});
  const context={companyId:'trial-company',uid:'synthetic-owner'};
  const checkout=await s.checkout(context,{planCode:'growth'});
  assert.equal(checkout.amountMinor,349000);
  const event={data:{id:'evt_synthetic_paid',type:'event',attributes:{type:'payment.paid',livemode:false,data:{id:'pay_synthetic',type:'payment',attributes:{amount:checkout.amountMinor,currency:'PHP',status:'paid',livemode:false,metadata:{internal_payment_reference:attempt.internal_reference},source:{type:'gcash'}}}}}};
  const raw=Buffer.from(JSON.stringify(event));const stamp=Math.floor(+now/1000);
  const signature='t='+stamp+',te='+crypto.createHmac('sha256',config.webhookSecret).update(stamp+'.').update(raw).digest('hex');
  const result=await s.webhook(raw,signature);assert.equal(result.status,'PROCESSED',JSON.stringify(result));
  assert.equal((await s.webhook(raw,signature)).status,'DUPLICATE');
  for(const table of ['payment_transactions','billing_fulfillments','subscription_billing_history'])assert.equal(await count(pg,table),1,table);
  assert.equal(await count(pg,'invoices'),2);
  assert.equal((await s.effective(context)).entitlements.jobs,15);
  await assert.rejects(()=>pg.query('UPDATE gethired.payment_attempts SET expected_amount_minor=100 WHERE id=$1',[checkout.paymentAttemptId]),/immutable/);
  await assert.rejects(()=>pg.query("UPDATE gethired.billing_plan_versions SET monthly_minor=100 WHERE id='pricing_2026_09_21_v2:growth'"),/immutable/);
  await assert.rejects(()=>pg.query("INSERT INTO gethired.invoices(company_id,billing_attempt_id) VALUES('trial-company','missing-attempt')"),{code:'23503'});
  await pg.exec(migration);
  assert.equal((await s.status(context,checkout.paymentAttemptId)).status,'PAID');
  assert.equal(await count(pg,'payment_transactions'),1);
 }finally{await pg.close();}
});
