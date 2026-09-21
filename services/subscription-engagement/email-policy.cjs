'use strict';
function emailPolicy(recipient,env) {
 if(!env || !['production','staging'].includes(env.EMAIL_DELIVERY_MODE)) return {allowed:false,sandboxed:true,reason:'local_sink'};
 if(typeof recipient!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) return {allowed:false,reason:'invalid_address'};
 if(env.EMAIL_DELIVERY_MODE==='production' && env.NODE_ENV!=='production') return {allowed:false,reason:'production_transport_blocked'};
 if(env.EMAIL_DELIVERY_MODE==='staging') {
  const approved=(env.EMAIL_TEST_RECIPIENTS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(!approved.includes(recipient.trim().toLowerCase())) return {allowed:false,reason:'recipient_not_allowed'};
 }
 return {allowed:true};
}
module.exports={emailPolicy};
