# NOTIFY-P1 Event State Machine Log
**GETHIRED_NOTIFY_P1_PAYMONGO_EVENT_STATE_MACHINE_LOG_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Local Payment States

| State | Description |
|-------|-------------|
| `pending` | Transaction row created, payment not yet confirmed |
| `paid` | Payment confirmed by PayMongo |
| `failed` | Payment failed |
| `cancelled` | Not explicitly handled — would need reconciliation |
| `needs_reconciliation` | Conflicting state (e.g., paid event after already-active subscription) |

---

## Local Subscription States (companies_subscription)

| State | Column | Description |
|-------|--------|-------------|
| inactive | No row in companies_subscription | Employer has no subscription |
| active | `is_paid = true` | Subscription activated |
| (no expired/cancelled in schema) | N/A | Not tracked in current schema |

---

## Event Types → State Transitions

### `link.payment.paid`

```
webhook arrives
  ↓ signature verified
  ↓ event ID claimed in ledger
  ↓ insertTransactionTable ON CONFLICT
  │
  ├── NEW INSERT (first delivery):
  │     updateCart status→paymentStatus, transaction_id→id
  │     if paymentStatus == "paid":
  │       UPDATE transaction_table with billing details
  │       createCompanySubscription → INSERT companies_subscription
  │       Subscription: inactive → active
  │     RETURN 200 processed
  │
  └── DUPLICATE (insertResult.duplicate = true):
        SKIP updateCart, UPDATE, createCompanySubscription
        RETURN 200 duplicate_ignored
```

### `payment.paid`

```
webhook arrives
  ↓ signature verified
  ↓ event ID claimed OR ledger graceful miss
  ↓ UPDATE transaction_table SET status=paymentStatus WHERE reference_number=external_reference_number
  (Idempotent UPDATE — safe to replay. No subscription change in this path.)
  RETURN 200 processed
```

### `payment.failed`

```
webhook arrives
  ↓ signature verified
  ↓ mark processed
  ↓ RETURN 200 processed
  (No mutation — subscription stays as-is. Out-of-order failed-after-paid is safe.)
```

### Unknown event type

```
webhook arrives
  ↓ signature verified
  ↓ mark processed (ignored)
  ↓ RETURN 200 ignored
  (No mutation)
```

---

## State Transition Rules

| Scenario | Before | Event | After | Side Effects |
|----------|--------|-------|-------|-------------|
| No subscription → payment.paid (link) | inactive | link.payment.paid (paid) | active | Insert companies_subscription |
| Already active → duplicate webhook | active | link.payment.paid (duplicate) | active (no change) | NONE |
| Active → payment.failed (stale) | active | payment.failed | active (no downgrade) | NONE |
| Failed → payment.paid (later success) | failed | link.payment.paid | active | Insert subscription (if not exists) |
| No transaction → payment.paid | (no row) | payment.paid | (UPDATE no-ops on missing row) | None |

---

## Out-of-Order Event Handling

### payment.failed arrives after link.payment.paid

The `payment.failed` handler does NOT modify `companies_subscription` or `transaction_table`. It returns 200 immediately. The subscription stays active.

**Policy:** Do not downgrade active/paid state based on a later failed event.

### Stale payment.paid arrives after already-active subscription

`UPDATE transaction_table ... WHERE reference_number = ?` — if the row already has `status = 'paid'`, the UPDATE just re-sets it to 'paid'. No harm. The `companies_subscription` check-then-insert prevents a duplicate row.

---

## Known State Machine Gap

The `payment.paid` event handler does NOT call `createCompanySubscription`. Only `link.payment.paid` does. This means if GetHired ever uses direct PayMongo payment objects (not links), subscription activation is not wired.

**Current production usage:** Only payment links (`createPaymongoLink` → `link.payment.paid`). Direct payments not used. This gap is documented in BACKLOG_V2.

---

## Event Logging Added

| Event | Log Entry |
|-------|----------|
| Webhook received | `PAYMONGO_WEBHOOK_RECEIVED type=... objectId=...` |
| Signature invalid | `PAYMONGO_WEBHOOK_SIGNATURE_INVALID` |
| Duplicate ignored (ledger) | `PAYMONGO_WEBHOOK_DUPLICATE_IGNORED` |
| Transaction inserted | `PAYMONGO_TRANSACTION_UPSERT_INSERTED` |
| Transaction duplicate | `PAYMONGO_TRANSACTION_UPSERT_DUPLICATE` |
| Subscription activated | `PAYMONGO_SUBSCRIPTION_STATE_TRANSITIONED` |
| Subscription no-op | `PAYMONGO_SUBSCRIPTION_DUPLICATE_NOOP` |
| payment.paid processed | `PAYMONGO_WEBHOOK_PROCESSED payment.paid` |
| payment.failed processed | `PAYMONGO_WEBHOOK_PROCESSED payment.failed` |
| Unknown event ignored | `PAYMONGO_WEBHOOK_IGNORED_UNSUPPORTED_TYPE` |
| Processing failed | `PAYMONGO_WEBHOOK_PROCESSING_FAILED` |
