import express from 'express';
import rateLimit from 'express-rate-limit';
import verifyAuth from '../middleware/verifyAuth';
import billing from '../services/paymongoBillingService';
const {routes}=require('../services/paymongo-billing/http.cjs');
const limiter=rateLimit({windowMs:60000,max:30,keyGenerator:req=>req.user.uid+':'+req.ip,standardHeaders:true,legacyHeaders:false});
export default routes(express,billing,verifyAuth,limiter);
