'use strict';
// Local subscription integration stage. Never imports env.js, Firebase or production credentials.
const fs=require('fs'),path=require('path'),vm=require('vm');
const {transformSync}=require('esbuild');const {PGlite}=require('@electric-sql/pglite');const express=require('express');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
async function start(){
 const db=new PGlite();
 for(const p of ['tests/fixtures/gethired-production-billing-schema.sql','db/subscription_engagement_migration.sql','db/paymongo_billing_migration.sql','db/internal_complimentary_access_migration.sql'])await db.exec(read(p));
 await db.exec("SET search_path=gethired,public; CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';");
 await db.exec('CREATE TABLE gethired.job_applicants(job_application_id varchar PRIMARY KEY)'); // Empty staging FK target; candidate workflows are outside this stage.
 await db.exec(read('db/20260913_stored_media.sql'));
 await db.exec(`INSERT INTO gethired.access_roles(id,role_name) VALUES(2,'Employer');INSERT INTO gethired.industry VALUES(1,'Synthetic');
 INSERT INTO gethired.user_credentials(uid,email,password,role) VALUES('stage-internal','internal@example.invalid','not-a-password',2),('stage-trial','trial@example.invalid','not-a-password',2);
 INSERT INTO gethired.users(uid) VALUES('stage-internal'),('stage-trial');
 INSERT INTO gethired.companies(company_id,company_name,created_at,created_by) VALUES('stage-internal','Internal company — synthetic',NOW(),'stage-internal'),('stage-trial','Trial company — synthetic',NOW(),'stage-trial');
 INSERT INTO gethired.company_employees(employee_id,company_id,employee_uuid,assigned_at,assigned_by) SELECT uid,uid,uid,NOW(),uid FROM gethired.user_credentials;
 INSERT INTO gethired.subscription(subscription_id,subscription_name,canonical_slug,price,annual_price) VALUES(1,'Free Trial','free_trial',0,0),(2,'Starter','starter',1490,14900),(3,'Growth','growth',3490,34900),(4,'Premium','business',5990,59900);
 INSERT INTO gethired.companies_subscription(company_id,subscription_id,created_at,is_paid,payment_date,sub_status,access_kind,access_granted_by,access_granted_at,access_reason) VALUES('stage-internal',4,'2020-01-01',FALSE,NULL,'active','internal_complimentary','local-stage',NOW(),'Synthetic internal company');
 INSERT INTO gethired.companies_subscription(company_id,subscription_id,created_at,is_paid,payment_date,sub_status,plan_slug,period_start,period_end) VALUES('stage-trial',1,NOW(),FALSE,NULL,'trialing','free_trial',NOW(),NOW()+INTERVAL '7 days');`);
 const cache={};
 const overrides={
  'env.js':{__esModule:true,default:{schema:'gethired'}},'db/dbQuery.js':{__esModule:true,default:db},
  'controllers/companiesController.js':{getUserCompanyForRequest:async req=>({companyId:req.user.uid})},
  'controllers/jobsController.js':{getBasicJobList:async()=>[],getPublishedJobsWithinDateRange:async()=>[]},
  'services/company.service.js':{companyUsers:async id=>(await db.query('SELECT employee_id FROM gethired.company_employees WHERE company_id=$1',[id])).rows},
  'services/job.service.js':{getAllVideoResponsesByJobIds:async()=>[]},
  'services/user.service.js':{insertLogs:async()=>{}},
  'services/subscriptionAuditLogServiceV4.js':{logCheckoutIntent:()=>{},logValidationRejection:()=>{}},
  'controllers/paymentController.js':{createPaymongoLink:async()=>{throw Error('External payment disabled');}},
 };
 function load(file){
  file=path.normalize(file);if(overrides[file])return overrides[file];if(cache[file])return cache[file].exports;
  const module={exports:{}};cache[file]=module;
  const code=transformSync(read(file),{format:'cjs'}).code;
  vm.runInNewContext(code,{module,exports:module.exports,console,Buffer,Date,setTimeout,clearTimeout,process:{env:{SUBSCRIPTIONS_ENFORCEMENT_MODE:'enforce'}},require:name=>{
   if(!name.startsWith('.'))return require(name);
   let resolved=path.join(path.dirname(file),name);if(!/\.(cjs|js)$/.test(resolved))resolved+='.js';
   if(resolved.endsWith('.cjs'))return require(path.join(root,resolved));return load(resolved);
  }},{filename:file});return module.exports;
 }
 const summary=load('controllers/subscriptionController.js');const guards=load('controllers/subscriptionGuardrailsControllerV4.js');
 let providerCalls=0;
 const service=require('../../services/paymongo-billing/service.cjs').billing(db,'gethired',{enabled:true,mode:'test',nodeEnv:'test',dbHost:'localhost'},{createLink:async a=>{providerCalls++;return {linkId:'link_'+a.id,referenceNumber:'ref_'+a.id,checkoutUrl:'http://127.0.0.1:4317/simulated-payment'};}});
 const app=express();app.use((req,res,next)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';");next();});app.use(express.json());app.use('/api',(req,res,next)=>{
  const scenario=req.headers['x-stage-case'];if(!['internal','trial'].includes(scenario))return res.status(401).json({code:'LOCAL_STAGE_IDENTITY_REQUIRED'});
  req.user={uid:'stage-'+scenario};next();
 });
 app.get('/api/recruiter/subscription-summary',summary.getSubscriptionSummary);
 app.get('/api/subscriptions/pricing-catalog',guards.getPricingCatalogEndpoint);
 app.get('/api/subscriptions/employer/summary',guards.getEmployerSubscriptionSummary);
 app.get('/api/billing/invoices',(req,res)=>res.json({success:true,invoices:[],total:0}));
 app.use('/api',require('../../services/paymongo-billing/http.cjs').routes(express,service,(req,res,next)=>next()));
 app.use('/api',(req,res)=>res.status(404).json({code:'LOCAL_STAGE_ENDPOINT_NOT_INCLUDED'}));
 app.get('/stage/evidence',async(req,res)=>res.json({stage:'local-synthetic',database:'PGlite in-memory',auth:'synthetic identities',provider:'simulated',providerCalls,payments:Number((await db.query('SELECT count(*) n FROM gethired.payment_transactions')).rows[0].n)}));
 const frontend=process.env.GETHIRED_STAGE_FRONTEND;if(frontend){app.use(express.static(frontend));app.get('*',(req,res)=>res.sendFile(path.join(path.resolve(frontend),'index.html')));}
 const server=app.listen(4317,'127.0.0.1',()=>console.log('LOCAL_STAGE http://127.0.0.1:4317 — synthetic accounts only'));
 process.on('SIGTERM',()=>server.close(async()=>{await db.close();process.exit(0);}));
}
start().catch(e=>{console.error(e.message);process.exitCode=1;});
