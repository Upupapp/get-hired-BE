-- GetHired Employer Portal v3 -- Messaging Foundation (GH-EMP-B04)
--
-- No messaging system exists anywhere in this codebase (confirmed by
-- direct inspection during the Employer Portal v3 pass -- the "Contacts"
-- module is CRM-style bulk contact management, not applicant messaging).
-- This is genuinely new infrastructure, not a restoration like
-- applicant_application_ddl.sql.
--
-- Design: one thread per (job, applicant) pair -- mirrors job_applicants'
-- own (job_id, candidate_id) scoping so a thread's authorization question
-- ("does this employer own this conversation?") reduces to the exact same
-- company-ownership check already proven correct for job_applicants
-- (getJobCompanyId + getUserCompany). Messages belong to a thread, not
-- directly to a job/applicant, so a thread can be fetched once and reused
-- for every message in it without re-deriving scope per message.
--
-- SAFE TO RUN: CREATE TABLE IF NOT EXISTS throughout, no existing table
-- touched, guarded FK adds. Apply to local/dev only.
--
-- ROLLBACK: DROP TABLE IF EXISTS gethired.messages CASCADE;
--           DROP TABLE IF EXISTS gethired.message_threads CASCADE;
-- (messages first -- it has the FK to message_threads)

CREATE TABLE IF NOT EXISTS gethired.message_threads (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	job_id varchar NOT NULL,
	company_id varchar NOT NULL,
	applicant_uid varchar NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT message_threads_pk PRIMARY KEY (id),
	-- One thread per job+applicant pair -- prevents duplicate threads for
	-- the same conversation if the employer opens "message applicant"
	-- twice instead of reusing the existing thread.
	CONSTRAINT message_threads_job_applicant_un UNIQUE (job_id, applicant_uid)
);

CREATE TABLE IF NOT EXISTS gethired.messages (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	thread_id varchar NOT NULL,
	sender_uid varchar NOT NULL,
	-- 'employer' | 'applicant' -- denormalized at write time from the
	-- caller's own role, so a reader never has to re-derive "who sent
	-- this" by cross-referencing company_employees/job_applicants again.
	sender_role varchar NOT NULL,
	body varchar NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT messages_pk PRIMARY KEY (id),
	CONSTRAINT messages_sender_role_check CHECK (sender_role IN ('employer', 'applicant'))
);

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_fk_job') THEN
		ALTER TABLE gethired.message_threads ADD CONSTRAINT message_threads_fk_job FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_fk_company') THEN
		ALTER TABLE gethired.message_threads ADD CONSTRAINT message_threads_fk_company FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_fk_applicant') THEN
		ALTER TABLE gethired.message_threads ADD CONSTRAINT message_threads_fk_applicant FOREIGN KEY (applicant_uid) REFERENCES gethired.user_credentials(uid) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_fk_thread') THEN
		ALTER TABLE gethired.messages ADD CONSTRAINT messages_fk_thread FOREIGN KEY (thread_id) REFERENCES gethired.message_threads(id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS message_threads_job_id_idx ON gethired.message_threads (job_id);
CREATE INDEX IF NOT EXISTS message_threads_company_id_idx ON gethired.message_threads (company_id);
CREATE INDEX IF NOT EXISTS message_threads_applicant_uid_idx ON gethired.message_threads (applicant_uid);
CREATE INDEX IF NOT EXISTS messages_thread_id_idx ON gethired.messages (thread_id);
