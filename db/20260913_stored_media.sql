-- Recruitment Storage: the billable media link table.
--
-- WHY THIS TABLE EXISTS
-- Storage is metered per EMPLOYER WORKSPACE (owner ruling, 2026-09-13): a 100 MB
-- CV sent to ten employers bills 100 MB to each -- 1 GB metered against 100 MB
-- physically stored. Nothing in the existing schema can express that.
-- gethired.documents is keyed by applicant_id and carries no company_id, so no
-- byte in this system is currently attributable to an employer at all.
--
-- The billable unit is therefore NOT the file. It is the file's PRESENCE IN ONE
-- EMPLOYER'S WORKSPACE. One physical object produces N rows here, one per
-- employer that received it. That is what makes per-employer metering possible
-- on a schema where the file itself has no employer.
--
-- THE RULE THAT MUST NOT BE "FIXED" LATER
-- Metered bytes deliberately exceed stored bytes. Employer storage totals are
-- computed by summing size_bytes over ACTIVE rows in this table, and must NEVER
-- be reconciled against actual object-store usage -- the bucket holds one copy
-- and this table bills ten. An engineer who "corrects the drift" against real
-- cloud usage silently under-bills every employer. See services/storedMediaService.js.
--
-- DELETION IS TWO OPERATIONS
-- Unlinking (status='deleted') frees that one employer's meter. The physical
-- object may only be removed once NO active row anywhere references its
-- object_key -- other employers still hold it. object_key is indexed for exactly
-- that reference count.
--
-- Safe to run repeatedly and safe on a live system: IF NOT EXISTS throughout,
-- purely additive, no existing table or column is modified.
--
-- ROLLBACK (destructive -- drops all storage accounting):
--   DROP TABLE IF EXISTS gethired.stored_media;

CREATE TABLE IF NOT EXISTS gethired.stored_media (
  id                varchar      NOT NULL DEFAULT uuid_generate_v4(),

  -- The billing dimension. NOT NULL: a row that cannot be attributed to an
  -- employer cannot be billed, and silently unattributed storage is the exact
  -- defect this table exists to remove.
  company_id        varchar      NOT NULL,

  -- Context. Nullable because media can outlive the job or application it
  -- arrived through, and the employer is still storing it either way.
  applicant_id      varchar      NULL,
  application_id    varchar      NULL,
  job_id            varchar      NULL,
  user_id           varchar      NULL,

  -- What kind of media this is. CHECKed rather than free text: the storage
  -- breakdown endpoint groups on this column, and an unrecognised value would
  -- silently vanish from the employer's totals rather than fail loudly.
  media_type        varchar      NOT NULL,

  -- Physical object identity. These repeat across every row that shares the
  -- same underlying file; that repetition IS the per-employer billing model,
  -- not a normalisation error.
  storage_provider  varchar      NOT NULL DEFAULT 'firebase',
  bucket            varchar      NULL,
  object_key        varchar      NOT NULL,
  checksum          varchar      NULL,
  original_filename varchar      NULL,
  mime_type         varchar      NULL,

  -- bigint, not the int4 used by gethired.documents."size": int4 caps a single
  -- file at ~2.1 GB, and a storage-accounting column should never be the thing
  -- that overflows first.
  size_bytes        bigint       NOT NULL,

  status            varchar      NOT NULL DEFAULT 'active',
  created_at        timestamp    NOT NULL DEFAULT now(),
  deleted_at        timestamp    NULL,

  CONSTRAINT stored_media_pk PRIMARY KEY (id),

  CONSTRAINT stored_media_media_type_check CHECK (media_type IN (
    'candidate_video',
    'candidate_cv',
    'candidate_document',
    'candidate_portfolio',
    'other_application_media'
  )),

  CONSTRAINT stored_media_status_check CHECK (status IN ('active', 'deleted')),

  -- Negative or absent sizes would corrupt every total downstream.
  CONSTRAINT stored_media_size_check CHECK (size_bytes >= 0),

  CONSTRAINT stored_media_company_fk FOREIGN KEY (company_id)
    REFERENCES gethired.companies(company_id) ON DELETE CASCADE ON UPDATE CASCADE,

  -- SET NULL, not CASCADE: deleting a job must not erase the record that the
  -- employer is still storing its applicants' media. The bytes survive the job,
  -- so the billing row must too.
  CONSTRAINT stored_media_job_fk FOREIGN KEY (job_id)
    REFERENCES gethired.jobs(job_id) ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT stored_media_application_fk FOREIGN KEY (application_id)
    REFERENCES gethired.job_applicants(job_application_id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- One employer is billed ONCE for a given physical object, however many of their
-- jobs or applications it reaches. Partial index so superseded ('deleted') rows
-- never block re-linking the same file later.
-- NOTE: this implements the recommended answer to the open "same file, same
-- employer, two jobs" question. If the ruling goes the other way, drop this
-- index -- nothing else depends on it.
CREATE UNIQUE INDEX IF NOT EXISTS stored_media_company_object_active_uidx
  ON gethired.stored_media (company_id, object_key)
  WHERE status = 'active';

-- The hot path: SUM(size_bytes) for one employer's active media.
CREATE INDEX IF NOT EXISTS stored_media_company_status_idx
  ON gethired.stored_media (company_id, status);

-- Storage breakdown by type (videoBytes / cvBytes / documentBytes / otherBytes).
CREATE INDEX IF NOT EXISTS stored_media_company_type_status_idx
  ON gethired.stored_media (company_id, media_type, status);

-- GET /storage/jobs and GET /storage/applications.
CREATE INDEX IF NOT EXISTS stored_media_job_idx
  ON gethired.stored_media (job_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS stored_media_application_idx
  ON gethired.stored_media (application_id) WHERE status = 'active';

-- Physical-deletion reference count: "does any other employer still hold this
-- object?" Without this index that question is a sequential scan of the whole
-- table on every delete.
CREATE INDEX IF NOT EXISTS stored_media_object_key_active_idx
  ON gethired.stored_media (object_key) WHERE status = 'active';
