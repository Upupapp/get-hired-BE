-- Local implementation: apply only to an explicitly local database.
-- Prerequisites: notifications, companies_subscription and company_employees migrations.
BEGIN;
ALTER TABLE gethired.companies_subscription ADD COLUMN IF NOT EXISTS engagement_plan_version VARCHAR NOT NULL DEFAULT 'legacy_v4';
ALTER TABLE gethired.notifications
 ADD COLUMN IF NOT EXISTS company_id VARCHAR,
 ADD COLUMN IF NOT EXISTS category VARCHAR NOT NULL DEFAULT 'HIRING',
 ADD COLUMN IF NOT EXISTS priority VARCHAR NOT NULL DEFAULT 'INFO',
 ADD COLUMN IF NOT EXISTS template_key VARCHAR,
 ADD COLUMN IF NOT EXISTS engagement_status VARCHAR NOT NULL DEFAULT 'DELIVERED',
 ADD COLUMN IF NOT EXISTS surfaces JSONB,
 ADD COLUMN IF NOT EXISTS cta JSONB,
 ADD COLUMN IF NOT EXISTS metadata JSONB,
 ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS notifications_company_recipient ON gethired.notifications(company_id,recipient_uid,created_at DESC);
CREATE TABLE IF NOT EXISTS gethired.engagement_accounts (
 company_id VARCHAR PRIMARY KEY REFERENCES gethired.companies(company_id) ON DELETE CASCADE,
 snapshot JSONB NOT NULL DEFAULT '{}',
 timezone VARCHAR NOT NULL DEFAULT 'Asia/Manila',
 upgraded_at TIMESTAMPTZ,
 checkout_started_at TIMESTAMPTZ,
 sales_active BOOLEAN NOT NULL DEFAULT FALSE,
 manual_intervention BOOLEAN NOT NULL DEFAULT FALSE,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS gethired.engagement_members (
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id) ON DELETE CASCADE,
 recipient_uid VARCHAR NOT NULL,
 role VARCHAR NOT NULL CHECK(role IN ('BILLING_OWNER','ACCOUNT_ADMIN','RECRUITER','MEMBER')),
 PRIMARY KEY(company_id,recipient_uid)
);
CREATE TABLE IF NOT EXISTS gethired.engagement_preferences (
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id) ON DELETE CASCADE,
 recipient_uid VARCHAR NOT NULL,
 preferences JSONB NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(company_id,recipient_uid)
);
CREATE TABLE IF NOT EXISTS gethired.engagement_events (
 id VARCHAR PRIMARY KEY,
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id) ON DELETE CASCADE,
 event_key VARCHAR NOT NULL,
 type VARCHAR NOT NULL,
 payload JSONB NOT NULL,
 status VARCHAR NOT NULL DEFAULT 'PENDING',
 attempts INTEGER NOT NULL DEFAULT 0,
 available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(company_id,event_key)
);
CREATE INDEX IF NOT EXISTS engagement_events_pending ON gethired.engagement_events(available_at) WHERE status='PENDING';
CREATE TABLE IF NOT EXISTS gethired.engagement_rules (
 key VARCHAR PRIMARY KEY,
 config JSONB NOT NULL DEFAULT '{}',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS gethired.engagement_deliveries (
 id VARCHAR PRIMARY KEY,
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id) ON DELETE CASCADE,
 recipient_uid VARCHAR NOT NULL,
 rule_key VARCHAR NOT NULL,
 period_key VARCHAR NOT NULL,
 event_id VARCHAR REFERENCES gethired.engagement_events(id),
 campaign_id VARCHAR,
 campaign_variant VARCHAR NOT NULL DEFAULT 'CONTROL',
 template_variant VARCHAR NOT NULL DEFAULT 'CONTROL',
 channel VARCHAR NOT NULL,
 template_key VARCHAR NOT NULL,
 status VARCHAR NOT NULL DEFAULT 'QUEUED',
 dedupe_key VARCHAR NOT NULL UNIQUE,
 notification_id VARCHAR REFERENCES gethired.notifications(id) ON DELETE SET NULL,
 content JSONB NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 sent_at TIMESTAMPTZ,
 delivered_at TIMESTAMPTZ,
 opened_at TIMESTAMPTZ,
 clicked_at TIMESTAMPTZ,
 dismissed_at TIMESTAMPTZ,
 conversion_at TIMESTAMPTZ,
 converted_plan VARCHAR,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS engagement_delivery_history ON gethired.engagement_deliveries(company_id,recipient_uid,rule_key,created_at DESC);
CREATE INDEX IF NOT EXISTS engagement_delivery_pending ON gethired.engagement_deliveries(available_at) WHERE status='QUEUED';
-- No customer address is stored in the sink. It cannot be used as an email transport.
CREATE TABLE IF NOT EXISTS gethired.engagement_email_sink (
 delivery_id VARCHAR PRIMARY KEY REFERENCES gethired.engagement_deliveries(id) ON DELETE CASCADE,
 content JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS gethired.engagement_analytics (
 id BIGSERIAL PRIMARY KEY,
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id) ON DELETE CASCADE,
 recipient_uid VARCHAR,
 event_type VARCHAR NOT NULL,
 delivery_id VARCHAR,
 event_id VARCHAR,
 properties JSONB NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS gethired.engagement_sales_signals (
 id VARCHAR PRIMARY KEY,
 company_id VARCHAR NOT NULL REFERENCES gethired.companies(company_id) ON DELETE CASCADE,
 trigger VARCHAR NOT NULL,
 current_plan VARCHAR NOT NULL,
 usage_snapshot JSONB NOT NULL,
 contact_uid VARCHAR NOT NULL,
 status VARCHAR NOT NULL DEFAULT 'OPEN',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(company_id,trigger)
);
COMMIT;
