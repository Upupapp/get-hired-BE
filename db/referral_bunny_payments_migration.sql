-- Apply after referral_bunny_migration.sql with the application's search_path.
CREATE TABLE IF NOT EXISTS referral_bunny_customers (
 connection_id varchar(100) NOT NULL, company_id varchar(100) NOT NULL,
 uid varchar(128) NOT NULL, membership_id varchar(100) NOT NULL, referred_at timestamptz NOT NULL,
 first_invoice_id varchar(100) NOT NULL, PRIMARY KEY(connection_id,company_id)
);
CREATE TABLE IF NOT EXISTS referral_bunny_payments (
 id varchar(64) PRIMARY KEY, connection_id varchar(100) NOT NULL, company_id varchar(100) NOT NULL,
 invoice_id varchar(100) NOT NULL, provider_payment_id varchar(255) NOT NULL,
 occurred_at timestamptz NOT NULL, gross_minor bigint, payload text, status varchar(20) NOT NULL,
 reason varchar(80), attempts integer NOT NULL DEFAULT 0, delivered_at timestamptz, next_attempt_at timestamptz, last_attempt_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT NOW(),
 UNIQUE(connection_id,invoice_id), UNIQUE(connection_id,provider_payment_id)
);
CREATE INDEX IF NOT EXISTS rb_payments_pending ON referral_bunny_payments(connection_id,status,occurred_at);

ALTER TABLE referral_bunny_requests ADD COLUMN IF NOT EXISTS payment_scope boolean NOT NULL DEFAULT FALSE;
ALTER TABLE referral_bunny_platform ADD COLUMN IF NOT EXISTS payments_authorized boolean NOT NULL DEFAULT FALSE;
