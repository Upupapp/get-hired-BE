-- Over-plan-limit report: how many employers a NEW action would be refused for, today.
--
-- READ-ONLY. Every statement is a SELECT inside a READ ONLY transaction, so it is safe to
-- run against production before deciding whether to switch
-- SUBSCRIPTIONS_ENFORCEMENT_MODE to 'enforce'. It changes nothing.
--
--   psql -v ON_ERROR_STOP=1 -d <database> -f tools/sql/over-plan-limit-report.sql
--
-- Limits mirror services/planCatalogServiceV4.js (subscription_id 1..4). Any other
-- subscription_id resolves to Enterprise in the code, where every limit is custom (null).
--
-- Reading the columns:
--   *_at_limit  : usage >= limit. The NEXT add is refused (a publish, a seat, an application).
--   *_over      : usage >  limit. Already over. They keep everything; they cannot add more.
--   no_subscription_row : no companies_subscription row at all. Under 'enforce' EVERY gated
--                         action is refused for these employers (plan resolves to none).

BEGIN TRANSACTION READ ONLY;

WITH plan_limits (subscription_id, plan, active_jobs, seats, applicants, questions_per_job) AS (
  VALUES (1, 'free_trial', 1, 1, 25, 1),
         (2, 'starter', 5, 2, NULL, 3),
         (3, 'growth', 15, 5, NULL, 5),
         (4, 'business', 40, 15, NULL, 10)
),
latest_subscription AS (
  SELECT DISTINCT ON (cs.company_id) cs.company_id, cs.subscription_id
    FROM gethired.companies_subscription cs
   ORDER BY cs.company_id, cs.created_at DESC NULLS LAST
),
usage AS (
  SELECT c.company_id,
         ls.subscription_id,
         (SELECT COUNT(*) FROM gethired.jobs j
           WHERE j.company_id = c.company_id AND j.job_status_id = 2) AS active_jobs,
         (SELECT COUNT(*) FROM gethired.company_employees e
           WHERE e.company_id = c.company_id AND e.status IS DISTINCT FROM 'suspended') AS seats,
         (SELECT COUNT(*) FROM gethired.job_applicants ja
            JOIN gethired.jobs j ON j.job_id = ja.job_id
           WHERE j.company_id = c.company_id) AS applicants,
         (SELECT COALESCE(MAX(per_job.n), 0) FROM (
             SELECT t.job_id, COUNT(q.template_question_id) AS n
               FROM gethired.job_interview_template t
               JOIN gethired.jobs j ON j.job_id = t.job_id AND j.job_status_id = 2
               JOIN gethired.interview_template_question q
                 ON q.job_interview_template_id = t.job_interview_template_id
              WHERE j.company_id = c.company_id AND t.job_interview_template_name = 'default'
              GROUP BY t.job_id) per_job) AS max_live_questions_on_one_job
    FROM gethired.companies c
    LEFT JOIN latest_subscription ls ON ls.company_id = c.company_id
)
SELECT COUNT(*)                                                                            AS employers,
       COUNT(*) FILTER (WHERE u.subscription_id IS NULL)                                   AS no_subscription_row,
       COUNT(*) FILTER (WHERE pl.active_jobs IS NOT NULL AND u.active_jobs >= pl.active_jobs) AS active_jobs_at_limit,
       COUNT(*) FILTER (WHERE pl.active_jobs IS NOT NULL AND u.active_jobs >  pl.active_jobs) AS active_jobs_over,
       COUNT(*) FILTER (WHERE pl.seats IS NOT NULL AND u.seats >= pl.seats)                AS seats_at_limit,
       COUNT(*) FILTER (WHERE pl.seats IS NOT NULL AND u.seats >  pl.seats)                AS seats_over,
       COUNT(*) FILTER (WHERE pl.applicants IS NOT NULL AND u.applicants >= pl.applicants) AS applicants_at_limit,
       COUNT(*) FILTER (WHERE pl.applicants IS NOT NULL AND u.applicants >  pl.applicants) AS applicants_over,
       COUNT(*) FILTER (WHERE pl.questions_per_job IS NOT NULL
                          AND u.max_live_questions_on_one_job > pl.questions_per_job)     AS live_questions_over
  FROM usage u
  LEFT JOIN plan_limits pl ON pl.subscription_id = u.subscription_id;

-- Storage needs db/20260913_stored_media.sql. If that migration has not been applied,
-- this statement errors with "relation does not exist" and nothing else is affected.
WITH plan_storage (subscription_id, limit_bytes) AS (
  VALUES (1, 1::bigint * 1073741824), (2, 10::bigint * 1073741824),
         (3, 50::bigint * 1073741824), (4, 200::bigint * 1073741824)
),
latest_subscription AS (
  SELECT DISTINCT ON (cs.company_id) cs.company_id, cs.subscription_id
    FROM gethired.companies_subscription cs
   ORDER BY cs.company_id, cs.created_at DESC NULLS LAST
),
used AS (
  SELECT company_id, SUM(size_bytes) AS bytes
    FROM gethired.stored_media WHERE status = 'active' GROUP BY company_id
)
SELECT COUNT(*) FILTER (WHERE ps.limit_bytes IS NOT NULL AND COALESCE(u.bytes, 0) >= ps.limit_bytes) AS storage_at_limit,
       COUNT(*) FILTER (WHERE ps.limit_bytes IS NOT NULL AND COALESCE(u.bytes, 0) >  ps.limit_bytes) AS storage_over
  FROM gethired.companies c
  LEFT JOIN latest_subscription ls ON ls.company_id = c.company_id
  LEFT JOIN plan_storage ps ON ps.subscription_id = ls.subscription_id
  LEFT JOIN used u ON u.company_id = c.company_id;

COMMIT;
