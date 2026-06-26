# NOTIFY-P1 Outbound PayMongo Idempotency Audit
**GETHIRED_NOTIFY_P1_PAYMONGO_OUTBOUND_IDEMPOTENCY_AUDIT_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Outbound PayMongo API Calls Audited

### 1. createPaymongoLink (payment link creation)

**File:** `controllers/paymentController.js`
**Endpoint:** `POST https://api.paymongo.com/v1/links`
**Called from:** `subscriptionController.createPaymentIntent` (via `createPaymongoLink`)
**Current idempotency key:** NONE
**Duplicate risk:** If `createPaymentIntent` is called twice before the user pays (e.g., FE double-tap, retry), two separate payment links are created in PayMongo — both are valid, both can be paid.

**PayMongo support for Idempotency-Key:** PayMongo's links endpoint does support an `Idempotency-Key` header.

**Recommended key:**
```
gethired:{environment}:{cartId}
```
Since `cartId` is generated per subscription cart row (unique per cart), this gives a deterministic key.

**Action taken in NOTIFY-P1:** DEFERRED — not part of the immediate webhook retry fix. Documented in BACKLOG.

**Reason for deferral:** The outbound idempotency risk (double link creation) is a UX issue, not the P1 webhook retry crash. The P1 fix (webhook handler idempotency) takes priority. Adding `Idempotency-Key` to the outbound call requires testing and could cause 422 if PayMongo treats the same key differently across environments.

---

### 2. paymongoPaymentLink endpoint (FE-initiated link creation)

**File:** `controllers/paymentController.js`, `routes/paymentRoute.js`
**Route:** `POST /api/payment/paymongopaymentlink`
**Auth:** verifyAuth (correct — authenticated employer)
**Idempotency key:** NONE

This endpoint is a thin wrapper — it accepts `{ cartId, itemDesc, amount }` from the FE and calls `createPaymongoLink`. If the FE retries this POST, another PayMongo link is created.

**Action taken:** DEFERRED to backlog.

---

## No Other Outbound PayMongo Mutations Found

The codebase audit found no other PayMongo API calls:
- No refund endpoint
- No payment intent creation
- No checkout session creation
- No webhook registration (this is done manually in PayMongo dashboard)
- No subscription resource creation via PayMongo API

---

## Idempotency Key Recommendation (Backlog)

For `createPaymongoLink`:
```js
const options = {
  method: "POST",
  url: "https://api.paymongo.com/v1/links",
  headers: {
    ...
    "Idempotency-Key": "gethired:" + process.env.NODE_ENV + ":" + cartId,
  },
  ...
};
```

**Key properties:**
- Unique per logical payment intent (cart row)
- Deterministic — same cartId always produces same key
- Environment-scoped — prevents accidental key collision across prod/staging
- Not predictable from FE — derived from server-generated cartId

**Scope:** Within PayMongo's idempotency window (typically 24 hours). After that, a new request with the same key may create a new resource.

**Risk:** If cartId is reused (it shouldn't be, based on `idGenerator`), the idempotency key would prevent creating a second link for the same cart — which is the desired behavior.
