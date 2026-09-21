const assert=require('node:assert/strict');const fs=require('node:fs');const crypto=require('node:crypto');const {PGlite}=require('@electric-sql/pglite');const {payments,paymentBody}=require('../../services/referral-bunny/payments.cjs');
async function setup(){
 const pg=new PGlite();await pg.exec(`CREATE SCHEMA gethired;SET search_path=gethired;
 CREATE TABLE user_credentials(uid text primary key,email text,role int,is_archive boolean,created_date timestamptz);
 CREATE TABLE companies(company_id varchar primary key,created_by text,created_at timestamptz);
 CREATE TABLE payment_attempts(id text primary key,company_id text,purchase_type text,currency text,status text,livemode boolean,paymongo_payment_id text,expected_amount_minor bigint);
 CREATE TABLE payment_transactions(attempt_id text,company_id text,provider_payment_id text,gross_minor bigint,currency text,paid_at timestamptz,status text,refund_minor bigint,livemode boolean,provider text);
 CREATE TABLE payment_webhook_events(provider text,attempt_id text,provider_payment_id text,status text,livemode boolean);
 CREATE TABLE billing_fulfillments(attempt_id text,company_id text);
 INSERT INTO user_credentials VALUES('owner','buyer@example.com',2,FALSE,'2026-09-02');
 INSERT INTO companies VALUES('company','owner','2026-09-02');`);
 for(const file of ['20260630_invoice_billing_schema.sql','referral_bunny_migration.sql','referral_bunny_payments_migration.sql','referral_bunny_payments_migration.sql'])await pg.exec(fs.readFileSync('db/'+file,'utf8'));
 await pg.exec(`ALTER TABLE invoices ADD COLUMN billing_attempt_id text;UPDATE referral_bunny_platform SET connection_id='connection',program_id='program',generation='generation',payments_authorized=TRUE,connected_by='admin',connected_at='2026-09-01' WHERE id=1;INSERT INTO referral_bunny_attributions(uid,connection_id,program_id,membership_id,referred_at) VALUES('owner','connection','program','member','2026-09-01');`);
 const context={connection_id:'connection',program_id:'program',generation:'generation',secret:'s'.repeat(64)};const config={enabled:true,rbOrigin:'https://referralbunny.ai'};const sent=[];let failDelivery=false;
 const service=payments(pg,'gethired',{paymentContext:async()=>context},config,async(url,body,headers)=>{
  assert.equal(headers['X-RB-Signature'],crypto.createHmac('sha256',context.secret).update(headers['X-RB-Timestamp']+'.'+body).digest('hex'));
  if(url.endsWith('/validate'))return {membershipId:'member',windowDays:30,emailFingerprint:crypto.createHmac('sha256',context.secret).update('referrer@example.com').digest('hex')};
  sent.push(body);if(failDelivery)throw Error('response lost');return {received:true};
 });
 async function invoice(n,{type=n===1?'SUBSCRIPTION_START':'SUBSCRIPTION_RENEWAL',date=n===1?'2026-09-03':'2026-10-03',live=true,status='PAID'}={}){
  const id='00000000-0000-4000-8000-'+String(n).padStart(12,'0'),attempt='attempt-'+n,payment='pay-'+n;
  await pg.query(`INSERT INTO payment_attempts VALUES($1,'company',$2,'PHP',$3,$4,$5,100800)`,[attempt,type,status,live,payment]);
  await pg.query(`INSERT INTO payment_transactions VALUES($1,'company',$2,100800,'PHP',$3,$4,0,$5,'PAYMONGO')`,[attempt,payment,date,status,live]);
  await pg.query(`INSERT INTO payment_webhook_events VALUES('paymongo',$1,$2,'processed',$3)`,[attempt,payment,live]);
  await pg.query(`INSERT INTO billing_fulfillments VALUES($1,'company')`,[attempt]);
  await pg.query(`INSERT INTO invoices(id,company_id,transaction_id,billing_attempt_id,status,currency,subtotal_amount,discount_amount,tax_amount,total_amount,amount_paid,amount_due,paid_at) VALUES($1,'company',$2,$3,'paid','PHP',1000,100,108,1008,1008,0,$4)`,[id,payment,attempt,date]);return id;
 }
 return {pg,service,config,context,sent,invoice,fail:()=>failDelivery=true,recover:()=>failDelivery=false};
}

module.exports={setup};
