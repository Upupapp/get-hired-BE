const {test}=require('node:test');const assert=require('node:assert/strict');const {setup}=require('./support/referral-payment-fixture.cjs');
test('verified first payment and renewal exclude tax, apply discounts once, and deliver once in order',async()=>{const f=await setup();try{
 await f.invoice(1);await f.invoice(2);assert.deepEqual(await f.service.prepare(),{queued:2,held:0});
 const rows=(await f.pg.query('SELECT payload FROM referral_bunny_payments ORDER BY occurred_at')).rows.map(r=>JSON.parse(r.payload));assert.equal(rows[0].amount_minor,90000);assert.equal(rows[0].first_payment,true);assert.equal(rows[1].first_payment,false);assert.equal(rows[0].customer_id,'company');assert.equal(rows[1].membership_id,'member');
 assert.deepEqual(await f.service.prepare(),{queued:0,held:0});await f.service.deliverNext();await f.service.deliverNext();assert.equal((await f.service.deliverNext()).processed,false);assert.equal(f.sent.length,2);
}finally{await f.pg.close();}});
test('test mode, pending, missing webhook or fulfillment, addons and upgrades never queue rewards',async()=>{const f=await setup();try{
 await f.invoice(1,{live:false});await f.invoice(2,{status:'PENDING'});await f.invoice(3,{type:'STORAGE_ADDON'});await f.invoice(4,{type:'SUBSCRIPTION_UPGRADE'});await f.invoice(5);await f.invoice(6);await f.pg.exec("DELETE FROM payment_webhook_events WHERE attempt_id='attempt-5';DELETE FROM billing_fulfillments WHERE attempt_id='attempt-6';");assert.deepEqual(await f.service.prepare(),{queued:0,held:0});
}finally{await f.pg.close();}});
test('legacy paid customers and renewal without a referred first purchase are held',async()=>{const f=await setup();try{
 await f.invoice(1);await f.pg.exec("INSERT INTO invoices(company_id,status,amount_paid,paid_at) VALUES('company','paid',500,'2026-08-01');");assert.equal((await f.service.prepare()).held,1);assert.equal((await f.service.deliverNext()).processed,false);
 await f.invoice(2);assert.equal((await f.service.prepare()).held,1);
}finally{await f.pg.close();}});
test('invoice inconsistencies and self-referrals are held rather than inventing a reward basis',async()=>{const f=await setup();try{
 await f.invoice(1);await f.pg.exec('UPDATE invoices SET tax_amount=100');assert.equal((await f.service.prepare()).held,1);assert.equal((await f.pg.query('SELECT reason FROM referral_bunny_payments')).rows[0].reason,'INVOICE_AMOUNT_MISMATCH');
}finally{await f.pg.close();}const g=await setup();try{await g.invoice(1);await g.pg.exec("UPDATE user_credentials SET email='referrer@example.com'");assert.equal((await g.service.prepare()).held,1);}finally{await g.pg.close();}});
test('lost response retries exact persisted payload before any renewal',async()=>{const f=await setup();try{
 await f.invoice(1);await f.invoice(2);await f.service.prepare();f.fail();assert.equal((await f.service.deliverNext()).delivered,false);assert.equal((await f.service.deliverNext()).processed,false);await f.pg.exec("UPDATE referral_bunny_payments SET next_attempt_at=NOW()-INTERVAL '1 second'");f.recover();assert.equal((await f.service.deliverNext()).delivered,true);assert.equal(f.sent[0],f.sent[1]);assert.equal(JSON.parse(f.sent[1]).first_payment,true);await f.service.deliverNext();assert.equal(JSON.parse(f.sent[2]).first_payment,false);
}finally{await f.pg.close();}});
test('disconnect and refund after preparation prevent pending reward delivery',async()=>{const f=await setup();try{
 await f.invoice(1);await f.service.prepare();await f.pg.exec("UPDATE referral_bunny_platform SET disconnected_at=NOW()");await assert.rejects(()=>f.service.deliverNext(),{code:'CONNECTION_CHANGED'});await f.pg.exec("UPDATE referral_bunny_platform SET disconnected_at=NULL;UPDATE payment_transactions SET status='PARTIALLY_REFUNDED',refund_minor=1000;");assert.equal((await f.service.deliverNext()).delivered,false);assert.equal(f.sent.length,0);assert.equal((await f.pg.query('SELECT reason FROM referral_bunny_payments')).rows[0].reason,'PAYMENT_CHANGED');
}finally{await f.pg.close();}});
test('expired attribution and accounts created before referral do not qualify',async()=>{for(const sql of ["UPDATE referral_bunny_attributions SET referred_at='2026-07-01'","UPDATE user_credentials SET created_date='2026-08-01'"]){const f=await setup();try{await f.invoice(1);await f.pg.exec(sql);assert.equal((await f.service.prepare()).held,1);}finally{await f.pg.close();}}});
test('feature disabled does not inspect or transmit financial records',async()=>{const f=await setup();try{f.config.enabled=false;await assert.rejects(()=>f.service.prepare(),{code:'PAYMENT_CONNECTOR_DISABLED'});assert.equal(f.sent.length,0);}finally{await f.pg.close();}});

 test('internal company usage is excluded before queueing and rechecked before delivery',async()=>{const f=await setup();try{
 await f.pg.exec("ALTER TABLE companies ADD COLUMN account_usage text DEFAULT 'customer'");
 await f.invoice(1);await f.pg.exec("UPDATE companies SET account_usage='internal'");
 assert.deepEqual(await f.service.prepare(),{queued:0,held:0});assert.equal(f.sent.length,0);
 await f.pg.exec("UPDATE companies SET account_usage='customer'");assert.equal((await f.service.prepare()).queued,1);
 await f.pg.exec("UPDATE companies SET account_usage='internal'");assert.equal((await f.service.deliverNext()).delivered,false);assert.equal(f.sent.length,0);
 }finally{await f.pg.close();}});
