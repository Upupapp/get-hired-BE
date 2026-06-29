-- Subscription Lifecycle V4 — DB Migration
-- Run against gethired schema. All changes are additive.
-- Apply after subscription_guardrails_v4_migration.sql

-- Step 1: Enhance companies_subscription with billing lifecycle columns
ALTER TABLE gethired.companies_subscription
  ADD COLUMN IF NOT EXISTS billing_cycle      VARCHAR(20) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS period_start       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amount_paid        NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS plan_slug          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sub_status         VARCHAR(50) DEFAULT 'active';

-- Step 2: Subscription lifecycle event log
CREATE TABLE IF NOT EXISTS gethired.subscription_lifecycle_events (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          VARCHAR(255)  NOT NULL,
  subscription_id     INTEGER,
  plan_slug           VARCHAR(50),
  billing_cycle       VARCHAR(20),
  event_type          VARCHAR(100)  NOT NULL,
  previous_status     VARCHAR(50),
  new_status          VARCHAR(50),
  amount              NUMERIC(12, 2),
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,
  provider_reference  VARCHAR(255),
  metadata            JSONB,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sub_lifecycle_company_idx
  ON gethired.subscription_lifecycle_events(company_id, created_at DESC);

-- Step 3: Notification dedupe log (prevents duplicate lifecycle emails/notifications)
CREATE TABLE IF NOT EXISTS gethired.subscription_notification_log (
  id                  BIGSERIAL PRIMARY KEY,
  dedupe_key          VARCHAR(500)  NOT NULL UNIQUE,
  company_id          VARCHAR(255)  NOT NULL,
  notification_type   VARCHAR(100)  NOT NULL,
  billing_cycle       VARCHAR(20),
  sent_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  channel             VARCHAR(20)   NOT NULL DEFAULT 'email',
  status              VARCHAR(20)   NOT NULL DEFAULT 'sent',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sub_notif_company_type_idx
  ON gethired.subscription_notification_log(company_id, notification_type, sent_at DESC);

-- Step 4: In-app subscription notifications table
CREATE TABLE IF NOT EXISTS gethired.subscription_notifications (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          VARCHAR(255)  NOT NULL,
  recipient_uid       VARCHAR(255),
  notification_type   VARCHAR(100)  NOT NULL,
  title               TEXT,
  body                TEXT,
  is_read             BOOLEAN       NOT NULL DEFAULT FALSE,
  metadata            JSONB,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  read_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sub_inapp_company_read_idx
  ON gethired.subscription_notifications(company_id, is_read, created_at DESC);

-- Step 5: Add transaction_id to cart_table if missing (links cart to transaction)
ALTER TABLE gethired.cart_table
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);
