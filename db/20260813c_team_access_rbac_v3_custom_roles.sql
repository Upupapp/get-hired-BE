-- Team & Access RBAC V3 alignment — custom role archival support
-- Additive only. Safe to re-run.
-- is_archived: an archived custom role can no longer be assigned to new
-- invites/members, but existing company_employees rows referencing it keep
-- resolving normally (accessControl.service.js's role join has no status
-- filter) -- archiving never silently breaks an existing member's access.

ALTER TABLE gethired.team_roles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS team_roles_company_active_idx ON gethired.team_roles (company_id, is_archived);
