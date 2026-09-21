-- LOCAL FIRST. Dependencies: subscription lifecycle, engagement, invoice and webhook-event migrations.
BEGIN;
ALTER TABLE gethired.payment_webhook_events
 ADD COLUMN IF NOT EXISTS livemode BOOLEAN,
 ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64),
 ADD COLUMN IF NOT EXISTS safe_event JSONB,
 ADD COLUMN IF NOT EXISTS attempt_id VARCHAR;
CREATE TABLE IF NOT EXISTS gethired.billing_plan_versions (
 id VARCHAR PRIMARY KEY,
 plan_code VARCHAR NOT NULL,
 catalog_version VARCHAR NOT NULL,
 legacy_subscription_id INTEGER,
 monthly_minor BIGINT CHECK(monthly_minor BETWEEN 100 AND 999999999999),
 annual_minor BIGINT CHECK(annual_minor BETWEEN 100 AND 999999999999),
 currency VARCHAR NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 entitlements JSONB NOT NULL,
 self_serve BOOLEAN NOT NULL DEFAULT TRUE,
 available BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE gethired.companies_subscription
 ADD COLUMN IF NOT EXISTS billing_plan_version_id VARCHAR REFERENCES gethired.billing_plan_versions(id),
 ADD COLUMN IF NOT EXISTS billing_revision INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS agreed_monthly_minor BIGINT,
 ADD COLUMN IF NOT EXISTS agreed_annual_minor BIGINT,
 ADD COLUMN IF NOT EXISTS effective_entitlements JSONB,
 ADD COLUMN IF NOT EXISTS billing_payment_attempt_id VARCHAR,
 ADD COLUMN IF NOT EXISTS trial_converted_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS scheduled_plan_version_id VARCHAR REFERENCES gethired.billing_plan_versions(id),
 ADD COLUMN IF NOT EXISTS scheduled_change_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS gethired.billing_approved_orders (
 id VARCHAR PRIMARY KEY,
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id),
 plan_version_id VARCHAR NOT NULL REFERENCES gethired.billing_plan_versions(id),
 amount_minor BIGINT NOT NULL CHECK(amount_minor BETWEEN 100 AND 999999999999),
 billing_cycle VARCHAR NOT NULL CHECK(billing_cycle IN ('monthly','annual')),
 currency VARCHAR NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 custom_entitlements JSONB NOT NULL,
 approved_by VARCHAR NOT NULL,
 approved_at TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 status VARCHAR NOT NULL DEFAULT 'APPROVED' CHECK(status IN ('APPROVED','PAID','CANCELLED'))
);
CREATE TABLE IF NOT EXISTS gethired.billing_storage_packages (
 code VARCHAR PRIMARY KEY,
 bytes BIGINT NOT NULL CHECK(bytes>0),
 monthly_minor BIGINT NOT NULL CHECK(monthly_minor BETWEEN 100 AND 999999999999),
 available BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS gethired.payment_attempts (
 id VARCHAR PRIMARY KEY,
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id),
 initiated_by_uid VARCHAR NOT NULL,
 purchase_type VARCHAR NOT NULL CHECK(purchase_type IN ('SUBSCRIPTION_START','SUBSCRIPTION_UPGRADE','SUBSCRIPTION_RENEWAL','STORAGE_ADDON','ENTERPRISE_INVOICE')),
 plan_version_id VARCHAR REFERENCES gethired.billing_plan_versions(id),
 addon_code VARCHAR REFERENCES gethired.billing_storage_packages(code),
 approved_order_id VARCHAR REFERENCES gethired.billing_approved_orders(id),
 billing_cycle VARCHAR NOT NULL CHECK(billing_cycle IN ('monthly','annual')),
 billing_mode VARCHAR NOT NULL DEFAULT 'UPFRONT',
 currency VARCHAR NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 expected_amount_minor BIGINT NOT NULL CHECK(expected_amount_minor BETWEEN 100 AND 999999999999),
 source_revision INTEGER NOT NULL,
 fingerprint VARCHAR NOT NULL,
 internal_reference VARCHAR NOT NULL UNIQUE,
 status VARCHAR NOT NULL DEFAULT 'CREATED',
 livemode BOOLEAN NOT NULL,
 paymongo_payment_id VARCHAR,
 paymongo_intent_id VARCHAR,
 client_key VARCHAR,
 request_hash VARCHAR(64),
 paymongo_link_id VARCHAR,
 paymongo_reference_number VARCHAR,
 checkout_url VARCHAR,
 expires_at TIMESTAMPTZ NOT NULL,
 failure_category VARCHAR,
 paid_at TIMESTAMPTZ,
 failed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempt_link_uq ON gethired.payment_attempts(livemode,paymongo_link_id) WHERE paymongo_link_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempt_reference_number_uq ON gethired.payment_attempts(livemode,paymongo_reference_number) WHERE paymongo_reference_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempt_pending_fingerprint_uq ON gethired.payment_attempts(company_id,fingerprint) WHERE status IN ('CREATED','CHECKOUT_CREATING','CHECKOUT_CREATED','PENDING','CHECKOUT_UNKNOWN');
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempt_client_key_uq ON gethired.payment_attempts(company_id,initiated_by_uid,client_key) WHERE client_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempt_intent_uq ON gethired.payment_attempts(livemode,paymongo_intent_id) WHERE paymongo_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_attempt_company_created ON gethired.payment_attempts(company_id,created_at DESC);
CREATE TABLE IF NOT EXISTS gethired.payment_transactions (
 id VARCHAR PRIMARY KEY,
 attempt_id VARCHAR NOT NULL UNIQUE REFERENCES gethired.payment_attempts(id),
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id),
 provider VARCHAR NOT NULL DEFAULT 'PAYMONGO',
 provider_payment_id VARCHAR NOT NULL,
 livemode BOOLEAN NOT NULL,
 gross_minor BIGINT NOT NULL,
 currency VARCHAR NOT NULL CHECK(currency='PHP'),
 status VARCHAR NOT NULL CHECK(status IN ('PAID','REFUNDED','PARTIALLY_REFUNDED')),
 payment_method_summary VARCHAR,
 refund_minor BIGINT NOT NULL DEFAULT 0,
 paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(livemode,provider_payment_id)
);
CREATE TABLE IF NOT EXISTS gethired.billing_fulfillments (
 attempt_id VARCHAR PRIMARY KEY REFERENCES gethired.payment_attempts(id),
 company_id VARCHAR NOT NULL,
 fulfillment_key VARCHAR NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(company_id,fulfillment_key)
);
CREATE TABLE IF NOT EXISTS gethired.subscription_storage_addons (
 id VARCHAR PRIMARY KEY,
 attempt_id VARCHAR NOT NULL UNIQUE REFERENCES gethired.payment_attempts(id),
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id),
 package_code VARCHAR NOT NULL REFERENCES gethired.billing_storage_packages(code),
 bytes BIGINT NOT NULL,
 amount_minor BIGINT NOT NULL,
 period_start TIMESTAMPTZ NOT NULL,
 period_end TIMESTAMPTZ NOT NULL,
 status VARCHAR NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE IF NOT EXISTS gethired.subscription_billing_history (
 id VARCHAR PRIMARY KEY,
 company_id VARCHAR NOT NULL,
 attempt_id VARCHAR NOT NULL UNIQUE REFERENCES gethired.payment_attempts(id),
 event_type VARCHAR NOT NULL,
 previous_snapshot JSONB,
 new_snapshot JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS gethired.billing_audit_events (
 id BIGSERIAL PRIMARY KEY,
 company_id VARCHAR,
 actor_uid VARCHAR,
 attempt_id VARCHAR,
 provider_payment_id VARCHAR,
 event_type VARCHAR NOT NULL,
 properties JSONB NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS gethired.billing_reconciliation (
 id VARCHAR PRIMARY KEY,
 event_id VARCHAR UNIQUE,
 attempt_id VARCHAR,
 reason VARCHAR NOT NULL,
 status VARCHAR NOT NULL DEFAULT 'OPEN',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 resolved_at TIMESTAMPTZ
);
ALTER TABLE gethired.invoices ADD COLUMN IF NOT EXISTS billing_attempt_id VARCHAR UNIQUE REFERENCES gethired.payment_attempts(id);
INSERT INTO gethired.billing_storage_packages(code,bytes,monthly_minor) VALUES
 ('storage_25',25000000000,49900),('storage_100',100000000000,149900),('storage_250',250000000000,299900)
 ON CONFLICT(code) DO NOTHING;
-- New approved monthly pricing. Annual stays NULL until a specific price is approved.
INSERT INTO gethired.billing_plan_versions(id,plan_code,catalog_version,legacy_subscription_id,monthly_minor,entitlements) VALUES
 ('pricing_2026_09:starter','starter','pricing_2026_09',2,129000,'{"jobs":5,"users":2,"storage":10000000000,"video":3}'),
 ('pricing_2026_09:growth','growth','pricing_2026_09',3,299000,'{"jobs":15,"users":5,"storage":50000000000,"video":5}'),
 ('pricing_2026_09:premium','premium','pricing_2026_09',4,599000,'{"jobs":40,"users":15,"storage":200000000000,"video":10}')
 ON CONFLICT(id) DO NOTHING;
INSERT INTO gethired.billing_plan_versions(id,plan_code,catalog_version,self_serve,entitlements) VALUES
 ('pricing_2026_09:enterprise','enterprise','pricing_2026_09',FALSE,'{}') ON CONFLICT(id) DO NOTHING;
-- Financial terms become immutable once an attempt/account references them.
CREATE OR REPLACE FUNCTION gethired.billing_attempt_terms_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(OLD.company_id,OLD.initiated_by_uid,OLD.purchase_type,OLD.plan_version_id,OLD.addon_code,OLD.approved_order_id,OLD.billing_cycle,OLD.billing_mode,OLD.currency,OLD.expected_amount_minor,OLD.source_revision,OLD.fingerprint,OLD.internal_reference,OLD.livemode)
 IS DISTINCT FROM ROW(NEW.company_id,NEW.initiated_by_uid,NEW.purchase_type,NEW.plan_version_id,NEW.addon_code,NEW.approved_order_id,NEW.billing_cycle,NEW.billing_mode,NEW.currency,NEW.expected_amount_minor,NEW.source_revision,NEW.fingerprint,NEW.internal_reference,NEW.livemode)
 THEN RAISE EXCEPTION 'payment attempt financial terms are immutable'; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS billing_attempt_terms_immutable_trg ON gethired.payment_attempts;
CREATE TRIGGER billing_attempt_terms_immutable_trg BEFORE UPDATE ON gethired.payment_attempts FOR EACH ROW EXECUTE FUNCTION gethired.billing_attempt_terms_immutable();
CREATE OR REPLACE FUNCTION gethired.billing_plan_terms_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM gethired.payment_attempts WHERE plan_version_id=OLD.id UNION ALL SELECT 1 FROM gethired.companies_subscription WHERE billing_plan_version_id=OLD.id LIMIT 1)
 AND ROW(OLD.plan_code,OLD.catalog_version,OLD.legacy_subscription_id,OLD.monthly_minor,OLD.annual_minor,OLD.currency,OLD.entitlements,OLD.self_serve)
 IS DISTINCT FROM ROW(NEW.plan_code,NEW.catalog_version,NEW.legacy_subscription_id,NEW.monthly_minor,NEW.annual_minor,NEW.currency,NEW.entitlements,NEW.self_serve)
 THEN RAISE EXCEPTION 'referenced billing plan terms are immutable'; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS billing_plan_terms_immutable_trg ON gethired.billing_plan_versions;
CREATE TRIGGER billing_plan_terms_immutable_trg BEFORE UPDATE ON gethired.billing_plan_versions FOR EACH ROW EXECUTE FUNCTION gethired.billing_plan_terms_immutable();
CREATE OR REPLACE FUNCTION gethired.billing_order_terms_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM gethired.payment_attempts WHERE approved_order_id=OLD.id)
 AND ROW(OLD.company_id,OLD.plan_version_id,OLD.amount_minor,OLD.billing_cycle,OLD.currency,OLD.custom_entitlements,OLD.approved_by,OLD.approved_at,OLD.expires_at)
 IS DISTINCT FROM ROW(NEW.company_id,NEW.plan_version_id,NEW.amount_minor,NEW.billing_cycle,NEW.currency,NEW.custom_entitlements,NEW.approved_by,NEW.approved_at,NEW.expires_at)
 THEN RAISE EXCEPTION 'approved order terms are immutable'; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS billing_order_terms_immutable_trg ON gethired.billing_approved_orders;
