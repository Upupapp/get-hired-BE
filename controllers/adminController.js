import dbQuery from "../db/dbQuery";
import env from "../env";
import { getUserProfileById, getUserRoleById } from "../helpers/userDetails";
import { successResponse, errorResponse, status } from "../helpers/status";
import { notifyJobUrlDeleted } from "../services/googleIndexing.service";

// Role integers (db/user_ddl.sql access_roles seed + FE sign-in):
//   0 super_admin, 1 admin, 2 employer, 3 candidate/jobseeker.
// Admin routes are gated to role 1. admins_total counts role 1 only.
const ADMIN_ROLE = 1;
const EMPLOYER_ROLE = 2;
const JOBSEEKER_ROLE = 3;

// jobsController status map: 1 Draft, 2 Published, 3 Expired, 4 Archived.
// Public listings and active-job counts use job_status_id = 2.
// Unpublish sets Archived (4). That hides the job without deleting the row.
const PUBLISHED_JOB_STATUS_ID = 2;
const ARCHIVED_JOB_STATUS_ID = 4;
const JOB_STATUS_NAMES = {
  1: "Draft",
  2: "Published",
  3: "Expired",
  4: "Archived",
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_QUERY_LENGTH = 200;

function schema() {
  const name = env.schema;
  if (typeof name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error("Invalid database schema");
  }
  return name;
}

function asInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

function asNullableInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function statusName(id, dbName) {
  if (dbName) return dbName;
  const key = asNullableInt(id);
  if (key !== null && Object.prototype.hasOwnProperty.call(JOB_STATUS_NAMES, key)) {
    return JOB_STATUS_NAMES[key];
  }
  return null;
}

function likePattern(raw) {
  return "%" + String(raw).replace(/[\\%_]/g, (ch) => "\\" + ch) + "%";
}

function parseOptionalPositiveInt(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { value: fallback };
  }
  const text = String(value).trim();
  if (!/^[0-9]+$/.test(text)) {
    return { error: "page and pageSize must be positive integers." };
  }
  const n = parseInt(text, 10);
  if (n < 1) {
    return { error: "page and pageSize must be positive integers." };
  }
  return { value: n };
}

function parseOptionalIntFilter(value, label) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { value: null };
  }
  const text = String(value).trim();
  if (!/^-?[0-9]+$/.test(text)) {
    return { error: label + " must be an integer." };
  }
  return { value: parseInt(text, 10) };
}

function parseListQuery(query, options) {
  const source = query || {};
  const pageParsed = parseOptionalPositiveInt(source.page, DEFAULT_PAGE);
  if (pageParsed.error) return pageParsed;
  const sizeParsed = parseOptionalPositiveInt(source.pageSize, DEFAULT_PAGE_SIZE);
  if (sizeParsed.error) return sizeParsed;

  let role = null;
  if (options && options.role) {
    const roleParsed = parseOptionalIntFilter(source.role, "role");
    if (roleParsed.error) return roleParsed;
    role = roleParsed.value;
  }

  let jobStatus = null;
  if (options && options.status) {
    const statusParsed = parseOptionalIntFilter(source.status, "status");
    if (statusParsed.error) return statusParsed;
    jobStatus = statusParsed.value;
  }

  const qRaw = source.q === undefined || source.q === null ? "" : String(source.q).trim();
  if (qRaw.length > MAX_QUERY_LENGTH) {
    return { error: "q must be at most " + MAX_QUERY_LENGTH + " characters." };
  }

  const pageSize = Math.min(sizeParsed.value, MAX_PAGE_SIZE);
  return {
    q: qRaw,
    role: role,
    jobStatus: jobStatus,
    page: pageParsed.value,
    pageSize: pageSize,
    offset: (pageParsed.value - 1) * pageSize,
  };
}

function searchClause(columns, paramIndex) {
  const checks = columns.map((column) => column + " ILIKE $" + paramIndex + " ESCAPE E'\\\\'");
  return "(" + checks.join(" OR ") + ")";
}

function userFilters(parsed) {
  const where = [];
  const params = [];
  if (parsed.q) {
    params.push(likePattern(parsed.q));
    where.push(searchClause(
      ["c.email", "u.firstname", "u.lastname", "concat_ws(' ', u.firstname, u.lastname)"],
      params.length
    ));
  }
  if (parsed.role !== null) {
    params.push(parsed.role);
    where.push("c.role = $" + params.length);
  }
  return { where: where, params: params };
}

