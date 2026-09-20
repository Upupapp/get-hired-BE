'use strict';
// Persist the deadline, never a timer in process memory. Restarting cannot reset backoff.
function outcome(error, attempt, now = new Date(), random = Math.random) {
 const status=Number(error && error.status);
 if(status>=400 && status<500 && ![408,425,429].includes(status))return {status:'held',reason:'RECEIVER_REJECTED',next:null};
 const base=Math.min(21600000,60000*2**Math.min(20,Math.max(0,attempt-1)));
 const delay=Math.min(21600000,Math.round(base*(1+random()*0.2)));
 const header=error && error.retryAfter;let requested=0;
 if(typeof header==='string')requested=/^\d+$/.test(header)?Number(header)*1000:Date.parse(header)-now.getTime();
 return {status:'failed',reason:'DELIVERY_FAILED',next:new Date(now.getTime()+Math.max(delay,Math.min(86400000,Number.isFinite(requested)?Math.max(0,requested):0)))};
}
async function record(q,table,row,delivered,error,zero=false){
 const now=new Date(),result=delivered?{status:'delivered',reason:zero?'ROUNDING_ZERO':null,next:null}:outcome(error,row.attempts+1,now);
 await q.query(`UPDATE ${table} SET status=$2,reason=$3,attempts=attempts+1,delivered_at=$4,next_attempt_at=$5,last_attempt_at=$6 WHERE id=$1`,[row.id,result.status,result.reason,delivered?now:null,result.next,now]);
 return {processed:true,delivered};
}
module.exports={outcome,record};
