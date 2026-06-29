-- Subscription Guardrails V4 — DB Migration Backlog
-- Run manually against production schema.
-- All changes are additive (no existing column drops or renames).
-- Replace :schema with your schema name (e.g., public or gethired).

-- Step 1: Add billing_cycle to cart_table (supports annual vs monthly tracking)
ALTER TABLE :schema.cart_table
  ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly';

-- Step 2: Add canonical_slug to subscription table (maps subscription_id to V4 slug)
ALTER TABLE :schema."subscription"
  ADD COLUMN IF NOT EXISTS canonical_slug VARCHAR(50);

-- Seed slugs based on subscription_id convention
UPDATE :schema."subscription" SET canonical_slug = 'free_trial' WHERE subscription_id = 1 AND canonical_slug IS NULL;
UPDATE :schema."subscription" SET canonical_slug = 'starter'    WHERE subscription_id = 2 AND canonical_slug IS NULL;
UPDATE :schema."subscription" SET canonical_slug = 'growth'     WHERE subscription_id = 3 AND canonical_slug IS NULL;
UPDATE :schema."subscription" SET canonical_slug = 'business'   WHERE subscription_id = 4 AND canonical_slug IS NULL;

-- Step 3: Add annual_price to subscription table (for display matching)
ALTER TABLE :schema."subscription"
  ADD COLUMN IF NOT EXISTS annual_price NUMERIC(12, 2);

UPDATE :schema."subscription" SET annual_price = 14900 WHERE subscription_id = 2 AND annual_price IS NULL;
UPDATE :schema."subscription" SET annual_price = 34900 WHERE subscription_id = 3 AND annual_price IS NULL;
UPDATE :schema."subscription" SET annual_price = 69900 WHERE subscription_id = 4 AND annual_price IS NULL;

-- Step 4: Unique index on companies_subscription (recommended from payment_webhook_events_ddl.sql Step 5)
-- Only run if the index does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
    AND tablename = 'companies_subscription'
    AND indexname = 'companies_subscription_company_sub_uidx'
  ) THEN
    CREATE UNIQUE INDEX companies_subscription_company_sub_uidx
      ON :schema.companies_subscription(company_id, subscription_id);
  END IF;
END;
$$;

-- Step 5: Audit log table (optional — subscription decisions currently logged to stdout)
-- Uncomment to enable persistent audit log:
-- CREATE TABLE IF NOT EXISTS :schema.subscription_audit_log (
--   id           BIGSERIAL PRIMARY KEY,
--   ts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   company_id   VARCHAR(255),
--   actor_id     VARCHAR(255),
--   action       VARCHAR(100),
--   entitlement_key VARCHAR(100),
--   plan_slug    VARCHAR(50),
--   billing_cycle VARCHAR(20),
--   used         INTEGER,
--   limit_val    INTEGER,
--   mode         VARCHAR(20),
--   allowed      BOOLEAN,
--   reason_code  VARCHAR(100),
--   would_have_blocked BOOLEAN,
--   checkout_intent_id VARCHAR(50)
-- );
