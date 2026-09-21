'use strict';
const crypto = require('crypto');
const id = () => crypto.randomBytes(32).toString('hex');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const failure = (code, httpStatus=400) => Object.assign(new Error(code), { code, httpStatus });
function connector(db, schema, config, transport) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) throw failure('INVALID_SCHEMA');
  const t = name => schema+'.'+name;
  const now = () => config.clock ? new Date(config.clock()) : new Date();
  function enabled() {
    if (!config.enabled || !config.clientSecret || config.clientSecret.length<32 || !/^[a-f0-9]{64}$/.test(config.encryptionKey || '')) throw failure('CONNECTOR_UNAVAILABLE',503);
    if (!/^https:\/\//.test(config.rbOrigin) || new URL(config.rbOrigin).origin!==config.rbOrigin) throw failure('CONNECTOR_UNAVAILABLE',503);
  }
  function authenticate(value) {
    enabled(); const expected='Bearer '+config.clientSecret;
    if (typeof value!=='string' || Buffer.byteLength(value)!==Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(value),Buffer.from(expected))) throw failure('UNAUTHORIZED',401);
  }
  function seal(value) {
    const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',Buffer.from(config.encryptionKey,'hex'),iv);
    const body=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
    return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
  }
  function unseal(value) {
    try { if(typeof value!=='string'||value.length>4096||!/^[a-zA-Z0-9_-]+$/.test(value))throw Error(); const bytes=Buffer.from(value,'base64url'); if(bytes.toString('base64url')!==value)throw Error(); const cipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(config.encryptionKey,'hex'),bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString()); }
    catch (_) { throw failure('INVALID_RECEIPT'); }
  }
  async function admin(uid,q=db) {
    enabled(); const r=await q.query(`SELECT uid FROM ${t('user_credentials')} WHERE uid=$1 AND role=1 AND is_archive=FALSE`,[uid]);
    if (!r.rows.length) throw failure('PLATFORM_ADMIN_REQUIRED',403);
  }
  async function authority(a) {
    if (a.connected_by === 'owner-configured') {
      if (!config.ownerConnectionId || !config.ownerProgramId || a.connection_id !== config.ownerConnectionId || a.program_id !== config.ownerProgramId) throw failure('OWNER_CONNECTION_REQUIRED',403);
      return;
    }
    await admin(a.connected_by);
  }
  // Only the confidential server client can call this through the route below.
  // The deployment owner must pin both identifiers in GetHired's environment.
  async function ownerConnect(input) {
    enabled();
    if (!config.ownerConnectionId || !config.ownerProgramId || input.connectionId !== config.ownerConnectionId || input.programId !== config.ownerProgramId) throw failure('OWNER_CONNECTION_REQUIRED',403);
    if (typeof input.eventSecret !== 'string' || input.eventSecret.length < 32 || input.eventSecret.length > 256) throw failure('INVALID_EXCHANGE');
    return db.transaction(async q => {
      const active=(await q.query(`SELECT * FROM ${t('referral_bunny_platform')} WHERE id=1 FOR UPDATE`)).rows[0];
      if (active.connection_id && !active.disconnected_at && (active.connection_id !== input.connectionId || active.program_id !== input.programId)) throw failure('ALREADY_CONNECTED',409);
      const same=active.connection_id === input.connectionId && active.program_id === input.programId && !active.disconnected_at && active.secret_cipher && unseal(active.secret_cipher) === input.eventSecret;
      await q.query(`UPDATE ${t('referral_bunny_platform')} SET connection_id=$1,program_id=$2,request_id=NULL,secret_cipher=$3,generation=$4,connected_by='owner-configured',connected_at=$5,payments_authorized=FALSE,disconnected_at=NULL WHERE id=1`,[input.connectionId,input.programId,seal(input.eventSecret),same?active.generation:id(),same?active.connected_at:now()]);
      return {connectionId:input.connectionId};
    });
  }
  async function pending(requestId,q=db,lock=false) {
    if (!/^[a-f0-9]{64}$/.test(requestId || '')) throw failure('CONNECTION_EXPIRED',410);
    const r=await q.query(`SELECT * FROM ${t('referral_bunny_requests')} WHERE id=$1${lock?' FOR UPDATE':''}`,[requestId]);
    const a=r.rows[0]; if (!a || +new Date(a.expires_at)<+now() || a.denied_at) throw failure('CONNECTION_EXPIRED',410); return a;
  }
  const callback = (a,values) => { const url=new URL(a.callback_path,config.rbOrigin); for(const [key,value] of Object.entries({state:a.state,...values}))url.searchParams.set(key,value);return url.toString(); };
  async function create(input) {
    enabled();
    for (const key of ['connectionId','programId','programName','businessName','state','challenge','callbackPath']) if(typeof input[key]!=='string')throw failure('INVALID_REQUEST');
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.connectionId)||!/^[a-zA-Z0-9_-]{1,100}$/.test(input.programId)||!/^[a-zA-Z0-9]{64}$/.test(input.state)||!/^[a-zA-Z0-9_-]{43}$/.test(input.challenge) || input.programName.length>200 || input.businessName.length>200 || !/^\/tenant\/[a-zA-Z0-9_-]+\/quick-program\/connection\/[a-zA-Z0-9_-]+\/gethired\/callback$/.test(input.callbackPath)) throw failure('INVALID_REQUEST');
    const requestId=id();
    await db.query(`INSERT INTO ${t('referral_bunny_requests')}(id,connection_id,program_id,program_name,business_name,state,challenge,callback_path,expires_at,payment_scope) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[requestId,input.connectionId,input.programId,input.programName,input.businessName,input.state,input.challenge,input.callbackPath,new Date(+now()+600000),config.paymentsEnabled===true]);
    return {requestId};
  }
  async function describe(uid,requestId) { await admin(uid);const a=await pending(requestId);return {programName:a.program_name,businessName:a.business_name,accountName:'GetHired Online',permissions:['Remember valid referral visits','Attribute newly registered accounts',...(a.payment_scope?['Share verified subscription payments']:[])],refundTracking:a.payment_scope===true&&config.refundsEnabled===true,paymentTracking:a.payment_scope===true}; }
  async function approve(uid,requestId,allowed) {
    await admin(uid);
    return db.transaction(async q=>{await admin(uid,q);const a=await pending(requestId,q,true);if(a.code_hash)throw failure('ALREADY_APPROVED',409);
      if(!allowed){await q.query(`UPDATE ${t('referral_bunny_requests')} SET denied_at=$2 WHERE id=$1`,[a.id,now()]);return {redirect:callback(a,{error:'access_denied'})};}
      const code=id();await q.query(`UPDATE ${t('referral_bunny_requests')} SET code_hash=$2,approved_by=$3 WHERE id=$1`,[a.id,sha(code),uid]);return {redirect:callback(a,{code})};
    });
  }
  async function exchange(input) {
    enabled(); if(!/^[a-f0-9]{64}$/.test(input.code || '')||!/^[a-zA-Z0-9]{64}$/.test(input.verifier || '')||typeof input.eventSecret!=='string'||input.eventSecret.length<32||input.eventSecret.length>256)throw failure('INVALID_EXCHANGE');
    return db.transaction(async q=>{
      const a=await pending(input.requestId,q,true);
      if(a.code_hash!==sha(input.code)||a.challenge!==crypto.createHash('sha256').update(input.verifier).digest('base64url'))throw failure('INVALID_EXCHANGE',401);
      await admin(a.approved_by,q);
      const {rows}=await q.query(`SELECT * FROM ${t('referral_bunny_platform')} WHERE id=1 FOR UPDATE`);const active=rows[0];
      if(a.exchanged_at){if(active.request_id!==a.id||active.disconnected_at)throw failure('CODE_CONSUMED',409);return {connectionId:a.connection_id};}
      if(active.connection_id && !active.disconnected_at && active.connection_id!==a.connection_id)throw failure('ALREADY_CONNECTED',409);
      await q.query(`UPDATE ${t('referral_bunny_platform')} SET connection_id=$1,program_id=$2,request_id=$3,secret_cipher=$4,generation=$5,connected_by=$6,connected_at=$7,payments_authorized=$8,disconnected_at=NULL WHERE id=1`,[a.connection_id,a.program_id,a.id,seal(input.eventSecret),(active.connection_id===a.connection_id && !active.disconnected_at && active.secret_cipher && unseal(active.secret_cipher)===input.eventSecret ? active.generation : id()),a.approved_by,now(),a.payment_scope===true]);
      await q.query(`UPDATE ${t('referral_bunny_requests')} SET exchanged_at=$2 WHERE id=$1`,[a.id,now()]);return {connectionId:a.connection_id};
    });
  }
  async function status(connectionId) {
    enabled();
    const {rows}=await db.query(`SELECT * FROM ${t('referral_bunny_platform')} WHERE id=1 AND connection_id=$1`,[connectionId]);
    const a=rows[0];
    if(!a || a.disconnected_at) return {account:a?'disconnected':'not_connected',signups:'not_connected',payments:'not_available',connectedAt:a?.connected_at || null};
    try { await authority(a); } catch(e) { if(e.httpStatus!==403)throw e;return {account:'reconnect_required',signups:'paused',payments:'not_available',connectedAt:a.connected_at}; }
    const observed=await db.query(`SELECT MAX(claimed_at) AS last_signup_at FROM ${t('referral_bunny_attributions')} WHERE connection_id=$1`,[connectionId]);
    let paymentStatus='not_available', lastPaymentAt=null;
    if(config.paymentsEnabled){
      if(!a.payments_authorized) paymentStatus='authorization_required';
      else {
        const delivery=(await db.query(`SELECT MAX(delivered_at) AS last_payment_at, COUNT(*) FILTER(WHERE status IN ('failed','held'))::int AS issues FROM ${t('referral_bunny_payments')} WHERE connection_id=$1`,[connectionId])).rows[0];
        if(config.refundsEnabled){const reversals=(await db.query(`SELECT COUNT(*) FILTER(WHERE status IN ('failed','held'))::int AS issues FROM ${t('referral_bunny_refunds')} WHERE connection_id=$1`,[connectionId])).rows[0];delivery.issues+=reversals.issues;}
        lastPaymentAt=delivery.last_payment_at;paymentStatus=delivery.issues>0?'attention':lastPaymentAt?'receiving':'ready';
      }
    }
    return {account:'connected',signups:'ready',payments:paymentStatus,connectedAt:a.connected_at,lastSignupAt:observed.rows[0]?.last_signup_at || null,lastPaymentAt};
  }
  async function disconnect(connectionId) {enabled();await db.query(`UPDATE ${t('referral_bunny_platform')} SET disconnected_at=$2,secret_cipher=NULL,generation=NULL WHERE id=1 AND connection_id=$1`,[connectionId,now()]);return {disconnected:true};}
  async function active() {enabled();const r=await db.query(`SELECT * FROM ${t('referral_bunny_platform')} WHERE id=1 AND disconnected_at IS NULL AND connection_id IS NOT NULL`);if(!r.rows.length)throw failure('NOT_CONNECTED',404);await authority(r.rows[0]);return r.rows[0];}
  async function capture(input) {
    const a=await active();if(input.programId!==a.program_id||!/^[a-zA-Z0-9_-]{1,100}$/.test(input.membershipId || ''))throw failure('INVALID_REFERRAL');
    const secret=unseal(a.secret_cipher), body=JSON.stringify({membership_id:input.membershipId,...(typeof input.clickToken==='string' && input.clickToken.length<1800?{click_token:input.clickToken}:{})}), timestamp=String(Math.floor(+now()/1000));
    const result=await transport(config.rbOrigin+'/api/program-connections/'+encodeURIComponent(a.connection_id)+'/referrals/validate',body,{'Content-Type':'application/json','Accept':'application/json','X-RB-Timestamp':timestamp,'X-RB-Signature':crypto.createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')});
    if(result.membershipId!==input.membershipId || !/^[a-f0-9]{64}$/.test(result.emailFingerprint || ''))throw failure('INVALID_REFERRAL');
    const receipt={connectionId:a.connection_id,programId:a.program_id,generation:a.generation,membershipId:result.membershipId,clickId:result.clickId || null,emailFingerprint:result.emailFingerprint,referredAt:now().toISOString(),expiresAt:+now()+Math.min(365,Math.max(1,Number(result.windowDays)||30))*86400000};
    return {receipt:seal(receipt),expiresAt:receipt.expiresAt};
  }
  async function claim(uid,receipt) {
    const a=await active();const r=unseal(receipt);
    if(r.connectionId!==a.connection_id||r.generation!==a.generation||r.expiresAt<+now())throw failure('REFERRAL_EXPIRED');
    const user=await db.query(`SELECT uid,email,created_date FROM ${t('user_credentials')} WHERE uid=$1 AND role=2 AND is_archive=FALSE`,[uid]);const u=user.rows[0];
    if(!u || !u.created_date || +new Date(u.created_date)<+new Date(r.referredAt))throw failure('NEW_EMPLOYER_REQUIRED',409);
    const fingerprint=crypto.createHmac('sha256',unseal(a.secret_cipher)).update(String(u.email).trim().toLowerCase()).digest('hex');
    if(fingerprint===r.emailFingerprint)throw failure('SELF_REFERRAL',409);
    await db.query(`INSERT INTO ${t('referral_bunny_attributions')}(uid,connection_id,program_id,membership_id,referred_at,click_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(uid) DO NOTHING`,[uid,a.connection_id,a.program_id,r.membershipId,r.referredAt,r.clickId || null]);return {attributed:true};
  }
  async function signups(input) {
    const a=await active();
    if(input.connectionId!==a.connection_id)throw failure('CONNECTION_MISMATCH',403);
    const cursor=input.cursor || '';
    if(typeof cursor!=='string'||cursor.length>128)throw failure('INVALID_CURSOR');
    // Full scans restart after the final page, so concurrent registrations cannot be skipped permanently.
    const rows=(await db.query(`SELECT r.uid,r.membership_id,r.click_id,r.referred_at,u.created_date FROM ${t('referral_bunny_attributions')} r JOIN ${t('user_credentials')} u ON u.uid=r.uid WHERE r.connection_id=$1 AND r.program_id=$2 AND r.uid>$3 AND u.role=2 AND u.is_archive=FALSE AND NOT EXISTS(SELECT 1 FROM ${t('companies')} c WHERE c.created_by=r.uid AND to_jsonb(c)->>'account_usage'='internal') ORDER BY r.uid LIMIT 100`,[a.connection_id,a.program_id,cursor])).rows;
    return {connectionId:a.connection_id,programId:a.program_id,rows:rows.map(r=>({customerId:sha(a.connection_id+':'+r.uid),membershipId:r.membership_id,clickId:r.click_id,referredAt:new Date(r.referred_at).toISOString(),occurredAt:new Date(r.created_date).toISOString()})),cursor:rows.length===100?rows[rows.length-1].uid:null};
  }
  async function paymentContext(){const a=await active();if(!config.paymentsEnabled||!a.payments_authorized)throw failure('PAYMENT_AUTHORIZATION_REQUIRED',403);return {...a,secret:unseal(a.secret_cipher)};}
  return {authenticate,ownerConnect,create,describe,approve,exchange,disconnect,status,capture,claim,signups,paymentContext};
}
module.exports={connector};
