import dbQuery from "../db/dbQuery";
import env from "../env";
import { getUserCompany, getUserCompanyForRequest, getRequestCache } from "../controllers/companiesController";

const dbSchema = env.schema;

/**
 * accessControl.service.js — Team & Access job-scoped RBAC (V1).
 *
 * This sits ALONGSIDE getUserCompanyForRequest (controllers/companiesController.js),
 * not in place of it. getUserCompanyForRequest remains the single source of truth
 * for COMPANY identity (JWT-derived, never client-trusted). This module adds the
 * role/permission/job-scope layer on top of that, for the new team_roles /
 * team_role_permissions / job_assignments tables (db/20260813_team_access_rbac.sql).
 *
 * AccessContext shape:
 *   {
 *     companyId: string,
 *     employeeId: string,               // company_employees.employee_id (PK)
 *     teamRoleId: string,
 *     roleKey: string | null,           // 'owner' | 'company_admin' | ... | null for custom roles
 *     accessScope: 'all_jobs' | 'assigned_jobs' | 'no_job_access',
 *     permissions: Set<string>,
 *     allowedJobIds: string[] | null,   // null when accessScope === 'all_jobs' (no enumeration needed)
 *   }
 */

const getAccessContextRow = async (companyId, employeeId, accessScope) => {
  const roleQuery = `SELECT ce.team_role_id, ce.access_scope, ce.status, tr.role_key,
      array_remove(array_agg(p.permission_key), NULL) AS permission_keys
    FROM ${dbSchema}.company_employees ce
    LEFT JOIN ${dbSchema}.team_roles tr ON tr.team_role_id = ce.team_role_id
    LEFT JOIN ${dbSchema}.team_role_permissions trp ON trp.team_role_id = ce.team_role_id
    LEFT JOIN ${dbSchema}.permissions p ON p.permission_id = trp.permission_id
    WHERE ce.employee_id = $1 AND ce.company_id = $2
    GROUP BY ce.team_role_id, ce.access_scope, ce.status, tr.role_key`;

  const { rows } = await dbQuery.query(roleQuery, [employeeId, companyId]);
  if (!rows || rows.length === 0) {
    return null;
  }
  return rows[0];
};

const getAllowedJobIds = async (companyId, uid) => {
  const { rows } = await dbQuery.query(
    `SELECT job_id FROM ${dbSchema}.job_assignments WHERE company_id = $1 AND employee_uuid = $2`,
    [companyId, uid]
  );
  return rows.map((r) => r.job_id);
};

/**
 * buildAccessContext(userCompany, uid) -> Promise<AccessContext | null>
 * Shared by both variants below once the company has already been resolved.
 */
const buildAccessContext = async (userCompany, uid) => {
  if (!userCompany || Array.isArray(userCompany)) {
    return null;
  }

  const roleRow = await getAccessContextRow(userCompany.companyId, userCompany.employeedCompanyId, null);
  if (!roleRow || !roleRow.team_role_id) {
    // company_employees row exists but has no team_role_id yet (should not
    // happen post-migration-backfill, but fail closed rather than throw).
    return null;
  }
  if (roleRow.status === "suspended") {
    // Suspended: fail closed exactly like "not a member" (null context ->
    // every hasPermission/canAccessJob check denies). Role/scope/job-assignment
    // rows are untouched in the DB so reactivating restores access exactly
    // as it was, with no re-invite needed.
    return null;
  }

  const accessScope = roleRow.access_scope || "no_job_access";
  const allowedJobIds = accessScope === "assigned_jobs"
    ? await getAllowedJobIds(userCompany.companyId, uid)
    : null;

  return {
    companyId: userCompany.companyId,
    employeeId: userCompany.employeedCompanyId,
    teamRoleId: roleRow.team_role_id,
    roleKey: roleRow.role_key || null,
    accessScope,
    permissions: new Set(roleRow.permission_keys || []),
    allowedJobIds,
  };
};

/**
 * getAccessContext(uid) -> Promise<AccessContext | null>
 * Non-request, non-cached variant -- for services/scripts that don't have a
 * `req` to hang a singleflight cache on. Mirrors the existing
 * getUserCompany()/getUserCompanyForRequest() split in companiesController.js.
 */
const getAccessContext = async (uid) => {
  if (!uid) {
    return null;
  }
  const userCompany = await getUserCompany(uid);
  return buildAccessContext(userCompany, uid);
};

/**
 * getAccessContextForRequest(req, uid) -> Promise<AccessContext | null>
 * Request-scoped singleflight cache, same pattern/Map as getRequestCache()
 * uses for getUserCompanyForRequest — never issues more than one set of
 * queries per uid per request. Reuses getUserCompanyForRequest's own cache
 * for the company lookup itself, so a controller that already resolved the
 * caller's company earlier in the request doesn't pay for it twice.
 */
