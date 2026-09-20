import express from 'express';
import { rateLimit } from 'express-rate-limit';
import db from '../services/referral-bunny/database';
import env from '../env';
import verifyAuth from '../middleware/verifyAuth';
const {connector}=require('../services/referral-bunny/service.cjs');
let instance;
function service() {
  if(!instance) instance=connector(db,env.schema,{
    enabled:process.env.REFERRAL_BUNNY_ENABLED==='true',
    ownerConnectionId:process.env.REFERRAL_BUNNY_OWNER_CONNECTION_ID,
    ownerProgramId:process.env.REFERRAL_BUNNY_OWNER_PROGRAM_ID,
    paymentsEnabled:process.env.REFERRAL_BUNNY_PAYMENTS_ENABLED==='true',
    refundsEnabled:process.env.REFERRAL_BUNNY_REFUNDS_ENABLED==='true',
    clientSecret:process.env.REFERRAL_BUNNY_CLIENT_SECRET,
    encryptionKey:process.env.REFERRAL_BUNNY_ENCRYPTION_KEY,
    rbOrigin:process.env.REFERRAL_BUNNY_ORIGIN || 'https://referralbunny.ai',
  },async(url,body,headers)=>{
    const res=await fetch(url,{method:'POST',body,headers,redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!res.ok)throw Object.assign(new Error('REFERRAL_VALIDATION_FAILED'),{code:'REFERRAL_VALIDATION_FAILED',httpStatus:422});return res.json();
  });
  return instance;
}
const router=express.Router();
router.use('/integrations/referral-bunny',rateLimit({windowMs:60000,max:60,standardHeaders:true,legacyHeaders:false}));
const run=fn=>async(req,res)=>{res.set('Cache-Control','no-store');try{res.json(await fn(service(),req));}catch(e){res.status(e.httpStatus || 503).json({code:e.httpStatus?e.code:'CONNECTOR_UNAVAILABLE'});}};
const platform=fn=>run((s,req)=>{s.authenticate(req.headers.authorization);return fn(s,req.body || {});});
// Raw bytes are retained by the server JSON parser for signature verification.
router.post('/integrations/referral-bunny/refunds/webhook',async(req,res)=>{
  try {
    const {refundIntake}=require('../services/referral-bunny/refunds.cjs');
    const intake=refundIntake(db,env.schema,{enabled:process.env.REFERRAL_BUNNY_REFUNDS_ENABLED==='true',mode:process.env.PAYMONGO_MODE || 'test',webhookSecret:process.env.REFERRAL_BUNNY_REFUND_WEBHOOK_SECRET});
    res.set('Cache-Control','no-store').json(await intake.webhook(req.rawBody,req.headers['paymongo-signature']));
  } catch(e) {res.status(e.httpStatus || 503).json({code:e.httpStatus?e.code:'REFUND_INTAKE_UNAVAILABLE'});}
});
router.post('/integrations/referral-bunny/owner-connect',platform((s,b)=>s.ownerConnect(b)));
router.post('/integrations/referral-bunny/requests',platform((s,b)=>s.create(b)));
router.post('/integrations/referral-bunny/exchange',platform((s,b)=>s.exchange(b)));
router.post('/integrations/referral-bunny/status',platform((s,b)=>s.status(b.connectionId)));
router.post('/integrations/referral-bunny/review',platform((s,b)=>require('../services/referral-bunny/review.cjs').review(db,env.schema,s).list(b)));
router.post('/integrations/referral-bunny/review/retry',platform((s,b)=>require('../services/referral-bunny/review.cjs').review(db,env.schema,s).retry(b)));
router.post('/integrations/referral-bunny/disconnect',platform((s,b)=>s.disconnect(b.connectionId)));
router.get('/integrations/referral-bunny/requests/:id',verifyAuth,run((s,r)=>s.describe(r.user.uid,r.params.id)));
router.post('/integrations/referral-bunny/requests/:id/approve',verifyAuth,run((s,r)=>s.approve(r.user.uid,r.params.id,r.body.approved===true)));
router.post('/integrations/referral-bunny/capture',run((s,r)=>s.capture(r.body || {})));
router.post('/integrations/referral-bunny/claim',verifyAuth,run((s,r)=>{
  if(typeof r.body.receipt!=='string'||r.body.receipt.length>4096)throw Object.assign(new Error('INVALID_RECEIPT'),{code:'INVALID_RECEIPT',httpStatus:400});
  return s.claim(r.user.uid,r.body.receipt);
}));
export default router;
