-- Company duplication fix -- schema piece.
--
-- Backend now rejects creating/renaming a company to a name that already
-- exists (see assertCompanyNameAvailable in services/company.service.js),
-- but existing duplicate-name companies predate that enforcement. Per
-- product decision: the oldest company in each duplicate-name group keeps
-- its exact name; every newer duplicate gets renamed with a numbered
-- suffix ("Company Name #2", "#3", ...) and flagged here so the public
-- company page can show a "this is a duplicate listing" banner. Each
-- duplicate stays a fully independent company with its own real data --
-- nothing is merged or deleted.
--
-- Additive, idempotent, safe on a live system. The actual backfill
-- (renaming existing duplicates + setting this flag) is a separate,
-- reviewed data script -- this migration only adds the column.

ALTER TABLE gethired.companies
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_companies_is_duplicate ON gethired.companies(is_duplicate) WHERE is_duplicate = true;
