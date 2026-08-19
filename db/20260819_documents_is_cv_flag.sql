-- CV Builder & Match Coach foundation (Increment 2).
--
-- gethired.documents currently has no way to distinguish "the candidate's
-- current CV" from any other uploaded document (cover letter, certificate,
-- etc.) -- it's a flat, undifferentiated multi-file bucket. The CV Builder
-- workspace needs a single authoritative answer to "what is this
-- candidate's current CV?" without introducing a full versioning schema
-- (that's explicitly a later command's scope -- Versions/History).
--
-- Minimal, additive mechanism: one boolean flag. At most one row per
-- applicant should be true at a time -- enforced at the application layer
-- (cvBuilderController.uploadCv clears any previous flag before setting
-- the new one), not by a DB constraint, since a transient two-true window
-- during the clear+insert sequence is an acceptable non-issue for a
-- single-user-writes-their-own-rows table and a partial unique index would
-- add complexity disproportionate to the actual risk here.
--
-- Safe to run repeatedly and safe on a live system: IF NOT EXISTS guard,
-- additive only, defaults false for every existing row (no existing
-- document silently becomes "the CV").

ALTER TABLE gethired.documents
  ADD COLUMN IF NOT EXISTS is_cv boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS documents_applicant_is_cv_idx
  ON gethired.documents (applicant_id, is_cv);
