-- Read-only diagnostic: finds "replaced" CV rows left behind by the
-- uploadCv() bug fixed alongside this script (it used to flip is_cv to
-- false instead of deleting the row outright -- see cvBuilderController.js).
-- A row here is an old CV that should have been deleted the moment it was
-- replaced, but instead silently reappeared in every generic "your
-- documents" list as if it were just an ordinary uploaded file.
--
-- Run this first. If it returns rows, review them, then run the DELETE
-- below (commented out) to actually remove them -- do not uncomment and
-- run it without reviewing the SELECT output first.

SELECT id, applicant_id, filename, fileurl, "size", created_at
FROM gethired.documents
WHERE is_cv = false
ORDER BY applicant_id, created_at;

-- Once reviewed and approved, run this (uncommented) to delete them:
--
-- DELETE FROM gethired.documents WHERE is_cv = false RETURNING id, applicant_id, fileurl;
--
-- Note: this only removes the DB rows. Each row's Storage blob (fileurl)
-- is NOT deleted by this script -- there is no bulk Storage-delete tooling
-- in this codebase yet (the code fix's per-request cleanup uses the
-- Firebase Admin SDK directly, not raw SQL). Orphaned Storage blobs from
-- before this fix are a low-priority, non-urgent cleanup miss (storage
-- cost only, no functional or security impact) -- not handled by this
-- script. If that matters here, say so and it can be scripted separately.
