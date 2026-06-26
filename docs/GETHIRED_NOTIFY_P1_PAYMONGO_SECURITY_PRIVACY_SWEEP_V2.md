# NOTIFY-P1 Security & Privacy Sweep
**GETHIRED_NOTIFY_P1_PAYMONGO_SECURITY_PRIVACY_SWEEP_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Security Properties Verified

### 1. Signature verification is always first

**Status:** ✅ CONFIRMED

`verifyPaymongoSignature(req)` is the FIRST check in `paymongoWebhook` — before any payload parsing, ledger write, or DB mutation.

```js
if (!verifyPaymongoSignature(req)) {
  return res.status(400).json({ message: "Invalid webhook signature" });
}
```

No DB is touched before signature verification passes. An unauthenticated attacker cannot:
- Claim event IDs in the ledger
- Create transaction rows
- Activate subscriptions
- Trigger any side effect

### 2. Timing-safe comparison

**Status:** ✅ CONFIRMED (unchanged from pre-patch baseline)

`verifyPaymongoSignature` uses `crypto.timingSafeEqual` — prevents timing oracle attacks against the HMAC comparison.

### 3. Replay window enforced

**Status:** ✅ CONFIRMED (unchanged)

5-minute timestamp window check before signature comparison — webhooks with timestamps older than 5 minutes are rejected.

### 4. Raw body preserved correctly

**Status:** ✅ CONFIRMED

`express.json` `verify` callback stores `req.rawBody = buf` (Buffer). `verifyPaymongoSignature` calls `req.rawBody.toString("utf8")` — uses the raw pre-parsed bytes, not the serialized `JSON.stringify(req.body)` which could differ.

### 5. No PII or secrets in logs

**Status:** ✅ CONFIRMED

Post-patch logs contain:
- Event type string
- PayMongo IDs (non-personal: `link_xxx`, `evt_xxx`)
- companyId, subscriptionId (internal IDs, not email/name/phone)

Not logged:
- `paymongo-signature` header value
- `PAYMONGO_WEBHOOK_SECRET` value
- `req.body.data.attributes.data.attributes.email`
- `req.body.data.attributes.data.attributes.name`
- `req.body.data.attributes.data.attributes.phone`
- Raw payload

### 6. Company/subscription IDs come from PayMongo payload, not client

**Status:** ✅ CONFIRMED

The `companyId` and `subscriptionId` used for subscription activation come from `remarks` in the PayMongo payload — which was set by GetHired's own server when the payment link was created. An attacker who sends a forged webhook (rejected by signature check) cannot influence which company gets a subscription.

### 7. `req.body.data.attributes.data` access is guarded

**Status:** ✅ CONFIRMED (limited guarding)

Before destructuring `data.attributes.data.id`:
```js
const providerObjectId = data.attributes.data && data.attributes.data.id;
```

The `link.payment.paid` handler accesses `data.attributes.data.id`, `data.attributes.data.attributes` directly — if PayMongo sends a well-formed but unexpected shape, this could throw. However, this is a server-to-server webhook from PayMongo (signature verified), so payload shape is controlled by PayMongo's API versioning policy — not attacker-controlled after the signature check.

**Minor improvement (backlog):** Add `if (!data.attributes.data) { return 400 }` before accessing `.attributes.data.attributes` in the `link.payment.paid` branch.

### 8. No UID trust from query params

**Status:** ✅ NOT APPLICABLE

The webhook route has no auth middleware and does not use Firebase UIDs. No `req.user`, `req.query.uid`, or `req.body.uid` is referenced.

### 9. Rate limiting

**Status:** PARTIALLY COVERED

The express app has 4-tier rate limiting in `server.js` (globalLimiter, authLimiter, writeLimiter, sensitiveLimiter). The webhook endpoint is NOT exempted from `globalLimiter`.

PayMongo's retry system may generate bursts of requests if GetHired returns 500. Post-patch: this burst cannot happen because 500 is no longer returned for duplicates.

**Risk level:** LOW post-patch.

### 10. ON CONFLICT does not expose row contents

**Status:** ✅ CONFIRMED

`ON CONFLICT (id) DO NOTHING RETURNING *` — the `RETURNING *` is returned to the server code only. Nothing from the conflict row is leaked to the HTTP response.

---

## Privacy Review

| Data element | Stored in `payment_webhook_events`? | Logged? |
|-------------|------------------------------------|---------| 
| PayMongo event ID (evt_xxx) | YES — idempotency key | NO (masked in log) |
| Payment link ID (link_xxx) | YES — provider_object_id | YES (non-personal ID) |
| Event type | YES | YES |
| Billing email | NO | NO |
| Billing name | NO | NO |
| Billing phone | NO | NO |
| companyId | YES — local_company_id | YES (internal ID) |
| subscriptionId | YES — local_subscription_id | NO |
| Credit card data | NEVER touches GetHired servers | N/A |
| CVV / security code | NEVER touches GetHired servers | N/A |

**Assessment:** No PII stored in `payment_webhook_events`. The table is an operational ledger of event IDs and internal references.

---

## Vulnerability Findings

| Finding | Severity | Status |
|---------|----------|--------|
| `insertTransactionTable` blind INSERT caused 23505 → HTTP 500 → retry loop | P1 CRITICAL | ✅ FIXED |
| `status` import shadowed by local `status = attributes.status` | P1 HIGH | ✅ FIXED |
| Unknown event type left response hanging | P1 HIGH | ✅ FIXED |
| No event ID deduplication | P2 HIGH | ✅ FIXED (ledger) |
| `createCompanySubscription` non-idempotent | P2 HIGH | ✅ FIXED |
| No outbound PayMongo Idempotency-Key | P2 MEDIUM | DEFERRED (backlog) |
| No deep payload guard before `data.attributes.data.attributes` | P3 LOW | DEFERRED (backlog) |
| No structured logging for webhook events | P3 LOW | DEFERRED (backlog) |
