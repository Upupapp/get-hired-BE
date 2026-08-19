-- Employer job creation 500s for any realistic salary figure (e.g.
-- PHP 50,000-80,000/month, a completely ordinary professional salary) --
-- confirmed live-testing job creation (2026-08-19): the same request
-- succeeds at salary 5,000-8,000 and fails at 50,000-80,000, isolating a
-- Postgres numeric field overflow.
--
-- gethired.jobs.salary_minimum/salary_maximum are numeric(6,2) -- max
-- representable value 9,999.99. Every other salary column in this schema
-- (gethired.applicants_profile, per db/applicant_application_ddl.sql, and
-- both salary columns in the legacy jobhunt schema this was migrated from,
-- per db/complete_ddl.sql) uses numeric(20,2). This is an isolated
-- copy/paste narrowing introduced only in db/job_ddl.sql, not an
-- intentional design choice -- widening to match every other salary
-- column in the codebase, not inventing a new precision.
--
-- Widening a numeric column's precision is safe and non-destructive --
-- existing values are preserved exactly, this only removes the overflow
-- ceiling.

ALTER TABLE gethired.jobs
	ALTER COLUMN salary_minimum TYPE numeric(20, 2),
	ALTER COLUMN salary_maximum TYPE numeric(20, 2);
