-- Team & Access — Job-Scoped RBAC (V1) — GetHired
-- Run against gethired schema. All changes are additive (IF NOT EXISTS / guarded FK adds throughout).
-- Safe to run on a live system. Does not modify any existing table's existing columns.
--
-- HOW TO RUN: same as db/20260630_invoice_billing_schema.sql (ssh + psql -f, or Supabase SQL editor).
--
-- NOTE: gethired.roles was already renamed to gethired.access_roles (db/user_ddl.sql) and holds
-- 4 fixed GLOBAL PLATFORM roles (super_admin/admin/employer/candidate). The new tables below are a
-- separate, COMPANY-SCOPED role system for job-level team access — named team_roles specifically to
-- avoid any collision or confusion with access_roles. Do not touch access_roles in this migration.

-- ── 1. Permissions catalog ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.permissions (
  permission_id   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key  VARCHAR(100)  NOT NULL,
  category        VARCHAR(50)   NOT NULL,
  description     VARCHAR(255),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT permissions_key_uq UNIQUE (permission_key)
);

-- ── 2. Team roles (company-scoped; company_id NULL = system template) ──────
CREATE TABLE IF NOT EXISTS gethired.team_roles (
  team_role_id      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        VARCHAR(50),                 -- NULL = system role, shared by every company
  role_key          VARCHAR(50),                 -- stable slug for system roles only; NULL for custom
  role_name         VARCHAR(100)  NOT NULL,
  role_description  VARCHAR(255),
  role_type         VARCHAR(20)   NOT NULL DEFAULT 'system'
                     CHECK (role_type IN ('system', 'custom')),   -- 'custom' unused in V1, schema-ready for backlog builder
  is_owner_role     BOOLEAN       NOT NULL DEFAULT false,         -- marks the one role that guards "last owner" logic
  created_by        VARCHAR(255),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS team_roles_system_role_key_uq
  ON gethired.team_roles (role_key) WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS team_roles_company_id_idx ON gethired.team_roles (company_id);

-- ── 3. Role → permission mapping ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.team_role_permissions (
  team_role_id    UUID NOT NULL,
  permission_id   UUID NOT NULL,
  PRIMARY KEY (team_role_id, permission_id)
);

-- ── 4. Job assignments (member ↔ job, only meaningful when access_scope='assigned_jobs') ──
CREATE TABLE IF NOT EXISTS gethired.job_assignments (
  job_assignment_id UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        VARCHAR(50)  NOT NULL,     -- denormalized: fast company-scoped queries + defense in depth
  employee_uuid     VARCHAR(255) NOT NULL,
  job_id            VARCHAR(50)  NOT NULL,
  assigned_by       VARCHAR(255),
  assigned_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT job_assignments_uq UNIQUE (employee_uuid, job_id)
);

CREATE INDEX IF NOT EXISTS job_assignments_employee_idx ON gethired.job_assignments (employee_uuid);
CREATE INDEX IF NOT EXISTS job_assignments_job_idx ON gethired.job_assignments (job_id);
CREATE INDEX IF NOT EXISTS job_assignments_company_idx ON gethired.job_assignments (company_id);

-- ── 5. Pending invitations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gethired.team_invitations (
  invitation_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           VARCHAR(50)  NOT NULL,
  email                VARCHAR(255) NOT NULL,
  invited_team_role_id UUID         NOT NULL,
  access_scope         VARCHAR(20)  NOT NULL
                        CHECK (access_scope IN ('all_jobs', 'assigned_jobs', 'no_job_access')),
  token_hash           VARCHAR(128) NOT NULL,   -- sha256 of the raw token; raw token only ever lives in the email link
  status               VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by           VARCHAR(255) NOT NULL,
  expires_at           TIMESTAMPTZ  NOT NULL,
  accepted_at          TIMESTAMPTZ,
  accepted_by_uid      VARCHAR(255),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT team_invitations_token_hash_uq UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS team_invitations_company_idx ON gethired.team_invitations (company_id, status);
CREATE INDEX IF NOT EXISTS team_invitations_email_idx ON gethired.team_invitations (email);

CREATE TABLE IF NOT EXISTS gethired.team_invitation_jobs (
  invitation_id UUID NOT NULL,
  job_id        VARCHAR(50) NOT NULL,
  PRIMARY KEY (invitation_id, job_id)
);

-- ── 6. Access audit log (no FKs on purpose — must outlive deleted rows) ────
CREATE TABLE IF NOT EXISTS gethired.access_audit_logs (
  audit_log_id  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    VARCHAR(50)   NOT NULL,
  actor_uid     VARCHAR(255)  NOT NULL,
  actor_email   VARCHAR(255),
  target_uid    VARCHAR(255),
  target_email  VARCHAR(255),
  event_type    VARCHAR(50)   NOT NULL,   -- invite_sent | invite_accepted | invite_revoked | role_changed | scope_changed | jobs_assigned | member_removed
  before_json   JSONB,
  after_json    JSONB,
  ip_address    VARCHAR(64),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS access_audit_logs_company_idx ON gethired.access_audit_logs (company_id, created_at DESC);

-- ── 7. Extend company_employees (additive only) ─────────────────────────────
ALTER TABLE gethired.company_employees ADD COLUMN IF NOT EXISTS team_role_id UUID;
ALTER TABLE gethired.company_employees ADD COLUMN IF NOT EXISTS access_scope VARCHAR(20) NOT NULL DEFAULT 'all_jobs'
  CHECK (access_scope IN ('all_jobs', 'assigned_jobs', 'no_job_access'));

-- ── 8. Foreign keys, guarded so this file is safely re-runnable ────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_roles_fk_company') THEN
    ALTER TABLE gethired.team_roles ADD CONSTRAINT team_roles_fk_company FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_role_permissions_fk_role') THEN
    ALTER TABLE gethired.team_role_permissions ADD CONSTRAINT team_role_permissions_fk_role FOREIGN KEY (team_role_id) REFERENCES gethired.team_roles(team_role_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_role_permissions_fk_perm') THEN
    ALTER TABLE gethired.team_role_permissions ADD CONSTRAINT team_role_permissions_fk_perm FOREIGN KEY (permission_id) REFERENCES gethired.permissions(permission_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_assignments_fk_company') THEN
    ALTER TABLE gethired.job_assignments ADD CONSTRAINT job_assignments_fk_company FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_assignments_fk_employee') THEN
    ALTER TABLE gethired.job_assignments ADD CONSTRAINT job_assignments_fk_employee FOREIGN KEY (employee_uuid) REFERENCES gethired.user_credentials(uid) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_assignments_fk_job') THEN
    ALTER TABLE gethired.job_assignments ADD CONSTRAINT job_assignments_fk_job FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_invitations_fk_company') THEN
    ALTER TABLE gethired.team_invitations ADD CONSTRAINT team_invitations_fk_company FOREIGN KEY (company_id) REFERENCES gethired.companies(company_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_invitations_fk_role') THEN
    ALTER TABLE gethired.team_invitations ADD CONSTRAINT team_invitations_fk_role FOREIGN KEY (invited_team_role_id) REFERENCES gethired.team_roles(team_role_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_invitation_jobs_fk_inv') THEN
    ALTER TABLE gethired.team_invitation_jobs ADD CONSTRAINT team_invitation_jobs_fk_inv FOREIGN KEY (invitation_id) REFERENCES gethired.team_invitations(invitation_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_invitation_jobs_fk_job') THEN
    ALTER TABLE gethired.team_invitation_jobs ADD CONSTRAINT team_invitation_jobs_fk_job FOREIGN KEY (job_id) REFERENCES gethired.jobs(job_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_employees_fk_team_role') THEN
    ALTER TABLE gethired.company_employees ADD CONSTRAINT company_employees_fk_team_role FOREIGN KEY (team_role_id) REFERENCES gethired.team_roles(team_role_id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 9. Seed: grounded permission catalog (17 keys, mapped only to real endpoints) ──
INSERT INTO gethired.permissions (permission_key, category, description) VALUES
  ('jobs.view',                'jobs',       'View job posts'),
  ('jobs.create',              'jobs',       'Create new job posts'),
  ('jobs.edit',                'jobs',       'Edit job posts'),
  ('jobs.delete',              'jobs',       'Delete job posts'),
  ('jobs.publish',             'jobs',       'Publish/unpublish/archive job posts'),
  ('applicants.view',          'applicants', 'View applicants and applications'),
  ('applicants.status_update', 'applicants', 'Change an applicant''s status'),
  ('cv.view',                  'cv',         'View applicant CVs/documents in a job-application context'),
  ('messages.view',            'messages',   'View applicant message threads'),
  ('messages.send',            'messages',   'Send messages to applicants'),
  ('interviews.view',          'interviews', 'View interview templates, questions, and activity'),
  ('interviews.manage',        'interviews', 'Create/edit interview templates, questions, and group interviews'),
  ('company.profile.view',     'company',    'View company profile'),
  ('company.profile.edit',     'company',    'Edit company profile'),
  ('team.view',                'team',       'View team members'),
  ('team.manage',              'team',       'Invite/edit/remove team members and their access'),
  ('billing.view',             'billing',    'View invoices and subscription/plan'),
  ('billing.manage',           'billing',    'Manage subscription/plan and checkout')
ON CONFLICT (permission_key) DO NOTHING;

-- ── 10. Seed: grounded default role set (system roles, company_id NULL) ────
INSERT INTO gethired.team_roles (role_key, role_name, role_description, role_type, is_owner_role) VALUES
  ('owner',          'Owner',            'Full access to everything, including billing and team management. Cannot be removed if last remaining owner.', 'system', true),
  ('company_admin',  'Company Admin',    'Full access to everything, including billing and team management.', 'system', false),
  ('recruiter',      'Recruiter',        'Manages job posts and applicants end-to-end; cannot delete jobs, manage the team, or manage billing.', 'system', false),
  ('hiring_manager', 'Hiring Manager',   'Reviews applicants, updates statuses, and messages candidates for their jobs; cannot create/edit job posts.', 'system', false),
  ('interviewer',    'Interviewer',      'Views jobs, applicants, CVs and interview activity; read-only, no messaging.', 'system', false),
  ('billing_admin',  'Billing Admin',    'Manages billing and subscription only; no access to jobs or applicants.', 'system', false),
  ('viewer',         'Read-only Viewer', 'Read-only access across jobs, applicants, CVs, messages, and interviews.', 'system', false)
ON CONFLICT DO NOTHING;

-- ── 11. Seed: role → permission mapping ─────────────────────────────────────
-- Owner & Company Admin: all 17 permissions.
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key IN ('owner', 'company_admin')
ON CONFLICT DO NOTHING;

-- Recruiter
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'recruiter'
  AND p.permission_key IN ('jobs.view','jobs.create','jobs.edit','jobs.publish',
    'applicants.view','applicants.status_update','cv.view',
    'messages.view','messages.send','interviews.view','interviews.manage')
ON CONFLICT DO NOTHING;

-- Hiring Manager
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'hiring_manager'
  AND p.permission_key IN ('jobs.view','applicants.view','applicants.status_update',
    'cv.view','messages.view','messages.send','interviews.view')
ON CONFLICT DO NOTHING;

-- Interviewer
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'interviewer'
  AND p.permission_key IN ('jobs.view','applicants.view','cv.view','interviews.view')
ON CONFLICT DO NOTHING;

-- Billing Admin
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'billing_admin'
  AND p.permission_key IN ('billing.view','billing.manage','company.profile.view')
ON CONFLICT DO NOTHING;

-- Read-only Viewer
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'viewer'
  AND p.permission_key IN ('jobs.view','applicants.view','cv.view','messages.view',
    'interviews.view','company.profile.view')
ON CONFLICT DO NOTHING;

-- ── 12. Backward-compatible backfill of existing company_employees ─────────
-- Today NOTHING narrows an employee's access below "everything in their
-- company" (every existing controller check is `callerCompany.companyId ===
-- X`, full stop). So "a role that preserves current effective access" for
-- every pre-existing row is the role with ALL 17 permissions. access_scope
-- already defaults to 'all_jobs' via the column DEFAULT above; this step
-- only needs to assign team_role_id.
--
-- The company creator (companies.created_by) becomes 'owner'; every other
-- pre-existing member becomes 'company_admin' (full access) — deliberately
-- generous, never reduces anyone's legitimate current access. Owners can
-- re-review and narrow teammates to tighter roles afterwards via the new UI.
UPDATE gethired.company_employees ce
SET team_role_id = (SELECT team_role_id FROM gethired.team_roles WHERE role_key = 'owner' AND company_id IS NULL)
FROM gethired.companies c
WHERE ce.company_id = c.company_id
  AND ce.employee_uuid = c.created_by
  AND ce.team_role_id IS NULL;

UPDATE gethired.company_employees
SET team_role_id = (SELECT team_role_id FROM gethired.team_roles WHERE role_key = 'company_admin' AND company_id IS NULL)
WHERE team_role_id IS NULL;

UPDATE gethired.company_employees SET access_scope = 'all_jobs' WHERE access_scope IS NULL;
