-- GETHIRED JOB CERTIFICATION REQUIREMENTS v1
--
-- Structured job-side certification/license requirements, additive to
-- the existing free-text job_requirement/job_goodtohave child tables --
-- see GETHIRED_MATCH_CERTIFICATION_LICENSE_DISCOVERY.md for the full
-- discovery/rationale. This table is read-only by MATCH today (not at
-- all, in fact -- JobCompatibilityService is explicitly not touched in
-- this pass). canonical_key is nullable and unused until a future MATCH
-- pass builds comparison logic against it.
--
-- SAFE TO RUN: CREATE TABLE IF NOT EXISTS, no existing table touched,
-- guarded FK add, mirrors job_requirement's job_id FK/cascade convention
-- exactly so it behaves identically under job deletion/update.
--
-- ROLLBACK: DROP TABLE IF EXISTS gethired.job_certification_requirement CASCADE;

CREATE TABLE IF NOT EXISTS gethired.job_certification_requirement (
	id varchar NOT NULL DEFAULT uuid_generate_v4(),
	job_id varchar NOT NULL,
	name varchar NOT NULL,
	type varchar NOT NULL DEFAULT 'certification',
	importance varchar NOT NULL DEFAULT 'required',
	issuing_authority varchar NULL,
	expiry_required bool NOT NULL DEFAULT false,
	verification_required bool NOT NULL DEFAULT false,
	canonical_key varchar NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT job_certification_requirement_pk PRIMARY KEY (id),
	CONSTRAINT job_certification_requirement_type_check CHECK (type IN ('certification', 'license', 'permit', 'eligibility', 'other')),
	CONSTRAINT job_certification_requirement_importance_check CHECK (importance IN ('required', 'preferred'))
);

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_certification_requirement_fk_job') THEN
		ALTER TABLE gethired.job_certification_requirement ADD CONSTRAINT job_certification_requirement_fk_job FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS job_certification_requirement_job_id_idx ON gethired.job_certification_requirement (job_id);
