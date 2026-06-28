# GETHIRED PAYMENT WEBHOOK SECURITY AUDIT — QA Cycle 11
Generated: 2026-06-25

---

## Endpoint Under Audit
`POST /api/payment/paymongowebhook`
File: `controllers/paymentController.js` — `paymongoWebhook()`

---

## Critical Finding: No Webhook Signature Verification

### Risk Rating: P2 / HIGH

### Description
The PayMongo webhook handler processes incoming events without verifying they originate from PayMongo. Any HTTP client that knows the endpoint URL can POST a crafted `link.payment.paid` event payload and:
1. Trigger `insertTransactionTable()` — creates a fake transaction record
2. Trigger `updateCart()` — marks a cart as paid
3. Trigger `createCompanySubscription()` — grants a subscription without actual payment

### Attack Scenario
```
POST https://api.gethired.ph/api/payment/paymongowebhook
Content-Type: application/json

{
  "data": {
    "attributes": {
      "type": "link.payment.paid",
      "data": {
        "id": "fake_id",
        "attributes": {
          "checkout_url": "https://fake.url",
          "reference_number": "REF123",
          "remarks": "COMPANY_IDsubscription_id",
          "status": "paid",
          "payments": [{
            "data": {
              "attributes": {
                "amount": 100000,
                "billing": {"email": "a@b.com", "name": "Fake", "phone": "09000000"},
                "currency": "PHP",
                "description": "Test",
                "external_reference_number": "REF123",
                "fee": 0,
                "net_amount": 100000,
                "source": {"type": "card"}
              }
            }
          }]
        }
      }
    }
  }
}
```
This would create a real subscription for any company without payment.

### Current State
- `paymongoWebhook()` reads `req.body.data.attributes.type` directly
- No check for `x-paymongo-signature` header
- No HMAC verification
- No IP allowlisting for PayMongo servers

---

## PayMongo Signature Verification Implementation

PayMongo sends an `x-paymongo-signature` header containing an HMAC-SHA256 of the raw request body, using the webhook signing key as the secret.

### Required Implementation

```javascript
// server.js — before JSON parser, add raw body capture for the webhook path:
app.use('/api/payment/paymongowebhook', express.raw({ type: 'application/json' }));

// paymentController.js — add at the start of paymongoWebhook():
const paymongoWebhook = async (req, res) => {
  // Step 1: Verify signature
  const sig = req.headers['x-paymongo-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing signature' });
  }
  
  const webhookSecret = env.paymongo_webhook_secret; // add to env.js
  const rawBody = req.body; // requires express.raw() above
  
  const hmac = require('crypto')
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac))) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  // Step 2: Parse body (was parsed by JSON middleware before; now is Buffer)
  const { data } = JSON.parse(rawBody.toString());
  // ... rest of handler unchanged
};
```

### Important Note on Body Parsing Order
Express's `express.json()` consumes the raw body stream. To get the raw body for HMAC verification, the webhook route must be registered BEFORE `express.json()` and use `express.raw()` instead. In `server.js`, move the webhook path to before the global `app.use(express.json(...))` line.

### Environment Variable Required
Add `PAYMONGO_WEBHOOK_SECRET` to `.env` and to `env.js`. Retrieve the value from PayMongo Dashboard → Webhooks → Signing Secret.

---

## Additional Webhook Issues

### remarks Parsing is Fragile
```js
const cartId = remarks.slice(9);       // assumes "GetHired-" prefix exactly 9 chars
const companyId = remarks.slice(0, 13); // assumes companyId is exactly 13 chars
const subscriptionId = remarks.slice(14); // assumes format "COMPANYID_SUBID"
```
If the `remarks` field format changes (e.g., GetHired changes ID generation), this silently produces wrong values. These slice positions should be replaced with a structured delimiter (e.g., `remarks.split('_')`).

### No Idempotency Check
PayMongo may retry webhook delivery on timeout. The handler does not check if a transaction ID already exists before inserting. This could create duplicate subscription grants on retry.

**Recommendation:** Add `ON CONFLICT DO NOTHING` to the transaction INSERT, or check for existing `reference_number` before proceeding.

---

## PayMongo Payment Link Endpoint

`POST /api/payment/paymongopaymentlink` — now requires verifyAuth (fixed QA10). PASS.

---

## Summary

| Control | Status |
|---------|--------|
| Webhook signature verification | FAIL — P2, OPEN |
| Payment link endpoint authentication | PASS (fixed QA10) |
| SQL injection in webhook handler | PASS (parameterized queries) |
| Remarks parsing robustness | P3 — fragile string slicing |
| Idempotency | P3 — no duplicate check |
