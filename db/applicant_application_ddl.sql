-- GetHired Applicant Data Foundation v2
-- Restores the applicant-profile and job-application tables that exist in
-- the project's own legacy DDL (db/complete_ddl.sql, schema "jobhunt") but
-- were never carried over when job/company/user tables were migrated to
-- the "gethired" schema (db/job_ddl.sql, db/company_ddl.sql, db/user_ddl.sql).
--
-- This is why services/application.service.js, services/applicant.service.js,
-- services/candidate.service.js, and job.service.js's jobApplicants() already
-- query job_applicants/applicants_profile/applicant_skills/etc. by these
-- exact column names -- the application code was written against this
-- design, it just never got migrated. Column names/types/defaults below are
-- preserved exactly from complete_ddl.sql, only the schema prefix changes
-- (jobhunt. -> gethired.) and CREATE TABLE IF NOT EXISTS / guarded FK adds
-- make this safe to re-run.
--
-- SAFE TO RUN: non-destructive (IF NOT EXISTS throughout), no DROP/ALTER of
-- any existing table, idempotent. Apply to local/dev only -- do not run
-- against production without separate review and approval.
--
-- ROLLBACK: DROP TABLE IF EXISTS gethired.<table_name> CASCADE; for each
-- table below, in reverse dependency order (job_applicants first, then
-- documents/applicant_resume/etc., then applicants_profile last). No
-- existing table is touched, so rollback cannot affect anything else.

CREATE TABLE IF NOT EXISTS gethired.applicants_profile (
	user_id varchar NOT NULL,
	photo_url varchar NULL,
	job_title varchar NOT NULL,
	short_bio varchar NULL,
	services_provided varchar NULL,
	job_type_id int4 NOT NULL,
	job_level_id int4 NOT NULL,
	work_setup_id int4 NOT NULL,
	salary_minimum numeric(20, 2) NULL,
	salary_maximum numeric(20, 2) NULL,
	applicant_profile_id varchar NOT NULL,
	video_cv_url varchar NULL,
	applicant_rating int4 NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	is_profile_ready bool NULL DEFAULT false,
	salary_currency varchar NULL,
	CONSTRAINT applicants_profile_pk PRIMARY KEY (applicant_profile_id)
);

