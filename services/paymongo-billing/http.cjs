 'use strict';
function error(res,e){return res.status(e.httpStatus || 503).json({success:false,code:e.code && /^[A-Z_]+$/.test(e.code)?e.code:'BILLING_UNAVAILABLE'});}
function webhook(service){return async(req,res)=>{try{const result=await service.webhook(Buffer.isBuffer(req.body)?req.body:req.rawBody,req.headers['paymongo-signature']);res.status(result.httpStatus).json({success:true,status:result.status,code:result.code});}catch(e){error(res,e);}};}
function routes(express,service,auth,limiter){const r=express.Router();const run=fn=>async(req,res)=>{try{const c=await service.resolve(req.user.uid);res.json({success:true,...await fn(c,req)});}catch(e){error(res,e);}};
const limited=limiter || ((req,res,next)=>next());
r.post('/employer/subscription/checkout',auth,limited,run((c,req)=>service.checkout(c,req.body)));
r.post('/employer/subscription/upgrade-preview',auth,limited,run((c,req)=>service.preview(c,req.body)));
r.post('/employer/storage-addons/checkout',auth,limited,run((c,req)=>service.checkout(c,req.body)));
r.get('/employer/subscription/checkout/:id/status',auth,limited,run((c,req)=>service.status(c,req.params.id)));
r.get('/employer/payment-attempts/:id/status',auth,limited,run((c,req)=>service.status(c,req.params.id)));
r.get('/employer/subscription/entitlements',auth,limited,run(c=>service.effective(c)));
r.get('/employer/billing/history',auth,limited,run(c=>service.history(c)));
return r;}
module.exports={routes,webhook,error};
