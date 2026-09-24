import dbQuery from "../db/dbQuery";
import env from "../env";
import { getUserProfileById, getUserRoleById } from "../helpers/userDetails";
import { successResponse, errorResponse, status } from "../helpers/status";
import { notifyJobUrlDeleted } from "../services/googleIndexing.service";
import { PLAN_FACTS, SUBSCRIPTION_STATUSES, PAYMENT_STATUSES, parseAdminRange, hasRangeInput, emptyVisits, normalizeSubscriptionRow, entitlementMeters, paymentFromLedger, mergePayments, assembleFinance, historyFromLifecycle, historyFromPayments, mergeHistory, validCompanyId, isMissingSchemaObject } from "../helpers/adminScreens";

// Role integers (db/user_ddl.sql access_roles seed + FE sign-in):
//   0 super_admin, 1 admin, 2 employer, 3 candidate/jobseeker.
// Admin routes allow 0 and 1. The FE still treats role '1' as admin;
// role 0 is an additional backend pass and does not change role-1 behavior.
// admins_total counts role 1 only.
const ADMIN_ROLES = [0, 1];
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
const JOB_STATUS_WORDS = {
  draft: 1,
  published: 2,
  expired: 3,
  archived: 4,
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

function parseIncludeArchived(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { value: false };
  }
  const text = String(value).trim().toLowerCase();
  if (text === "true" || text === "1") return { value: true };
  if (text === "false" || text === "0") return { value: false };
  return { error: "includeArchived must be true or false." };
}

function parseJobStatusFilter(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { value: null };
  }
  const text = String(value).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(JOB_STATUS_WORDS, text)) {
    return { value: JOB_STATUS_WORDS[text] };
  }
  if (!/^-?[0-9]+$/.test(text)) {
    return { error: "status must be a job status id (1-4) or draft, published, expired, archived." };
  }
  return { value: parseInt(text, 10) };
}

function parseEnum(value, allowed, label) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { value: null };
  }
  const text = String(value).trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(allowed, text)) {
    return { error: label + " is not a recognised value." };
  }
  return { value: text };
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
    const statusParsed = parseJobStatusFilter(source.status);
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
  // user_credentials.is_archive defaults false. Hide archived accounts
  // unless the caller passes includeArchived=true.
  if (!parsed.includeArchived) {
    where.push("c.is_archive = false");
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
    // Same allow-list as verifyRoles([0, 1]) on the route, so a direct
    // call still cannot read another user's profile. Role 1 keeps working;
    // role 0 (super_admin) is allowed here too.
    const callerRole = await getUserRoleById(req.user.uid);
    if (ADMIN_ROLES.indexOf(callerRole) === -1) {
      return res.status(403).json({ message: "User not allowed to access this API" });
    }

    const creds = await getUserProfileById(id);

    return res.status(status.success).json(successResponse(creds));
  } catch (error) {
    return fail(res, error, "getUserProfile");
  }
};

