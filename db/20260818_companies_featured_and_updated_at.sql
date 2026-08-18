-- SEC-08 / TAB 00 finding: services/company.service.js's companyList()
-- (backs the public, unauthenticated GET /company/featured endpoint) selects
-- c.is_featured and orders by c.updated_at, but neither column exists in
-- gethired.companies per the checked-in DDL (db/company_ddl.sql) or any
-- prior migration -- both only exist in db/complete_ddl.sql, which is the
-- retired legacy jobhunt-schema snapshot this schema was migrated away from
-- and is never run (see db/local-dev/README.md). If production genuinely
-- lacks these columns, GET /company/featured 500s on every request.
--
-- Additive, idempotent, safe to run on a live system regardless of whether
-- these columns were already added to production out-of-band -- mirrors
-- exactly how gethired.jobs.is_featured was already added in
-- db/local-dev/04_jobs_column_patch.sql (same default, same nullability).

ALTER TABLE gethired.companies
	ADD COLUMN IF NOT EXISTS is_featured bool NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS updated_at timestamp NULL DEFAULT now();
