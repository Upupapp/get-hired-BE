# NOTIFY-P1 Webhook Test Log
**GETHIRED_NOTIFY_P1_PAYMONGO_WEBHOOK_TEST_LOG_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Test Infrastructure Constraints

- No automated test runner (`npm test` or Mocha/Jest) — project does not have a test suite configured
- No in-memory Postgres fixture for `transaction_table` (production-only schema, not in `db/complete_ddl.sql`)
- All tests are manual smoke tests against the live environment or verified via code review
- ESM/Acorn constraint: `?.` and `??` cannot appear in source files — verified by `node -e` scan before deploy

---

## Tests Specified for NOTIFY-P1

The following test cases SHOULD be covered when a test harness is available. Currently verified by code review and logic tracing.

### T1: Normal first-delivery `link.payment.paid` → transaction inserted, subscription activated, 200 processed

**Trigger:** First time a `link.payment.paid` event arrives for a given `link_xxx`
**Expected:**
- Signature verification passes
- Event claimed in ledger (if migrated)
- `insertTransactionTable` returns `{ inserted: true, duplicate: false }`
- `updateCart` called
- `createCompanySubscription` called (if `paymentStatus == "paid"`)
- Response: `200 { received: true, status: 'processed' }`

### T2: Duplicate `link.payment.paid` (ledger gate) → 200 duplicate_ignored, no side effects

**Trigger:** Same `evt_xxx` event ID delivered a second time
**Expected:**
- Signature verification passes
- Event NOT claimed (conflict) → `claimed: false`
- Return `200 { status: 'duplicate_ignored' }` immediately
- No DB mutations (no cart update, no subscription insert)

### T3: Same transaction ID, different event ID (ON CONFLICT gate) → 200 duplicate_ignored

**Trigger:** PayMongo delivers a different event (`evt_yyy`) for the same `link_xxx` payment
**Expected:**
- Event `evt_yyy` claimed in ledger
- `insertTransactionTable` with same `link_xxx` → `{ inserted: false, duplicate: true }`
- Return `200 { status: 'duplicate_ignored' }` without calling `updateCart` or `createCompanySubscription`

### T4: Already-active subscription retry → no duplicate row, 200

**Trigger:** `link.payment.paid` with same `companyId + subscriptionId` that's already in `companies_subscription`
**Expected:**
- Either T2 or T3 catches it first (ledger or ON CONFLICT)
- If neither catches it (ledger table missing, different transaction ID): `createCompanySubscription` check-then-insert returns existing row, no second row inserted

### T5: Invalid signature → 400, no DB mutations

**Trigger:** POST to webhook endpoint with wrong/missing `paymongo-signature` header
**Expected:**
- `verifyPaymongoSignature` returns false
- Return `400 { message: "Invalid webhook signature" }`
- No ledger entry created
- No transaction_table mutation

### T6: Malformed payload → 400, no DB mutations

**Trigger:** POST with valid signature but `data` or `data.attributes` missing
**Expected:** `400 { message: "Malformed webhook payload" }`

### T7: `payment.paid` event → UPDATE transaction_table, 200

**Trigger:** `payment.paid` event with valid `external_reference_number`
**Expected:**
- UPDATE fires (idempotent — safe to replay)
- Return `200 { status: 'processed' }`
- No subscription activation in this path

### T8: `payment.failed` event → 200 processed, no state downgrade

**Trigger:** `payment.failed` event
**Expected:** `200 { status: 'processed' }` with no transaction or subscription changes

### T9: Unknown event type → 200 ignored

**Trigger:** `link.payment.expired` or any non-handled event type with valid signature
**Expected:** `200 { status: 'ignored' }` — no hanging response

### T10: DB failure in processing → 500 (retryable)

**Trigger:** Postgres connection error during `insertTransactionTable`
**Expected:**
- `tryMarkFailed(eventId)` called
- Return `500 { message: "Operation not successful..." }`
- PayMongo will retry (correct — this is genuinely a transient error)

---

## Code-Review Verification Performed

| Check | Status |
|-------|--------|
| `?.` and `??` absent from paymentController.js | ✅ Verified |
| `?.` and `??` absent from subscriptionController.js | ✅ Verified |
| Signature check before any DB mutation | ✅ Verified (line order) |
| Raw body used for signature, not parsed body | ✅ `req.rawBody` used |
| `eventId` is from `data.id`, not `data.attributes.data.id` | ✅ Confirmed |
| `ON CONFLICT (id)` in insertTransactionTable | ✅ Verified |
| `createCompanySubscription` has 23505 catch | ✅ Verified |
| `status` import not shadowed by local `status` variable | ✅ Fixed: renamed to `paymentStatus` |
| Unknown event type returns response | ✅ Final `else` branch present |
| All paths in `link.payment.paid` return a response | ✅ Verified |
| No PII in logs | ✅ Verified — no email/name/phone logged |
| No webhook secret in logs | ✅ Verified |

---

## Deployment Smoke Test

**Date:** 2026-06-26
**Action:** `pm2 restart gethired --update-env`
**Result:** Online, restart 22, 12.3mb
**Syntax check:** No parse errors from Acorn (would crash PM2 on startup)
