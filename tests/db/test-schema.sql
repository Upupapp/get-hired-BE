-- Test schema for the DB-backed jest suites. NEVER run against a production database.
--
-- Builds the tables the committed integration suites write to, in a scratch PostgreSQL
-- database. Afterwards apply the migrations under test, e.g.
--   psql -v ON_ERROR_STOP=1 -d <scratch db> -f tests/db/test-schema.sql
--   psql -v ON_ERROR_STOP=1 -d <scratch db> -f db/20260913_stored_media.sql
--
-- Why a separate file: the repo's own base DDL does not build on a clean database.
-- db/job_ddl.sql references gethired.job_level, which no file creates, and
-- db/company_ddl.sql needs gethired.industry before any file has created it.
--
-- Columns, types and NOT NULL constraints are copied from the repo DDL, so a fixture
-- that omits a required column fails here exactly as it would in production:
--   companies       db/company_ddl.sql (CREATE TABLE + the created_date/created_by ALTERs)
--   jobs            db/job_ddl.sql
--   job_applicants  db/applicant_application_ddl.sql
-- Omitted on purpose: foreign keys to lookup tables the suites never touch
-- (industry, work_setup, users, job_role, job_type, job_level).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS gethired;

CREATE TABLE IF NOT EXISTS gethired.companies (
	company_id varchar NOT NULL,
	company_logo varchar NOT NULL,
	company_name varchar NOT NULL,
	company_details varchar NULL,
	industry_id int4 NULL,
	work_setup_id int4 NULL,
	number_of_employee int4 NULL,
	company_email varchar NULL,
	company_city varchar NULL,
	company_contact_number varchar NULL,
	company_country varchar NULL,
	company_adress varchar NULL,
	created_date timestamp NOT NULL,
	created_by varchar NOT NULL,
	CONSTRAINT companies_pk PRIMARY KEY (company_id)
);

CREATE TABLE IF NOT EXISTS gethired.jobs (
	job_id varchar NOT NULL,
	job_banner varchar NULL,
	job_title varchar NOT NULL,
	company_id varchar NULL,
	industry_id int4 NULL,
	job_role_id int4 NULL,
	job_type_id int4 NULL,
	job_level_id int4 NULL,
	job_description varchar NULL,
	job_duties varchar NULL,
	work_setup_id int4 NULL,
	salary_minimum numeric(20, 2) NULL,
	salary_maximum numeric(20, 2) NULL,
	rate varchar NULL,
	job_address varchar NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL,
	expiration_date date NULL,
	job_status_id int4 NULL,
	CONSTRAINT jobs_pk PRIMARY KEY (job_id)
);

CREATE TABLE IF NOT EXISTS gethired.job_applicants (
	job_application_id varchar NOT NULL,
	job_id varchar NOT NULL,
	date_applied timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	candidate_id varchar NOT NULL,
	application_status_id int4 NULL,
	is_archived bool NULL DEFAULT false,
	CONSTRAINT job_applicants_pk PRIMARY KEY (job_application_id)
);

-- company_employees: db/company_ddl.sql, plus team_role_id and access_scope from
-- db/20260813_team_access_rbac.sql and status from
-- db/20260813d_team_access_rbac_v3_reconciliation.sql.
CREATE TABLE IF NOT EXISTS gethired.company_employees (
	employee_id varchar NOT NULL,
	company_id varchar NOT NULL,
	employee_uuid varchar NOT NULL,
	assigned_at timestamp NOT NULL,
	updated_at timestamp NOT NULL DEFAULT now(),
	position_id int4 NULL,
	assigned_by varchar NOT NULL,
	team_role_id uuid NULL,
	access_scope varchar(20) NOT NULL DEFAULT 'all_jobs' CHECK (access_scope IN ('all_jobs', 'assigned_jobs', 'no_job_access')),
	status varchar(20) NOT NULL DEFAULT 'active',
	CONSTRAINT company_employees_pk PRIMARY KEY (employee_id),
	CONSTRAINT company_employees_status_check CHECK (status IN ('active', 'suspended')),
	CONSTRAINT company_employees_fk_2 FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- job_interview_template and interview_template_question: db/job_ddl.sql, plus
-- updated_at from db/20260827_interview_template_question_updated_at.sql and the
-- one-'default'-template-per-job index from db/20260830_job_interview_template_unique_per_job.sql.
CREATE TABLE IF NOT EXISTS gethired.job_interview_template (
	job_interview_template_id varchar NOT NULL,
	job_interview_template_name varchar NOT NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL DEFAULT now(),
	job_id varchar NULL,
	company_id varchar NULL,
	created_by varchar NULL,
	CONSTRAINT job_interview_template_pk PRIMARY KEY (job_interview_template_id),
	CONSTRAINT job_interview_template_fk FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT job_interview_template_fk_company FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS job_interview_template_one_default_per_job
	ON gethired.job_interview_template (job_id)
	WHERE job_interview_template_name = 'default' AND job_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS gethired.interview_template_question (
	template_question_id varchar NOT NULL,
	template_question varchar NOT NULL,
	template_answer_duration int4 NULL DEFAULT 3,
	template_question_retakes int4 NULL DEFAULT 1,
	job_interview_template_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	sequence int4 NULL,
	updated_at timestamp NULL DEFAULT now(),
	CONSTRAINT interview_template_question_pk PRIMARY KEY (template_question_id),
	CONSTRAINT interview_template_question_fk FOREIGN KEY (job_interview_template_id) REFERENCES gethired.job_interview_template(job_interview_template_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- subscription and companies_subscription: NO repo file creates these tables; only ALTERs
-- exist (db/subscription_*_v4_migration.sql, db/20260913b_plan_versions.sql). Columns are
-- the ones the code reads and writes: resolveCompanyPlan() in
-- services/subscriptionEntitlementServiceV4.js and createCompanySubscription() in
-- controllers/subscriptionController.js. Their nullability is documented nowhere; only
-- the columns those writers always supply are NOT NULL here.
CREATE TABLE IF NOT EXISTS gethired."subscription" (
	subscription_id int4 NOT NULL,
	subscription_name varchar NULL,
	job_post int4 NULL,
	admin int4 NULL,
	video_response int4 NULL,
	with_customer_care bool NULL,
	price numeric NULL,
	price_currency varchar NULL,
	payment_occurence varchar NULL,
	CONSTRAINT subscription_pk PRIMARY KEY (subscription_id)
);

CREATE TABLE IF NOT EXISTS gethired.companies_subscription (
	company_id varchar NOT NULL,
	subscription_id int4 NOT NULL,
	created_at timestamp NULL,
	is_paid bool NULL,
	payment_date timestamp NULL
);