const getDashboard = async (req, res) => {
  const archived = parseIncludeArchived(req.query && req.query.includeArchived);
  if (archived.error) {
    return res.status(status.bad).json(errorResponse(archived.error));
  }
  const range = parseAdminRange(req.query, new Date());
  if (range.error) {
    return res.status(status.bad).json(errorResponse(range.error));
  }
  const s = safeSchema();
  if (s.error) return fail(res, s.error, "getDashboard");

  // user_credentials: uid, email, password, role, created_date, is_archive.
  // Names live on users (firstname/lastname). Applications use date_applied.
  // password is never selected. Archived users are excluded unless
  // includeArchived=true. Jobs and companies are not archive-filtered.
  const userWhere = archived.value ? "" : " WHERE is_archive = false";
  const userAnd = archived.value ? "" : " AND is_archive = false";
  const sql = `
    SELECT
      (SELECT COUNT(*)::int FROM ${s.name}.user_credentials${userWhere}) AS users_total,
      (SELECT COUNT(*)::int FROM ${s.name}.user_credentials WHERE role = ${JOBSEEKER_ROLE}${userAnd}) AS jobseekers_total,
      (SELECT COUNT(*)::int FROM ${s.name}.user_credentials WHERE role = ${EMPLOYER_ROLE}${userAnd}) AS employers_total,
      (SELECT COUNT(*)::int FROM ${s.name}.user_credentials WHERE role = ${ADMIN_ROLE}${userAnd}) AS admins_total,
      (SELECT COUNT(*)::int FROM ${s.name}.jobs WHERE job_status_id = ${PUBLISHED_JOB_STATUS_ID}) AS jobs_active,
      (SELECT COUNT(*)::int FROM ${s.name}.jobs) AS jobs_total,
      (SELECT COUNT(*)::int FROM ${s.name}.job_applicants WHERE date_applied >= NOW() - INTERVAL '7 days') AS applications_7d,
      (SELECT COUNT(*)::int FROM ${s.name}.job_applicants WHERE date_applied >= NOW() - INTERVAL '30 days') AS applications_30d,
      (SELECT COUNT(*)::int FROM ${s.name}.companies) AS companies_total
  `;

  const inRangeSql = `
    SELECT COUNT(*)::int AS applications_in_range
    FROM ${s.name}.job_applicants
    WHERE date_applied >= $1 AND date_applied < $2
  `;

  try {
    const results = await Promise.all([
      dbQuery.query(sql, []),
      dbQuery.query(inRangeSql, [range.fromAt, range.toAt]),
    ]);
    const result = results[0];
    const inRange = results[1];
    const row = (result && result.rows && result.rows[0]) || {};
    const inRangeRow = (inRange && inRange.rows && inRange.rows[0]) || {};
    const visits = emptyVisits(range);
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
      applications_in_range: asInt(inRangeRow.applications_in_range),
      visits_total: visits.visits_total,
      visits_previous: visits.visits_previous,
      visits_series: visits.visits_series,
      visits_metric_label: visits.visits_metric_label,
      range: range.range,
      from: range.from,
      to: range.to,
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
  const archived = parseIncludeArchived(req.query && req.query.includeArchived);
  if (archived.error) {
    return res.status(status.bad).json(errorResponse(archived.error));
  }
  parsed.includeArchived = archived.value;
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
  // created_date is the credentials timestamp. There is no last_login column
  // on user_credentials. last_login is the latest auth_identities.last_login_at
  // (OAuth only). Email/password accounts stay null. If that table is absent
  // the query is retried without it.
  const loginSelect = `
      (SELECT MAX(ai.last_login_at)
         FROM ${s.name}.auth_identities ai
        WHERE ai.user_uid = c.uid AND ai.unlinked_at IS NULL) AS last_login`;
  const listSql = `
    SELECT
      c.uid,
      c.email,
      c.role,
      u.firstname,
      u.lastname,
      c.created_date,
      c.is_archive,
      ${loginSelect}
    ${from}
    ORDER BY c.created_date DESC NULLS LAST, c.uid ASC
    LIMIT $${page.limitIdx} OFFSET $${page.offsetIdx}
  `;
  const listSqlNoLogin = `
    SELECT
      c.uid,
      c.email,
      c.role,
      u.firstname,
      u.lastname,
      c.created_date,
      c.is_archive,
      NULL::timestamptz AS last_login
    ${from}
    ORDER BY c.created_date DESC NULLS LAST, c.uid ASC
    LIMIT $${page.limitIdx} OFFSET $${page.offsetIdx}
  `;
  const countSql = `SELECT COUNT(*)::int AS total ${from}`;

  try {
    let results;
    try {
      results = await Promise.all([
        dbQuery.query(countSql, filters.params),
        dbQuery.query(listSql, page.listParams),
      ]);
    } catch (error) {
      if (!isMissingSchemaObject(error)) throw error;
      results = await Promise.all([
        dbQuery.query(countSql, filters.params),
        dbQuery.query(listSqlNoLogin, page.listParams),
      ]);
    }
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
      last_login: row.last_login || null,
      is_archived: row.is_archive === true,
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
      already_unpublished: false,
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

async function queryOptional(sql, params, label) {
  try {
    const result = await dbQuery.query(sql, params);
    return { rows: (result && result.rows) || [], missing: false };
  } catch (error) {
    if (isMissingSchemaObject(error)) {
      console.warn("[adminController] " + label + " unavailable:", error && error.message ? error.message : error);
      return { rows: [], missing: true };
    }
    throw error;
  }
}

function latestSubscriptionSql(schemaName) {
  return `
    SELECT DISTINCT ON (cs.company_id)
      cs.company_id,
      co.company_name,
      cs.subscription_id,
      cs.plan_slug,
      cs.billing_cycle,
      cs.sub_status,
      cs.is_paid,
      cs.created_at,
      cs.period_start,
      cs.period_end,
      cs.payment_date,
      s.canonical_slug,
      s.payment_occurence,
      to_jsonb(cs) AS subscription_row
    FROM ${schemaName}.companies_subscription cs
    JOIN ${schemaName}.companies co ON co.company_id = cs.company_id
    LEFT JOIN ${schemaName}."subscription" s ON s.subscription_id = cs.subscription_id
  `;
}

function applyLastPayment(rows, lastRows) {
  const map = {};
  const source = lastRows || [];
  let i;
  for (i = 0; i < source.length; i++) {
    map[source[i].company_id] = source[i].last_payment_at;
  }
  return (rows || []).map(function (row) {
    const copy = Object.assign({}, row);
    if (map[copy.company_id]) copy.last_payment_at = map[copy.company_id];
    return copy;
  });
}

async function loadSubscriptions(schemaName, companyId) {
  const params = [];
  let where = "";
  if (companyId) {
    params.push(companyId);
    where = " WHERE cs.company_id = $1";
  }
  const sql = latestSubscriptionSql(schemaName) + where + `
    ORDER BY cs.company_id, cs.created_at DESC NULLS LAST, cs.id DESC
  `;
  return queryOptional(sql, params, "companies_subscription");
}

async function loadLastPayments(schemaName, companyId) {
  const params = [];
  let where = " WHERE status = 'PAID'";
  if (companyId) {
    params.push(companyId);
    where += " AND company_id = $1";
  }
  const sql = `
    SELECT company_id, MAX(paid_at) AS last_payment_at
    FROM ${schemaName}.payment_transactions
    ${where}
    GROUP BY company_id
  `;
  return queryOptional(sql, params, "payment_transactions last payment");
}

function paymentRangeClause(columnExpr, params, range) {
  if (!range) return "";
  params.push(range.fromAt);
  const fromIdx = params.length;
  params.push(range.toAt);
  const toIdx = params.length;
  return " AND " + columnExpr + " >= $" + fromIdx + " AND " + columnExpr + " < $" + toIdx;
}

async function loadLedgerPayments(schemaName, range, companyId) {
  const params = [];
  const where = ["TRUE"];
  if (companyId) {
    params.push(companyId);
    where.push("t.company_id = $" + params.length);
  }
  const rangeSql = paymentRangeClause("t.paid_at", params, range);
  const sql = `
    SELECT
      t.id,
      t.paid_at,
      t.company_id,
      co.company_name,
      t.gross_minor,
      t.status AS raw_status,
      t.payment_method_summary AS method,
      t.provider_payment_id AS external_id,
      a.plan_version_id
    FROM ${schemaName}.payment_transactions t
    LEFT JOIN ${schemaName}.companies co ON co.company_id = t.company_id
    LEFT JOIN ${schemaName}.payment_attempts a ON a.id = t.attempt_id
    WHERE ${where.join(" AND ")}
    ${rangeSql}
  `;
  const joined = await queryOptional(sql, params, "payment_transactions");
  if (!joined.missing) return joined;

  const bareParams = [];
  const bareWhere = ["TRUE"];
  if (companyId) {
    bareParams.push(companyId);
    bareWhere.push("t.company_id = $" + bareParams.length);
  }
  const bareRange = paymentRangeClause("t.paid_at", bareParams, range);
  const bareSql = `
    SELECT
      t.id,
      t.paid_at,
      t.company_id,
      co.company_name,
      t.gross_minor,
      t.status AS raw_status,
      t.payment_method_summary AS method,
      t.provider_payment_id AS external_id,
      NULL::varchar AS plan_version_id
    FROM ${schemaName}.payment_transactions t
    LEFT JOIN ${schemaName}.companies co ON co.company_id = t.company_id
    WHERE ${bareWhere.join(" AND ")}
    ${bareRange}
  `;
  return queryOptional(bareSql, bareParams, "payment_transactions");
}

async function loadAttemptPayments(schemaName, range, companyId) {
  const params = [];
  const where = ["t.id IS NULL"];
  if (companyId) {
    params.push(companyId);
    where.push("a.company_id = $" + params.length);
  }
  const stamp = "COALESCE(a.paid_at, a.failed_at, a.created_at)";
  const rangeSql = paymentRangeClause(stamp, params, range);
  const sql = `
    SELECT
      a.id,
      ${stamp} AS paid_at,
      a.company_id,
      co.company_name,
      a.expected_amount_minor AS gross_minor,
      a.status AS raw_status,
      NULL::varchar AS method,
      COALESCE(a.paymongo_payment_id, a.paymongo_reference_number, a.internal_reference) AS external_id,
      a.plan_version_id
    FROM ${schemaName}.payment_attempts a
    LEFT JOIN ${schemaName}.payment_transactions t ON t.attempt_id = a.id
    LEFT JOIN ${schemaName}.companies co ON co.company_id = a.company_id
    WHERE ${where.join(" AND ")}
    ${rangeSql}
  `;
  return queryOptional(sql, params, "payment_attempts");
}

async function loadInvoicePayments(schemaName, range, companyId) {
  const params = [];
  const where = ["TRUE"];
  if (companyId) {
    params.push(companyId);
    where.push("i.company_id = $" + params.length);
  }
  const stamp = "COALESCE(i.paid_at, i.issued_at, i.created_at)";
  const rangeSql = paymentRangeClause(stamp, params, range);
  const sql = `
    SELECT
      i.id,
      ${stamp} AS paid_at,
      i.company_id,
      co.company_name,
      i.total_amount AS amount_php,
      i.status AS raw_status,
      i.payment_method_label AS method,
      COALESCE(i.payment_reference, i.transaction_id, i.invoice_number) AS external_id,
      i.plan_slug
    FROM ${schemaName}.invoices i
    LEFT JOIN ${schemaName}.companies co ON co.company_id = i.company_id
    WHERE ${where.join(" AND ")}
    ${rangeSql}
  `;
  return queryOptional(sql, params, "invoices");
}

async function loadPayments(schemaName, range, companyId) {
  const ledger = await loadLedgerPayments(schemaName, range, companyId);
  const attempts = ledger.missing ? { rows: [] } : await loadAttemptPayments(schemaName, range, companyId);
  const invoices = await loadInvoicePayments(schemaName, range, companyId);
  const ledgerRows = (ledger.rows || []).map(paymentFromLedger);
  const attemptRows = (attempts.rows || []).map(paymentFromLedger);
  const invoiceRows = (invoices.rows || []).map(paymentFromLedger);
  if (ledger.missing) return mergePayments([invoiceRows]);
  return mergePayments([ledgerRows, attemptRows, invoiceRows]);
}

const listApplications = async (req, res) => {
  const parsed = parseListQuery(req.query, {});
  if (parsed.error) {
    return res.status(status.bad).json(errorResponse(parsed.error));
  }
  let range = null;
  if (hasRangeInput(req.query)) {
    range = parseAdminRange(req.query, new Date());
    if (range.error) {
      return res.status(status.bad).json(errorResponse(range.error));
    }
  }
  const s = safeSchema();
  if (s.error) return fail(res, s.error, "listApplications");

  const where = [];
  const params = [];
  if (parsed.q) {
    params.push(likePattern(parsed.q));
    where.push(searchClause(
      [
        "uc.email",
        "u.firstname",
        "u.lastname",
        "concat_ws(' ', u.firstname, u.lastname)",
        "j.job_title",
        "c.company_name",
      ],
      params.length
    ));
  }
  if (range) {
    params.push(range.fromAt);
    where.push("ja.date_applied >= $" + params.length);
    params.push(range.toAt);
    where.push("ja.date_applied < $" + params.length);
  }
  const page = withPage(params, parsed);
  const from = `
    FROM ${s.name}.job_applicants ja
    LEFT JOIN ${s.name}.jobs j ON j.job_id = ja.job_id
    LEFT JOIN ${s.name}.companies c ON c.company_id = j.company_id
    LEFT JOIN ${s.name}.user_credentials uc ON uc.uid = ja.candidate_id
    LEFT JOIN ${s.name}.users u ON u.uid = ja.candidate_id
    LEFT JOIN ${s.name}.job_applicant_status jas ON jas.job_applicant_status_id = ja.application_status_id
    ${whereSql(where)}
  `;
  const listSql = `
    SELECT
      ja.job_application_id,
      ja.date_applied,
      uc.email,
      u.firstname,
      u.lastname,
      j.job_id,
      j.job_title,
      c.company_name,
      jas.job_applicant_status_name
    ${from}
    ORDER BY ja.date_applied DESC NULLS LAST, ja.job_application_id ASC
    LIMIT $${page.limitIdx} OFFSET $${page.offsetIdx}
  `;
  const countSql = `SELECT COUNT(*)::int AS total ${from}`;

  try {
    const results = await Promise.all([
      dbQuery.query(countSql, params),
      dbQuery.query(listSql, page.listParams),
    ]);
    const total = results[0] && results[0].rows && results[0].rows[0]
      ? asInt(results[0].rows[0].total)
      : 0;
    const rows = (results[1] && results[1].rows) || [];
    const items = rows.map(function (row) {
      const name = [row.firstname, row.lastname].filter(Boolean).join(" ").trim();
      return {
        application_id: row.job_application_id,
        date_applied: row.date_applied || null,
        seeker_name: name || null,
        seeker_email: row.email || null,
        job_id: row.job_id || null,
        job_title: row.job_title || null,
        company_name: row.company_name || null,
        status: row.job_applicant_status_name || null,
      };
    });
    return res.status(status.success).json(successResponse(paged(items, total, parsed)));
  } catch (error) {
    return fail(res, error, "listApplications");
  }
};

function parseFinanceQuery(query) {
  const parsed = parseListQuery(query, {});
  if (parsed.error) return parsed;
  const source = query || {};
  const payPage = parseOptionalPositiveInt(source.payPage, DEFAULT_PAGE);
  if (payPage.error) return { error: "payPage must be a positive integer." };
  const plan = parseEnum(source.plan, {
    free_trial: true,
    starter: true,
    growth: true,
    business: true,
    other: true,
  }, "plan");
  if (plan.error) return plan;
  const subStatus = parseEnum(source.status, SUBSCRIPTION_STATUSES, "status");
  if (subStatus.error) return subStatus;
  const payStatus = parseEnum(source.payStatus, PAYMENT_STATUSES, "payStatus");
  if (payStatus.error) return payStatus;
  parsed.payPage = payPage.value;
  parsed.plan = plan.value;
  parsed.subStatus = subStatus.value;
  parsed.payStatus = payStatus.value;
  return parsed;
}

const getFinance = async (req, res) => {
  const range = parseAdminRange(req.query, new Date());
  if (range.error) {
    return res.status(status.bad).json(errorResponse(range.error));
  }
  const parsed = parseFinanceQuery(req.query);
  if (parsed.error) {
    return res.status(status.bad).json(errorResponse(parsed.error));
  }
  const s = safeSchema();
  if (s.error) return fail(res, s.error, "getFinance");

  try {
    const loaded = await Promise.all([
      loadSubscriptions(s.name, null),
      loadLastPayments(s.name, null),
      loadPayments(s.name, range, null),
    ]);
    const subRows = applyLastPayment(loaded[0].rows, loaded[1].rows);
    const now = new Date();
    const subscriptions = subRows.map(function (row) {
      return normalizeSubscriptionRow(row, now);
    });
    const body = assembleFinance(subscriptions, loaded[2], range, {
      q: parsed.q,
      plan: parsed.plan,
      status: parsed.subStatus,
      payStatus: parsed.payStatus,
      page: parsed.page,
      pageSize: parsed.pageSize,
      payPage: parsed.payPage,
    });
    return res.status(status.success).json(successResponse(body));
  } catch (error) {
    return fail(res, error, "getFinance");
  }
};

async function loadCompanyAdmins(schemaName, companyId) {
  const withRoles = `
    SELECT
      u.firstname,
      u.lastname,
      uc.email,
      u.phone_number,
      u.cell_number,
      tr.role_name,
      tr.is_owner_role
    FROM ${schemaName}.company_employees ce
    LEFT JOIN ${schemaName}.users u ON u.uid = ce.employee_uuid
    LEFT JOIN ${schemaName}.user_credentials uc ON uc.uid = ce.employee_uuid
    LEFT JOIN ${schemaName}.team_roles tr ON tr.team_role_id = ce.team_role_id
    WHERE ce.company_id = $1 AND ce.status IS DISTINCT FROM 'suspended'
    ORDER BY tr.is_owner_role DESC NULLS LAST, ce.assigned_at ASC
  `;
  try {
    const result = await dbQuery.query(withRoles, [companyId]);
    return (result && result.rows) || [];
  } catch (error) {
    if (!isMissingSchemaObject(error)) throw error;
    const plain = `
      SELECT
        u.firstname,
        u.lastname,
        uc.email,
        u.phone_number,
        u.cell_number,
        NULL::varchar AS role_name,
        NULL::boolean AS is_owner_role
      FROM ${schemaName}.company_employees ce
      LEFT JOIN ${schemaName}.users u ON u.uid = ce.employee_uuid
      LEFT JOIN ${schemaName}.user_credentials uc ON uc.uid = ce.employee_uuid
      WHERE ce.company_id = $1 AND ce.status IS DISTINCT FROM 'suspended'
      ORDER BY ce.assigned_at ASC
    `;
    const result = await dbQuery.query(plain, [companyId]);
    return (result && result.rows) || [];
  }
}

async function loadCompanyUsage(schemaName, companyId) {
  const sql = `
    SELECT
      (SELECT COUNT(*)::int FROM ${schemaName}.jobs
        WHERE company_id = $1 AND job_status_id = ${PUBLISHED_JOB_STATUS_ID}) AS jobs_used,
      (SELECT COUNT(*)::int FROM ${schemaName}.company_employees
        WHERE company_id = $1 AND status IS DISTINCT FROM 'suspended') AS admins_used,
      (SELECT COUNT(*)::int FROM ${schemaName}.interview_answers ia
        JOIN ${schemaName}.jobs j ON j.job_id = ia.job_id
        WHERE j.company_id = $1) AS videos_used
  `;
  const result = await dbQuery.query(sql, [companyId]);
  const row = (result && result.rows && result.rows[0]) || {};
  return {
    jobs: asInt(row.jobs_used),
    admins: asInt(row.admins_used),
    videos: asInt(row.videos_used),
  };
}

async function loadLifecycleHistory(schemaName, companyId) {
  const sql = `
    SELECT event_type, previous_status, new_status, plan_slug, amount, created_at
    FROM ${schemaName}.subscription_lifecycle_events
    WHERE company_id = $1
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return queryOptional(sql, [companyId], "subscription_lifecycle_events");
}

const getCompany = async (req, res) => {
  const companyId = validCompanyId(req.params && req.params.companyId);
  if (!companyId) {
    return res.status(status.bad).json(errorResponse("Invalid company id."));
  }
  const s = safeSchema();
  if (s.error) return fail(res, s.error, "getCompany");

  try {
    const found = await dbQuery.query(
      `SELECT company_id, company_name, company_slug, created_at
       FROM ${s.name}.companies
       WHERE company_id = $1`,
      [companyId]
    );
    const company = found && found.rows && found.rows[0];
    if (!company) {
      return res.status(status.notfound).json(errorResponse("Company not found."));
    }

    const loaded = await Promise.all([
      loadCompanyAdmins(s.name, companyId),
      loadCompanyUsage(s.name, companyId),
      loadSubscriptions(s.name, companyId),
      loadLastPayments(s.name, companyId),
      loadPayments(s.name, null, companyId),
      loadLifecycleHistory(s.name, companyId),
    ]);
    const admins = (loaded[0] || []).map(function (row) {
      const name = [row.firstname, row.lastname].filter(Boolean).join(" ").trim();
      return {
        name: name || null,
        email: row.email || null,
        phone: row.phone_number || row.cell_number || null,
        role: row.role_name || (row.is_owner_role ? "Owner" : "Admin"),
      };
    });
    const usage = loaded[1];
    const subRows = applyLastPayment(loaded[2].rows, loaded[3].rows);
    const now = new Date();
    let subscription = null;
    if (subRows.length) {
      const normalized = normalizeSubscriptionRow(subRows[0], now);
      subscription = {
        plan_slug: normalized.plan_slug,
        plan_label: normalized.plan_label,
        status: normalized.status,
        cycle: normalized.cycle,
        started_at: normalized.started_at,
        period_end: normalized.period_end,
        trial_days_left: normalized.trial_days_left,
        mrr_php: normalized.mrr_php,
        entitlements: entitlementMeters(subRows[0], normalized.plan_slug, usage),
      };
    }
    const payments = loaded[4];
    const history = mergeHistory([
      historyFromLifecycle(loaded[5].rows),
      historyFromPayments(payments),
    ]);

    return res.status(status.success).json(successResponse({
      company_id: company.company_id,
      company_name: company.company_name,
      slug: company.company_slug || null,
      created_at: company.created_at || null,
      open_jobs_count: usage.jobs,
      admins: admins,
      subscription: subscription,
      payments: payments,
      history: history,
    }));
  } catch (error) {
    return fail(res, error, "getCompany");
  }
};

export {
  getUserProfile,
  getDashboard,
  listUsers,
  listJobs,
  unpublishJob,
  listCompanies,
  listApplications,
  getFinance,
  getCompany,
  parseAdminRange,
  assembleFinance,
  normalizeSubscriptionRow,
  entitlementMeters,
  PLAN_FACTS,
};
