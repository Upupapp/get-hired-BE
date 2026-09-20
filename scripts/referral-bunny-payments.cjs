// A bounded operator-run batch. Schedule on the existing server during deployment;
// never via GitHub Actions. No web endpoint can submit an amount or trigger a reward.
require('dotenv').config();
const {Pool}=require('pg');
const {connector}=require('../services/referral-bunny/service.cjs');
const {refunds}=require('../services/referral-bunny/refunds.cjs');
const {payments}=require('../services/referral-bunny/payments.cjs');
if(process.env.REFERRAL_BUNNY_ENABLED!=='true'||process.env.REFERRAL_BUNNY_PAYMENTS_ENABLED!=='true')throw Error('Referral payment delivery is disabled');
if(process.env.REFERRAL_BUNNY_LIVE_DELIVERY_AUTHORIZED!=='true')throw Error('Live delivery must be explicitly enabled by the operator');
// Require explicit worker connection settings; do not guess production DB routing.
if(!process.env.RB_WORKER_DB_HOST||!process.env.RB_WORKER_DB_NAME||!process.env.RB_WORKER_DB_SCHEMA)throw Error('Explicit referral worker database configuration is required');
const pool=new Pool({host:process.env.RB_WORKER_DB_HOST,database:process.env.RB_WORKER_DB_NAME,user:process.env.RB_WORKER_DB_USER,password:process.env.RB_WORKER_DB_PASSWORD,port:Number(process.env.RB_WORKER_DB_PORT||5432),max:3,connectionTimeoutMillis:5000});
const db={query:(...args)=>pool.query(...args),transaction:async work=>{const q=await pool.connect();try{await q.query('BEGIN');const result=await work(q);await q.query('COMMIT');return result;}catch(e){await q.query('ROLLBACK');throw e;}finally{q.release();}}};
const config={enabled:true,paymentsEnabled:true,refundsEnabled:process.env.REFERRAL_BUNNY_REFUNDS_ENABLED==='true',clientSecret:process.env.REFERRAL_BUNNY_CLIENT_SECRET,encryptionKey:process.env.REFERRAL_BUNNY_ENCRYPTION_KEY,rbOrigin:process.env.REFERRAL_BUNNY_ORIGIN||'https://referralbunny.ai'};
const transport=async(url,body,headers)=>{const res=await fetch(url,{method:'POST',body,headers,redirect:'error',signal:AbortSignal.timeout(10000)});if(!res.ok)throw Object.assign(Error('Receiver rejected event'),{code:'RECEIVER_REJECTED',status:res.status,retryAfter:res.headers.get('retry-after')});return res.json();};
const connection=connector(db,process.env.RB_WORKER_DB_SCHEMA,config,transport);
const service=payments(db,process.env.RB_WORKER_DB_SCHEMA,connection,config,transport);
const reversals=refunds(db,process.env.RB_WORKER_DB_SCHEMA,connection,config,transport);
let batchLock;
(async()=>{
 batchLock=await pool.connect();
 const locked=await batchLock.query("SELECT pg_try_advisory_lock(hashtext($1),hashtext('referral-bunny-delivery')) AS locked",[process.env.RB_WORKER_DB_SCHEMA]);
 if(!locked.rows[0].locked){console.log(JSON.stringify({skipped:'batch_already_running'}));return;}
 const prepared=await service.prepare(10);
 const refundPrepared=config.refundsEnabled?await reversals.prepare(20):{queued:0,held:0};
 let delivered=0,reversed=0,failed=0;
 // Prioritize known reversals, while never sending one before its original payment.
 for(let n=0;n<30;n++){
  if(reversed>=20)break;
  const refund=config.refundsEnabled?await reversals.deliverNext():{processed:false};
  if(refund.processed){if(!refund.delivered){failed++;break;}reversed++;continue;}
  if(delivered>=10)break;
  const r=await service.deliverNext();if(!r.processed)break;if(!r.delivered){failed++;break;}delivered++;
 }
 console.log(JSON.stringify({...prepared,refundsQueued:refundPrepared.queued,refundsHeld:refundPrepared.held,delivered,reversed,failed}));if(failed)process.exitCode=1;
})().catch(()=>{console.error('Referral payment batch failed; inspect configuration and delivery records. No credentials or customer details are logged.');process.exitCode=1;}).finally(async()=>{if(batchLock){await batchLock.query("SELECT pg_advisory_unlock(hashtext($1),hashtext('referral-bunny-delivery'))",[process.env.RB_WORKER_DB_SCHEMA]).catch(()=>{});batchLock.release();}await pool.end();});
