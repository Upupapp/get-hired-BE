import crypto from "crypto";
import dbQuery from "../db/dbQuery";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import { send } from "../helpers/mailer";
import {
  checkUserIfExistInFirebase,
  registerNewUserInFirebase,
  getForgetPwLinkInFirebase,
} from "../helpers/firebaseFunctions";
import { hashPassword } from "../helpers/validation";
import { registerUserInDB } from "../controllers/userController";
import { getCompanyNameByCompanyId } from "./company.service";

const dbSchema = env.schema;
const INVITE_EXPIRY_HOURS = 72;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const generateToken = () => crypto.randomBytes(32).toString("hex");

/**
 * addJobAssignment — used by createJobs (jobsController.js) so an
 * assigned_jobs-scoped member who creates a job doesn't immediately lose
 * access to the job they just made. No-op if the pair already exists.
 */
const addJobAssignment = async (companyId, employeeUuid, jobId, assignedBy) => {
  await dbQuery.query(
    `INSERT INTO ${dbSchema}.job_assignments (company_id, employee_uuid, job_id, assigned_by)
     VALUES ($1, $2, $3, $4) ON CONFLICT (employee_uuid, job_id) DO NOTHING`,
    [companyId, employeeUuid, jobId, assignedBy]
  );
};

// ── Audit log ────────────────────────────────────────────────────────────
const writeAuditLog = async ({ companyId, actorUid, actorEmail, targetUid, targetEmail, eventType, beforeJson, afterJson }, client) => {
  const runner = client || dbQuery;
  const text = `INSERT INTO ${dbSchema}.access_audit_logs
      (company_id, actor_uid, actor_email, target_uid, target_email, event_type, before_json, after_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
  const params = [companyId, actorUid, actorEmail || null, targetUid || null, targetEmail || null, eventType, beforeJson ? JSON.stringify(beforeJson) : null, afterJson ? JSON.stringify(afterJson) : null];
  await runner.query(text, params);
};

// ── Permissions ──────────────────────────────────────────────────────────
const listPermissions = async () => {
  const { rows } = await dbQuery.query(
    `SELECT permission_key, category, description, is_sensitive FROM ${dbSchema}.permissions ORDER BY category, permission_key`,
    []
  );
  return rows.map((r) => ({ key: r.permission_key, category: r.category, description: r.description, sensitive: r.is_sensitive }));
};

// ── Roles ────────────────────────────────────────────────────────────────
/**
 * listTeamRoles — system roles + this company's custom roles.
 * includeArchived=false (default) is what invite/assignment pickers use --
 * an archived custom role can't be newly assigned. The role-management/
 * builder view passes includeArchived=true so archived roles are still
 * visible (with isArchived:true) for un-archiving or review; existing
 * members already on an archived role are unaffected either way (see
 * db/20260813c_team_access_rbac_v3_custom_roles.sql).
 */
const listTeamRoles = async (companyId, includeArchived) => {
  const { rows } = await dbQuery.query(
    `SELECT tr.team_role_id, tr.role_key, tr.role_name, tr.role_description, tr.role_type, tr.is_owner_role, tr.is_archived,
        array_remove(array_agg(p.permission_key), NULL) AS permission_keys
     FROM ${dbSchema}.team_roles tr
     LEFT JOIN ${dbSchema}.team_role_permissions trp ON trp.team_role_id = tr.team_role_id
     LEFT JOIN ${dbSchema}.permissions p ON p.permission_id = trp.permission_id
     WHERE (tr.company_id IS NULL OR tr.company_id = $1) ${includeArchived ? "" : "AND tr.is_archived = false"}
     GROUP BY tr.team_role_id
     ORDER BY tr.company_id NULLS FIRST, tr.role_name`,
    [companyId]
  );
  return rows.map((r) => ({
    roleId: r.team_role_id,
    roleKey: r.role_key,
    name: r.role_name,
    description: r.role_description,
    roleType: r.role_type,
    isOwnerRole: r.is_owner_role,
    isArchived: r.is_archived,
    permissionKeys: r.permission_keys || [],
  }));
};

const getRoleForCompany = async (companyId, roleId) => {
  const { rows } = await dbQuery.query(
    `SELECT team_role_id, role_type, company_id FROM ${dbSchema}.team_roles WHERE team_role_id = $1`,
    [roleId]
  );
  return rows[0] || null;
};

/**
 * createCustomRole — creator cannot grant permissions they don't have
 * (permissionsNotGranted, same check used for role-grant-on-invite/update).
 * Custom roles can never be is_owner_role -- only the seeded system Owner
 * role carries that flag, so a custom role can never bypass last-owner
 * protection or the "only an Owner can grant Owner" rule.
 */
const createCustomRole = async (companyId, { name, description, permissionKeys, cloneFromRoleId }, actor, ctx) => {
  let keys = Array.isArray(permissionKeys) ? permissionKeys.slice() : [];
  if (cloneFromRoleId) {
    const { rows } = await dbQuery.query(
      `SELECT p.permission_key FROM ${dbSchema}.team_role_permissions trp
       JOIN ${dbSchema}.permissions p ON p.permission_id = trp.permission_id
       WHERE trp.team_role_id = $1`,
      [cloneFromRoleId]
    );
    keys = Array.from(new Set([...keys, ...rows.map((r) => r.permission_key)]));
  }

  return dbQuery.withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO ${dbSchema}.team_roles (company_id, role_key, role_name, role_description, role_type, is_owner_role, created_by)
       VALUES ($1, NULL, $2, $3, 'custom', false, $4) RETURNING team_role_id`,
      [companyId, name, description || null, actor.uid]
    );
    const roleId = rows[0].team_role_id;

    if (keys.length > 0) {
      const { rows: permRows } = await client.query(
        `SELECT permission_id, permission_key FROM ${dbSchema}.permissions WHERE permission_key = ANY($1::text[])`,
        [keys]
      );
      for (const p of permRows) {
        await client.query(
          `INSERT INTO ${dbSchema}.team_role_permissions (team_role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roleId, p.permission_id]
        );
      }
    }

    await writeAuditLog(
      { companyId, actorUid: actor.uid, actorEmail: actor.email, eventType: "custom_role_created", afterJson: { roleId, name, permissionKeys: keys } },
      client
    );

    return { roleId, name, description: description || null, permissionKeys: keys };
  });
};

const updateCustomRole = async (companyId, roleId, { name, description, permissionKeys }, actor) => {
  const role = await getRoleForCompany(companyId, roleId);
  if (!role || role.role_type !== "custom" || role.company_id !== companyId) {
    const e = new Error("INVALID_ROLE");
    e.code = "INVALID_ROLE";
    throw e;
  }

  return dbQuery.withTransaction(async (client) => {
    if (name || description !== undefined) {
      await client.query(
        `UPDATE ${dbSchema}.team_roles SET role_name = COALESCE($1, role_name), role_description = $2, updated_at = NOW() WHERE team_role_id = $3`,
        [name || null, description !== undefined ? description : null, roleId]
      );
    }

    if (Array.isArray(permissionKeys)) {
      await client.query(`DELETE FROM ${dbSchema}.team_role_permissions WHERE team_role_id = $1`, [roleId]);
      if (permissionKeys.length > 0) {
        const { rows: permRows } = await client.query(
          `SELECT permission_id FROM ${dbSchema}.permissions WHERE permission_key = ANY($1::text[])`,
          [permissionKeys]
        );
        for (const p of permRows) {
          await client.query(
            `INSERT INTO ${dbSchema}.team_role_permissions (team_role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [roleId, p.permission_id]
          );
        }
      }
    }

    await writeAuditLog(
      { companyId, actorUid: actor.uid, actorEmail: actor.email, eventType: "custom_role_updated", afterJson: { roleId, name, permissionKeys } },
      client
    );

    return { roleId };
  });
};

