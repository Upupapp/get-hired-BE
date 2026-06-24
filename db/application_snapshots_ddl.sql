-- GETHIRED_APPLICATION_SNAPSHOTS_COMPLETENESS_MATCH_SNAPSHOT_WORLD_CLASS_V2
-- Additive migration: application_snapshots, application_completeness_snapshots, match_snapshots
--
-- SAFE TO RUN: non-destructive (CREATE TABLE IF NOT EXISTS throughout).
-- No DROP, no ALTER of any existing table, no column removal, idempotent.
-- Apply to local/dev only -- do not run against production without review.
--
-- ROLLBACK (reverse dependency order):
--   DROP TABLE IF EXISTS gethired.match_snapshots;
--   DROP TABLE IF EXISTS gethired.application_completeness_snapshots;
--   DROP TABLE IF EXISTS gethired.application_snapshots;

-- ─── application_snapshots ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.application_snapshots (
  id                            varchar NOT NULL DEFAULT uuid_generate_v4(),
  application_id                varchar NOT NULL,
  applicant_id                  varchar NOT NULL,
  job_id                        varchar NOT NULL,
  company_id                    varchar NOT NULL,
  snapshot_version              varchar NOT NULL DEFAULT 'application_snapshot_v1',
  source                        varchar NOT NULL DEFAULT 'application_submit',
  provenance_json               jsonb NULL,
  snapshot_hash                 varchar NULL,
  applicant_profile_snapshot    jsonb NOT NULL,
  job_snapshot                  jsonb NOT NULL,
  submitted_documents_snapshot  jsonb NOT NULL,
  submitted_answers_snapshot    jsonb NOT NULL,
  submitted_video_answers_snapshot jsonb NULL,
  excluded_fields               jsonb NULL,
  created_at                    timestamp NOT NULL DEFAULT now(),
  updated_at                    timestamp NOT NULL DEFAULT now(),
  CONSTRAINT application_snapshots_pk PRIMARY KEY (id)
);

-- Unique: one original snapshot per application (idempotency anchor)
CREATE UNIQUE INDEX IF NOT EXISTS application_snapshots_application_id_source_unique
  ON gethired.application_snapshots (application_id)
  WHERE source = 'application_submit';

CREATE INDEX IF NOT EXISTS application_snapshots_applicant_id_idx
  ON gethired.application_snapshots (applicant_id);

CREATE INDEX IF NOT EXISTS application_snapshots_job_id_idx
  ON gethired.application_snapshots (job_id);

CREATE INDEX IF NOT EXISTS application_snapshots_company_id_idx
  ON gethired.application_snapshots (company_id);

CREATE INDEX IF NOT EXISTS application_snapshots_source_idx
  ON gethired.application_snapshots (source);

CREATE INDEX IF NOT EXISTS application_snapshots_created_at_idx
  ON gethired.application_snapshots (created_at);

-- ─── application_completeness_snapshots ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.application_completeness_snapshots (
  id                        varchar NOT NULL DEFAULT uuid_generate_v4(),
  application_id            varchar NOT NULL,
  applicant_id              varchar NOT NULL,
  job_id                    varchar NOT NULL,
  company_id                varchar NOT NULL,
  completeness_score        integer NOT NULL DEFAULT 0,
  completeness_level        varchar NOT NULL DEFAULT 'incomplete',
  required_completed_count  integer NOT NULL DEFAULT 0,
  required_total_count      integer NOT NULL DEFAULT 0,
  recommended_completed_count integer NOT NULL DEFAULT 0,
  recommended_total_count   integer NOT NULL DEFAULT 0,
  missing_required          jsonb NOT NULL DEFAULT '[]',
  missing_recommended       jsonb NOT NULL DEFAULT '[]',
  completed_sections        jsonb NOT NULL DEFAULT '[]',
  evidence                  jsonb NULL,
  scoring_rubric_version    varchar NOT NULL DEFAULT 'application_completeness_v1',
  source                    varchar NOT NULL DEFAULT 'application_submit',
  calculated_at             timestamp NOT NULL DEFAULT now(),
  created_at                timestamp NOT NULL DEFAULT now(),
  updated_at                timestamp NOT NULL DEFAULT now(),
  CONSTRAINT application_completeness_snapshots_pk PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS acs_application_id_source_unique
  ON gethired.application_completeness_snapshots (application_id)
  WHERE source = 'application_submit';

CREATE INDEX IF NOT EXISTS acs_company_id_idx
  ON gethired.application_completeness_snapshots (company_id);

CREATE INDEX IF NOT EXISTS acs_job_id_idx
  ON gethired.application_completeness_snapshots (job_id);

CREATE INDEX IF NOT EXISTS acs_applicant_id_idx
  ON gethired.application_completeness_snapshots (applicant_id);

CREATE INDEX IF NOT EXISTS acs_completeness_score_idx
  ON gethired.application_completeness_snapshots (completeness_score);

CREATE INDEX IF NOT EXISTS acs_completeness_level_idx
  ON gethired.application_completeness_snapshots (completeness_level);

CREATE INDEX IF NOT EXISTS acs_source_idx
  ON gethired.application_completeness_snapshots (source);

CREATE INDEX IF NOT EXISTS acs_calculated_at_idx
  ON gethired.application_completeness_snapshots (calculated_at);

-- ─── match_snapshots ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.match_snapshots (
  id                        varchar NOT NULL DEFAULT uuid_generate_v4(),
  application_id            varchar NOT NULL,
  applicant_id              varchar NOT NULL,
  job_id                    varchar NOT NULL,
  company_id                varchar NOT NULL,
  match_score               integer NULL,
  match_level               varchar NULL,
  matched_evidence          jsonb NOT NULL DEFAULT '[]',
  missing_evidence          jsonb NOT NULL DEFAULT '[]',
  neutral_evidence          jsonb NOT NULL DEFAULT '[]',
  factor_scores             jsonb NOT NULL DEFAULT '{}',
  excluded_factors          jsonb NULL,
  match_algorithm_version   varchar NOT NULL DEFAULT 'employer_signals_v5',
  source                    varchar NOT NULL DEFAULT 'application_submit',
  calculated_at             timestamp NOT NULL DEFAULT now(),
  created_at                timestamp NOT NULL DEFAULT now(),
  updated_at                timestamp NOT NULL DEFAULT now(),
  CONSTRAINT match_snapshots_pk PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS match_snapshots_application_id_source_unique
  ON gethired.match_snapshots (application_id)
  WHERE source = 'application_submit';

CREATE INDEX IF NOT EXISTS match_snapshots_company_id_idx
  ON gethired.match_snapshots (company_id);

CREATE INDEX IF NOT EXISTS match_snapshots_job_id_idx
  ON gethired.match_snapshots (job_id);

CREATE INDEX IF NOT EXISTS match_snapshots_applicant_id_idx
  ON gethired.match_snapshots (applicant_id);

CREATE INDEX IF NOT EXISTS match_snapshots_match_score_idx
  ON gethired.match_snapshots (match_score);

CREATE INDEX IF NOT EXISTS match_snapshots_match_level_idx
  ON gethired.match_snapshots (match_level);

CREATE INDEX IF NOT EXISTS match_snapshots_source_idx
  ON gethired.match_snapshots (source);

CREATE INDEX IF NOT EXISTS match_snapshots_calculated_at_idx
  ON gethired.match_snapshots (calculated_at);
