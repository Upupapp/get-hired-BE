'use strict';
const fail=(code,status=422)=>Object.assign(new Error(code),{code,httpStatus:status});
const retryable=r=>r.status==='failed'||(r.status==='held'&&r.reason==='RECEIVER_REJECTED');
function review(db,schema,connector){
 if(!/^[a-z_][a-z0-9_]*$/i.test(schema))throw fail('INVALID_SCHEMA');const t=n=>schema+'.'+n;
 async function scope(q,connectionId){const c=await connector.paymentContext();const row=(await q.query(`SELECT * FROM ${t('referral_bunny_platform')} WHERE id=1 FOR UPDATE`)).rows[0];if(c.connection_id!==connectionId||row.connection_id!==connectionId||row.generation!==c.generation||row.disconnected_at||!row.payments_authorized)throw fail('REVIEW_UNAVAILABLE',403);}
 async function list(input){
  const kind=input.kind||'payment',status=input.status||'held',page=Number(input.page||1);
  if(!['payment','refund'].includes(kind)||!['held','failed','pending','delivered'].includes(status)||!Number.isInteger(page)||page<1||page>10000)throw fail('INVALID_REVIEW_FILTER');
  return db.transaction(async q=>{await scope(q,input.connectionId);const table=t(kind==='payment'?'referral_bunny_payments':'referral_bunny_refunds');
   const rows=(await q.query(`SELECT id,status,reason,attempts,next_attempt_at,last_attempt_at,delivered_at,created_at,${kind==='payment' ? 'invoice_id' : "payload::jsonb->>'invoice_id'"} AS invoice_id,payload::jsonb->>'amount_minor' AS amount_minor,payload::jsonb->>'currency' AS currency FROM ${table} WHERE connection_id=$1 AND status=$2 ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $3`,[input.connectionId,status,(page-1)*25])).rows;
   const history=(await q.query(`SELECT event_kind,delivery_id,actor_id,note,created_at FROM ${t('referral_bunny_review_actions')} WHERE connection_id=$1 ORDER BY id DESC LIMIT 10`,[input.connectionId])).rows;
   return {kind,status,page,hasMore:rows.length>25,items:rows.slice(0,25).map(r=>({...r,canRetry:retryable(r)})),history};
  });
 }
 async function retry(input){
  if(!['payment','refund'].includes(input.kind)||! /^[a-f0-9]{64}$/.test(input.id||'')||typeof input.actorId!=='string'||input.actorId.length<1||input.actorId.length>128||typeof input.note!=='string'||input.note.trim().length<5||input.note.length>500)throw fail('INVALID_REVIEW_ACTION');
  return db.transaction(async q=>{await scope(q,input.connectionId);const table=t(input.kind==='payment'?'referral_bunny_payments':'referral_bunny_refunds');
   const row=(await q.query(`SELECT * FROM ${table} WHERE id=$1 AND connection_id=$2 FOR UPDATE`,[input.id,input.connectionId])).rows[0];if(!row)throw fail('DELIVERY_NOT_FOUND',404);
   if(!retryable(row))throw fail('REVIEW_STATE_CHANGED',409);
   await q.query(`INSERT INTO ${t('referral_bunny_review_actions')}(connection_id,event_kind,delivery_id,actor_id,note,previous_status,previous_reason) VALUES($1,$2,$3,$4,$5,$6,$7)`,[input.connectionId,input.kind,input.id,input.actorId,input.note.trim(),row.status,row.reason]);
   await q.query(`UPDATE ${table} SET status='pending',reason=NULL,next_attempt_at=NULL WHERE id=$1`,[row.id]);
   return {queued:true};
  });
 }
 return {list,retry};
}
module.exports={review};
