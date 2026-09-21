const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {setup}=require('./support/referral-payment-fixture.cjs');
const {connector}=require('../services/referral-bunny/service.cjs');
const {refundIntake,refunds}=require('../services/referral-bunny/refunds.cjs');

test('signup mapping follows verified ownership through payment, renewal and refund without reassignment',async()=>{
 const f=await setup();try{
  await f.pg.exec(fs.readFileSync('db/referral_bunny_signups_migration.sql','utf8'));
  await f.pg.exec(fs.readFileSync('db/referral_bunny_refunds_migration.sql','utf8'));
  await f.pg.exec("ALTER TABLE companies ADD COLUMN account_usage text DEFAULT 'customer';UPDATE referral_bunny_platform SET connected_by='owner-configured';DELETE FROM companies WHERE company_id='company'");
  Object.assign(f.config,{clientSecret:'a'.repeat(64),encryptionKey:'b'.repeat(64),ownerConnectionId:'connection',ownerProgramId:'program',refundsEnabled:true});
  const signupConnector=connector(f.pg,'gethired',f.config,async()=>{throw Error('network not expected');});

  const registered=await signupConnector.signups({connectionId:'connection'});
  assert.equal(registered.rows.length,1);
  assert.deepEqual(registered.rows[0].paymentCustomerIds,[]);
  const signupId=registered.rows[0].customerId;

  await f.pg.exec("INSERT INTO companies(company_id,created_by,created_at,account_usage) VALUES('company','owner','2026-09-02','customer'),('internal-company','owner','2026-09-02','internal')");
  assert.equal((await signupConnector.signups({connectionId:'connection'})).rows.length,0);
  await f.pg.exec("DELETE FROM companies WHERE company_id='internal-company'");
  const enriched=await signupConnector.signups({connectionId:'connection'});
  assert.equal(enriched.rows[0].customerId,signupId);
  assert.deepEqual(enriched.rows[0].paymentCustomerIds,['company']);
  assert.deepEqual((await signupConnector.signups({connectionId:'connection'})).rows,enriched.rows);

  await f.invoice(1);await f.invoice(2);
  await f.pg.exec("UPDATE payment_transactions SET provider_payment_id='pay_mapping' WHERE attempt_id='attempt-1';UPDATE payment_attempts SET paymongo_payment_id='pay_mapping' WHERE id='attempt-1';UPDATE payment_webhook_events SET provider_payment_id='pay_mapping' WHERE attempt_id='attempt-1';UPDATE invoices SET transaction_id='pay_mapping' WHERE billing_attempt_id='attempt-1'");
  assert.deepEqual(await f.service.prepare(),{queued:2,held:0});
  assert.deepEqual(await f.service.prepare(),{queued:0,held:0});
  assert.equal((await f.pg.query('SELECT COUNT(*)::int AS n FROM referral_bunny_customers')).rows[0].n,1);
  assert.equal((await f.service.deliverNext()).delivered,true);
  assert.equal((await f.service.deliverNext()).delivered,true);
  assert.equal((await f.service.deliverNext()).processed,false);
  assert.equal(f.sent.length,2);

  const intake=refundIntake(f.pg,'gethired',{enabled:true,mode:'live',webhookSecret:'secret'});
  const reversals=[];
  const refundService=refunds(f.pg,'gethired',{paymentContext:async()=>f.context},f.config,async(_url,body)=>{reversals.push(JSON.parse(body));return {received:true};});
  const event={data:{id:'evt_mapping_refund',type:'event',attributes:{type:'refund.succeeded',livemode:true,data:{id:'ref_mapping',type:'refund',attributes:{status:'succeeded',payment_id:'pay_mapping',amount:100800,currency:'PHP',livemode:true,created_at:1788480000}}}}};
  const raw=Buffer.from(JSON.stringify(event)),timestamp=String(Math.floor(Date.now()/1000));
  const signature=crypto.createHmac('sha256','secret').update(timestamp+'.').update(raw).digest('hex');
  assert.equal((await intake.webhook(raw,'t='+timestamp+',li='+signature)).recorded,1);
  assert.equal((await intake.webhook(raw,'t='+timestamp+',li='+signature)).duplicate,true);
  assert.deepEqual(await refundService.prepare(),{queued:1,held:0});
  assert.deepEqual(await refundService.prepare(),{queued:0,held:0});
  assert.equal((await refundService.deliverNext()).delivered,true);
  assert.equal((await refundService.deliverNext()).processed,false);
  assert.equal(reversals.length,1);

  await f.pg.exec("INSERT INTO user_credentials VALUES('other-owner','other@example.com',2,FALSE,'2026-09-02');INSERT INTO referral_bunny_attributions(uid,connection_id,program_id,membership_id,referred_at) VALUES('other-owner','connection','program','other-member','2026-09-01');UPDATE companies SET created_by='other-owner' WHERE company_id='company'");
  const conflicted=await signupConnector.signups({connectionId:'connection'});
  assert.deepEqual(conflicted.rows.map(row=>row.paymentCustomerIds),[[],[]]);
  const binding=(await f.pg.query("SELECT uid,membership_id FROM referral_bunny_customers WHERE connection_id='connection' AND company_id='company'")).rows[0];
  assert.deepEqual(binding,{uid:'owner',membership_id:'member'});
 }finally{await f.pg.close();}
});
