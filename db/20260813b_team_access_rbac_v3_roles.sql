-- Team & Access RBAC V3 alignment — additional system role templates
-- Additive only (ON CONFLICT DO NOTHING throughout). Safe to re-run.
-- Adds Reviewer, Sourcer, Recruiting Coordinator, Reports Viewer, and
-- Company Profile Manager -- the remaining V3 role templates that map
-- cleanly onto the existing, grounded 18-key permission catalog from
-- db/20260813_team_access_rbac.sql. External Agency/Partner is
-- deliberately NOT added -- no "submit a candidate" feature exists in
-- this codebase to scope it against (see GETHIRED_TEAM_ACCESS_RBAC_V3_GAP_ANALYSIS.md).

INSERT INTO gethired.team_roles (role_key, role_name, role_description, role_type, is_owner_role) VALUES
  ('reviewer',              'Reviewer',                 'Reviews assigned candidates and applications; read-only, cannot message or change status.', 'system', false),
  ('sourcer',                'Sourcer',                  'Views assigned jobs and applicants to identify candidates; cannot message or change status.', 'system', false),
  ('recruiting_coordinator', 'Recruiting Coordinator',   'Schedules and manages interviews for assigned jobs; limited candidate data visibility.', 'system', false),
  ('reports_viewer',         'Reports Viewer',           'Views company-wide job and applicant activity; cannot edit jobs, message candidates, or manage the team.', 'system', false),
  ('company_profile_manager','Company Profile Manager',  'Manages company profile and public company page; no applicant or job access by default.', 'system', false)
ON CONFLICT DO NOTHING;

-- Reviewer: read-only candidate review
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'reviewer'
  AND p.permission_key IN ('jobs.view','applicants.view','cv.view')
ON CONFLICT DO NOTHING;

-- Sourcer: assigned-job visibility, no messaging/status-change
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'sourcer'
  AND p.permission_key IN ('jobs.view','applicants.view')
ON CONFLICT DO NOTHING;

-- Recruiting Coordinator: scheduling-focused
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'recruiting_coordinator'
  AND p.permission_key IN ('jobs.view','applicants.view','interviews.view','interviews.manage','messages.view','messages.send')
ON CONFLICT DO NOTHING;

-- Reports Viewer: company-wide visibility, no mutation
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'reports_viewer'
  AND p.permission_key IN ('jobs.view','applicants.view','interviews.view','company.profile.view')
ON CONFLICT DO NOTHING;

-- Company Profile Manager: profile-only, no job/applicant access
INSERT INTO gethired.team_role_permissions (team_role_id, permission_id)
SELECT r.team_role_id, p.permission_id
FROM gethired.team_roles r CROSS JOIN gethired.permissions p
WHERE r.company_id IS NULL AND r.role_key = 'company_profile_manager'
  AND p.permission_key IN ('company.profile.view','company.profile.edit')
ON CONFLICT DO NOTHING;
