-- Employer signup/onboarding is broken end-to-end locally: `POST
-- /company/createinitial` (createBasicCompany, controllers/companiesController.js)
-- and `createCompany` both INSERT into gethired.companies(..., created_at, ...)
-- and mappedCompany() reads raw.created_at back out -- but no `created_at`
-- column has ever existed on this table in any tracked migration. The
-- table's real DDL (db/company_ddl.sql) only ever defined `created_date`
-- (NOT NULL, no default), which every current code path has abandoned --
-- confirmed via repo-wide grep, zero references to companies.created_date
-- anywhere in controllers/ or services/. Every company-creation attempt
-- 500s with "column \"created_at\" of relation \"companies\" does not
-- exist" (Postgres error 42703).
--
-- Same class of gap as db/20260818_companies_featured_and_updated_at.sql
-- (is_featured/updated_at were selected/ordered-by but never existed
-- either) -- additive, idempotent, safe on a live system.
--
-- created_date is left in place (not dropped -- no certainty about hidden
-- external dependents, e.g. reporting queries outside this repo) but given
-- a default so it stops blocking inserts that -- like every current code
-- path -- never populate it.

ALTER TABLE gethired.companies
	ADD COLUMN IF NOT EXISTS created_at timestamp NULL DEFAULT now();

ALTER TABLE gethired.companies
	ALTER COLUMN created_date SET DEFAULT now();

-- Second, related gap found live-testing the same broken /company/createinitial
-- flow immediately after the fix above: company_logo is NOT NULL per the
-- original DDL, but createBasicCompany() (the lightweight first step of
-- signup -- create a bare company row, add details/logo in a later step)
-- never supplies one, by design -- the logo is uploaded in the company-
-- details step that follows. The NOT NULL constraint was written for the
-- older single-step createCompany()/createCompanyFull() flow and was never
-- relaxed when this newer two-step basic+details pattern was introduced.
-- Making it nullable matches the flow's actual intended UX; it is not
-- worked around by inserting a placeholder value.
ALTER TABLE gethired.companies
	ALTER COLUMN company_logo DROP NOT NULL;
