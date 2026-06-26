# NOTIFY-P1 Idempotency Design Contract
**GETHIRED_NOTIFY_P1_PAYMONGO_WEBHOOK_IDEMPOTENCY_DESIGN_CONTRACT_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Idempotency Keys

### Primary: PayMongo Event ID

`req.body.data.id` — the PayMongo event envelope ID (e.g., `evt_xxxx`)

Used for: event ledger claim. One row per event ID in `payment_webhook_events`.

### Secondary: Provider Object ID

`req.body.data.attributes.data.id` — the payment link or payment object ID (e.g., `link_xxx`, `pay_xxx`)

Used for: `transaction_table.id` unique constraint via `ON CONFLICT (id)`.

### Business Object Keys

| Key | Source | Used For |
|-----|--------|---------|
| `id` (payment link ID) | PayMongo webhook payload | transaction_table unique key |
| `company_id + subscription_id` | remarks parsing + DB | companies_subscription deduplication |
| `reference_number` | PayMongo payment link attributes | UPDATE target in transaction_table |
| `cart_id` | remarks parsing | cart_table UPDATE target |

---

## Ledger Table

**Table:** `gethired.payment_webhook_events` (or schema-prefixed by env.schema)
**Required unique index:** `UNIQUE(provider, event_id)` — enforced at DB level
**Status lifecycle:** `received` → `processing` → `processed` / `duplicate` / `ignored` / `failed` / `needs_reconciliation`

---

## Processing Contract

1. **Receive** POST /api/payment/paymongowebhook
2. **Preserve raw body** — `req.rawBody` already set by `express.json` verify callback
3. **Verify signature** — `verifyPaymongoSignature(req)` before any DB mutation
4. **Validate payload** — `data` and `data.attributes` must exist
5. **Extract event ID** — `data.id`
6. **Claim event** — `INSERT INTO payment_webhook_events ON CONFLICT (provider, event_id) DO NOTHING`
   - If INSERT returns rows: first delivery → proceed
   - If INSERT returns nothing: duplicate → return `200 { status: 'duplicate_ignored' }`
   - If table missing (42P01): warning log → proceed to ON CONFLICT safety net
7. **Process event** in try/catch
   - `link.payment.paid`:
     a. `insertTransactionTable` with `ON CONFLICT (id) DO NOTHING`
     b. If duplicate → return 200 duplicate_ignored without side effects
     c. If new → updateCart, UPDATE transaction details, createCompanySubscription
   - `payment.paid`: idempotent UPDATE → return 200
   - `payment.failed`: log → return 200
   - Unknown: log → return 200 ignored
8. **Mark processed** — `UPDATE payment_webhook_events SET status='processed'`
9. **Return 2xx** — always return 2xx for already-processed, duplicate, ignored

---

## Response Shape Contract

**First successful delivery:**
```json
{ "received": true, "provider": "paymongo", "status": "processed" }
```

**Duplicate event (ledger gate):**
```json
{ "received": true, "provider": "paymongo", "status": "duplicate_ignored" }
```

**Duplicate transaction (ON CONFLICT gate):**
```json
{ "received": true, "provider": "paymongo", "status": "duplicate_ignored" }
```

**Unsupported event type:**
```json
{ "received": true, "provider": "paymongo", "status": "ignored" }
```

**Invalid signature:**
```json
{ "message": "Invalid webhook signature" }  HTTP 400
```

**Malformed payload:**
```json
{ "message": "Malformed webhook payload" }  HTTP 400
```

**Retryable failure (DB down, network error):**
```json
{ "message": "Operation not successful. Please try again." }  HTTP 500
```

---

## Expected Behavior Matrix

| Scenario | Ledger | ON CONFLICT | Result |
|----------|--------|-------------|--------|
| First delivery | claimed=true | inserted=true | Process all, return 200 processed |
| Same event ID retry | claimed=false | (not reached) | Return 200 duplicate_ignored |
| Same object ID, diff event ID | claimed=true | inserted=false → duplicate=true | Return 200 duplicate_ignored |
| Concurrent same event | One claims, rest see conflict | Only one inserts | One processes, rest return 200 |
| Ledger table missing | null (graceful) | inserted=true or false | Falls through to ON CONFLICT gate |
| Invalid signature | (never reaches DB) | (never reached) | Return 400 |
| Unknown event | claimed, mark processed | (not applicable) | Return 200 ignored |
| DB failure before claim | null | (not reached) | Return 500 (retryable) |

---

## Side Effect Idempotency

| Side Effect | Before Patch | After Patch |
|------------|-------------|------------|
| transaction_table INSERT | Throws 23505 on duplicate | ON CONFLICT → duplicate=true → return 200 |
| cart_table UPDATE | Idempotent (UPDATE) | Unchanged — still idempotent |
| transaction_table UPDATE (billing) | Idempotent (UPDATE) | Unchanged |
| companies_subscription INSERT | Non-idempotent blind INSERT | check-then-insert + 23505 catch |
| Email/notification | Not implemented in payment path | N/A |
| Entitlement/usage credit | Not explicitly implemented | N/A |

---

## Concurrency Contract

PostgreSQL unique constraint on `payment_webhook_events(provider, event_id)` + `ON CONFLICT DO NOTHING RETURNING id`:
- Only ONE concurrent insert will return a row → only one processor claims the event
- Other concurrent inserts return empty → callers see `claimed: false` → return 200 immediately
- No application-level locking needed

PostgreSQL unique constraint on `transaction_table(id)`:
- Only ONE insert will succeed for a given PayMongo object ID
- Others are no-ops via `ON CONFLICT DO NOTHING`
