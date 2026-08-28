-- GetHired Team & Access RBAC V3 — reconciliation against the full V3 spec.
-- Additive only, safe to re-run (IF NOT EXISTS / guarded ADD CONSTRAINT).
--
-- Closes two schema-level gaps found when re-checking the V3 implementation
-- against the original spec instead of the scoped-down V1 plan:
--   1. Sensitive-permission flag was a frontend-only guess (a hardcoded
--      list duplicating what should be server-owned truth). Moves it to
--      the database so the frontend reads it instead of re-deriving it.
--   2. Member suspension (distinct from removal) had no schema support at
--      all. Adds `status` so a member's role/scope/job-assignment
--      configuration can be preserved while access is temporarily denied.

ALTER TABLE gethired.permissions
  ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN NOT NULL DEFAULT false;

UPDATE gethired.permissions
  SET is_sensitive = true
  WHERE permission_key IN ('cv.view', 'billing.view', 'billing.manage', 'team.manage')
    AND is_sensitive = false;

ALTER TABLE gethired.company_employees
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'gethired'
      AND table_name = 'company_employees'
      AND constraint_name = 'company_employees_status_check'
  ) THEN
    ALTER TABLE gethired.company_employees
      ADD CONSTRAINT company_employees_status_check CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;
