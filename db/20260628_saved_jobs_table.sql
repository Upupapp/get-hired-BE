-- Save-job feature (V6 public job detail redesign)
-- Run once on production: psql -d <db> -f this_file.sql
-- Safe to run multiple times (IF NOT EXISTS guards).

CREATE TABLE IF NOT EXISTS gethired.saved_jobs (
  id         BIGSERIAL     PRIMARY KEY,
  applicant_uid VARCHAR(128) NOT NULL,
  job_id     VARCHAR(128)  NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (applicant_uid, job_id)
);

CREATE INDEX IF NOT EXISTS saved_jobs_applicant_uid_idx
  ON gethired.saved_jobs (applicant_uid);
