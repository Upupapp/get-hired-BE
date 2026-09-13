-- Test schema for the DB-backed jest suites. NEVER run against a production database.
--
-- Builds the base tables the committed integration suites write to, in a scratch
-- PostgreSQL database. Afterwards apply the migrations under test, e.g.
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
