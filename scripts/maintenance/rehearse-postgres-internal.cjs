'use strict';
// Synthetic, empty PostgreSQL 16 database only; no production env or provider credentials.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {Client}=require('pg');
const {billing}=require('../../services/paymongo-billing/service.cjs');
const {provision}=require('../../services/paymongo-billing/trial.cjs');
const database=process.argv[2];
if(!/^codex_stage_internal_[0-9]+$/.test(database||''))throw Error('Isolated rehearsal database required');
const client=new Client({host:'/var/run/postgresql',database,user:'postgres'});
const db={query:(...a)=>client.query(...a),exec:sql=>client.query(sql),transaction:async fn=>{await client.query('BEGIN');try{const result=await fn(db);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}}};
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'../..',p),'utf8');
async function run(){
 await client.connect();
 const info=(await db.query('SELECT current_database() db,current_setting(\'server_version_num\')::int version')).rows[0];assert.equal(info.db,database);assert.ok(info.version>=160000&&info.version<170000);
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='gethired'")).rows[0].n,0);
 await db.exec(read('tests/fixtures/gethired-production-billing-schema.sql'));
 await db.exec('SET search_path=gethired,public');
 await db.exec(read('db/referral_bunny_migration.sql'));await db.exec(read('db/referral_bunny_payments_migration.sql'));
 await db.exec(`INSERT INTO gethired.industry VALUES(1,'Synthetic industry');
 INSERT INTO gethired.access_roles(id,role_name) VALUES(2,'Employer');
 INSERT INTO gethired.user_credentials(uid,email,password,role) VALUES('synthetic-owner','synthetic@example.invalid','not-a-password',2);
 INSERT INTO gethired.users(uid) VALUES('synthetic-owner');
 INSERT INTO gethired.companies(company_id,company_name,created_by,created_at) VALUES('COM-26-612469','Synthetic internal','synthetic-owner',NOW()),('trial-company','Synthetic trial','synthetic-owner',NOW());
 INSERT INTO gethired.companies_subscription(id,company_id,subscription_id,created_at) VALUES(6,'COM-26-612469',4,'2020-01-01');
 INSERT INTO gethired.company_employees(employee_id,company_id,employee_uuid,assigned_at,assigned_by) VALUES('synthetic-employee','trial-company','synthetic-owner',NOW(),'synthetic-owner');`);
 const before=(await db.query('SELECT to_jsonb(s) row FROM gethired.companies_subscription s')).rows[0].row;
 for(const p of ['db/subscription_engagement_migration.sql','db/paymongo_billing_migration.sql','db/internal_complimentary_access_migration.sql']){
  const sql=read(p);await assert.rejects(()=>db.exec(sql.replace(/COMMIT;\s*$/,'SELECT 1/0; COMMIT;')),{code:'22012'});await db.exec('ROLLBACK');
  await db.exec(sql);await db.exec(sql);
 }
 const migrated=(await db.query('SELECT to_jsonb(s) row FROM gethired.companies_subscription s')).rows[0].row;
 for(const k of Object.keys(before))assert.deepEqual(migrated[k],before[k],k);
 await assert.rejects(()=>db.query("UPDATE gethired.companies_subscription SET access_kind='internal_complimentary' WHERE id=6"),{code:'23514'});
 const grant=read('scripts/maintenance/grant-internal-company-access.sql');await db.exec(grant);await db.exec(grant);
 assert.equal((await db.query('SELECT count(*)::int n FROM gethired.internal_access_audit')).rows[0].n,1);
 const granted=(await db.query('SELECT * FROM gethired.companies_subscription WHERE id=6')).rows[0];assert.equal(granted.is_paid,false);assert.equal(granted.payment_date,null);assert.equal(granted.subscription_id,4);assert.equal(granted.access_kind,'internal_complimentary');
 assert.equal((await db.query("SELECT account_usage FROM gethired.companies WHERE company_id='COM-26-612469'")).rows[0].account_usage,'internal');
 await assert.rejects(()=>db.query('UPDATE gethired.companies_subscription SET is_paid=true WHERE id=6'),{code:'23514'});
 for(const t of ['invoices','payment_transactions','billing_fulfillments','referral_bunny_payments'])assert.equal((await db.query('SELECT count(*)::int n FROM gethired.'+t)).rows[0].n,0);
 let calls=0,attempt;const now=new Date();const config={enabled:true,mode:'test',nodeEnv:'test',dbHost:'localhost',webhookSecret:crypto.randomBytes(32).toString('hex'),clock:()=>now};
 const service=billing(db,'gethired',config,{createLink:async a=>{calls++;attempt=a;return {linkId:'synthetic-link',referenceNumber:'synthetic-reference',checkoutUrl:'https://example.invalid/checkout'};}});
 await assert.rejects(()=>service.checkout({companyId:'COM-26-612469',uid:'synthetic-owner'},{planCode:'premium'}),{code:'INTERNAL_ACCOUNT_BILLING_DISABLED'});assert.equal(calls,0);
 await db.exec(read('scripts/maintenance/rollback-internal-company-access.sql'));
 const restored=(await db.query('SELECT to_jsonb(s) row FROM gethired.companies_subscription s WHERE id=6')).rows[0].row;assert.deepEqual(restored,migrated);
 await assert.rejects(()=>db.exec(grant),/Previously granted account changed/);await db.exec('ROLLBACK');
 const trial=await provision(db,'gethired','trial-company',1);assert.equal(trial.is_paid,false);assert.equal(trial.payment_date,null);
 await provision(db,'gethired','trial-company',1);assert.equal((await db.query("SELECT count(*)::int n FROM gethired.companies_subscription WHERE company_id='trial-company'")).rows[0].n,1);
 const context={companyId:'trial-company',uid:'synthetic-owner'};const checkout=await service.checkout(context,{planCode:'growth'});assert.equal(checkout.amountMinor,349000);
 const event={data:{id:'evt_synthetic_paid',type:'event',attributes:{type:'payment.paid',livemode:false,data:{id:'pay_synthetic',type:'payment',attributes:{amount:checkout.amountMinor,currency:'PHP',status:'paid',livemode:false,metadata:{internal_payment_reference:attempt.internal_reference},source:{type:'gcash'}}}}}};
 const raw=Buffer.from(JSON.stringify(event)),stamp=Math.floor(+now/1000),signature='t='+stamp+',te='+crypto.createHmac('sha256',config.webhookSecret).update(stamp+'.').update(raw).digest('hex');
 assert.equal((await service.webhook(raw,signature)).status,'PROCESSED');assert.equal((await service.webhook(raw,signature)).status,'DUPLICATE');
 for(const t of ['invoices','payment_transactions','billing_fulfillments','subscription_billing_history'])assert.equal((await db.query('SELECT count(*)::int n FROM gethired.'+t)).rows[0].n,1,t);
 assert.equal((await service.effective(context)).entitlements.jobs,15);
 await assert.rejects(()=>db.query('UPDATE gethired.payment_attempts SET expected_amount_minor=1 WHERE id=$1',[checkout.paymentAttemptId]),/immutable/);
 console.log(JSON.stringify({database,postgres:info.version,migrations:'repeatable, preserve rows, injected failures rollback',internalGrant:'audited, idempotent, zero payment, checkout blocked',rollback:'restores exact before state',trial:'unpaid, idempotent',mockPayment:'signed event processed exactly once, limits applied',externalCalls:0}));
}
run().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>client.end());
