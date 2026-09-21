const {test}=require('node:test');const assert=require('node:assert/strict');
const {legacy}=require('../services/paymongo-billing/legacy-http.cjs');
function response(){return {code:200,status(n){this.code=n;return this;},json(data){this.data=data;return this;}};}
test('disabled gate preserves legacy checkout without resolving billing or reading its tables',async()=>{
 let next=0;const h=legacy({resolve(){throw Error('must not call');}},()=>false);await h.checkout({},response(),()=>next++);await h.status({},response(),()=>next++);assert.equal(next,2);
});
test('legacy plan names map to canonical checkout and keep response contract',async()=>{
 let input;const service={resolve:async uid=>({uid}),checkout:async(c,b)=>{input=b;return {paymentAttemptId:'attempt',checkoutUrl:'https://example.com',status:'PENDING',billingCycle:b.billingCycle,amountMinor:599000};},status:async()=>({paymentAttemptId:'attempt',status:'PAID'})};const h=legacy(service,()=>true),r=response();
 await h.checkout({user:{uid:'owner'},body:{planSlug:'business',billingCycle:'monthly'}},r);assert.deepEqual(input,{planCode:'premium',billingCycle:'monthly'});assert.equal(r.data.checkoutIntentId,'attempt');assert.equal(r.data.disclosure.amountDueToday,5990);assert.equal(r.data.status,'pending');
 await h.status({user:{uid:'owner'},params:{id:'attempt'}},r);assert.equal(r.data.status,'confirmed');
 await h.checkout({user:{uid:'owner'},body:{planSlug:'growth',amount:1}},r);assert.equal(r.code,400);
});
test('billing failure never falls back to the legacy charging path',async()=>{
 const h=legacy({resolve:async()=>{throw Object.assign(Error(),{code:'BILLING_FORBIDDEN',httpStatus:403});}},()=>true),r=response();await h.checkout({user:{uid:'outsider'}},r,()=>{throw Error('must not fall back');});assert.equal(r.code,403);
});
