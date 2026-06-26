# NOTIFY-P1 Current State Audit
**GETHIRED_NOTIFY_P1_PAYMONGO_WEBHOOK_CURRENT_STATE_AUDIT_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Webhook Route

**File:** `routes/paymentRoute.js`
**Mounted path:** `POST /api/payment/paymongowebhook`
**Auth:** NOT auth-gated (correct — PayMongo calls this directly, cannot supply Firebase token)
**Handler:** `paymongoWebhook` from `controllers/paymentController.js`
**Rate limiter:** Excluded from `writeLimiter.skip` (correct — PayMongo's retry system must not be blocked)

```js
router.post("/payment/paymongowebhook", paymongoWebhook);
```

---

## Express Body Parser

**File:** `server.js`
**Raw body available:** YES — `express.json` uses `verify` callback:
```js
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
```
`req.rawBody` is a Buffer. `verifyPaymongoSignature` calls `req.rawBody.toString("utf8")` — correct.

---

## Signature Verification

**Present:** YES — `verifyPaymongoSignature(req)` in `paymentController.js`
**Header used:** `paymongo-signature` (lowercase)
**Secret env var:** `PAYMONGO_WEBHOOK_SECRET` (production), `PAYMONGO_WEBHOOK_SECRET_DEV` / `PAYMONGO_WEBHOOK_SECRET_EUCANNAJOBS` (staging)
**Replay window:** 5 minutes (timestamp comparison)
**Signature parts:** `t` = timestamp, `li` = live sig, `te` = test sig
**Algorithm:** HMAC-SHA256 over `${timestamp}.${rawBody}`
**Timing-safe:** `crypto.timingSafeEqual` used

---

## PayMongo Event ID Field Path

**Primary event ID:** `req.body.data.id` (envelope — the `evt_xxx` ID)
**Event type:** `req.body.data.attributes.type`
**Provider object ID (payment link):** `req.body.data.attributes.data.id` (e.g., `link_xxx`)
**Provider object ID (payment):** `req.body.data.attributes.data.id` (e.g., `pay_xxx`)
**Billing data (payment link paid):** `req.body.data.attributes.data.attributes.payments[0].data.attributes`
**Billing data (payment paid):** `req.body.data.attributes.data.attributes`

---

## Event Types Handled

| Event type | Handler | Idempotent? (pre-patch) | Idempotent? (post-patch) |
|-----------|---------|------------------------|--------------------------|
| `link.payment.paid` | insertTransactionTable + updateCart + UPDATE + createCompanySubscription | ❌ NO | ✅ YES |
| `payment.paid` | UPDATE transaction_table | ✅ YES (UPDATE) | ✅ YES |
| `payment.failed` | Log + return 200 | ✅ YES | ✅ YES |
| Unknown | (no explicit handler) | ❌ NO response | ✅ YES (2xx ignored) |

---

## insertTransactionTable Definition

**File:** `controllers/paymentController.js`
**Before patch:**
```js
const insertQuery = `INSERT INTO ${dbSchema}.transaction_table
    (id, checkout_url, reference_number) VALUES($1, $2, $3) returning *`;
```
No ON CONFLICT. Throws 23505 (duplicate key) on retry.

**After patch:**
```js
const insertQuery = `INSERT INTO ${dbSchema}.transaction_table
    (id, checkout_url, reference_number) VALUES($1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    RETURNING *`;
// Returns { transaction, inserted: true, duplicate: false } on new insert
// Returns { transaction, inserted: false, duplicate: true } on conflict
```

---

## transaction_table Schema

**In complete_ddl.sql:** NOT PRESENT (production-only table, not in DDL file)
**Known columns (from controller):** `id`, `checkout_url`, `reference_number`, `gross_amount`, `transaction_fee`, `currency`, `description`, `status`, `payment_id`, `net_amount`, `email`, `name`, `phone`, `payment_type`, `paid_at`
**Unique constraint on `id`:** YES (inferred from 23505 error) — `ON CONFLICT (id)` requires this
**Provider-object unique constraint:** NOT DOCUMENTED in DDL — `id` IS the PayMongo payment link/payment object ID

---

## companies_subscription Schema

**Known columns (from controller):** `company_id`, `subscription_id`, `created_at`, `is_paid`, `payment_date`
**Unique constraint on (company_id, subscription_id):** NOT KNOWN — DDL file does not include this table
**createCompanySubscription before patch:** Blind INSERT, no duplicate guard
**createCompanySubscription after patch:** check-then-insert with 23505 race catch

---

## Webhook Event Ledger

**Before patch:** NONE — no tracking of processed PayMongo event IDs
**After patch:** `payment_webhook_events` table (requires migration `db/payment_webhook_events_ddl.sql`)
**Graceful degradation:** Code handles 42P01 (table not exists) with warning log; ON CONFLICT safety net is always active

---

## Duplicate-Key Error Analysis

**Error code:** PostgreSQL 23505 (duplicate key value violates unique constraint)
**Trigger:** `insertTransactionTable` called with same `id` on webhook retry
**Before patch:** error.code 23505 → `throw error` → caught by `paymongoWebhook` catch → `res.status(status.error)` but `status` was shadowed by local variable → returned unpredictable HTTP status
**Additionally:** `status` imported from `"../helpers/status"` was shadowed by local destructuring `const { ..., status } = attributes` inside the handler — the catch block `res.status(status.error)` used the string "paid" as an HTTP status code, resulting in a 500 or similar error
**After patch:** Duplicate INSERT returns `{ duplicate: true }` → handler returns `res.status(200).json({ status: 'duplicate_ignored' })` → no 500, no PayMongo retry loop

---

## Root Cause Classification

| Root Cause | Present? |
|-----------|---------|
| insertTransactionTable blindly inserts duplicate provider transaction | ✅ CONFIRMED |
| Webhook event ID not tracked | ✅ CONFIRMED |
| Provider payment object not uniquely constrained (app level) | ✅ CONFIRMED |
| Duplicate-key error not treated as idempotent duplicate | ✅ CONFIRMED |
| Subscription activation not idempotent | ✅ CONFIRMED |
| `status` import shadowed by local variable | ✅ CONFIRMED |
| No webhook event ledger | ✅ CONFIRMED |
| notification/email side effects not idempotent | N/A — no email/notification in payment.paid path |
| webhook response too slow | LOW RISK — synchronous handler |
| Frontend shows premature payment success | PARTIAL — subscription page reads localStorage which is not updated by webhook |

---

## Customer Impact

- PayMongo webhook retries (normal behavior) triggered 500 errors
- 500 caused PayMongo to retry again → more 500s → infinite retry loop
- If loop exhausted PayMongo's retry budget: subscription NOT activated despite successful payment
- Employers who paid may not have received active subscription
- companies_subscription table may have duplicate rows if any retry succeeded twice

---

## Rollback Plan

```bash
git revert 0ba7414 --no-edit && git push origin main
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull --ff-only && pm2 restart gethired --update-env"
```