/**
 * archiveCustomRole — hides the role from future assignment (listTeamRoles
 * default) without touching any company_employees row already on it, so
 * existing members never silently lose access.
 */
const archiveCustomRole = async (companyId, roleId, actor) => {
  const role = await getRoleForCompany(companyId, roleId);
  if (!role || role.role_type !== "custom" || role.company_id !== companyId) {
    const e = new Error("INVALID_ROLE");
    e.code = "INVALID_ROLE";
    throw e;
  }
  await dbQuery.query(`UPDATE ${dbSchema}.team_roles SET is_archived = true, updated_at = NOW() WHERE team_role_id = $1`, [roleId]);
  await writeAuditLog({ companyId, actorUid: actor.uid, actorEmail: actor.email, eventType: "custom_role_archived", afterJson: { roleId } });
  return { archived: true };
};

// ── Audit log ────────────────────────────────────────────────────────────
const listAuditLogs = async (companyId, limit) => {
  const { rows } = await dbQuery.query(
    `SELECT audit_log_id, actor_uid, actor_email, target_uid, target_email, event_type, before_json, after_json, created_at
     FROM ${dbSchema}.access_audit_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [companyId, Math.min(limit || 100, 500)]
  );
  return rows.map((r) => ({
    auditLogId: r.audit_log_id,
    actorUid: r.actor_uid,
    actorEmail: r.actor_email,
    targetUid: r.target_uid,
    targetEmail: r.target_email,
    eventType: r.event_type,
    before: r.before_json,
    after: r.after_json,
    createdAt: r.created_at,
  }));
};

// ── Members ──────────────────────────────────────────────────────────────
const listTeamMembers = async (companyId) => {
  // users.email doesn't exist (dropped in a DDL migration -- see STITCH
  // QA11 FIX F-01 elsewhere in this codebase); email lives on
  // user_credentials only. Confirmed via real query failure during V1
  // verification (2026-08-13) -- the pre-existing company.service.js
  // companyUsers() has the same stale-column bug, out of scope to fix here.
  const { rows } = await dbQuery.query(
    `SELECT ce.employee_id, ce.company_id, ce.employee_uuid, ce.assigned_at, ce.access_scope, ce.status,
        u.firstname, u.lastname, uc.email, u.photo_url,
        tr.team_role_id, tr.role_key, tr.role_name, tr.is_owner_role
     FROM ${dbSchema}.company_employees ce
     LEFT JOIN ${dbSchema}.users u ON ce.employee_uuid = u.uid
     LEFT JOIN ${dbSchema}.user_credentials uc ON ce.employee_uuid = uc.uid
     LEFT JOIN ${dbSchema}.team_roles tr ON tr.team_role_id = ce.team_role_id
     WHERE ce.company_id = $1
     ORDER BY ce.assigned_at ASC`,
    [companyId]
  );

  if (rows.length === 0) return [];

  const employeeUuids = rows.map((r) => r.employee_uuid);
  const { rows: jobRows } = await dbQuery.query(
    `SELECT ja.employee_uuid, ja.job_id, j.job_title
     FROM ${dbSchema}.job_assignments ja
     JOIN ${dbSchema}.jobs j ON j.job_id = ja.job_id
     WHERE ja.company_id = $1 AND ja.employee_uuid = ANY($2::text[])`,
    [companyId, employeeUuids]
  );
  const jobsByEmployee = {};
  jobRows.forEach((jr) => {
    if (!jobsByEmployee[jr.employee_uuid]) jobsByEmployee[jr.employee_uuid] = [];
    jobsByEmployee[jr.employee_uuid].push({ jobId: jr.job_id, jobTitle: jr.job_title });
  });

  return rows.map((r) => ({
    employeeId: r.employee_id,
    uid: r.employee_uuid,
    fullName: [r.firstname, r.lastname].filter(Boolean).join(" ") || null,
    email: r.email,
    photoUrl: r.photo_url,
    roleId: r.team_role_id,
    roleKey: r.role_key,
    roleName: r.role_name,
    isOwnerRole: !!r.is_owner_role,
    accessScope: r.access_scope,
    status: r.status,
    assignedJobs: jobsByEmployee[r.employee_uuid] || [],
    assignedAt: r.assigned_at,
  }));
};

/**
 * getOwnerCountForCompany — counts only ACTIVE owners. A suspended Owner
 * can't currently act as Owner (their access is fully denied while
 * suspended, see accessControl.service.js), so they don't count toward
 * "there's still someone who can manage this company" -- counting them
 * would let the last *active* Owner be removed/demoted/suspended while a
 * suspended Owner is the only one left, which is a lockout (nobody with
 * team.manage can reactivate anyone).
 */
const getOwnerCountForCompany = async (companyId) => {
  const { rows } = await dbQuery.query(
    `SELECT count(*)::int AS owner_count
     FROM ${dbSchema}.company_employees ce
     JOIN ${dbSchema}.team_roles tr ON tr.team_role_id = ce.team_role_id
     WHERE ce.company_id = $1 AND tr.is_owner_role = true AND ce.status = 'active'`,
    [companyId]
  );
  return rows[0] ? rows[0].owner_count : 0;
};

const getMemberRow = async (companyId, employeeId) => {
  const { rows } = await dbQuery.query(
    `SELECT ce.employee_id, ce.employee_uuid, ce.team_role_id, ce.access_scope, ce.status, tr.is_owner_role, tr.role_name
     FROM ${dbSchema}.company_employees ce
     LEFT JOIN ${dbSchema}.team_roles tr ON tr.team_role_id = ce.team_role_id
     WHERE ce.employee_id = $1 AND ce.company_id = $2`,
    [employeeId, companyId]
  );
  return rows[0] || null;
};

const replaceJobAssignments = async (client, companyId, employeeUuid, jobIds, assignedBy) => {
  await client.query(`DELETE FROM ${dbSchema}.job_assignments WHERE company_id = $1 AND employee_uuid = $2`, [companyId, employeeUuid]);
  if (Array.isArray(jobIds) && jobIds.length > 0) {
    const values = jobIds.map((_, i) => `($1, $2, $${i + 3}, $${jobIds.length + 3})`).join(", ");
    await client.query(
      `INSERT INTO ${dbSchema}.job_assignments (company_id, employee_uuid, job_id, assigned_by) VALUES ${values}
       ON CONFLICT (employee_uuid, job_id) DO NOTHING`,
      [companyId, employeeUuid, ...jobIds, assignedBy]
    );
  }
};

/**
 * updateTeamMember — role/scope/job-assignment changes for an existing member.
 * Guards against removing the last remaining Owner. Wrapped in a transaction
 * since a role/scope change can also replace job_assignments.
 *
 * Job assignments are only touched when the caller explicitly provides
 * `jobIds` (an array, possibly empty when paired with a non-assigned_jobs
 * scope) or when the scope itself is changing. A role-only update on an
 * already-`assigned_jobs` member that omits `jobIds` leaves their existing
 * assignments untouched -- previously this silently wiped them, since the
 * old code always replaced job_assignments with `changes.jobIds || []`
 * whenever the resulting scope was assigned_jobs, regardless of whether the
 * caller ever mentioned jobs.
 *
 * Writes one audit-log row per dimension that actually changed
 * (role_changed / scope_changed / jobs_assigned), rather than folding every
 * combination into a single role_changed event -- matches the V3 spec's
 * distinct event-type list.
 */
const updateTeamMember = async (companyId, employeeId, changes, actor) => {
  const current = await getMemberRow(companyId, employeeId);
  if (!current) {
    const e = new Error("MEMBER_NOT_FOUND");
    e.code = "MEMBER_NOT_FOUND";
    throw e;
  }

  const nextRoleId = changes.roleId || current.team_role_id;
  const nextScope = changes.accessScope || current.access_scope;
  const roleChanged = nextRoleId !== current.team_role_id;
  const scopeChanged = nextScope !== current.access_scope;
  const jobIdsProvided = Array.isArray(changes.jobIds);
  const shouldTouchJobs = jobIdsProvided || scopeChanged;

  if (current.is_owner_role && roleChanged) {
    const ownerCount = await getOwnerCountForCompany(companyId);
    if (ownerCount <= 1) {
      const e = new Error("CANNOT_REMOVE_LAST_OWNER");
      e.code = "CANNOT_REMOVE_LAST_OWNER";
      throw e;
    }
  }

  return dbQuery.withTransaction(async (client) => {
    if (roleChanged || scopeChanged) {
      await client.query(
        `UPDATE ${dbSchema}.company_employees SET team_role_id = $1, access_scope = $2 WHERE employee_id = $3 AND company_id = $4`,
        [nextRoleId, nextScope, employeeId, companyId]
      );
    }

    let jobsChanged = false;
    if (shouldTouchJobs) {
      const { rows: oldJobs } = await client.query(
        `SELECT job_id FROM ${dbSchema}.job_assignments WHERE company_id = $1 AND employee_uuid = $2`,
        [companyId, current.employee_uuid]
      );
      const oldSet = new Set(oldJobs.map((r) => r.job_id));

      if (nextScope === "assigned_jobs") {
        const newJobIds = jobIdsProvided ? changes.jobIds : [];
        const newSet = new Set(newJobIds);
        jobsChanged = oldSet.size !== newSet.size || [...oldSet].some((id) => !newSet.has(id));
        await replaceJobAssignments(client, companyId, current.employee_uuid, newJobIds, actor.uid);
      } else {
        jobsChanged = oldSet.size > 0;
        await client.query(`DELETE FROM ${dbSchema}.job_assignments WHERE company_id = $1 AND employee_uuid = $2`, [companyId, current.employee_uuid]);
      }
    }

    if (roleChanged) {
      await writeAuditLog(
        {
          companyId, actorUid: actor.uid, actorEmail: actor.email, targetUid: current.employee_uuid,
          eventType: "role_changed",
          beforeJson: { teamRoleId: current.team_role_id },
          afterJson: { teamRoleId: nextRoleId },
        },
        client
      );
    }
    if (scopeChanged) {
      await writeAuditLog(
        {
          companyId, actorUid: actor.uid, actorEmail: actor.email, targetUid: current.employee_uuid,
          eventType: "scope_changed",
          beforeJson: { accessScope: current.access_scope },
          afterJson: { accessScope: nextScope },
        },
        client
      );
    }
    if (jobsChanged) {
      await writeAuditLog(
        {
          companyId, actorUid: actor.uid, actorEmail: actor.email, targetUid: current.employee_uuid,
          eventType: "jobs_assigned",
          afterJson: { jobIds: nextScope === "assigned_jobs" && jobIdsProvided ? changes.jobIds : [] },
        },
        client
      );
    }

    return { employeeId, roleId: nextRoleId, accessScope: nextScope };
  });
};

/**
 * suspendTeamMember / reactivateTeamMember — a distinct state from removal:
 * role, access scope, and job assignments are all preserved in the DB, only
 * access is denied (accessControl.service.js treats a suspended member as
 * having no AccessContext at all -- same fail-closed path as "not a member").
 * Reactivating restores exactly what was there before, with no re-invite
 * needed. Suspending the last active Owner is blocked for the same lockout
 * reason removing/demoting them is (see getOwnerCountForCompany).
 */
const suspendTeamMember = async (companyId, employeeId, actor) => {
  const current = await getMemberRow(companyId, employeeId);
  if (!current) {
    const e = new Error("MEMBER_NOT_FOUND");
    e.code = "MEMBER_NOT_FOUND";
    throw e;
  }
  if (current.status === "suspended") {
    return { employeeId, status: "suspended" };
  }
  if (current.is_owner_role) {
    const ownerCount = await getOwnerCountForCompany(companyId);
    if (ownerCount <= 1) {
      const e = new Error("CANNOT_REMOVE_LAST_OWNER");
      e.code = "CANNOT_REMOVE_LAST_OWNER";
      throw e;
    }
  }
  await dbQuery.query(`UPDATE ${dbSchema}.company_employees SET status = 'suspended', updated_at = NOW() WHERE employee_id = $1 AND company_id = $2`, [employeeId, companyId]);
  await writeAuditLog({ companyId, actorUid: actor.uid, actorEmail: actor.email, targetUid: current.employee_uuid, eventType: "member_suspended" });
  return { employeeId, status: "suspended" };
};

const reactivateTeamMember = async (companyId, employeeId, actor) => {
  const current = await getMemberRow(companyId, employeeId);
  if (!current) {
    const e = new Error("MEMBER_NOT_FOUND");
    e.code = "MEMBER_NOT_FOUND";
    throw e;
  }
  if (current.status !== "suspended") {
    return { employeeId, status: current.status || "active" };
  }
  await dbQuery.query(`UPDATE ${dbSchema}.company_employees SET status = 'active', updated_at = NOW() WHERE employee_id = $1 AND company_id = $2`, [employeeId, companyId]);
  await writeAuditLog({ companyId, actorUid: actor.uid, actorEmail: actor.email, targetUid: current.employee_uuid, eventType: "member_reactivated" });
  return { employeeId, status: "active" };
};

/**
 * removeTeamMember — guards against removing the last remaining Owner.
 * Also cleans up any job_assignments rows for hygiene (access is already
 * fully revoked the moment the company_employees row is gone, regardless).
 */
const removeTeamMember = async (companyId, employeeId, actor) => {
  const current = await getMemberRow(companyId, employeeId);
  if (!current) {
    const e = new Error("MEMBER_NOT_FOUND");
    e.code = "MEMBER_NOT_FOUND";
    throw e;
  }

  if (current.is_owner_role) {
    const ownerCount = await getOwnerCountForCompany(companyId);
    if (ownerCount <= 1) {
      const e = new Error("CANNOT_REMOVE_LAST_OWNER");
      e.code = "CANNOT_REMOVE_LAST_OWNER";
      throw e;
    }
  }

  return dbQuery.withTransaction(async (client) => {
    await client.query(`DELETE FROM ${dbSchema}.job_assignments WHERE company_id = $1 AND employee_uuid = $2`, [companyId, current.employee_uuid]);
    await client.query(`DELETE FROM ${dbSchema}.company_employees WHERE employee_id = $1 AND company_id = $2`, [employeeId, companyId]);
    await writeAuditLog(
      { companyId, actorUid: actor.uid, actorEmail: actor.email, targetUid: current.employee_uuid, eventType: "member_removed" },
      client
    );
    return { removed: true };
  });
};

// ── Invitations ──────────────────────────────────────────────────────────
const listPendingInvites = async (companyId) => {
  const { rows } = await dbQuery.query(
    `SELECT ti.invitation_id, ti.email, ti.access_scope, ti.status, ti.invited_by, ti.created_at, ti.expires_at,
        tr.role_name
     FROM ${dbSchema}.team_invitations ti
     LEFT JOIN ${dbSchema}.team_roles tr ON tr.team_role_id = ti.invited_team_role_id
     WHERE ti.company_id = $1 AND ti.status IN ('pending', 'revoked')
     ORDER BY ti.created_at DESC`,
    [companyId]
  );
  return rows.map((r) => ({
    invitationId: r.invitation_id,
    email: r.email,
    roleName: r.role_name,
    accessScope: r.access_scope,
    status: r.status,
    invitedAt: r.created_at,
    expiresAt: r.expires_at,
  }));
};

const emailHasActiveMembership = async (companyId, email) => {
  const { rows } = await dbQuery.query(
    `SELECT ce.employee_id FROM ${dbSchema}.company_employees ce
     JOIN ${dbSchema}.user_credentials uc ON uc.uid = ce.employee_uuid
     WHERE ce.company_id = $1 AND lower(uc.email) = lower($2) LIMIT 1`,
    [companyId, email]
  );
  return rows.length > 0;
};

const emailHasPendingInvite = async (companyId, email) => {
  const { rows } = await dbQuery.query(
    `SELECT invitation_id FROM ${dbSchema}.team_invitations
     WHERE company_id = $1 AND lower(email) = lower($2) AND status = 'pending' AND expires_at > NOW() LIMIT 1`,
    [companyId, email]
  );
  return rows.length > 0;
};

/**
 * createInvitations — per-email create-or-skip, mirroring the response shape
 * of the endpoint this replaces (POST /company/addcompanyuser).
 */
const createInvitations = async (companyId, invites, actor) => {
  const companyName = await getCompanyNameByCompanyId(companyId);

  const results = await Promise.all(
    invites.map(async ({ email, roleId, accessScope, jobIds }) => {
      try {
        if (await emailHasActiveMembership(companyId, email)) {
          return { email, status: "failed", msg: "Already a member of this company." };
        }
        if (await emailHasPendingInvite(companyId, email)) {
          return { email, status: "failed", msg: "An invite is already pending for this email." };
        }

        const token = generateToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

        const { rows } = await dbQuery.query(
          `INSERT INTO ${dbSchema}.team_invitations
             (company_id, email, invited_team_role_id, access_scope, token_hash, invited_by, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING invitation_id`,
          [companyId, email, roleId, accessScope, tokenHash, actor.uid, expiresAt]
        );
        const invitationId = rows[0].invitation_id;

        if (accessScope === "assigned_jobs" && Array.isArray(jobIds) && jobIds.length > 0) {
          const values = jobIds.map((_, i) => `($1, $${i + 2})`).join(", ");
          await dbQuery.query(
            `INSERT INTO ${dbSchema}.team_invitation_jobs (invitation_id, job_id) VALUES ${values} ON CONFLICT DO NOTHING`,
            [invitationId, ...jobIds]
          );
        }

        await writeAuditLog({
          companyId,
          actorUid: actor.uid,
          actorEmail: actor.email,
          targetEmail: email,
          eventType: "invite_sent",
          afterJson: { invitationId, roleId, accessScope, jobIds: jobIds || null },
        });

        send(email, "invite", {
          login_url: `${env.app_url}/accept-invite?token=${token}`,
          company: companyName,
          email,
        });

        return { email, status: "success", invitationId, msg: "Invite sent." };
      } catch (error) {
        console.error("[teamAccess.service] createInvitations error:", error);
        return { email, status: "failed", msg: "Failed to send invite." };
      }
    })
  );

  return results;
};

const revokeInvitation = async (companyId, invitationId, actor) => {
  const { rows } = await dbQuery.query(
    `UPDATE ${dbSchema}.team_invitations SET status = 'revoked', updated_at = NOW()
     WHERE invitation_id = $1 AND company_id = $2 AND status = 'pending' RETURNING email`,
    [invitationId, companyId]
  );
  if (rows.length === 0) {
    const e = new Error("INVITE_NOT_FOUND");
    e.code = "INVITE_NOT_FOUND";
    throw e;
  }
  await writeAuditLog({ companyId, actorUid: actor.uid, actorEmail: actor.email, targetEmail: rows[0].email, eventType: "invite_revoked" });
  return { revoked: true };
};

/**
 * resendInvitation — re-keys an existing pending invitation with a fresh
 * token and expiry, and re-sends the invite email. Does not create a new
 * invitation row (keeps a single row per invite through its lifecycle,
 * simpler for the audit trail than issuing a second one).
 */
const resendInvitation = async (companyId, invitationId, actor) => {
  const { rows } = await dbQuery.query(
    `SELECT ti.email, tr.role_name, c.company_name
     FROM ${dbSchema}.team_invitations ti
     JOIN ${dbSchema}.companies c ON c.company_id = ti.company_id
     LEFT JOIN ${dbSchema}.team_roles tr ON tr.team_role_id = ti.invited_team_role_id
     WHERE ti.invitation_id = $1 AND ti.company_id = $2 AND ti.status = 'pending'`,
    [invitationId, companyId]
  );
  if (rows.length === 0) {
    const e = new Error("INVITE_NOT_FOUND");
    e.code = "INVITE_NOT_FOUND";
    throw e;
  }
  const { email, company_name: companyName } = rows[0];

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  await dbQuery.query(
    `UPDATE ${dbSchema}.team_invitations SET token_hash = $1, expires_at = $2, updated_at = NOW() WHERE invitation_id = $3`,
    [tokenHash, expiresAt, invitationId]
  );

  send(email, "invite", {
    login_url: `${env.app_url}/accept-invite?token=${token}`,
    company: companyName,
    email,
  });

  await writeAuditLog({ companyId, actorUid: actor.uid, actorEmail: actor.email, targetEmail: email, eventType: "invite_sent", afterJson: { resent: true, invitationId } });

  return { resent: true };
};

const getInvitationByToken = async (token) => {
  const tokenHash = hashToken(token);
  const { rows } = await dbQuery.query(
    `SELECT ti.invitation_id, ti.company_id, ti.email, ti.access_scope, ti.status, ti.expires_at, ti.invited_team_role_id,
        c.company_name, c.company_logo, tr.role_name
     FROM ${dbSchema}.team_invitations ti
     JOIN ${dbSchema}.companies c ON c.company_id = ti.company_id
     LEFT JOIN ${dbSchema}.team_roles tr ON tr.team_role_id = ti.invited_team_role_id
     WHERE ti.token_hash = $1 LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
};

const isInvitationUsable = (invitation) => !!invitation && invitation.status === "pending" && new Date(invitation.expires_at) > new Date();

/**
 * acceptInvitation — provisions (or links) the invited account and grants
 * company access in one transaction. Mirrors the existing
 * addCompanyUserByEmail provisioning steps (companiesController.js) but
 * gated behind a real pending-invite/token lifecycle instead of firing
 * immediately, and sets team_role_id/access_scope/job_assignments instead
 * of leaving every invite as an undifferentiated full-access member.
 */
const acceptInvitation = async (token, payload, reqUser) => {
  const invitation = await getInvitationByToken(token);
  if (!isInvitationUsable(invitation)) {
    const e = new Error("INVITE_NOT_USABLE");
    e.code = "INVITE_NOT_USABLE";
    throw e;
  }

  let uid;
  let resetLink = null;

  const existingFirebaseUser = await checkUserIfExistInFirebase(invitation.email);
  const accountExists = existingFirebaseUser && existingFirebaseUser.length !== 0 && !!existingFirebaseUser.uid;

  if (accountExists) {
    if (!reqUser || (reqUser.email || "").toLowerCase() !== invitation.email.toLowerCase()) {
      const e = new Error("SIGN_IN_REQUIRED");
      e.code = "SIGN_IN_REQUIRED";
      throw e;
    }
    uid = reqUser.uid;
  } else {
    const password = crypto.randomBytes(24).toString("base64");
    const firstName = (payload && payload.firstName) || "Team";
    const lastName = (payload && payload.lastName) || "Member";
    const userData = await registerNewUserInFirebase({ email: invitation.email, password, firstName, lastName, role: 2 });
    await registerUserInDB({
      uid: userData.uid,
      email: userData.email,
      password: hashPassword(password),
      firstname: firstName,
      lastname: lastName,
      role: 2,
    });
    uid = userData.uid;
    resetLink = await getForgetPwLinkInFirebase(invitation.email);
  }

  let assignedJobIds = [];
  if (invitation.access_scope === "assigned_jobs") {
    const { rows } = await dbQuery.query(`SELECT job_id FROM ${dbSchema}.team_invitation_jobs WHERE invitation_id = $1`, [invitation.invitation_id]);
    assignedJobIds = rows.map((r) => r.job_id);
  }

  await dbQuery.withTransaction(async (client) => {
    const { rows: reCheck } = await client.query(
      `SELECT status FROM ${dbSchema}.team_invitations WHERE invitation_id = $1 FOR UPDATE`,
      [invitation.invitation_id]
    );
    if (!reCheck[0] || reCheck[0].status !== "pending") {
      const e = new Error("INVITE_NOT_USABLE");
      e.code = "INVITE_NOT_USABLE";
      throw e;
    }

    const { rows: existingMembership } = await client.query(
      `SELECT employee_id FROM ${dbSchema}.company_employees WHERE company_id = $1 AND employee_uuid = $2`,
      [invitation.company_id, uid]
    );
    if (existingMembership.length === 0) {
      await client.query(
        `INSERT INTO ${dbSchema}.company_employees
           (employee_id, company_id, employee_uuid, assigned_at, updated_at, position_id, assigned_by, team_role_id, access_scope)
         VALUES ($1, $2, $3, NOW(), NOW(), 0, $4, $5, $6)`,
        [idGenerator(6, "EMP"), invitation.company_id, uid, invitation.invited_by || uid, invitation.invited_team_role_id, invitation.access_scope]
      );
    }

    if (invitation.access_scope === "assigned_jobs" && assignedJobIds.length > 0) {
      await replaceJobAssignments(client, invitation.company_id, uid, assignedJobIds, invitation.invited_by || uid);
    }

    await client.query(
      `UPDATE ${dbSchema}.team_invitations SET status = 'accepted', accepted_at = NOW(), accepted_by_uid = $1, updated_at = NOW() WHERE invitation_id = $2`,
      [uid, invitation.invitation_id]
    );

    await writeAuditLog(
      {
        companyId: invitation.company_id,
        actorUid: uid,
        actorEmail: invitation.email,
        targetUid: uid,
        targetEmail: invitation.email,
        eventType: "invite_accepted",
        afterJson: { roleId: invitation.invited_team_role_id, accessScope: invitation.access_scope, jobIds: assignedJobIds },
      },
      client
    );
  });

  return {
    companyId: invitation.company_id,
    companyName: invitation.company_name,
    resetLink,
    redirectTo: "/signin",
  };
};

const previewInvitation = async (token) => {
  const invitation = await getInvitationByToken(token);
  if (!isInvitationUsable(invitation)) {
    return null;
  }
  return {
    companyName: invitation.company_name,
    companyLogoUrl: invitation.company_logo,
    roleName: invitation.role_name,
  };
};

export {
  addJobAssignment,
  listPermissions,
  listTeamRoles,
  listTeamMembers,
  updateTeamMember,
  removeTeamMember,
  suspendTeamMember,
  reactivateTeamMember,
  listPendingInvites,
  createInvitations,
  revokeInvitation,
  resendInvitation,
  previewInvitation,
  acceptInvitation,
  createCustomRole,
  updateCustomRole,
  archiveCustomRole,
  listAuditLogs,
  writeAuditLog,
};