function jobFilters(parsed) {
  const where = [];
  const params = [];
  if (parsed.q) {
    params.push(likePattern(parsed.q));
    where.push(searchClause(["j.job_title", "c.company_name"], params.length));
  }
  if (parsed.jobStatus !== null) {
    params.push(parsed.jobStatus);
    where.push("j.job_status_id = $" + params.length);
  }
  return { where: where, params: params };
}

function companyFilters(parsed) {
  const where = [];
  const params = [];
  if (parsed.q) {
    params.push(likePattern(parsed.q));
    where.push(searchClause(["c.company_name", "c.company_slug"], params.length));
  }
  return { where: where, params: params };
}

function whereSql(where) {
  if (!where.length) return "";
  return " WHERE " + where.join(" AND ");
}

function withPage(params, parsed) {
  const listParams = params.slice();
  listParams.push(parsed.pageSize);
  const limitIdx = listParams.length;
  listParams.push(parsed.offset);
  const offsetIdx = listParams.length;
  return { listParams: listParams, limitIdx: limitIdx, offsetIdx: offsetIdx };
}

function paged(items, total, parsed) {
  return {
    items: items,
    total: total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

function fail(res, error, label) {
  console.error("[adminController] " + label + " error:", error);
  return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
}

const getUserProfile = async (req, res) => {
  const { id } = req.query;

  try {
    // Kept in addition to verifyRoles([1]) on the route so a direct call
    // still cannot read another user's profile.
    const callerRole = await getUserRoleById(req.user.uid);
    if (callerRole !== ADMIN_ROLE) {
      return res.status(403).send("Forbidden");
    }

    const creds = await getUserProfileById(id);

    return res.status(status.success).json(successResponse(creds));
  } catch (error) {
    return fail(res, error, "getUserProfile");
  }
};

const getDashboard = async (req, res) => {
  const s = safeSchema();
  if (s.error) return fail(res, s.error, "getDashboard");

  // user_credentials: uid, email, password, role, created_date, is_archive.
  // Names live on users (firstname/lastname). Applications use date_applied.
  // password is never selected.
  const sql = `
    SELECT
      (SELECT COUNT(*)::int FROM ${s.name}.user_credentials) AS users_total,
      (SELECT COUNT(*)::int FROM ${s.name}.user_credentials WHERE role = ${JOBSEEKER_ROLE}) AS jobseekers_total,
      (SELECT COUNT(*)::int FROM ${s.name}.user_credentials WHERE role = ${EMPLOYER_ROLE}) AS employers_total,
      (SELECT COUNT(*)::int FROM ${s.name}.user_credentials WHERE role = ${ADMIN_ROLE}) AS admins_total,
      (SELECT COUNT(*)::int FROM ${s.name}.jobs WHERE job_status_id = ${PUBLISHED_JOB_STATUS_ID}) AS jobs_active,
      (SELECT COUNT(*)::int FROM ${s.name}.jobs) AS jobs_total,
      (SELECT COUNT(*)::int FROM ${s.name}.job_applicants WHERE date_applied >= NOW() - INTERVAL '7 days') AS applications_7d,
      (SELECT COUNT(*)::int FROM ${s.name}.job_applicants WHERE date_applied >= NOW() - INTERVAL '30 days') AS applications_30d,
      (SELECT COUNT(*)::int FROM ${s.name}.companies) AS companies_total
  `;

  try {
    const result = await dbQuery.query(sql, []);
    const row = (result && result.rows && result.rows[0]) || {};
    return res.status(status.success).json(successResponse({
      users_total: asInt(row.users_total),
      jobseekers_total: asInt(row.jobseekers_total),
      employers_total: asInt(row.employers_total),
      admins_total: asInt(row.admins_total),
      jobs_active: asInt(row.jobs_active),
      jobs_total: asInt(row.jobs_total),
      applications_7d: asInt(row.applications_7d),
      applications_30d: asInt(row.applications_30d),
      companies_total: asInt(row.companies_total),
    }));
  } catch (error) {
    return fail(res, error, "getDashboard");
  }
};

function safeSchema() {
  try {
    return { name: schema() };
  } catch (error) {
    return { error: error };
  }
}

const listUsers = async (req, res) => {
  const parsed = parseListQuery(req.query, { role: true });
  if (parsed.error) {
    return res.status(status.bad).json(errorResponse(parsed.error));
  }
  const s = safeSchema();
  if (s.error) return fail(res, s.error, "listUsers");

  const filters = userFilters(parsed);
  const page = withPage(filters.params, parsed);
  const from = `
    FROM ${s.name}.user_credentials c
    LEFT JOIN ${s.name}.users u ON u.uid = c.uid
    ${whereSql(filters.where)}
  `;
  // Explicit columns only. user_credentials.password is never selected.
  // created_date is the credentials timestamp (there is no last_login column).
  const listSql = `
    SELECT
      c.uid,
      c.email,
      c.role,
      u.firstname,
      u.lastname,
      c.created_date
    ${from}
    ORDER BY c.created_date DESC NULLS LAST, c.uid ASC
    LIMIT $${page.limitIdx} OFFSET $${page.offsetIdx}
  `;
  const countSql = `SELECT COUNT(*)::int AS total ${from}`;

  try {
    const results = await Promise.all([
      dbQuery.query(countSql, filters.params),
      dbQuery.query(listSql, page.listParams),
    ]);
    const countResult = results[0];
    const listResult = results[1];
    const total = countResult && countResult.rows && countResult.rows[0]
      ? asInt(countResult.rows[0].total)
      : 0;
    const rows = (listResult && listResult.rows) || [];
    const items = rows.map((row) => ({
      uid: row.uid,
      email: row.email,
      role: asNullableInt(row.role),
      first_name: row.firstname || null,
      last_name: row.lastname || null,
      created_at: row.created_date || null,
    }));
    return res.status(status.success).json(successResponse(paged(items, total, parsed)));
  } catch (error) {
    return fail(res, error, "listUsers");
  }
};

const listJobs = async (req, res) => {
  const parsed = parseListQuery(req.query, { status: true });
  if (parsed.error) {
    return res.status(status.bad).json(errorResponse(parsed.error));
  }
  const s = safeSchema();
  if (s.error) return fail(res, s.error, "listJobs");

  const filters = jobFilters(parsed);
  const page = withPage(filters.params, parsed);
  const from = `
    FROM ${s.name}.jobs j
    LEFT JOIN ${s.name}.companies c ON c.company_id = j.company_id
    LEFT JOIN ${s.name}.job_status js ON js.job_status_id = j.job_status_id
    ${whereSql(filters.where)}
  `;
  const listSql = `
    SELECT
      j.job_id,
      j.job_title,
      c.company_name,
      j.job_status_id,
      js.job_status_name,
      j.created_at,
      (SELECT COUNT(*)::int FROM ${s.name}.job_applicants ja WHERE ja.job_id = j.job_id) AS applicant_count
    ${from}
    ORDER BY j.created_at DESC NULLS LAST, j.job_id ASC
    LIMIT $${page.limitIdx} OFFSET $${page.offsetIdx}
  `;
  const countSql = `SELECT COUNT(*)::int AS total ${from}`;

  try {
    const results = await Promise.all([
      dbQuery.query(countSql, filters.params),
      dbQuery.query(listSql, page.listParams),
    ]);
    const countResult = results[0];
    const listResult = results[1];
    const total = countResult && countResult.rows && countResult.rows[0]
      ? asInt(countResult.rows[0].total)
      : 0;
    const rows = (listResult && listResult.rows) || [];
    const items = rows.map((row) => ({
      job_id: row.job_id,
      title: row.job_title,
      company_name: row.company_name || null,
      status: asNullableInt(row.job_status_id),
      status_name: statusName(row.job_status_id, row.job_status_name),
      created_at: row.created_at || null,
      applicant_count: asInt(row.applicant_count),
    }));
    return res.status(status.success).json(successResponse(paged(items, total, parsed)));
  } catch (error) {
    return fail(res, error, "listJobs");
  }
};

function validJobId(raw) {
  const jobId = raw === undefined || raw === null ? "" : String(raw).trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(jobId)) return null;
  return jobId;
}

const unpublishJob = async (req, res) => {
  const jobId = validJobId(req.params && req.params.jobId);
  if (!jobId) {
    return res.status(status.bad).json(errorResponse("Invalid job id."));
  }
  const s = safeSchema();
  if (s.error) return fail(res, s.error, "unpublishJob");

  try {
    const found = await dbQuery.query(
      `SELECT job_id, job_status_id FROM ${s.name}.jobs WHERE job_id = $1`,
      [jobId]
    );
    const current = found && found.rows && found.rows[0];
    if (!current) {
      return res.status(status.notfound).json(errorResponse("Job not found."));
    }

    const previous = asNullableInt(current.job_status_id);
    if (previous !== PUBLISHED_JOB_STATUS_ID) {
      return res.status(status.success).json(successResponse({
        job_id: current.job_id,
        status: previous,
        status_name: statusName(previous),
        previous_status: previous,
        unpublished: true,
        already_unpublished: true,
      }));
    }

    const updated = await dbQuery.query(
      `UPDATE ${s.name}.jobs
       SET job_status_id = $1, updated_at = NOW()
       WHERE job_id = $2 AND job_status_id = $3
       RETURNING job_id, job_status_id`,
      [ARCHIVED_JOB_STATUS_ID, jobId, PUBLISHED_JOB_STATUS_ID]
    );
    const row = updated && updated.rows && updated.rows[0];
    if (!row) {
      const reread = await dbQuery.query(
        `SELECT job_id, job_status_id FROM ${s.name}.jobs WHERE job_id = $1`,
        [jobId]
      );
      const again = reread && reread.rows && reread.rows[0];
      if (!again) {
        return res.status(status.notfound).json(errorResponse("Job not found."));
      }
      const nowStatus = asNullableInt(again.job_status_id);
      return res.status(status.success).json(successResponse({
        job_id: again.job_id,
        status: nowStatus,
        status_name: statusName(nowStatus),
        previous_status: nowStatus,
        unpublished: true,
        already_unpublished: true,
      }));
    }

    // Same indexing side effect as an employer unpublish. No-op unless
    // GOOGLE_INDEXING_API_ENABLED=true. Never deletes the job row.
    notifyJobUrlDeleted({ job_id: row.job_id });

    return res.status(status.success).json(successResponse({
      job_id: row.job_id,
      status: ARCHIVED_JOB_STATUS_ID,
      status_name: JOB_STATUS_NAMES[ARCHIVED_JOB_STATUS_ID],
      previous_status: PUBLISHED_JOB_STATUS_ID,
      unpublished: true,
    }));
  } catch (error) {
    return fail(res, error, "unpublishJob");
  }
};

const listCompanies = async (req, res) => {
  const parsed = parseListQuery(req.query, {});
  if (parsed.error) {
    return res.status(status.bad).json(errorResponse(parsed.error));
  }
  const s = safeSchema();
  if (s.error) return fail(res, s.error, "listCompanies");

  const filters = companyFilters(parsed);
  const page = withPage(filters.params, parsed);
  const from = `
    FROM ${s.name}.companies c
    ${whereSql(filters.where)}
  `;
  // created_at was added by db/20260819b_companies_created_at_column.sql.
  // Open jobs match the public rule: job_status_id = 2.
  const listSql = `
    SELECT
      c.company_id,
      c.company_name,
      c.company_slug,
      c.created_at,
      (SELECT COUNT(*)::int FROM ${s.name}.jobs j
        WHERE j.company_id = c.company_id AND j.job_status_id = ${PUBLISHED_JOB_STATUS_ID}) AS open_jobs_count
    ${from}
    ORDER BY c.company_name ASC, c.company_id ASC
    LIMIT $${page.limitIdx} OFFSET $${page.offsetIdx}
  `;
  const countSql = `SELECT COUNT(*)::int AS total ${from}`;

  try {
    const results = await Promise.all([
      dbQuery.query(countSql, filters.params),
      dbQuery.query(listSql, page.listParams),
    ]);
    const countResult = results[0];
    const listResult = results[1];
    const total = countResult && countResult.rows && countResult.rows[0]
      ? asInt(countResult.rows[0].total)
      : 0;
    const rows = (listResult && listResult.rows) || [];
    const items = rows.map((row) => ({
      company_id: row.company_id,
      company_name: row.company_name,
      slug: row.company_slug || null,
      open_jobs_count: asInt(row.open_jobs_count),
      created_at: row.created_at || null,
    }));
    return res.status(status.success).json(successResponse(paged(items, total, parsed)));
  } catch (error) {
    return fail(res, error, "listCompanies");
  }
};

export {
  getUserProfile,
  getDashboard,
  listUsers,
  listJobs,
  unpublishJob,
  listCompanies,
};
