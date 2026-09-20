-- Apply using the configured application schema after referral_bunny_payments_migration.sql.
CREATE TABLE IF NOT EXISTS referral_bunny_refund_events (
 event_id varchar(220) PRIMARY KEY, payload_hash varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS referral_bunny_provider_refunds (
 refund_id varchar(220) NOT NULL, livemode boolean NOT NULL, provider_payment_id varchar(220) NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency varchar(3) NOT NULL,
 occurred_at timestamptz NOT NULL, event_id varchar(220) NOT NULL,
 PRIMARY KEY(refund_id,livemode)
);
CREATE INDEX IF NOT EXISTS rb_provider_refund_payment ON referral_bunny_provider_refunds(provider_payment_id,livemode);
CREATE TABLE IF NOT EXISTS referral_bunny_refunds (
 id varchar(64) PRIMARY KEY, connection_id varchar(100) NOT NULL, refund_id varchar(220) NOT NULL,
 payment_delivery_id varchar(64) NOT NULL REFERENCES referral_bunny_payments(id),
 gross_minor bigint NOT NULL, net_minor bigint NOT NULL DEFAULT 0, ordinal integer NOT NULL,
 payload text, status varchar(20) NOT NULL, reason varchar(80), attempts integer NOT NULL DEFAULT 0,
 delivered_at timestamptz, next_attempt_at timestamptz, last_attempt_at timestamptz, created_at timestamptz NOT NULL DEFAULT NOW(),
 UNIQUE(connection_id,refund_id), UNIQUE(payment_delivery_id,ordinal)
);
ALTER TABLE referral_bunny_payments ADD COLUMN IF NOT EXISTS gross_minor bigint;
