-- NOTIFY-P1: Payment webhook idempotency — event ledger table
-- Run this on the production Supabase PostgreSQL database.
-- Replace 'gethired' with the actual schema name (env SCHEMA variable).
--
-- This migration is ADDITIVE ONLY — creates a new table, does not modify existing tables.
-- Safe to run on a live system. Does not drop or modify transaction_table or companies_subscription.
--
-- The insertTransactionTable ON CONFLICT fix in paymentController.js works IMMEDIATELY
-- (uses existing unique constraint on transaction_table.id) and does NOT require this migration.
-- This migration adds the full event-ledger layer for event-ID–level deduplication.
--
-- RUN COMMAND (production):
--   From Supabase SQL editor or psql:
--   \i payment_webhook_events_ddl.sql

-- Step 1: Create the webhook event ledger table
CREATE TABLE IF NOT EXISTS gethired.payment_webhook_events (
    id              SERIAL PRIMARY KEY,
    provider        VARCHAR(50)  NOT NULL DEFAULT 'paymongo',
    event_id        VARCHAR(255) NOT NULL,
    event_type      VARCHAR(255),
    provider_object_id      VARCHAR(255),
    provider_object_type    VARCHAR(100),
    provider_payment_id     VARCHAR(255),
    status          VARCHAR(50)  NOT NULL DEFAULT 'received',
                    -- received | processing | processed | duplicate | ignored | failed | needs_reconciliation
    received_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    processing_started_at   TIMESTAMP,
    processed_at    TIMESTAMP,
    last_error_code         VARCHAR(50),
    last_error_message      VARCHAR(500),
    internal_attempt_count  INTEGER NOT NULL DEFAULT 0,
    duplicate_count         INTEGER NOT NULL DEFAULT 0,
    local_transaction_id    VARCHAR(255),
    local_subscription_id   VARCHAR(255),
    local_company_id        VARCHAR(255),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 2: Primary deduplication index — one row per provider+event_id pair
-- ON CONFLICT (provider, event_id) DO NOTHING in claimWebhookEvent depends on this.
CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_event_id_uidx
    ON gethired.payment_webhook_events (provider, event_id);

-- Step 3: Lookup indexes
CREATE INDEX IF NOT EXISTS payment_webhook_events_status_idx
    ON gethired.payment_webhook_events (status)
    WHERE status IN ('failed', 'processing', 'needs_reconciliation');

CREATE INDEX IF NOT EXISTS payment_webhook_events_provider_object_idx
    ON gethired.payment_webhook_events (provider, provider_object_id)
    WHERE provider_object_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_webhook_events_created_at_idx
    ON gethired.payment_webhook_events (created_at DESC);

-- Step 4: Verify the existing unique constraint on transaction_table.id
-- (used by ON CONFLICT (id) DO NOTHING in the patched insertTransactionTable).
-- Run this SELECT to check — if it returns a row, the constraint is present:
--
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_schema = 'gethired'
--   AND table_name = 'transaction_table'
--   AND constraint_type IN ('PRIMARY KEY', 'UNIQUE');
--
-- If no unique constraint exists on id, run:
-- ALTER TABLE gethired.transaction_table ADD PRIMARY KEY (id);
-- OR:
-- CREATE UNIQUE INDEX IF NOT EXISTS transaction_table_id_uidx ON gethired.transaction_table (id);

-- Step 5 (OPTIONAL — run only if companies_subscription allows duplicates):
-- Add a unique index to prevent duplicate subscription rows at DB level.
-- Run this SELECT first to check for existing duplicates:
--
-- SELECT company_id, subscription_id, COUNT(*) as cnt
-- FROM gethired.companies_subscription
-- GROUP BY company_id, subscription_id
-- HAVING COUNT(*) > 1;
--
-- If no duplicates exist, you can safely add:
-- CREATE UNIQUE INDEX IF NOT EXISTS companies_subscription_co_sub_uidx
--     ON gethired.companies_subscription (company_id, subscription_id);
-- This makes createCompanySubscription ON CONFLICT–safe instead of check-then-insert.

-- Rollback (DROP ONLY the new table — does not touch transaction_table or companies_subscription):
-- DROP TABLE IF EXISTS gethired.payment_webhook_events;
