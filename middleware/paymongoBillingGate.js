import billing from '../services/paymongoBillingService';
const {legacy}=require('../services/paymongo-billing/legacy-http.cjs');
const handlers=legacy(billing,()=>process.env.PAYMONGO_BILLING_ENABLED==='true');
export const billingCheckout=handlers.checkout;
export const billingStatus=handlers.status;
