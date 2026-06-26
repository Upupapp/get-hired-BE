-- LAUNCH-02: Application notification event log
-- Provides idempotency tracking and audit trail for confirmation + status-change emails.
-- Safe to apply incrementally — all statements use IF NOT EXISTS.
--
-- Apply: psql -U <user> -d <dbname> -f db/application_notification_events_ddl.sql
-- Rollback: DROP TABLE IF EXISTS gethired.application_notification_events;
--
-- Until this migration is applied, the code degrades gracefully:
-- ON CONFLICT idempotency guard at DB level is inactive, but application-level
-- guards (no-op status check, duplicate application check) remain active.

-- Step 1: Create the notification event log table
CREATE TABLE IF NOT EXISTS gethired.application_notification_events (
  id                        SERIAL PRIMARY KEY,
  event_key                 VARCHAR(500) NOT NULL,
  event_type                VARCHAR(100) NOT NULL,
  application_id            VARCHAR(100),
  applicant_id              VARCHAR(255),
  job_id                    VARCHAR(100),
  company_id                VARCHAR(100),
  recipient_email_hash      VARCHAR(128),
  old_status_id             INTEGER,
  new_status_id             INTEGER,
  new_status_label          VARCHAR(100),
  status                    VARCHAR(50)  NOT NULL DEFAULT 'queued',
  provider                  VARCHAR(50)  NOT NULL DEFAULT 'sendgrid',
  provider_message_id       VARCHAR(255),
  attempt_count             INTEGER      NOT NULL DEFAULT 1,
  last_error_code           VARCHAR(100),
  last_error_message        VARCHAR(500),
  sent_at                   TIMESTAMPTZ,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Step 2: Unique constraint — one event per key prevents duplicate emails
CREATE UNIQUE INDEX IF NOT EXISTS application_notification_events_event_key_uidx
  ON gethired.application_notification_events (event_key);

-- Step 3: Index for status-based reconciliation queries
CREATE INDEX IF NOT EXISTS application_notification_events_status_idx
  ON gethired.application_notification_events (status, created_at)
  WHERE status IN ('failed', 'queued');

-- Step 4: Index for application-level lookups
CREATE INDEX IF NOT EXISTS application_notification_events_application_id_idx
  ON gethired.application_notification_events (application_id);

-- Verify
SELECT COUNT(*) AS table_exists
FROM information_schema.tables
WHERE table_schema = 'gethired'
  AND table_name = 'application_notification_events';

-- Event key patterns:
--   Confirmation:    application:{applicationId}:email:application_received
--   Status change:   application:{applicationId}:email:status_change:{oldStatus}->{newStatus}
--
-- Status values:
--   queued, sent, failed, duplicate, skipped
