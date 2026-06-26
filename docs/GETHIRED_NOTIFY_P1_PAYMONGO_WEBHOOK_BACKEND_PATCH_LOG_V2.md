# NOTIFY-P1 Backend Patch Log
**GETHIRED_NOTIFY_P1_PAYMONGO_WEBHOOK_BACKEND_PATCH_LOG_V2**
Run: 2026-06-26 | Commit: 0ba7414

---

## Files Changed

| File | Change Type | Risk |
|------|------------|------|
| `controllers/paymentController.js` | Rewrite + idempotency additions | LOW |
| `controllers/subscriptionController.js` | Idempotency guard for createCompanySubscription | LOW |
| `db/payment_webhook_events_ddl.sql` | New migration SQL (manual apply) | LOW |

---

## paymentController.js — Change Summary

### New: Webhook event ledger functions

```js
const claimWebhookEvent = async (eventId, eventType, providerObjectId) => { ... }
const markWebhookEventProcessed = async (eventId, localTransactionId) => { ... }
const markWebhookEventFailed = async (eventId, errorMsg) => { ... }
const tryClaimEvent = async (eventId, eventType, providerObjectId) => { ... }
const tryMarkProcessed = async (eventId, localTransactionId) => { ... }
const tryMarkFailed = async (eventId, errorMsg) => { ... }
```

All try/catch degradation is non-blocking. If `payment_webhook_events` table doesn't exist, code logs a warning and falls through to the ON CONFLICT safety net.

### Fixed: insertTransactionTable

**Before:**
```js
const insertQuery = `INSERT INTO ${dbSchema}.transaction_table
    (id, checkout_url, reference_number) VALUES($1, $2, $3) returning *`;
// Throws PostgreSQL 23505 on duplicate
```

**After:**
```js
const insertQuery = `INSERT INTO ${dbSchema}.transaction_table
    (id, checkout_url, reference_number) VALUES($1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    RETURNING *`;
// Returns { transaction, inserted: true, duplicate: false } on new insert
// Returns { transaction, inserted: false, duplicate: true } on conflict (no-op)
```

### Fixed: paymongoWebhook — event ID extraction

**Before:**
```js
const { data } = req.body;
const webhookEvent = data.attributes.type;
// No event ID extraction, no ledger
```

**After:**
```js
const eventId = data.id;                                      // PayMongo event ID
const webhookEvent = data.attributes.type;                    // event type
const providerObjectId = data.attributes.data && data.attributes.data.id;  // object ID
// Ledger claim before processing
const ledgerClaim = await tryClaimEvent(eventId, webhookEvent, providerObjectId);
if (ledgerClaim && !ledgerClaim.claimed) {
  return res.status(200).json({ received: true, status: 'duplicate_ignored' });
}
```

### Fixed: link.payment.paid duplicate guard

**Before:** No duplicate check — called createCompanySubscription on every delivery
**After:** Checks `insertResult.duplicate` — if true, returns 200 immediately without side effects

### Fixed: status variable shadowing

**Before:**
```js
const { ..., status } = attributes;  // Shadows imported status helper
// catch block: res.status(status.error)  // status is now string "paid", not helper
```
**After:**
```js
const { ..., status: paymentStatus } = attributes;  // No shadowing
```

### Fixed: Unknown event types

**Before:** No handler — code fell through try block without returning, leaving response hanging
**After:**
```js
} else {
  await tryMarkProcessed(eventId, null);
  return res.status(200).json({ received: true, provider: 'paymongo', status: 'ignored' });
}
```

### Fixed: payment.paid logging

Removed potential PII log reference (pre-existing QA11 fix preserved). No billing data logged.

### Removed: unused import

`import idGenerator from "../helpers/randomNumberForId";` — was imported but never used. Removed.

---

## subscriptionController.js — Change Summary

### Fixed: createCompanySubscription

**Before:** Blind INSERT — 23505 on duplicate webhook retry propagated to caller
**After:**
1. SELECT check before INSERT — returns existing row if already activated
2. INSERT attempt if check shows no existing row
3. `if (error.code === '23505') return null` — race condition safety catch

```js
// Check first
const existing = await dbQuery.query(checkQuery, [companyId, subscriptionId]);
if (existing.rows && existing.rows.length > 0) return existing.rows[0]; // already activated

// INSERT
try { ... }
catch (error) {
  if (error.code === '23505') return null;  // race condition duplicate, treat as no-op
  throw error;
}
```

---

## Authorization Impact

**Zero.** The webhook route has no auth middleware (correct — PayMongo can't supply Firebase tokens). Signature verification is still the first check before any DB mutation. No user/company/uid is taken from the client — company/subscription mapping comes from the PayMongo `remarks` field which was set when the payment link was created by the server.

---

## Payment Correctness Impact

| Case | Before | After |
|------|--------|-------|
| First webhook delivery | Insert + activate | Insert + activate (unchanged) |
| Duplicate webhook delivery | 23505 → 500 → retry loop | ON CONFLICT → duplicate=true → 200 |
| Concurrent duplicate | Race → 23505 → 500 | Constraint → one wins → 200 for rest |
| Already-activated subscription retry | Second INSERT → possible duplicate | check-then-insert → no-op return |
| payment.paid (UPDATE) | Already safe | Unchanged |
| payment.failed | Already safe | Unchanged |
| Unknown event | Hanging (no return) | 200 ignored |

---

## ESM/Acorn Compatibility

- Zero `?.` or `??` operators — verified by `node -e` test: `?. count: 0, ?? count: 0`
- `catch (e) {}` pattern used (Acorn 6/7 compatible)
- Build passed: PM2 restart 22, online, 12.3mb

---

## Deployment

- Commit: `0ba7414`
- GitHub: pushed
- Linode: deployed, PM2 restart 22, online