const getAccessContextForRequest = async (req, uid) => {
  if (!uid) {
    return null;
  }

  const cache = getRequestCache(req);
  const cacheKey = "getAccessContext:" + uid;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const promise = (async () => {
    const userCompany = await getUserCompanyForRequest(req, uid);
    return buildAccessContext(userCompany, uid);
  })().catch((error) => {
    cache.delete(cacheKey);
    throw error;
  });

  cache.set(cacheKey, promise);
  return promise;
};

const hasPermission = (ctx, permissionKey) => !!(ctx && ctx.permissions && ctx.permissions.has(permissionKey));

const forbiddenError = () => {
  const e = new Error("FORBIDDEN");
  e.code = "FORBIDDEN";
  return e;
};

const assertPermission = (ctx, permissionKey) => {
  if (!hasPermission(ctx, permissionKey)) {
    throw forbiddenError();
  }
};

/**
 * permissionsNotGranted(ctx, permissionKeys) -> string[]
 * Returns the subset of permissionKeys the caller does NOT hold. Empty
 * array means the caller can legitimately grant/assign every key in the
 * list. Single source of truth for "can't grant permissions you don't
 * have" -- used for both role-grant-on-invite/update and custom-role
 * creation, so the escalation-prevention rule can't drift between them.
 */
const permissionsNotGranted = (ctx, permissionKeys) => {
  const keys = Array.isArray(permissionKeys) ? permissionKeys : [];
  if (!ctx || !ctx.permissions) return keys.slice();
  return keys.filter((k) => !ctx.permissions.has(k));
};

/**
 * canAccessJob(ctx, jobId) — the single chokepoint for job-level BOLA checks.
 */
const canAccessJob = (ctx, jobId) => {
  if (!ctx || !jobId) return false;
  if (ctx.accessScope === "all_jobs") return true;
  if (ctx.accessScope === "assigned_jobs") {
    return Array.isArray(ctx.allowedJobIds) && ctx.allowedJobIds.indexOf(jobId) !== -1;
  }
  return false; // 'no_job_access'
};

const assertJobAccess = (ctx, jobId) => {
  if (!canAccessJob(ctx, jobId)) {
    throw forbiddenError();
  }
};

/**
 * assertApplicationJobAccess(ctx, applicationId) -> Promise<string jobId>
 * Resolves job_id for a job_application_id in one query and throws FORBIDDEN
 * identically for "doesn't exist" and "wrong company/scope" — mirrors the
 * existing 403-for-both-cases oracle-avoidance pattern in
 * applicationController.js:getEmployerApplicantSnapshotSummary, extended
 * with the job-scope check.
 */
const assertApplicationJobAccess = async (ctx, applicationId) => {
  if (!ctx || !applicationId) {
    throw forbiddenError();
  }
  const { rows } = await dbQuery.query(
    `SELECT ja.job_id, j.company_id
     FROM ${dbSchema}.job_applicants ja
     JOIN ${dbSchema}.jobs j ON j.job_id = ja.job_id
     WHERE ja.job_application_id = $1 LIMIT 1`,
    [applicationId]
  );
  if (!rows || rows.length === 0 || rows[0].company_id !== ctx.companyId || !canAccessJob(ctx, rows[0].job_id)) {
    throw forbiddenError();
  }
  return rows[0].job_id;
};

/**
 * sqlJobScopeFilter(ctx, columnExpr, paramIndex) -> { clause: string, param: string[] | null }
 * For LIST endpoints. `columnExpr` is the SQL expression for the job_id column
 * in the query being filtered (e.g. "j.job_id"). `paramIndex` is the next
 * available $N placeholder position.
 *   - all_jobs:       no-op, zero overhead on the common case.
 *   - assigned_jobs:  `AND <columnExpr> = ANY($paramIndex)`, param = allowedJobIds.
 *   - no_job_access:  `AND 1=0` — empty result set, not an error; a scoped-out
 *                      list view should render "no jobs", not crash.
 */
const sqlJobScopeFilter = (ctx, columnExpr, paramIndex) => {
  if (!ctx || ctx.accessScope === "no_job_access") {
    return { clause: " AND 1=0", param: null };
  }
  if (ctx.accessScope === "assigned_jobs") {
    return { clause: ` AND ${columnExpr} = ANY($${paramIndex}::text[])`, param: ctx.allowedJobIds || [] };
  }
  return { clause: "", param: null }; // all_jobs
};

export {
  getAccessContext,
  getAccessContextForRequest,
  hasPermission,
  assertPermission,
  permissionsNotGranted,
  canAccessJob,
  assertJobAccess,
  assertApplicationJobAccess,
  sqlJobScopeFilter,
};
