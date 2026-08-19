-- Job creation with interview questions attached 500s outright -- confirmed
-- live: POST /job/create succeeds with badges/requirements/skills/tags/
-- goodToHave/educationalBackground/certificationRequirements, but fails the
-- instant `interviewQuestions` is included. Root cause: createInterviewTemplateQuestions()
-- (services/interview.service.js) INSERTs into job_interview_template
-- specifying (job_interview_template_id, job_interview_template_name,
-- created_at, job_id, company_id, created_by) -- but company_id and
-- created_by have never existed on this table (confirmed: db/job_ddl.sql's
-- canonical DDL only has job_interview_template_id/_name/created_at/
-- updated_at/job_id). Same for createQuestion(): INSERTs
-- interview_template_question specifying a `sequence` column and relying on
-- `created_at` -- neither exists on that table either.
--
-- This is the same root gap the earlier Employer audit already flagged on
-- the READ side (interviewController.js's getAllInterviewsTemplatesOfCompanies
-- querying `jit.company_id`, confirmed broken via live harness with error
-- 42703 "column jit.company_id does not exist") -- confirming company_id is
-- a genuinely intended, actively-referenced column across multiple call
-- sites, not a one-off typo to work around by removing it from the query.
-- Both the response mapper (mappedQuestionTemplate) and other controllers
-- already expect to read it back.
--
-- Additive, idempotent, safe on a live system.

ALTER TABLE gethired.job_interview_template
	ADD COLUMN IF NOT EXISTS company_id varchar NULL,
	ADD COLUMN IF NOT EXISTS created_by varchar NULL;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_interview_template_fk_company') THEN
		ALTER TABLE gethired.job_interview_template
			ADD CONSTRAINT job_interview_template_fk_company
			FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS job_interview_template_company_id_idx
	ON gethired.job_interview_template (company_id);

ALTER TABLE gethired.interview_template_question
	ADD COLUMN IF NOT EXISTS created_at timestamp NULL DEFAULT now(),
	ADD COLUMN IF NOT EXISTS sequence int4 NULL;