CREATE TABLE IF NOT EXISTS gethired.applicant_certificates (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	cert_title varchar NOT NULL,
	no_expiry bool NULL DEFAULT false,
	start_month varchar NULL,
	start_year int4 NULL,
	end_month varchar NULL,
	end_year int4 NULL,
	details varchar NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	applicant_id varchar NOT NULL,
	CONSTRAINT applicant_certificates_pk PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS gethired.applicant_educational_background (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	applicant_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	educ_level_name varchar NOT NULL,
	field_of_study varchar NULL,
	school varchar NULL,
	school_address varchar NULL,
	start_month varchar NULL,
	start_year int4 NULL,
	end_month varchar NULL,
	end_year int4 NULL,
	CONSTRAINT applicant_educational_background_pk PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS gethired.applicant_skills (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	skills varchar NOT NULL,
	applicant_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT applicant_skills_pk PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS gethired.applicant_work_experience (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	job_title varchar NOT NULL,
	company_name varchar NOT NULL,
	"location" varchar NULL,
	job_type_id int4 NOT NULL,
	start_month varchar NOT NULL,
	start_year varchar NOT NULL,
	end_month varchar NULL,
	end_year varchar NULL,
	is_current_job bool NULL DEFAULT false,
	details varchar NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	applicant_id varchar NULL,
	CONSTRAINT applicant_workexperience_pk PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS gethired.documents (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	fileurl varchar NOT NULL,
	filename varchar NOT NULL,
	"size" int4 NULL,
	"type" varchar NULL,
	applicant_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT documents_pk PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS gethired.applicant_covered_letter (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	fileurl varchar NOT NULL,
	filename varchar NOT NULL,
	"size" int4 NULL,
	"type" varchar NULL,
	applicant_id varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT applicant_covered_letters_pk PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS gethired.applicant_resume (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	fileurl varchar NOT NULL,
	filename varchar NOT NULL,
	"size" int4 NULL,
	"type" varchar NULL,
	applicant_id varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT applicant_resume_pk PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS gethired.applicant_government_files (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	fileurl varchar NOT NULL,
	filename varchar NOT NULL,
	"size" int4 NULL,
	"type" varchar NULL,
	applicant_id varchar NOT NULL,
	job_id varchar NOT NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT applicant_government_files_pk PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS gethired.job_applicant_status (
	job_applicant_status_id int4 NOT NULL,
	job_applicant_status_name varchar NOT NULL,
	CONSTRAINT job_applicant_status_pk PRIMARY KEY (job_applicant_status_id)
);

-- Seed reasonable status rows -- IDs 2 and 3 are load-bearing: the existing
-- controllers/applicationController.js already hardcodes
-- applicationStatusId = interviewAnswers.length > 0 ? 3 : 2 on creation, so
-- those two rows must exist with these IDs for new applications to satisfy
-- job_applicants' FK to this table.
INSERT INTO gethired.job_applicant_status (job_applicant_status_id, job_applicant_status_name)
VALUES
	(1, 'Pending Review'),
	(2, 'Applied'),
	(3, 'Under Review'),
	(4, 'Shortlisted'),
	(5, 'Rejected'),
	(6, 'Hired')
ON CONFLICT (job_applicant_status_id) DO NOTHING;

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

CREATE TABLE IF NOT EXISTS gethired.interview_answers (
	interview_answer_id varchar NOT NULL DEFAULT uuid_generate_v4(),
	question_id varchar NOT NULL,
	answer_url varchar NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	job_id varchar NOT NULL,
	applicant_id varchar NOT NULL,
	CONSTRAINT interview_answers_pk PRIMARY KEY (interview_answer_id)
);

-- Foreign keys, guarded so this file is safely re-runnable.
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicants_fk') THEN
		ALTER TABLE gethired.applicants_profile ADD CONSTRAINT applicants_fk FOREIGN KEY (job_type_id) REFERENCES gethired.job_type(job_type_id);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicants_fk_1') THEN
		ALTER TABLE gethired.applicants_profile ADD CONSTRAINT applicants_fk_1 FOREIGN KEY (job_level_id) REFERENCES gethired.job_level(job_level_id);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicants_fk_2') THEN
		ALTER TABLE gethired.applicants_profile ADD CONSTRAINT applicants_fk_2 FOREIGN KEY (work_setup_id) REFERENCES gethired.work_setup(work_setup_id);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicants_profile_fk') THEN
		ALTER TABLE gethired.applicants_profile ADD CONSTRAINT applicants_profile_fk FOREIGN KEY (user_id) REFERENCES gethired.users(uid);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_certificates_fk') THEN
		ALTER TABLE gethired.applicant_certificates ADD CONSTRAINT applicant_certificates_fk FOREIGN KEY (applicant_id) REFERENCES gethired.applicants_profile(applicant_profile_id);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_educational_background_fk') THEN
		ALTER TABLE gethired.applicant_educational_background ADD CONSTRAINT applicant_educational_background_fk FOREIGN KEY (applicant_id) REFERENCES gethired.applicants_profile(applicant_profile_id);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_skills_fk') THEN
		ALTER TABLE gethired.applicant_skills ADD CONSTRAINT applicant_skills_fk FOREIGN KEY (applicant_id) REFERENCES gethired.applicants_profile(applicant_profile_id);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_work_experience_fk') THEN
		ALTER TABLE gethired.applicant_work_experience ADD CONSTRAINT applicant_work_experience_fk FOREIGN KEY (job_type_id) REFERENCES gethired.job_type(job_type_id);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_work_experience_fk_1') THEN
		ALTER TABLE gethired.applicant_work_experience ADD CONSTRAINT applicant_work_experience_fk_1 FOREIGN KEY (applicant_id) REFERENCES gethired.applicants_profile(applicant_profile_id);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_fk') THEN
		ALTER TABLE gethired.documents ADD CONSTRAINT documents_fk FOREIGN KEY (applicant_id) REFERENCES gethired.applicants_profile(applicant_profile_id);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_covered_letter_fk') THEN
		ALTER TABLE gethired.applicant_covered_letter ADD CONSTRAINT applicant_covered_letter_fk FOREIGN KEY (applicant_id) REFERENCES gethired.applicants_profile(applicant_profile_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_covered_letter_fk_1') THEN
		ALTER TABLE gethired.applicant_covered_letter ADD CONSTRAINT applicant_covered_letter_fk_1 FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_resume_fk') THEN
		ALTER TABLE gethired.applicant_resume ADD CONSTRAINT applicant_resume_fk FOREIGN KEY (applicant_id) REFERENCES gethired.applicants_profile(applicant_profile_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_resume_fk_1') THEN
		ALTER TABLE gethired.applicant_resume ADD CONSTRAINT applicant_resume_fk_1 FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_government_files_fk') THEN
		ALTER TABLE gethired.applicant_government_files ADD CONSTRAINT applicant_government_files_fk FOREIGN KEY (applicant_id) REFERENCES gethired.applicants_profile(applicant_profile_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_government_files_fk_1') THEN
		ALTER TABLE gethired.applicant_government_files ADD CONSTRAINT applicant_government_files_fk_1 FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_applicants_fk') THEN
		ALTER TABLE gethired.job_applicants ADD CONSTRAINT job_applicants_fk FOREIGN KEY (candidate_id) REFERENCES gethired.user_credentials(uid) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_applicants_fk_1') THEN
		ALTER TABLE gethired.job_applicants ADD CONSTRAINT job_applicants_fk_1 FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_applicants_fk_2') THEN
		ALTER TABLE gethired.job_applicants ADD CONSTRAINT job_applicants_fk_2 FOREIGN KEY (application_status_id) REFERENCES gethired.job_applicant_status(job_applicant_status_id);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interview_answers_fk') THEN
		ALTER TABLE gethired.interview_answers ADD CONSTRAINT interview_answers_fk FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interview_answers_fk_1') THEN
		ALTER TABLE gethired.interview_answers ADD CONSTRAINT interview_answers_fk_1 FOREIGN KEY (applicant_id) REFERENCES gethired.applicants_profile(applicant_profile_id);
	END IF;
END $$;

-- Indexes for the lookups the existing code already performs (job_id,
-- candidate_id, applicant_id) -- none of these existed before since the
-- tables themselves didn't exist.
CREATE INDEX IF NOT EXISTS job_applicants_job_id_idx ON gethired.job_applicants (job_id);
CREATE INDEX IF NOT EXISTS job_applicants_candidate_id_idx ON gethired.job_applicants (candidate_id);
CREATE INDEX IF NOT EXISTS applicants_profile_user_id_idx ON gethired.applicants_profile (user_id);
CREATE INDEX IF NOT EXISTS applicant_skills_applicant_id_idx ON gethired.applicant_skills (applicant_id);
CREATE INDEX IF NOT EXISTS applicant_work_experience_applicant_id_idx ON gethired.applicant_work_experience (applicant_id);
CREATE INDEX IF NOT EXISTS applicant_educational_background_applicant_id_idx ON gethired.applicant_educational_background (applicant_id);
CREATE INDEX IF NOT EXISTS applicant_certificates_applicant_id_idx ON gethired.applicant_certificates (applicant_id);
CREATE INDEX IF NOT EXISTS documents_applicant_id_idx ON gethired.documents (applicant_id);
