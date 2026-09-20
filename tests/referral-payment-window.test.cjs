const {test}=require('node:test');
const assert=require('node:assert/strict');
const {paymentBody}=require('../services/referral-bunny/payments.cjs');
const row={gross_minor:10000,paid_minor:10000,total_minor:10000,tax_minor:0,subtotal_minor:10000,discount_minor:0,expected_amount_minor:10000,currency:'PHP',invoice_currency:'PHP',attempt_currency:'PHP',provider_payment_id:'payment',company_id:'company',invoice_id:'invoice',membership_id:'member',referred_at:'2026-07-01T00:00:00Z',user_created_at:'2026-07-21T00:00:00Z',company_created_at:'2026-07-21T00:00:00Z',paid_at:'2026-08-20T00:00:00Z'};
test('first payment may be 50 days after referral but at most 30 days after signup',()=>{
 const body=paymentBody(row,true);assert.equal(body.signed_up_at,'2026-07-21T00:00:00.000Z');assert.equal(body.referred_at,'2026-07-01T00:00:00.000Z');
 assert.throws(()=>paymentBody({...row,paid_at:'2026-08-20T00:00:01Z'},true),{code:'ATTRIBUTION_EXPIRED'});
 assert.throws(()=>paymentBody({...row,paid_at:'2026-07-20T00:00:00Z'},true),{code:'ATTRIBUTION_EXPIRED'});
 assert.equal(paymentBody({...row,paid_at:'2026-09-20T00:00:00Z'},false).first_payment,false);
});
