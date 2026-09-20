const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {connector}=require('../services/referral-bunny/service.cjs');
async function setup(){
 const pg=new PGlite();await pg.exec(`CREATE SCHEMA gethired; SET search_path=gethired; CREATE TABLE user_credentials(uid text primary key,email text,role int,is_archive boolean default false,created_date timestamptz); INSERT INTO user_credentials(uid,email,role,created_date) VALUES('admin','admin@example.com',1,'2026-09-01'),('employer','old@example.com',2,'2026-09-01'),('new','new@example.com',2,'2026-09-20 10:00:01Z'),('self','referrer@example.com',2,'2026-09-20 10:00:01Z');`);
 const migration=fs.readFileSync('db/referral_bunny_migration.sql','utf8');await pg.exec(migration);await pg.exec(migration);await pg.exec(fs.readFileSync('db/referral_bunny_payments_migration.sql','utf8'));
 await pg.exec(fs.readFileSync('db/referral_bunny_signups_migration.sql','utf8'));
 const config={enabled:true,clientSecret:'a'.repeat(64),encryptionKey:'b'.repeat(64),rbOrigin:'https://referralbunny.ai',clock:()=>Date.parse('2026-09-20T10:00:00Z')};const secret='event-secret-'.repeat(6);
 const s=connector(pg,'gethired',config,async(url,body,headers)=>{assert.ok(url.startsWith(config.rbOrigin));assert.equal(headers['X-RB-Signature'],crypto.createHmac('sha256',secret).update(headers['X-RB-Timestamp']+'.'+body).digest('hex'));return {clickId:JSON.parse(body).click_token==='valid-click'?'12345678-1234-4234-8234-123456789abc':null,membershipId:JSON.parse(body).membership_id,windowDays:30,emailFingerprint:crypto.createHmac('sha256',secret).update('referrer@example.com').digest('hex')};});
 const verifier='v'.repeat(64),input={connectionId:'connection-1',programId:'program-1',programName:'GetHired Referrals',businessName:'GetHired',state:'s'.repeat(64),challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),callbackPath:'/tenant/acme/quick-program/connection/program-1/gethired/callback'};
 async function authorize(extra={}){const {requestId}=await s.create({...input,...extra});const {redirect}=await s.approve('admin',requestId,true);return {requestId,code:new URL(redirect).searchParams.get('code'),verifier,eventSecret:secret};}
 return {pg,s,config,input,secret,authorize};
}
test('only platform admins approve, service endpoints require secret, requests expire and callbacks cannot escape',async()=>{const f=await setup();try{
 assert.throws(()=>f.s.authenticate('Bearer wrong'),{httpStatus:401});f.s.authenticate('Bearer '+f.config.clientSecret);
 const {requestId}=await f.s.create(f.input);await assert.rejects(()=>f.s.describe('employer',requestId),{httpStatus:403});await assert.rejects(()=>f.s.approve('employer',requestId,true),{httpStatus:403});
 await assert.rejects(()=>f.s.create({...f.input,callbackPath:'//evil.example/callback'}),{code:'INVALID_REQUEST'});
 const details=await f.s.describe('admin',requestId);assert.equal(details.paymentTracking,false);assert.equal(details.programName,f.input.programName);
 f.config.clock=()=>Date.parse('2026-09-20T10:11:00Z');await assert.rejects(()=>f.s.describe('admin',requestId),{httpStatus:410});
}finally{await f.pg.close();}});
test('PKCE is required, keys are encrypted, network retries recover and another program cannot take over',async()=>{const f=await setup();try{
 const input=await f.authorize();await assert.rejects(()=>f.s.exchange({...input,verifier:'x'.repeat(64)}),{httpStatus:401});
 assert.equal((await f.s.exchange(input)).connectionId,'connection-1');assert.equal((await f.s.exchange(input)).connectionId,'connection-1');
 const saved=(await f.pg.query('SELECT secret_cipher FROM gethired.referral_bunny_platform')).rows[0];assert.ok(!saved.secret_cipher.includes(f.secret));
 await assert.rejects(()=>f.s.exchange({...input,code:'1'.repeat(64)}),{httpStatus:401});
 const second=await f.authorize({connectionId:'connection-2'});await assert.rejects(()=>f.s.exchange(second),{httpStatus:409});
 await f.s.disconnect('connection-1');await assert.rejects(()=>f.s.exchange(input),{httpStatus:409});await f.s.exchange(second);
}finally{await f.pg.close();}});
test('revoking admin role before exchange denies authorization; denial creates no connection',async()=>{const f=await setup();try{
 const input=await f.authorize();await f.pg.query("UPDATE gethired.user_credentials SET role=2 WHERE uid='admin'");await assert.rejects(()=>f.s.exchange(input),{httpStatus:403});
 await f.pg.query("UPDATE gethired.user_credentials SET role=1 WHERE uid='admin'");const {requestId}=await f.s.create(f.input);const denied=await f.s.approve('admin',requestId,false);assert.equal(new URL(denied.redirect).searchParams.get('error'),'access_denied');await assert.rejects(()=>f.s.describe('admin',requestId),{httpStatus:410});
}finally{await f.pg.close();}});
test('capture and signup attribution reject tampering, existing customers, self-referrals and disconnected receipts',async()=>{const f=await setup();try{
 await f.s.exchange(await f.authorize());const r=await f.s.capture({programId:'program-1',membershipId:'member'});assert.ok(!r.receipt.includes('referrer@example.com'));
 await assert.rejects(()=>f.s.claim('new',r.receipt+'x'),{code:'INVALID_RECEIPT'});
 await assert.rejects(()=>f.s.claim('employer',r.receipt),{code:'NEW_EMPLOYER_REQUIRED'});
 await assert.rejects(()=>f.s.claim('self',r.receipt),{code:'SELF_REFERRAL'});
 await f.s.claim('new',r.receipt);await f.s.claim('new',r.receipt);assert.equal((await f.pg.query('SELECT * FROM gethired.referral_bunny_attributions')).rows.length,1);
 await f.s.disconnect('connection-1');await assert.rejects(()=>f.s.claim('new',r.receipt),{code:'NOT_CONNECTED'});
 await f.s.exchange(await f.authorize());await assert.rejects(()=>f.s.claim('new',r.receipt),{code:'REFERRAL_EXPIRED'});
}finally{await f.pg.close();}});
test('status reports actual provider state and reconnect keeps valid receipts until an explicit disconnect',async()=>{
 const f=await setup();try{
  assert.equal((await f.s.status('connection-1')).account,'not_connected');
  await f.s.exchange(await f.authorize());let status=await f.s.status('connection-1');assert.equal(status.account,'connected');assert.equal(status.signups,'ready');assert.equal(status.payments,'not_available');assert.equal(status.lastSignupAt,null);
  const receipt=await f.s.capture({programId:'program-1',membershipId:'member'});
  await f.s.exchange(await f.authorize());await f.s.claim('new',receipt.receipt);
  status=await f.s.status('connection-1');assert.ok(status.lastSignupAt);assert.equal(JSON.stringify(status).includes('secret'),false);
  await f.pg.query("UPDATE gethired.user_credentials SET role=2 WHERE uid='admin'");
  status=await f.s.status('connection-1');assert.equal(status.account,'reconnect_required');assert.equal(status.signups,'paused');await assert.rejects(()=>f.s.capture({programId:'program-1',membershipId:'member'}),{httpStatus:403});
  await f.pg.query("UPDATE gethired.user_credentials SET role=1 WHERE uid='admin'");await f.s.exchange(await f.authorize());assert.equal((await f.s.status('connection-1')).account,'connected');
  await f.s.disconnect('connection-1');status=await f.s.status('connection-1');assert.equal(status.account,'disconnected');assert.equal(status.signups,'not_connected');
 }finally{await f.pg.close();}
});

