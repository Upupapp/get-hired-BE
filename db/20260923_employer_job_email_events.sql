-- Employer job email send log (milestones + job-live). Idempotent via UNIQUE(job_id, milestone).
-- Safe/additive. Apply only after Paul authorizes DB migrate.
--
-- Apply: psql -U <user> -d <dbname> -f db/20260923_employer_job_email_events.sql
-- Rollback: DROP TABLE IF EXISTS gethired.employer_job_email_events;
--
-- Until this migration is applied, employerJobEmailService degrades gracefully:
-- claim INSERT fails with 42P01 → log + skip send (no live mail without the table).

CREATE TABLE IF NOT EXISTS gethired.employer_job_email_events (
  id                   BIGSERIAL PRIMARY KEY,
  job_id               VARCHAR(100)  NOT NULL,
  company_id           VARCHAR(100),
  milestone            VARCHAR(32)   NOT NULL,
  -- milestone values: '1' | '10' | '20' | '40' | '50' | 'job_live'
  application_count    INTEGER,
  recipient_email_hash VARCHAR(128),
  status               VARCHAR(32)   NOT NULL DEFAULT 'queued',
  -- status: queued | sent | failed | skipped_pref | skipped_duplicate
  provider             VARCHAR(32)   NOT NULL DEFAULT 'sendgrid',
  provider_message_id  VARCHAR(255),
  template_id          VARCHAR(64),
  last_error_code      VARCHAR(100),
  last_error_message   VARCHAR(500),
  sent_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT employer_job_email_events_job_milestone_uidx UNIQUE (job_id, milestone)
);

CREATE INDEX IF NOT EXISTS employer_job_email_events_company_idx
  ON gethired.employer_job_email_events (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS employer_job_email_events_status_idx
  ON gethired.employer_job_email_events (status, created_at)
  WHERE status IN ('failed', 'queued');
