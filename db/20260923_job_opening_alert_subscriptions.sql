-- Seeker job-opening alert subscriptions (Linode Postgres).
-- One row per registered user + normalized position.
-- instant_sent_at is the once-per-subscription instant-email guard.
-- last_digest_week is the Tuesday digest idempotency key (Asia/Manila date of that Tuesday).
--
-- Safe/additive. Deploys do not apply this file. Run by hand when rollout is authorized:
--   psql -U <user> -d <dbname> -f db/20260923_job_opening_alert_subscriptions.sql
-- Rollback:
--   DROP TABLE IF EXISTS gethired.job_opening_alert_subscriptions;
--
-- Until this table exists, the job-opening alert API returns 503 and does not send mail.

CREATE TABLE IF NOT EXISTS gethired.job_opening_alert_subscriptions (
  id                      BIGSERIAL PRIMARY KEY,
  user_uid                VARCHAR(128)  NOT NULL,
  position                VARCHAR(160)  NOT NULL,
  position_normalized     VARCHAR(160)  NOT NULL,
  job_role_id             INTEGER NULL,
  active                  BOOLEAN       NOT NULL DEFAULT TRUE,
  instant_sent_at         TIMESTAMPTZ NULL,
  instant_claimed_at      TIMESTAMPTZ NULL,
  instant_message_id      VARCHAR(255) NULL,
  instant_job_count       INTEGER NULL,
  last_digest_week        VARCHAR(16) NULL,
  last_digest_sent_at     TIMESTAMPTZ NULL,
  last_digest_message_id  VARCHAR(255) NULL,
  last_digest_job_count   INTEGER NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT job_opening_alert_subs_user_position_uidx UNIQUE (user_uid, position_normalized)
);

CREATE INDEX IF NOT EXISTS job_opening_alert_subs_user_idx
  ON gethired.job_opening_alert_subscriptions (user_uid, active);

CREATE INDEX IF NOT EXISTS job_opening_alert_subs_digest_idx
  ON gethired.job_opening_alert_subscriptions (id)
  WHERE active = TRUE;
