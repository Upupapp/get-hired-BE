-- Deletes every company except LGUIDS (COM-26-612469, 2 open jobs) and
-- Wayne Enterprises (COM-26-151234), plus everything scoped to those
-- other companies. Confirmed by the operator: every other company in
-- this environment is test data, including "LGUIDS #2" (COM-26-815459,
-- the renamed duplicate from the 2026-08-30 company-duplicate cleanup).
--
-- DO NOT RUN until 20260831_dry_run_delete_test_companies.sql's output has
-- been reviewed and explicitly approved.
--
-- Wrapped in a single transaction: if anything here fails, the whole
-- script rolls back rather than leaving a partially-deleted state.
--
-- Order matters:
--   1. jobs first -- gethired.jobs.company_id has NO foreign key to
--      companies (confirmed via information_schema against this
--      production database), so deleting companies alone would silently
--      ORPHAN their jobs rather than removing them. Deleting jobs first
--      cascades automatically (ON DELETE CASCADE, confirmed) to:
--      applicant_covered_letter, applicant_government_files,
--      applicant_resume, interview_answers, job_applicants,
--      job_assignments, job_badges, job_certification_requirement,
--      job_educationalbackground, job_goodtohave, job_interview_template,
--      job_requirement, job_skills, job_tags, message_threads,
--      team_invitation_jobs.
--   2. Explicit deletes for company_id-scoped tables confirmed to have NO
--      FK/cascade back to companies (would otherwise be left as orphaned
--      rows referencing a company_id that no longer exists).
--   3. companies last -- cascades (ON DELETE CASCADE, confirmed) to:
--      company_employees, company_followers, job_assignments,
--      message_threads, team_invitations, team_roles.
--      (job_interview_template's OWN company_id FK is ON DELETE SET NULL,
--      not CASCADE -- moot here since step 1 already deleted those rows
--      via their job_id FK.)
--
-- Known, accepted residual: gethired.group_list (contact group
-- membership, keyed by email/group_id, not company_id) may retain a few
-- orphaned rows for deleted "group" rows -- harmless, no FK/security
-- implication, same class of accepted gap as job_interview_template's
-- own SET NULL design.

BEGIN;

\set keep_ids '(''COM-26-612469'',''COM-26-151234'')'

DELETE FROM gethired.jobs WHERE company_id NOT IN :keep_ids;

DELETE FROM gethired.contact WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.candidates WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired."group" WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.cart_table WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.invoice_delivery_attempts WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.invoice_events WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.invoices WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.companies_subscription WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.subscription_lifecycle_events WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.subscription_notification_log WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.subscription_notifications WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.billing_profiles WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.access_audit_logs WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.application_notification_events WHERE company_id NOT IN :keep_ids;
DELETE FROM gethired.image_variants WHERE company_id NOT IN :keep_ids;

DELETE FROM gethired.companies WHERE company_id NOT IN :keep_ids;

-- Featured section: only LGUIDS and Wayne Enterprises should show. After
-- the deletes above, these two are the only companies left in the table,
-- but set this explicitly (not "set every OTHER company to false", which
-- would now be a no-op) rather than relying on that as a side effect.
UPDATE gethired.companies SET is_featured = true WHERE company_id IN :keep_ids;

-- Review the output below carefully. If everything looks right, run
-- COMMIT; -- otherwise ROLLBACK; to undo everything above with zero effect.
