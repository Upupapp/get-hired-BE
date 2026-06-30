-- Invoice & Billing Schema — GetHired
-- Run against gethired schema. All changes are additive (IF NOT EXISTS throughout).
-- Safe to run on a live system. Does not modify any existing tables.
--
-- HOW TO RUN:
--   ssh root@139.162.11.242 "psql -U <DB_USER> -d <DB_NAME> -f /path/to/20260630_invoice_billing_schema.sql"
--   OR from Supabase SQL editor: paste contents and execute.

-- ── 1. Invoice number sequence ──────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS gethired.invoice_number_seq
  START 1
  INCREMENT 1
  NO MAXVALUE
  CACHE 1;

-- ── 2. Billing profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.billing_profiles (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                VARCHAR(50)   NOT NULL,
  legal_name                VARCHAR(255),
  billing_email             VARCHAR(255),
  finance_contact_name      VARCHAR(255),
  finance_contact_email     VARCHAR(255),
  billing_address_line1     VARCHAR(500),
  billing_address_line2     VARCHAR(500),
  city                      VARCHAR(100),
  province_state            VARCHAR(100),
  country                   VARCHAR(100)  DEFAULT 'Philippines',
  postal_code               VARCHAR(20),
  tax_identifier            VARCHAR(100),
  auto_send_invoices        BOOLEAN       NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_profiles_company_id_uq UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_profiles_company_id
  ON gethired.billing_profiles (company_id);

-- ── 3. Invoices ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.invoices (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                VARCHAR(50)   NOT NULL,
  subscription_id           INTEGER,
  cart_id                   VARCHAR(30),
  transaction_id            VARCHAR(255),
  invoice_number            VARCHAR(50),
  invoice_sequence          BIGINT,
  status                    VARCHAR(50)   NOT NULL DEFAULT 'draft',
  currency                  VARCHAR(10)   NOT NULL DEFAULT 'PHP',
  subtotal_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount                NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid               NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_due                NUMERIC(12,2) NOT NULL DEFAULT 0,
  plan_slug                 VARCHAR(100),
  plan_name                 VARCHAR(255),
  billing_cycle             VARCHAR(50),
  billing_period_start      TIMESTAMPTZ,
  billing_period_end        TIMESTAMPTZ,
  issued_at                 TIMESTAMPTZ,
  due_at                    TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ,
  voided_at                 TIMESTAMPTZ,
  customer_name             VARCHAR(255),
  customer_email            VARCHAR(255),
  customer_address          TEXT,
  line_items_json           JSONB,
  payment_reference         VARCHAR(255),
  payment_method_label      VARCHAR(100),
  hosted_invoice_token      VARCHAR(128),
  hosted_invoice_expires_at TIMESTAMPTZ,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT invoices_invoice_number_uq UNIQUE (invoice_number),
  CONSTRAINT invoices_hosted_token_uq   UNIQUE (hosted_invoice_token)
);

CREATE INDEX IF NOT EXISTS idx_invoices_company_id
  ON gethired.invoices (company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON gethired.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at
  ON gethired.invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id
  ON gethired.invoices (transaction_id);

-- ── 4. Invoice events (audit trail) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.invoice_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID        NOT NULL,
  company_id        VARCHAR(50),
  actor_uid         VARCHAR(255),
  event_type        VARCHAR(100) NOT NULL,
  event_source      VARCHAR(100),
  metadata_json     JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoice_events_invoice_fk
    FOREIGN KEY (invoice_id)
    REFERENCES gethired.invoices (id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_id
  ON gethired.invoice_events (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_events_company_id
  ON gethired.invoice_events (company_id, created_at DESC);

-- ── 5. Invoice delivery attempts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.invoice_delivery_attempts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id            UUID        NOT NULL,
  company_id            VARCHAR(50),
  recipient_email       VARCHAR(255),
  cc_emails_json        JSONB,
  channel               VARCHAR(50)  NOT NULL DEFAULT 'sendgrid',
  status                VARCHAR(50)  NOT NULL DEFAULT 'pending',
  provider_message_id   VARCHAR(255),
  error_message         TEXT,
  triggered_by_uid      VARCHAR(255),
  sent_at               TIMESTAMPTZ,
  failed_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT invoice_delivery_invoice_fk
    FOREIGN KEY (invoice_id)
    REFERENCES gethired.invoices (id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoice_delivery_invoice_id
  ON gethired.invoice_delivery_attempts (invoice_id);
