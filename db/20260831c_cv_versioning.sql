-- CV Builder & Match Coach, Phase B: real CV versioning.
--
-- Today, uploading a replacement CV (cvBuilderController.js's uploadCv())
-- hard-deletes the previous is_cv=true row outright (a deliberate fix from
-- an earlier pass, to stop the old CV silently reappearing in the generic
-- "Profile Documents" list). That closed one bug but left no history at
-- all: there was never a way to see or restore a prior CV.
--
-- This adds a second flag, is_cv_version, orthogonal to is_cv:
--   is_cv         = TRUE on exactly the one CURRENTLY ACTIVE CV row
--                    (unchanged meaning -- every existing reader of this
--                    flag, e.g. job-application Resume auto-fill,
--                    Profile Documents' dedicated CV section, CV Builder
--                    Overview, keeps working with zero changes).
--   is_cv_version = TRUE on the active CV row AND every prior version kept
--                    for history. Replacing the CV now sets the old row's
--                    is_cv=false but leaves is_cv_version=true (instead of
--                    deleting it), so it's still excluded from the generic
--                    documents list (which excludes is_cv_version=true, not
--                    just is_cv=true -- see the paired code change) while
--                    remaining visible and restorable in a new
--                    Versions/History view.
--
-- Backfill: every row that is already is_cv=true today also becomes
-- is_cv_version=true, so existing applicants' current CV is correctly
-- recognized as "version 1" with zero behavior change.
--
-- SAFE TO RUN: ADD COLUMN IF NOT EXISTS + one deterministic, narrowly
-- scoped UPDATE (only touches rows already flagged is_cv=true). No column
-- dropped or altered, no destructive change.
--
-- ROLLBACK: ALTER TABLE gethired.documents DROP COLUMN IF EXISTS is_cv_version;

ALTER TABLE gethired.documents
  ADD COLUMN IF NOT EXISTS is_cv_version boolean NOT NULL DEFAULT false;

UPDATE gethired.documents
  SET is_cv_version = true
  WHERE is_cv = true AND is_cv_version = false;
