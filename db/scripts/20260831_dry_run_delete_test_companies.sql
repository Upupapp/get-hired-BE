-- DRY RUN ONLY -- read-only counts, no writes. Run this first and review
-- before ever running 20260831_delete_test_companies.sql.
--
-- Keep-list: COM-26-612469 (LGUIDS, 2 open jobs) and COM-26-151234
-- (Wayne Enterprises). Every other company is a test company per the
-- operator's confirmation and will be fully removed by the companion
-- delete script, along with everything scoped to those companies.

\set keep_ids '(''COM-26-612469'',''COM-26-151234'')'

SELECT company_id, company_name, is_featured, created_at
FROM gethired.companies
WHERE company_id NOT IN :keep_ids
ORDER BY created_at;

SELECT 'jobs' AS table_name, count(*) FROM gethired.jobs WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'contact', count(*) FROM gethired.contact WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'candidates', count(*) FROM gethired.candidates WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'group', count(*) FROM gethired."group" WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'cart_table', count(*) FROM gethired.cart_table WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'invoice_delivery_attempts', count(*) FROM gethired.invoice_delivery_attempts WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'invoice_events', count(*) FROM gethired.invoice_events WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'invoices', count(*) FROM gethired.invoices WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'companies_subscription', count(*) FROM gethired.companies_subscription WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'subscription_lifecycle_events', count(*) FROM gethired.subscription_lifecycle_events WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'subscription_notification_log', count(*) FROM gethired.subscription_notification_log WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'subscription_notifications', count(*) FROM gethired.subscription_notifications WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'billing_profiles', count(*) FROM gethired.billing_profiles WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'access_audit_logs', count(*) FROM gethired.access_audit_logs WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'application_notification_events', count(*) FROM gethired.application_notification_events WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'image_variants', count(*) FROM gethired.image_variants WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'company_employees (FK cascade)', count(*) FROM gethired.company_employees WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'company_followers (FK cascade)', count(*) FROM gethired.company_followers WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'job_assignments (FK cascade)', count(*) FROM gethired.job_assignments WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'message_threads (FK cascade)', count(*) FROM gethired.message_threads WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'team_invitations (FK cascade)', count(*) FROM gethired.team_invitations WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'team_roles (FK cascade)', count(*) FROM gethired.team_roles WHERE company_id NOT IN :keep_ids
UNION ALL
SELECT 'companies (final)', count(*) FROM gethired.companies WHERE company_id NOT IN :keep_ids;

-- Job-scoped children of the jobs that will be deleted (all CASCADE via
-- job_id, shown here only so the operator sees the real scale before
-- committing -- these rows are not deleted directly, they cascade).
SELECT 'job_applicants (cascade via jobs)' AS table_name, count(*)
FROM gethired.job_applicants WHERE job_id IN (SELECT job_id FROM gethired.jobs WHERE company_id NOT IN :keep_ids)
UNION ALL
SELECT 'interview_answers (cascade via jobs)', count(*)
FROM gethired.interview_answers WHERE job_id IN (SELECT job_id FROM gethired.jobs WHERE company_id NOT IN :keep_ids)
UNION ALL
SELECT 'applicant_resume (cascade via jobs)', count(*)
FROM gethired.applicant_resume WHERE job_id IN (SELECT job_id FROM gethired.jobs WHERE company_id NOT IN :keep_ids)
UNION ALL
SELECT 'job_interview_template (cascade via jobs)', count(*)
FROM gethired.job_interview_template WHERE job_id IN (SELECT job_id FROM gethired.jobs WHERE company_id NOT IN :keep_ids);