test('signup-only approval cannot deliver payments; reauthorization explicitly grants the new scope',async()=>{const f=await setup();try{
 await f.s.exchange(await f.authorize());f.config.paymentsEnabled=true;
 assert.equal((await f.s.status('connection-1')).payments,'authorization_required');
 await assert.rejects(()=>f.s.paymentContext(),{code:'PAYMENT_AUTHORIZATION_REQUIRED'});
 const {requestId}=await f.s.create(f.input);assert.equal((await f.s.describe('admin',requestId)).paymentTracking,true);
 const {redirect}=await f.s.approve('admin',requestId,true);
 await f.s.exchange({requestId,code:new URL(redirect).searchParams.get('code'),verifier:'v'.repeat(64),eventSecret:f.secret});
 assert.equal((await f.s.paymentContext()).secret,f.secret);assert.equal((await f.s.status('connection-1')).payments,'ready');
 f.config.paymentsEnabled=false;await assert.rejects(()=>f.s.paymentContext(),{code:'PAYMENT_AUTHORIZATION_REQUIRED'});
}finally{await f.pg.close();}});

test('owner-configured signup connection is pinned, preserves retries, and needs no admin account',async()=>{
 const f=await setup();try {
  const input={connectionId:'connection-1',programId:'program-1',eventSecret:f.secret};
  await assert.rejects(()=>f.s.ownerConnect(input),{httpStatus:403});
  f.config.ownerConnectionId=input.connectionId;f.config.ownerProgramId=input.programId;
  await assert.rejects(()=>f.s.ownerConnect({...input,programId:'other'}),{httpStatus:403});
  await assert.rejects(()=>f.s.ownerConnect({...input,connectionId:'other'}),{httpStatus:403});
  await f.pg.query('DELETE FROM gethired.user_credentials WHERE role=1');
  await f.s.ownerConnect(input);
  assert.equal((await f.s.status(input.connectionId)).account,'connected');
  const receipt=await f.s.capture({programId:'program-1',membershipId:'member'});
  await f.s.ownerConnect(input);await f.s.claim('new',receipt.receipt);
  f.config.paymentsEnabled=true;assert.equal((await f.s.status(input.connectionId)).payments,'authorization_required');
  await assert.rejects(()=>f.s.paymentContext(),{code:'PAYMENT_AUTHORIZATION_REQUIRED'});
  f.config.ownerProgramId='other';assert.equal((await f.s.status(input.connectionId)).account,'reconnect_required');
  await assert.rejects(()=>f.s.capture({programId:'program-1',membershipId:'member'}),{httpStatus:403});
  f.config.ownerProgramId='program-1';await f.s.disconnect(input.connectionId);await f.s.ownerConnect(input);
  await assert.rejects(()=>f.s.claim('new',receipt.receipt),{code:'REFERRAL_EXPIRED'});
 } finally {await f.pg.close();}
});

test('signup feed retains verified click attribution, is connection scoped and exposes no email',async()=>{
 const f=await setup();try {
  await f.s.exchange(await f.authorize());
  const receipt=await f.s.capture({programId:'program-1',membershipId:'member',clickToken:'valid-click'});
  await f.s.claim('new',receipt.receipt);await f.s.claim('new',receipt.receipt);
  const feed=await f.s.signups({connectionId:'connection-1'});
  assert.equal(feed.rows.length,1);assert.equal(feed.rows[0].clickId,'12345678-1234-4234-8234-123456789abc');
  assert.equal(feed.rows[0].membershipId,'member');assert.equal(feed.rows[0].occurredAt,'2026-09-20T10:00:01.000Z');
  assert.equal(JSON.stringify(feed).includes('new@example.com'),false);assert.equal(feed.cursor,null);
  await assert.rejects(()=>f.s.signups({connectionId:'other'}),{httpStatus:403});
 }finally{await f.pg.close();}
});
