const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const {transformSync}=require('esbuild');const {PGlite}=require('@electric-sql/pglite');const access=require('../services/internalAccess.cjs');
const internal={subscription_id:4,is_paid:false,created_at:'2020-01-01',period_end:'2020-02-01',sub_status:'active',access_kind:'internal_complimentary',access_granted_by:'operator',access_granted_at:'2026-09-21',access_reason:'Internal company use'};
function load(file,extra=''){
 const code=transformSync(fs.readFileSync(file,'utf8')+'\n'+extra,{format:'cjs',loader:'js'}).code;const module={exports:{}};
 const mocks={getPlanByDbId:()=>({slug:'business'}),getPlanBySlug:()=>({slug:'business'}),default:{schema:'gethired'}};
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>name.endsWith('internalAccess.cjs')?access:mocks,console,process,Date});return module.exports;
}
test('internal access remains active despite old dates, reports unpaid, and suppresses dunning',()=>{
 const lifecycle=load('services/subscriptionLifecycleServiceV4.js');const dunning=load('services/subscriptionDunningServiceV4.js');const entitlement=load('services/subscriptionEntitlementServiceV4.js','export {deriveStatusFromRow};');
 assert.equal(lifecycle.deriveLifecycleStatus(internal),'active');assert.equal(dunning.calculateDunningState(internal).notifications.length,0);assert.equal(dunning.isInGracePeriod(internal),false);
 const info=entitlement.deriveStatusFromRow(internal);assert.equal(info.status,'subscription_active');assert.equal(info.currentPeriodEnd,null);assert.equal(info.planCode,'business');assert.equal(info.isPaid,false);assert.equal(info.accessLabel,'Internal / Complimentary');
 const ordinary={...internal,access_kind:'standard'};assert.equal(entitlement.deriveStatusFromRow(ordinary).status,'subscription_pending_payment');
 for(const field of ['access_granted_by','access_granted_at'])assert.equal(access.isInternal({...internal,[field]:null}),false);
});
test('additive access migration preserves records, reruns and rejects paid or unaudited internal grants',async()=>{
 const db=new PGlite();try{
 await db.exec(fs.readFileSync('tests/fixtures/gethired-production-billing-schema.sql','utf8'));
 await db.exec("INSERT INTO gethired.companies_subscription(company_id,subscription_id) VALUES('synthetic',4)");
 const migration=fs.readFileSync('db/internal_complimentary_access_migration.sql','utf8');await db.exec(migration);await db.exec(migration);
 assert.equal((await db.query('SELECT access_kind,is_paid FROM gethired.companies_subscription')).rows[0].access_kind,'standard');
 await assert.rejects(()=>db.query("UPDATE gethired.companies_subscription SET access_kind='internal_complimentary'"),{code:'23514'});
 await db.query("UPDATE gethired.companies_subscription SET access_kind='internal_complimentary',is_paid=false,payment_date=null,access_granted_by='operator',access_granted_at=NOW(),access_reason='Internal company use'");
 await assert.rejects(()=>db.query('UPDATE gethired.companies_subscription SET is_paid=true'),{code:'23514'});
 assert.equal(access.isInternal((await db.query('SELECT * FROM gethired.companies_subscription')).rows[0]),true);
 }finally{await db.close();}
});

test('internal checkout fails before idempotent link reuse or provider call',async()=>{
 const {billing}=require('../services/paymongo-billing/service.cjs');let calls=0;const queries=[];
 const db={transaction:fn=>fn({query:async(sql)=>{queries.push(sql);if(sql.includes('FROM gethired.companies_subscription'))return {rows:[internal]};if(sql.includes('advisory'))return {rows:[]};throw Error('Unexpected query');}})};
 const service=billing(db,'gethired',{enabled:true,mode:'test',nodeEnv:'test',dbHost:'localhost'},{createLink:async()=>calls++});
 await assert.rejects(()=>service.checkout({companyId:'internal',uid:'owner'},{planCode:'premium',idempotencyKey:'existing_key'}),{code:'INTERNAL_ACCOUNT_BILLING_DISABLED'});
 assert.equal(calls,0);assert.equal(queries.some(q=>q.includes('payment_attempts')),false);
});

 test('legacy free trial creation stays unpaid with billing foundation disabled',async()=>{
 const rows=[];const db={query:async(sql,params)=>{if(sql.startsWith('SELECT'))return {rows:[]};rows.push(params);return {rows:[{company_id:params[0],is_paid:params[3],payment_date:params[4]}]};}};
 const module={exports:{}};const code=transformSync(fs.readFileSync('controllers/subscriptionController.js','utf8'),{format:'cjs'}).code;
 vm.runInNewContext(code,{module,exports:module.exports,console,Date,process:{env:{PAYMONGO_BILLING_ENABLED:'false'}},require:name=>name.endsWith('internalAccess.cjs')?access:name==='../db/dbQuery'?{__esModule:true,default:db}:{__esModule:true,default:{schema:'gethired'}}});
 await module.exports.createCompanySubscription('trial',1);await module.exports.createCompanySubscription('trial-string','1');
 assert.equal(rows.length,2);for(const row of rows){assert.equal(row[3],false);assert.equal(row[4],null);}
 });