CREATE TRIGGER billing_order_terms_immutable_trg BEFORE UPDATE ON gethired.billing_approved_orders FOR EACH ROW EXECUTE FUNCTION gethired.billing_order_terms_immutable();
-- Current published catalog; no inference of legacy account agreements.
INSERT INTO gethired.billing_plan_versions(id,plan_code,catalog_version,legacy_subscription_id,monthly_minor,annual_minor,entitlements) VALUES
 ('pricing_2026_09_21:starter','starter','pricing_2026_09_21',2,149000,1490000,'{"jobs":2,"users":1,"storage":null,"video":25}'),
 ('pricing_2026_09_21:growth','growth','pricing_2026_09_21',3,349000,3490000,'{"jobs":6,"users":3,"storage":null,"video":100}'),
 ('pricing_2026_09_21:premium','premium','pricing_2026_09_21',4,599000,5990000,'{"jobs":40,"users":15,"storage":null,"video":400}')
ON CONFLICT(id) DO NOTHING;
-- Production catalog capacities reconciled with main at 93177c8.
-- New immutable version: retain prior versions for historical agreements.
INSERT INTO gethired.billing_plan_versions(id,plan_code,catalog_version,legacy_subscription_id,monthly_minor,annual_minor,entitlements) VALUES
 ('pricing_2026_09_21_v2:starter','starter','pricing_2026_09_21_v2',2,149000,1490000,'{"jobs":5,"users":2,"storage":10737418240,"video":25}'),
 ('pricing_2026_09_21_v2:growth','growth','pricing_2026_09_21_v2',3,349000,3490000,'{"jobs":15,"users":5,"storage":53687091200,"video":100}'),
 ('pricing_2026_09_21_v2:premium','premium','pricing_2026_09_21_v2',4,599000,5990000,'{"jobs":40,"users":15,"storage":214748364800,"video":400}')
ON CONFLICT(id) DO NOTHING;
COMMIT;
