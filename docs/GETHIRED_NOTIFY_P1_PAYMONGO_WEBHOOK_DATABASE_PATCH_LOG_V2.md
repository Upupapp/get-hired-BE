# NOTIFY-P1 Database Patch Log
**GETHIRED_NOTIFY_P1_PAYMONGO_WEBHOOK_DATABASE_PATCH_LOG_V2**
Run: 2026-06-26 | BE HEAD: 0ba7414

---

## Existing Schema Analysis

**transaction_table:** Not in `db/complete_ddl.sql` — production-only table
- Known columns: `id`, `checkout_url`, `reference_number`, `gross_amount`, `transaction_fee`, `currency`, `description`, `status`, `payment_id`, `net_amount`, `email`, `name`, `phone`, `payment_type`, `paid_at`
- `id` column: holds PayMongo payment link ID (e.g., `link_xxx`). Has a unique/primary key constraint (confirmed by 23505 error).
- `ON CONFLICT (id)` therefore works — no schema change needed for the critical fix.

**companies_subscription:** Not in `db/complete_ddl.sql`
- Known columns: `company_id`, `subscription_id`, `created_at`, `is_paid`, `payment_date`
- Unique constraint on `(company_id, subscription_id)`: UNKNOWN — not documented
- Application-level idempotency guard added (check-then-insert + 23505 catch)

---

## New Migration Required

**File:** `db/payment_webhook_events_ddl.sql`
**Status:** Created but NOT YET applied to production Supabase DB

### Required action (manual):
Run in Supabase SQL editor or via psql:
```sql
-- Replace 'gethired' with actual schema if different
\i db/payment_webhook_events_ddl.sql
```

OR paste content of `db/payment_webhook_events_ddl.sql` into Supabase dashboard SQL editor.

### Table created:
`gethired.payment_webhook_events`

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Internal ID |
| provider | VARCHAR(50) | 'paymongo' |
| event_id | VARCHAR(255) | PayMongo event ID (e.g., evt_xxx) |
| event_type | VARCHAR(255) | link.payment.paid / payment.paid / etc. |
| provider_object_id | VARCHAR(255) | Payment link / payment ID |
| status | VARCHAR(50) | received/processing/processed/failed/etc. |
| received_at | TIMESTAMP | When event arrived |
| processed_at | TIMESTAMP | When processing completed |
| internal_attempt_count | INTEGER | Retry count |
| local_transaction_id | VARCHAR(255) | FK to transaction_table.id |
| created_at / updated_at | TIMESTAMP | Standard |

### Unique index:
`UNIQUE(provider, event_id)` — the primary dedupe constraint

---

## Existing Constraint: transaction_table.id

**Status:** Already exists (implied by 23505 error — `ON CONFLICT (id)` requires it)
**No migration needed** — the ON CONFLICT fix works with the existing constraint.

To verify on production (run in Supabase SQL editor):
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'gethired'
  AND table_name = 'transaction_table'
  AND constraint_type IN ('PRIMARY KEY', 'UNIQUE');
```
Expected: one row with PRIMARY KEY or UNIQUE on `id`.

---

## Optional: companies_subscription Unique Index (Step 5 in migration)

Currently the idempotency guard is at application level (check-then-insert). To add DB-level protection:
1. Check for existing duplicates first:
```sql
SELECT company_id, subscription_id, COUNT(*) AS cnt
FROM gethired.companies_subscription
GROUP BY company_id, subscription_id
HAVING COUNT(*) > 1;
```
2. If no duplicates: apply the index from step 5 in migration SQL
3. If duplicates exist: document and plan cleanup before adding unique index

---

## Backfill Requirements

**payment_webhook_events:** No backfill needed — new table, no historical data required.
**transaction_table:** No backfill needed — existing constraint already present.
**companies_subscription:** Check for existing duplicates as noted above.

---

## Production Risk

| Change | Risk | Notes |
|--------|------|-------|
| payment_webhook_events CREATE TABLE IF NOT EXISTS | LOW | Additive only, no locks on existing tables |
| CREATE UNIQUE INDEX IF NOT EXISTS | LOW | New table, no data to lock |
| transaction_table ON CONFLICT (code change) | NONE | No schema change, uses existing constraint |
| companies_subscription check-then-insert | LOW | Read before write, no schema change |
| companies_subscription unique index (optional) | MEDIUM | Requires duplicate check first |
