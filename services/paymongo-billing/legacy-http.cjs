'use strict';
const {error}=require('./http.cjs');
const {fail}=require('./security.cjs');
// Keep existing URLs/response fields while pricing exclusively from the server catalog.
function legacy(service,enabled){
 const run=fn=>async(req,res,next)=>{if(!enabled())return next();try{const context=await service.resolve(req.user.uid);return res.json({success:true,...await fn(context,req)});}catch(e){return error(res,e);}};
 const checkout=run(async(context,req)=>{
  const body=req.body||{};
  const allowed=['planSlug','planCode','billingCycle','idempotencyKey','operation'];
  if(Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!allowed.includes(k))||(body.planSlug&&body.planCode&&body.planSlug!==body.planCode))throw fail('PAYMENT_REQUEST_INVALID');
  const plan=body.planCode||body.planSlug;
  const input={planCode:plan==='business'?'premium':plan,billingCycle:body.billingCycle||'monthly'};
  if(body.idempotencyKey!==undefined)input.idempotencyKey=body.idempotencyKey;
  if(body.operation!==undefined)input.operation=body.operation;
  const result=await service.checkout(context,input);
  return {...result,checkoutIntentId:result.paymentAttemptId,status:result.status==='PAID'?'confirmed':'pending',disclosure:{selectedPlanSlug:plan,selectedBillingCycle:result.billingCycle,amountDueToday:result.amountMinor/100,checkoutIntentId:result.paymentAttemptId,checkoutUrl:result.checkoutUrl,billingMode:'UPFRONT'}};
 });
 const status=run(async(context,req)=>{
  const result=await service.status(context,req.params.id);
  const states={PAID:'confirmed',FAILED:'failed',EXPIRED:'expired',CANCELLED:'expired',PENDING:'pending'};
  return {...result,checkoutIntentId:result.paymentAttemptId,status:states[result.status]||'unknown_retry'};
 });
 return {checkout,status};
}
module.exports={legacy};
