# NOTIFY-P1 Reconciliation Sweep
**GETHIRED_NOTIFY_P1_PAYMONGO_RECONCILIATION_SWEEP_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Reconciliation Scope

This document covers data integrity checks needed to detect and resolve any bad state that may have accumulated BEFORE this patch was deployed.

---

## Pre-Patch Risk Period

**Risk period:** All `link.payment.paid` webhook deliveries processed before commit `0ba7414` was deployed.

**Root cause:** `insertTransactionTable` threw 23505 on duplicate → HTTP 500 → PayMongo retry loop.

**Two scenarios:**
1. **Loop exhausted:** PayMongo stopped retrying after N attempts → subscription NOT activated (false negative — employer paid, no subscription)
2. **Race condition win:** A retry succeeded on a later delivery (possibly because the first 500 happened before the transaction INSERT, and a race retry succeeded before the conflict) → single subscription row created (correct outcome)

The current code prevents both scenarios going forward. The issue is detecting scenario #1 from historical data.

---

## Check 1: transactions without corresponding companies_subscription

**Goal:** Find employers who paid successfully (transaction row exists, status=paid) but no subscription was created.

**Query** (run in Supabase SQL editor):
```sql
SELECT
  tt.id AS transaction_id,
  tt.reference_number,
  tt.status AS tx_status,
  tt.paid_at
FROM gethired.transaction_table tt
LEFT JOIN gethired.companies_subscription cs
  ON tt.reference_number LIKE '%' || cs.company_id || '%'
     OR tt.id = cs.subscription_id
WHERE tt.status = 'paid'
  AND cs.company_id IS NULL
ORDER BY tt.paid_at DESC;
```

**Note:** The exact join key depends on how `remarks` is parsed. The `link.payment.paid` handler does:
- `companyId = remarks.slice(0, 13)` — first 13 chars
- `subscriptionId = remarks.slice(14)` — chars after position 14

This means `reference_number` is NOT the join key — the link between transaction and subscription goes through the `remarks` field in PayMongo. If there are orphaned transactions, manual PayMongo dashboard lookups are needed to get the `remarks` and reconstruct companyId + subscriptionId.

---

## Check 2: duplicate rows in companies_subscription

**Goal:** Detect if any PayMongo retry race condition created duplicate subscription rows before the patch.

```sql
SELECT company_id, subscription_id, COUNT(*) AS cnt,
       MIN(created_at) AS first, MAX(created_at) AS last
FROM gethired.companies_subscription
GROUP BY company_id, subscription_id
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
```

**If rows found:** The duplicate rows are cosmetically harmless (FE shows billing history for all rows), but the newest row may conflict with adding a unique index (step 5 in migration SQL). Clean up oldest duplicate before adding the unique index.

---

## Check 3: duplicate rows in transaction_table

**Goal:** Verify there are no duplicate rows in transaction_table (should not be possible if the unique constraint has always been there).

```sql
SELECT id, COUNT(*) AS cnt
FROM gethired.transaction_table
GROUP BY id
HAVING COUNT(*) > 1;
```

Expected: 0 rows. If any rows found: this indicates the unique constraint was added after some data was inserted — escalate.

---

## Check 4: payment_webhook_events after migration

After applying `db/payment_webhook_events_ddl.sql`:
```sql
-- Distribution by status
SELECT status, COUNT(*) FROM gethired.payment_webhook_events GROUP BY status;

-- Events that failed processing (need manual review)
SELECT event_id, event_type, last_error_code, last_error_message, received_at
FROM gethired.payment_webhook_events
WHERE status IN ('failed', 'needs_reconciliation')
ORDER BY received_at DESC;
```

---

## Manual Reconciliation: Employer Paid, No Subscription

If Check 1 finds orphaned transactions:

1. Log into PayMongo dashboard
2. Find the payment link by `transaction_table.id` (link ID = `link_xxx`)
3. From the link's `remarks` field, extract `companyId` (chars 0-12) and `subscriptionId` (chars 14+)
4. Verify no row in `companies_subscription` for this pair:
```sql
SELECT * FROM gethired.companies_subscription
WHERE company_id = '<companyId>' AND subscription_id = '<subscriptionId>';
```
5. If no row: manually insert to activate subscription:
```sql
INSERT INTO gethired.companies_subscription
  (company_id, subscription_id, created_at, is_paid, payment_date)
VALUES ('<companyId>', '<subscriptionId>', NOW(), true, '<paid_at from transaction_table>')
ON CONFLICT DO NOTHING;
```
6. Notify the employer their account has been activated.

---

## Monitoring Post-Deploy

For 7 days after deploy: check PayMongo dashboard → Webhook → Delivery logs:
- All retries should return 200 now
- If still seeing 500s: check `pm2 logs gethired | grep PAYMONGO_WEBHOOK_PROCESSING_FAILED`

After 7 days: apply `db/payment_webhook_events_ddl.sql` migration if not already done.
