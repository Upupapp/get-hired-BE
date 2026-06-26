# GetHired — Payment Webhook Security Audit (SECURE 3)
**Date:** 2026-06-26

---

## 1. Webhook Implementation Review

### Endpoint
`POST /api/payment/paymongowebhook` — registered without auth middleware (correct; PayMongo cannot supply Firebase tokens)

### HMAC Verification Function (`verifyPaymongoSignature`)

**Full code review of `controllers/paymentController.js` lines 58-94:**

```js
const verifyPaymongoSignature = (req) => {
  const secret = env.paymongo_webhook_secret;
  if (!secret) return false;                          // ✓ fails closed without secret

  const sigHeader = req.headers["paymongo-signature"];
  if (!sigHeader) return false;                       // ✓ rejects requests with no sig header

  const parts = {};
  sigHeader.split(",").forEach((part) => {
    const eq = part.indexOf("=");
    if (eq > -1) parts[part.slice(0, eq)] = part.slice(eq + 1);
  });

  const timestamp = parts.t;
  if (!timestamp) return false;                       // ✓ rejects if no timestamp

  // Replay protection: 5-minute window
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)) > 300) return false;  // ✓

  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const sig = parts.li || parts.te;                  // ✓ live preferred, test fallback
  if (!sig) return false;

  try {
    const a = Buffer.from(sig.padEnd(expected.length, "0"), "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);             // ✓ timing-safe comparison
  } catch {
    return false;
  }
};
```

### Security properties verified:

| Property | Implementation | Status |
|---|---|---|
| Fails closed without secret | `if (!secret) return false` | PASS |
| Rejects missing signature header | `if (!sigHeader) return false` | PASS |
| Timestamp validation | `parseInt(timestamp, 10)` | PASS |
| Replay attack prevention | 5-minute window (300 seconds) | PASS |
| Raw body preserved for HMAC | `express.json verify` callback sets `req.rawBody` | PASS |
| Timing-safe comparison | `crypto.timingSafeEqual()` | PASS |
| Correct HMAC algorithm | SHA-256 as per PayMongo spec | PASS |
| Live vs test signature | `parts.li || parts.te` — live preferred | PASS |
| Padded buffer length match | Length check before `timingSafeEqual` | PASS |

---

## 2. rawBody Preservation

`server.js` lines 91-94:
```js
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
```

The `verify` callback captures the raw buffer before JSON parsing, enabling HMAC computation on the original bytes. This is the correct approach — computing HMAC on `JSON.stringify(req.body)` would fail if PayMongo serializes numbers or booleans differently.

**Important:** The `writeLimiter` explicitly skips the webhook endpoint:
```js
skip: (req) => req.method === "GET" || ... || req.path === "/payment/paymongowebhook",
```
This prevents rate-limiting from interfering with legitimate PayMongo deliveries.

---

## 3. Webhook Event Handler Review

The `paymongoWebhook` controller handles three event types:

| Event | Handler | DB operation | Risk |
|---|---|---|---|
| `link.payment.paid` | Lines 106-165 | INSERT transaction_table + UPDATE cart_table + createCompanySubscription | Medium — creates subscription if paid |
| `payment.paid` | Lines 167-209 | UPDATE transaction_table | Low — updates existing record |
| `payment.failed` | Lines 210-216 | Log only | Low |

**PII handling in logs (after NOTIFY/QA11 fixes):**
- `payment.paid`: logs only `webHookPaid.id` (not billing data) — PASS
- `payment.failed`: logs only event type and `data.id` — PASS

---

## 4. Edge Cases

### 4.1 `cartId` Parsing from `remarks`
```js
const cartId = remarks.slice(9);        // Skip "GetHired-" prefix
const companyId = remarks.slice(0, 13);
const subscriptionId = remarks.slice(14);
```
The `remarks` field comes from the PayMongo event (not the HTTP request body from an attacker — the HMAC ensures it). However, `remarks` is a string set by the BE when creating the link:
```js
remarks: "GetHired-" + cartId,
```
This means `cartId` in the link creation must be alphanumeric/URL-safe. No injection risk here since `cartId` is a DB-generated ID, but the slice parsing is fragile — if `cartId` contains the wrong character count, parsing breaks silently.

### 4.2 Response after subscription creation
The `createCompanySubscription` result is not checked for failure before returning 200. If subscription creation fails (DB error), the webhook returns 200 (PayMongo won't retry), but the subscription isn't activated.

**Severity: LOW** — operational concern, not a security issue. PayMongo considers the webhook delivered. The transaction is recorded.

---

## 5. Outstanding Issue

**PAYMONGO_WEBHOOK_SECRET not confirmed set in production.** Until confirmed:
- Status: All webhooks return 400 (fails closed — no unauthorized mutations)
- Consequence: Legitimate payment webhooks are also rejected — payment processing may appear broken

**Resolution path:** See `GETHIRED_SECURE_EXTERNAL_ACTIONS_RECENT_3.md` EA-1 and EA-7.

---

## 6. Summary

| Item | Status |
|---|---|
| HMAC implementation correctness | PASS |
| Replay attack protection | PASS |
| Timing-safe comparison | PASS |
| Raw body preservation | PASS |
| PII in webhook logs | PASS (fixed) |
| Rate limit exclusion | PASS |
| Production secret confirmation | UNVERIFIED (external action required) |
| `remarks` parsing fragility | LOW (non-security operational risk) |
| Subscription activation error handling | LOW (non-security operational risk) |
