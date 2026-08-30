-- BUG #4 FIX (2026-08-30): schema-level safety net for the "12 duplicated
-- interview questions on edit" production bug.
--
-- Root cause (fixed in application code in this same change --
-- services/job.service.js's interviewQuestionsUpdate(), controllers/
-- jobsController.js's create/updatejobs handlers, and get-hired-FE's
-- JobCreateComponent.performAutosave()/persistAssistantDraft()):
-- interviewQuestionsUpdate() used to blindly INSERT a brand new
-- gethired.job_interview_template row ("default") every time it was called
-- with no interviewTemplateId, with no check for whether the job already
-- had one. The frontend's background autosave and AI-Create draft-save
-- paths both bypass the normal store flow and never learned the real,
-- backend-assigned questionId/templateId after their first save -- so a
-- newly-added interview question kept looking "new" on every later
-- autosave tick, and each tick created ANOTHER "default" template for the
-- same job and inserted the question into it again.
-- services/job.service.js's getJobInterviewQuestions() reads by
-- job_id + job_interview_template_name with no scoping to a single
-- template row, so once 2+ "default" templates existed for one job, every
-- question across all of them was silently summed on read -- doubling (or
-- worse) the question count shown to the employer.
--
-- The application-code fix (find-or-create instead of blind-create) closes
-- the hole going forward. This migration adds the matching DB-level
-- guarantee: at most one "default"-named interview template per job. It is
-- intentionally conditional -- if any job on this environment ALREADY has
-- duplicate "default" templates (a real possibility, since this is exactly
-- the bug being fixed), creating a hard unique index would fail outright.
-- Rather than either silently skipping or attempting to auto-merge/delete
-- production data unattended, this migration:
--   1. Reports (via RAISE NOTICE, visible in the migration run's output)
--      exactly which job_ids currently have duplicate "default" templates,
--      so they can be reviewed and consolidated by hand.
--   2. Creates the unique index only if no duplicates exist yet -- so a
--      clean environment (or one already manually cleaned up) is protected
--      immediately, and a dirty one is not silently left unprotected: the
--      NOTICE makes that visibly unambiguous in the migration output rather
--      than failing the whole script.
--
-- Idempotent / safe to re-run: IF NOT EXISTS guards the index creation;
-- the duplicate-detection query is read-only.

DO $$
DECLARE
  dup_count integer;
  dup_job record;
BEGIN
  SELECT count(*) INTO dup_count
  FROM (
    SELECT job_id
    FROM gethired.job_interview_template
    WHERE job_interview_template_name = 'default' AND job_id IS NOT NULL
    GROUP BY job_id
    HAVING count(*) > 1
  ) dupes;

  IF dup_count > 0 THEN
    RAISE NOTICE 'job_interview_template_unique_per_job: % job(s) currently have duplicate "default" templates -- unique index NOT created. Review and consolidate these job_ids manually, then re-run this migration:', dup_count;
    FOR dup_job IN
      SELECT job_id, count(*) AS template_count
      FROM gethired.job_interview_template
      WHERE job_interview_template_name = 'default' AND job_id IS NOT NULL
      GROUP BY job_id
      HAVING count(*) > 1
    LOOP
      RAISE NOTICE '  job_id=% has % duplicate "default" templates', dup_job.job_id, dup_job.template_count;
    END LOOP;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS job_interview_template_one_default_per_job
      ON gethired.job_interview_template (job_id)
      WHERE job_interview_template_name = 'default' AND job_id IS NOT NULL;
    RAISE NOTICE 'job_interview_template_unique_per_job: no existing duplicates found -- unique index created.';
  END IF;
END $$;
