/**
 * Admin MVP handlers. Stubs dbQuery so no database is required.
 * Run: node --test tests/adminMvp.unit.cjs
 *
 * Schema assumptions locked in here:
 * - role 0 super_admin and role 1 admin may call these routes; FE still treats '1' as admin
 * - role 2 employer, 3 jobseeker (candidate)
 * - user_credentials.is_archive = false unless includeArchived=true
 * - jobs.job_status_id 2 = published/active; unpublish sets 4 (Archived)
 * - user names are users.firstname/lastname; timestamp is user_credentials.created_date
 * - applications are counted on job_applicants.date_applied
 * - companies.company_slug and companies.created_at
 */

process.env.is_staging = "false";
process.env.SCHEMA = "gethired";
process.env.NODE_ENV = "test";
delete process.env.GOOGLE_INDEXING_API_ENABLED;

const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// The repo loads ESM through the unmaintained `esm` package, which aborts on
// this Node version. This loader only compiles the admin controller and
// helpers/status.js, and stubs the database and indexing modules.
function loadController(dbStub, indexingStub) {
  const root = path.join(__dirname, "..");
  const cache = new Map();
  const stubs = new Map();
  stubs.set(path.join(root, "db/dbQuery.js"), { default: dbStub });
  stubs.set(path.join(root, "env.js"), { default: { schema: "gethired" } });
  stubs.set(path.join(root, "helpers/userDetails.js"), {
    getUserRoleById: async () => caller.role,
    getUserProfileById: async (id) => {
      caller.profileReads += 1;
      return { uid: id || "u1" };
    },
  });
  stubs.set(path.join(root, "services/googleIndexing.service.js"), {
    notifyJobUrlDeleted: indexingStub,
    notifyJobUrlUpdated: () => {},
  });

  function resolve(fromFile, spec) {
    const base = path.resolve(path.dirname(fromFile), spec);
    const candidates = [base, base + ".js", path.join(base, "index.js")];
    for (let i = 0; i < candidates.length; i++) {
      if (fs.existsSync(candidates[i]) && fs.statSync(candidates[i]).isFile()) {
        return candidates[i];
      }
    }
    throw new Error("Cannot resolve " + spec + " from " + fromFile);
  }

  function bindImport(clause, spec) {
    const load = "__load(" + JSON.stringify(spec) + ")";
    const trimmed = clause.trim();
    if (trimmed.charAt(0) === "{") {
      return bindNamed(load, trimmed);
    }
    return "const " + trimmed + " = " + load + ".default;";
  }

  function bindNamed(load, clause) {
    const inner = clause.slice(1, -1);
    return inner.split(",").map((part) => {
      const bits = part.trim().split(/\s+as\s+/);
      const local = (bits[1] || bits[0]).trim();
      const imported = bits[0].trim();
      return "const " + local + " = " + load + "." + imported + ";";
    }).join("\n");
  }

  function transform(code) {
    const loads = [];
    const withoutImports = code.replace(/^import\s+(.+?)\s+from\s+['"](.+?)['"];?\s*$/gm, (_, clause, spec) => {
      loads.push(bindImport(clause, spec));
      return "";
    });
    const body = withoutImports.replace(/export\s+\{([^}]+)\}\s*;?/g, (_, names) => {
      const fields = names.split(",").map((name) => name.trim()).filter(Boolean);
      return "module.exports = { " + fields.join(", ") + " };";
    });
    return loads.join("\n") + "\n" + body;
  }

  function load(absPath) {
    if (cache.has(absPath)) return cache.get(absPath);
    if (stubs.has(absPath)) {
      cache.set(absPath, stubs.get(absPath));
      return stubs.get(absPath);
    }
    const transformed = transform(fs.readFileSync(absPath, "utf8"));
    const module = { exports: {} };
    const fn = new Function("__load", "module", "exports", transformed);
    fn((spec) => load(resolve(absPath, spec)), module, module.exports);
    cache.set(absPath, module.exports);
    return module.exports;
  }

  return load(path.join(root, "controllers/adminController.js"));
}

const dbQuery = {
  async query() {
    return { rows: [], rowCount: 0 };
  },
  async close() {},
};
const indexingCalls = [];
const caller = { role: 1, profileReads: 0 };
const admin = loadController(dbQuery, (job) => {
  indexingCalls.push(job);
});

const calls = [];

function mockRes() {
  const res = { statusCode: null, body: null, sent: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  res.send = (body) => {
    res.sent = body;
    return res;
  };
  return res;
}

function req(query, params) {
  return { query: query || {}, params: params || {}, user: { uid: "admin-uid" } };
}

beforeEach(() => {
  calls.length = 0;
  indexingCalls.length = 0;
  caller.role = 1;
  caller.profileReads = 0;
  dbQuery.query = async (sql, params) => {
    calls.push({ sql: String(sql), params: params || [] });
    return { rows: [], rowCount: 0 };
  };
});

function sqlBlob() {
  return calls.map((call) => call.sql).join("\n");
}

describe("admin route gate", () => {
  test("every admin route uses verifyAuth and verifyRoles([0, 1])", () => {
    const src = fs.readFileSync(path.join(__dirname, "../routes/adminRoute.js"), "utf8");
    const lines = src.split("\n").filter((line) => line.indexOf("router.") === 0);
    assert.equal(lines.length, 9);
    lines.forEach((line) => {
      assert.match(line, /verifyAuth/);
      assert.match(line, /verifyRoles\(\[0, 1\]\)/);
    });
    assert.doesNotMatch(src, /verifyRoles\(\[1\]\)/);
    assert.match(src, /router\.get\("\/admin\/dashboard"/);
    assert.match(src, /router\.get\("\/admin\/users"/);
    assert.match(src, /router\.get\("\/admin\/userprofile"/);
    assert.match(src, /router\.get\("\/admin\/jobs"/);
    assert.match(src, /router\.post\("\/admin\/jobs\/:jobId\/unpublish"/);
    assert.match(src, /router\.get\("\/admin\/companies"/);
    assert.match(src, /router\.get\("\/admin\/applications"/);
    assert.match(src, /router\.get\("\/admin\/finance"/);
    assert.match(src, /router\.get\("\/admin\/companies\/:companyId"/);
    const authSrc = fs.readFileSync(path.join(__dirname, "../middleware/verifyAuth.js"), "utf8");
    const rolesSrc = fs.readFileSync(path.join(__dirname, "../middleware/verifyRoles.js"), "utf8");
    assert.match(authSrc, /res\.status\(401\)/);
    assert.match(rolesSrc, /status\(403\)/);
    assert.match(rolesSrc, /allowedRoles\.includes\(rows\[0\]\.role\)/);
  });
});

describe("GET /api/admin/dashboard", () => {
  test("returns KPI counts and treats job_status_id 2 as active", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      return {
        rows: [{
          users_total: "10",
          jobseekers_total: 6,
          employers_total: 3,
          admins_total: 1,
          jobs_active: 4,
          jobs_total: 9,
          applications_7d: 2,
          applications_30d: 7,
          companies_total: 5,
        }],
      };
    };

    const res = mockRes();
    await admin.getDashboard(req(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.users_total, 10);
    assert.equal(res.body.data.jobseekers_total, 6);
    assert.equal(res.body.data.employers_total, 3);
    assert.equal(res.body.data.admins_total, 1);
    assert.equal(res.body.data.jobs_active, 4);
    assert.equal(res.body.data.jobs_total, 9);
    assert.equal(res.body.data.applications_7d, 2);
    assert.equal(res.body.data.applications_30d, 7);
    assert.equal(res.body.data.companies_total, 5);
    assert.equal(res.body.data.applications_in_range, 0);
    assert.equal(res.body.data.visits_total, 0);
    assert.equal(res.body.data.visits_previous, 0);
    assert.equal(res.body.data.visits_metric_label, "Site visits not collected");
    assert.equal(res.body.data.range, "7d");
    assert.match(res.body.data.from, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(res.body.data.to, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(res.body.data.visits_series.length >= 7);
    res.body.data.visits_series.forEach((point) => {
      assert.equal(point.count, 0);
      assert.match(point.date, /^\d{4}-\d{2}-\d{2}$/);
    });
    assert.equal(calls.length, 2);
    const sql = sqlBlob();
    assert.match(sql, /role = 3/);
    assert.match(sql, /role = 2/);
    assert.match(sql, /role = 1/);
    assert.match(sql, /job_status_id = 2/);
    assert.match(sql, /date_applied >= NOW\(\) - INTERVAL '7 days'/);
    assert.match(sql, /date_applied >= NOW\(\) - INTERVAL '30 days'/);
    assert.doesNotMatch(sql, /password/i);
    assert.match(sql, /user_credentials WHERE is_archive = false/);
    assert.match(sql, /role = 3 AND is_archive = false/);
    assert.match(sql, /role = 2 AND is_archive = false/);
    assert.match(sql, /role = 1 AND is_archive = false/);
    assert.doesNotMatch(sql, /FROM gethired\.jobs WHERE is_archive/);
  });

  test("includeArchived=true counts archived users in the KPIs", async () => {
    const res = mockRes();
    await admin.getDashboard(req({ includeArchived: "true" }), res);
    assert.equal(res.statusCode, 200);
    assert.doesNotMatch(sqlBlob(), /is_archive/);
  });
});

describe("GET /api/admin/users", () => {
  test("searches email and name, paginates, and omits secrets", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      if (String(sql).indexOf("COUNT(*)") !== -1) {
        return { rows: [{ total: 2 }] };
      }
      return {
        rows: [{
          uid: "u1",
          email: "ada@example.com",
          role: 3,
          firstname: "Ada",
          lastname: "Lovelace",
          created_date: "2026-01-02T00:00:00.000Z",
          password: "must-not-leak",
        }],
      };
    };

    const res = mockRes();
    await admin.listUsers(req({ q: "100%_ada", role: "3", page: "2", pageSize: "10" }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.total, 2);
    assert.equal(res.body.data.page, 2);
    assert.equal(res.body.data.pageSize, 10);
    assert.equal(res.body.data.items.length, 1);
    assert.deepEqual(res.body.data.items[0], {
      uid: "u1",
      email: "ada@example.com",
      role: 3,
      first_name: "Ada",
      last_name: "Lovelace",
      created_at: "2026-01-02T00:00:00.000Z",
      last_login: null,
      is_archived: false,
    });
    assert.equal(Object.prototype.hasOwnProperty.call(res.body.data.items[0], "password"), false);

    const listCall = calls.find((call) => call.sql.indexOf("SELECT") !== -1 && call.sql.indexOf("COUNT(*)") === -1);
    assert.ok(listCall);
    assert.match(listCall.sql, /c\.email/);
    assert.match(listCall.sql, /u\.firstname/);
    assert.match(listCall.sql, /u\.lastname/);
    assert.match(listCall.sql, /c\.created_date/);
    assert.match(listCall.sql, /c\.is_archive = false/);
    assert.doesNotMatch(listCall.sql, /password/i);
    assert.equal(listCall.params[0], "%100\\%\\_ada%");
    assert.equal(listCall.params[1], 3);
    assert.equal(listCall.params[2], 10);
    assert.equal(listCall.params[3], 10);
    assert.doesNotMatch(listCall.sql, /100%/);
  });

  test("rejects a non-integer role before querying", async () => {
    const res = mockRes();
    await admin.listUsers(req({ role: "admin" }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  });

  test("includeArchived=true keeps archived accounts in the directory", async () => {
    const res = mockRes();
    await admin.listUsers(req({ includeArchived: "1" }), res);
    assert.equal(res.statusCode, 200);
    const listCall = calls.find((call) => call.sql.indexOf("LIMIT") !== -1);
    assert.doesNotMatch(listCall.sql, /is_archive = false/);
  });

  test("rejects an invalid includeArchived flag before querying", async () => {
    const res = mockRes();
    await admin.listUsers(req({ includeArchived: "maybe" }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  });

  test("caps pageSize at 100", async () => {
    const res = mockRes();
    await admin.listUsers(req({ pageSize: "500" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.pageSize, 100);
    const listCall = calls.find((call) => call.sql.indexOf("LIMIT") !== -1);
    assert.equal(listCall.params[0], 100);
    assert.equal(listCall.params[1], 0);
  });
});

describe("GET /api/admin/jobs", () => {
  test("includes company name, applicant count, and a bound status filter", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      if (String(sql).indexOf("COUNT(*)::int AS total") !== -1) {
        return { rows: [{ total: 1 }] };
      }
      return {
        rows: [{
          job_id: "JB-26-100001",
          job_title: "Backend Engineer",
          company_name: "Acme",
          job_status_id: 2,
          job_status_name: "Published",
          created_at: "2026-03-01T00:00:00.000Z",
          applicant_count: "4",
        }],
      };
    };

    const res = mockRes();
    await admin.listJobs(req({ q: "'; DROP TABLE jobs;--", status: "2", page: "1", pageSize: "25" }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.items[0], {
      job_id: "JB-26-100001",
      title: "Backend Engineer",
      company_name: "Acme",
      status: 2,
      status_name: "Published",
      created_at: "2026-03-01T00:00:00.000Z",
      applicant_count: 4,
    });
    const listCall = calls.find((call) => call.sql.indexOf("applicant_count") !== -1);
    assert.match(listCall.sql, /companies c/);
    assert.match(listCall.sql, /job_applicants ja/);
    assert.match(listCall.sql, /j\.job_status_id = \$2/);
    assert.equal(listCall.params[1], 2);
    assert.match(listCall.params[0], /DROP TABLE/);
    assert.doesNotMatch(listCall.sql, /DROP TABLE/);
  });
});

describe("POST /api/admin/jobs/:jobId/unpublish", () => {
  test("sets a published job to archived and does not delete", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      if (String(sql).indexOf("UPDATE") !== -1) {
        return { rows: [{ job_id: "JB-26-100001", job_status_id: 4 }], rowCount: 1 };
      }
      return { rows: [{ job_id: "JB-26-100001", job_status_id: 2 }] };
    };

    const res = mockRes();
    await admin.unpublishJob(req({}, { jobId: "JB-26-100001" }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, {
      job_id: "JB-26-100001",
      status: 4,
      status_name: "Archived",
      previous_status: 2,
      unpublished: true,
      already_unpublished: false,
    });
    const update = calls.find((call) => call.sql.indexOf("UPDATE") !== -1);
    assert.ok(update);
    assert.deepEqual(update.params, [4, "JB-26-100001", 2]);
    assert.doesNotMatch(sqlBlob(), /DELETE/i);
    assert.deepEqual(indexingCalls, [{ job_id: "JB-26-100001" }]);
  });

  test("returns 404 when the job does not exist", async () => {
    const res = mockRes();
    await admin.unpublishJob(req({}, { jobId: "JB-26-999999" }), res);
    assert.equal(res.statusCode, 404);
    assert.equal(calls.length, 1);
    assert.doesNotMatch(sqlBlob(), /UPDATE/);
    assert.doesNotMatch(sqlBlob(), /DELETE/i);
  });

  test("does not write when the job is already unpublished", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      return { rows: [{ job_id: "JB-26-100001", job_status_id: 1 }] };
    };
    const res = mockRes();
    await admin.unpublishJob(req({}, { jobId: "JB-26-100001" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.already_unpublished, true);
    assert.equal(res.body.data.status, 1);
    assert.equal(res.body.data.status_name, "Draft");
    assert.equal(calls.length, 1);
    assert.doesNotMatch(sqlBlob(), /UPDATE/);
    assert.equal(indexingCalls.length, 0);
  });

  test("rejects an empty job id before querying", async () => {
    const res = mockRes();
    await admin.unpublishJob(req({}, { jobId: " " }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  });
});

describe("GET /api/admin/userprofile", () => {
  test("role 1 still receives the profile", async () => {
    caller.role = 1;
    const res = mockRes();
    await admin.getUserProfile(req({ id: "u1" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "success");
    assert.equal(caller.profileReads, 1);
    assert.equal(res.sent, null);
  });

  test("role 0 super_admin is allowed on the backend", async () => {
    caller.role = 0;
    const res = mockRes();
    await admin.getUserProfile(req({ id: "u1" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(caller.profileReads, 1);
  });

  test("a non-admin 403 is the JSON message used by verifyRoles, not plain text", async () => {
    caller.role = 2;
    const res = mockRes();
    await admin.getUserProfile(req({ id: "u1" }), res);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { message: "User not allowed to access this API" });
    assert.equal(res.sent, null);
    assert.equal(caller.profileReads, 0);
  });
});

describe("GET /api/admin/companies", () => {
  test("counts open jobs as job_status_id 2 and returns slug", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      if (String(sql).indexOf("COUNT(*)::int AS total") !== -1) {
        return { rows: [{ total: 1 }] };
      }
      return {
        rows: [{
          company_id: "CO-1",
          company_name: "Acme",
          company_slug: "acme",
          created_at: "2026-02-01T00:00:00.000Z",
          open_jobs_count: 3,
        }],
      };
    };

    const res = mockRes();
    await admin.listCompanies(req({ q: "acme" }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.items[0], {
      company_id: "CO-1",
      company_name: "Acme",
      slug: "acme",
      open_jobs_count: 3,
      created_at: "2026-02-01T00:00:00.000Z",
    });
    const listCall = calls.find((call) => call.sql.indexOf("open_jobs_count") !== -1);
    assert.match(listCall.sql, /company_slug/);
    assert.match(listCall.sql, /job_status_id = 2/);
    assert.equal(listCall.params[0], "%acme%");
  });
});

const MANILA_NOW = new Date("2026-09-24T02:30:00.000Z");

describe("Asia/Manila admin ranges", () => {
  test("today is the Manila calendar day, and 7d is a rolling 7x24h window", () => {
    const today = admin.parseAdminRange({ range: "today" }, MANILA_NOW);
    assert.equal(today.range, "today");
    assert.equal(today.from, "2026-09-24");
    assert.equal(today.to, "2026-09-24");
    assert.equal(today.fromAt, "2026-09-23T16:00:00.000Z");
    assert.equal(today.toAt, "2026-09-24T16:00:00.000Z");
    assert.deepEqual(today.seriesDates, ["2026-09-24"]);
    assert.equal(today.previousFromAt, "2026-09-22T16:00:00.000Z");

    const week = admin.parseAdminRange({ range: "7d" }, MANILA_NOW);
    assert.equal(week.fromAt, "2026-09-17T02:30:00.000Z");
    assert.equal(week.toAt, "2026-09-24T02:30:00.000Z");
    assert.equal(week.from, "2026-09-17");
    assert.equal(week.to, "2026-09-24");
    assert.equal(week.seriesDates.length, 8);

    const omitted = admin.parseAdminRange({}, MANILA_NOW);
    assert.equal(omitted.range, "7d");
    assert.equal(omitted.fromAt, week.fromAt);
    assert.equal(omitted.toAt, week.toAt);

    const month = admin.parseAdminRange({ range: "30d" }, MANILA_NOW);
    assert.equal(month.fromAt, "2026-08-25T02:30:00.000Z");
    assert.equal(month.toAt, MANILA_NOW.toISOString());
  });

  test("custom bounds are inclusive Manila dates and reject an inverted range", () => {
    const oneDay = admin.parseAdminRange({ range: "custom", from: "2026-09-01", to: "2026-09-01" }, MANILA_NOW);
    assert.equal(oneDay.fromAt, "2026-08-31T16:00:00.000Z");
    assert.equal(oneDay.toAt, "2026-09-01T16:00:00.000Z");
    assert.deepEqual(oneDay.seriesDates, ["2026-09-01"]);

    const span = admin.parseAdminRange({ from: "2026-09-01", to: "2026-09-03" }, MANILA_NOW);
    assert.equal(span.range, "custom");
    assert.equal(span.from, "2026-09-01");
    assert.equal(span.to, "2026-09-03");
    assert.equal(span.toAt, "2026-09-03T16:00:00.000Z");

    const inverted = admin.parseAdminRange({ from: "2026-09-10", to: "2026-09-01" }, MANILA_NOW);
    assert.match(inverted.error, /on or after/);

    const preset = admin.parseAdminRange({ range: "today", from: "2026-01-01", to: "2026-01-02" }, MANILA_NOW);
    assert.equal(preset.range, "today");
    assert.equal(preset.from, "2026-09-24");
  });

  test("an unknown dashboard range is rejected before any query", async () => {
    const res = mockRes();
    await admin.getDashboard(req({ range: "90d" }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  });
});

describe("plan catalog caps stay aligned with planCatalogServiceV4", () => {
  function catalogBlock(slug) {
    const src = fs.readFileSync(path.join(__dirname, "../services/planCatalogServiceV4.js"), "utf8");
    const parts = src.split("slug: '" + slug + "'");
    assert.ok(parts.length >= 2);
    return parts[1].split(/\n  \},\n/)[0];
  }

  function field(block, name) {
    const match = block.match(new RegExp(name + ":\\s*(-?\\d+)"));
    assert.ok(match, name + " in catalog block");
    return Number(match[1]);
  }

  test("starter, growth, and business prices and caps match the live catalog", () => {
    ["starter", "growth", "business"].forEach((slug) => {
      const block = catalogBlock(slug);
      const facts = admin.PLAN_FACTS[slug];
      assert.equal(facts.jobs, field(block, "active_job_posts"));
      assert.equal(facts.admins, field(block, "admin_users"));
      assert.equal(facts.videos, field(block, "video_responses"));
      assert.equal(facts.monthly, field(block, "priceMonthlyPHP"));
      assert.equal(facts.annualMonthly, field(block, "effectiveMonthlyPHP"));
    });
    assert.equal(admin.PLAN_FACTS.growth.jobs, 15);
    assert.equal(admin.PLAN_FACTS.growth.admins, 5);
    assert.equal(admin.PLAN_FACTS.growth.videos, 100);
  });
});

describe("GET /api/admin/applications", () => {
  test("pages job_applicants and bounds date_applied to inclusive Manila dates", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      if (String(sql).indexOf("COUNT(*)::int AS total") !== -1) {
        return { rows: [{ total: 40 }] };
      }
      return {
        rows: [{
          job_application_id: "APP-1",
          date_applied: "2026-09-02T01:00:00.000Z",
          email: "ada@example.com",
          firstname: "Ada",
          lastname: "Lovelace",
          job_id: "JB-1",
          job_title: "Engineer",
          company_name: "Acme",
          job_applicant_status_name: "Applied",
          password: "must-not-leak",
        }],
      };
    };

    const res = mockRes();
    await admin.listApplications(req({
      q: "ada",
      from: "2026-09-01",
      to: "2026-09-03",
      page: "2",
      pageSize: "25",
    }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.total, 40);
    assert.equal(res.body.data.page, 2);
    assert.equal(res.body.data.pageSize, 25);
    assert.deepEqual(res.body.data.items[0], {
      application_id: "APP-1",
      date_applied: "2026-09-02T01:00:00.000Z",
      seeker_name: "Ada Lovelace",
      seeker_email: "ada@example.com",
      job_id: "JB-1",
      job_title: "Engineer",
      company_name: "Acme",
      status: "Applied",
    });
    const listCall = calls.find((call) => call.sql.indexOf("LIMIT") !== -1);
    assert.match(listCall.sql, /job_applicants ja/);
    assert.match(listCall.sql, /user_credentials uc/);
    assert.doesNotMatch(listCall.sql, /password/i);
    assert.doesNotMatch(listCall.sql, /UPDATE|DELETE/i);
    assert.equal(listCall.params[0], "%ada%");
    assert.equal(listCall.params[1], "2026-08-31T16:00:00.000Z");
    assert.equal(listCall.params[2], "2026-09-03T16:00:00.000Z");
    assert.equal(listCall.params[3], 25);
    assert.equal(listCall.params[4], 25);
  });
});

describe("GET /api/admin/jobs status words", () => {
  test("accepts published as job_status_id 2", async () => {
    const res = mockRes();
    await admin.listJobs(req({ status: "Published" }), res);
    assert.equal(res.statusCode, 200);
    const listCall = calls.find((call) => call.sql.indexOf("LIMIT") !== -1);
    assert.equal(listCall.params[0], 2);
    assert.match(listCall.sql, /j\.job_status_id = \$1/);
  });

  test("rejects an unknown status word before querying", async () => {
    const res = mockRes();
    await admin.listJobs(req({ status: "live" }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  });
});

describe("GET /api/admin/users last_login", () => {
  test("returns auth_identities.last_login_at and retries when that table is missing", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      if (String(sql).indexOf("auth_identities") !== -1) {
        const error = new Error('relation "auth_identities" does not exist');
        error.code = "42P01";
        throw error;
      }
      if (String(sql).indexOf("COUNT(*)") !== -1) return { rows: [{ total: 1 }] };
      return {
        rows: [{
          uid: "u1",
          email: "ada@example.com",
          role: 3,
          firstname: "Ada",
          lastname: "Lovelace",
          created_date: "2026-01-02T00:00:00.000Z",
          last_login: "2026-09-01T00:00:00.000Z",
        }],
      };
    };

    const res = mockRes();
    await admin.listUsers(req({}), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.items[0].last_login, "2026-09-01T00:00:00.000Z");
    assert.ok(calls.some((call) => call.sql.indexOf("auth_identities") !== -1));
    assert.ok(calls.some((call) => call.sql.indexOf("NULL::timestamptz AS last_login") !== -1));
    assert.equal(calls.some((call) => /password/i.test(call.sql)), false);
  });
});

function subscriptionRow(overrides) {
  return Object.assign({
    company_id: "CO-1",
    company_name: "Acme",
    subscription_id: 2,
    plan_slug: "starter",
    canonical_slug: null,
    billing_cycle: "monthly",
    sub_status: "active",
    is_paid: true,
    created_at: "2026-01-01T00:00:00.000Z",
    period_start: "2026-09-01T00:00:00.000Z",
    period_end: "2099-01-01T00:00:00.000Z",
    payment_date: "2026-08-01T00:00:00.000Z",
    subscription_row: {},
  }, overrides);
}

describe("finance snapshot versus range", () => {
  test("MRR and status counts ignore the range; revenue sums succeeded payments only", () => {
    const clock = MANILA_NOW;
    const subs = [
      admin.normalizeSubscriptionRow(subscriptionRow({
        company_id: "CO-1",
        company_name: "Acme",
        plan_slug: "starter",
        billing_cycle: "monthly",
      }), clock),
      admin.normalizeSubscriptionRow(subscriptionRow({
        company_id: "CO-2",
        company_name: "Beta",
        subscription_id: 3,
        plan_slug: "growth",
        billing_cycle: "annual",
      }), clock),
      admin.normalizeSubscriptionRow(subscriptionRow({
        company_id: "CO-3",
        company_name: "Trial Co",
        subscription_id: 1,
        plan_slug: "free_trial",
        billing_cycle: "trial",
        sub_status: "trialing",
        is_paid: false,
      }), clock),
      admin.normalizeSubscriptionRow(subscriptionRow({
        company_id: "CO-4",
        company_name: "Late Co",
        plan_slug: "starter",
        sub_status: "past_due",
        is_paid: false,
      }), clock),
      admin.normalizeSubscriptionRow(subscriptionRow({
        company_id: "CO-5",
        company_name: "Internal",
        plan_slug: "growth",
        billing_cycle: "monthly",
        is_paid: false,
        subscription_row: {
          access_kind: "internal_complimentary",
          access_granted_by: "ops@gethiredonline.app",
          access_granted_at: "2026-09-01T00:00:00.000Z",
        },
      }), clock),
    ];
    assert.equal(subs[0].mrr_php, 1490);
    assert.equal(subs[1].mrr_php, 2908);
    assert.equal(subs[2].status, "trialing");
    assert.equal(subs[2].mrr_php, 0);
    assert.equal(subs[3].status, "past_due");
    assert.equal(subs[4].status, "active");
    assert.equal(subs[4].mrr_php, 0);

    const narrow = admin.assembleFinance(subs, [
      { id: "tx1", paid_at: "2026-09-02T00:00:00.000Z", company_id: "CO-2", company_name: "Beta", plan_label: "Growth", amount_php: 3490, status: "succeeded", external_id: "pay_1" },
      { id: "tx2", paid_at: "2026-09-02T01:00:00.000Z", company_id: "CO-1", company_name: "Acme", plan_label: "Starter", amount_php: 1490, status: "failed", external_id: "pay_fail" },
    ], { range: "custom", from: "2026-09-01", to: "2026-09-03" }, { page: 1, pageSize: 25, payPage: 1 });
    const wide = admin.assembleFinance(subs, [
      { id: "tx1", paid_at: "2026-09-02T00:00:00.000Z", company_id: "CO-2", company_name: "Beta", plan_label: "Growth", amount_php: 3490, status: "succeeded", external_id: "pay_1" },
      { id: "tx3", paid_at: "2026-08-15T00:00:00.000Z", company_id: "CO-1", company_name: "Acme", plan_label: "Starter", amount_php: 1490, status: "succeeded", external_id: "pay_old" },
    ], { range: "30d", from: "2026-08-25", to: "2026-09-24" }, { page: 1, pageSize: 25, payPage: 1 });

    assert.equal(narrow.mrr_php, wide.mrr_php);
    assert.equal(narrow.mrr_php, 1490 + 2908);
    assert.equal(narrow.mrr_note, "Current monthly recurring (snapshot)");
    assert.equal(narrow.paying_companies, 2);
    assert.equal(narrow.active_subscriptions, 3);
    assert.equal(narrow.trials, 1);
    assert.equal(narrow.past_due, 1);
    assert.equal(narrow.revenue_in_range_php, 3490);
    assert.equal(wide.revenue_in_range_php, 3490 + 1490);
    assert.equal(narrow.subscriptions.total, 5);
    assert.equal(narrow.payments.total, 2);
    assert.equal(narrow.currency, "PHP");
    const growth = narrow.plan_breakdown.find((row) => row.slug === "growth");
    assert.equal(growth.company_count, 2);
    assert.equal(growth.label, "Growth");
    const legacy = admin.normalizeSubscriptionRow(subscriptionRow({
      company_id: "CO-9",
      plan_slug: "legacy_gold",
      subscription_id: 2,
    }), clock);
    assert.equal(legacy.plan_slug, "other");
    assert.equal(legacy.plan_label, "Other");
  });

  test("subscription directory is not range-bound; payment SQL is", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      const text = String(sql);
      if (text.indexOf("companies_subscription") !== -1) {
        return { rows: [subscriptionRow({ company_name: "Acme" })] };
      }
      if (text.indexOf("MAX(paid_at)") !== -1) {
        return { rows: [{ company_id: "CO-1", last_payment_at: "2026-08-01T00:00:00.000Z" }] };
      }
      if (text.indexOf("FROM gethired.payment_attempts") !== -1) {
        return { rows: [] };
      }
      if (text.indexOf("payment_transactions") !== -1) {
        return {
          rows: [{
            id: "tx1",
            paid_at: "2026-09-02T04:00:00.000Z",
            company_id: "CO-1",
            company_name: "Acme",
            gross_minor: 149000,
            raw_status: "PAID",
            method: "gcash",
            external_id: "pay_1",
            plan_version_id: "pricing_2026_09_21:starter",
          }],
        };
      }
      if (text.indexOf("invoices") !== -1) {
        return {
          rows: [{
            id: "inv-dup",
            paid_at: "2026-09-02T04:00:00.000Z",
            company_id: "CO-1",
            company_name: "Acme",
            amount_php: 1490,
            raw_status: "paid",
            method: "gcash",
            external_id: "pay_1",
            plan_slug: "starter",
          }],
        };
      }
      return { rows: [] };
    };

    const res = mockRes();
    await admin.getFinance(req({ range: "custom", from: "2026-09-01", to: "2026-09-07" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.mrr_php, 1490);
    assert.equal(res.body.data.revenue_in_range_php, 1490);
    assert.equal(res.body.data.payments.total, 1);
    assert.equal(res.body.data.payments.items[0].status, "succeeded");
    assert.equal(res.body.data.payments.items[0].amount_php, 1490);
    assert.equal(res.body.data.subscriptions.total, 1);

    const subCall = calls.find((call) => call.sql.indexOf("companies_subscription") !== -1);
    assert.deepEqual(subCall.params, []);
    assert.doesNotMatch(subCall.sql, /\$1/);
    const payCall = calls.find((call) => call.sql.indexOf("FROM gethired.payment_transactions t") !== -1);
    assert.ok(payCall);
    assert.deepEqual(payCall.params, ["2026-08-31T16:00:00.000Z", "2026-09-07T16:00:00.000Z"]);
    assert.doesNotMatch(sqlBlob(), /UPDATE|DELETE|INSERT/i);
  });

  test("missing billing tables return zeros instead of invented payments", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      const error = new Error("relation does not exist");
      error.code = "42P01";
      throw error;
    };
    const res = mockRes();
    await admin.getFinance(req({ range: "7d" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.currency, "PHP");
    assert.equal(res.body.data.mrr_php, 0);
    assert.equal(res.body.data.revenue_in_range_php, 0);
    assert.deepEqual(res.body.data.subscriptions.items, []);
    assert.deepEqual(res.body.data.payments.items, []);
    assert.equal(res.body.data.plan_breakdown.length, 5);
  });
});

describe("GET /api/admin/companies/:companyId", () => {
  test("returns 404 when the company row is missing", async () => {
    const res = mockRes();
    await admin.getCompany(req({}, { companyId: "CO-missing" }), res);
    assert.equal(res.statusCode, 404);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /FROM gethired\.companies/);
    assert.deepEqual(calls[0].params, ["CO-missing"]);
  });

  test("uses live Growth caps unless the subscription stores effective entitlements", async () => {
    dbQuery.query = async (sql, params) => {
      calls.push({ sql: String(sql), params: params || [] });
      const text = String(sql);
      if (text.indexOf("company_slug") !== -1 && text.indexOf("FROM gethired.companies") !== -1 && text.indexOf("companies_subscription") === -1) {
        return {
          rows: [{
            company_id: "CO-9",
            company_name: "Growth Co",
            company_slug: "growth-co",
            created_at: "2026-02-01T00:00:00.000Z",
          }],
        };
      }
      if (text.indexOf("jobs_used") !== -1) {
        return { rows: [{ jobs_used: 4, admins_used: 2, videos_used: 9 }] };
      }
      if (text.indexOf("company_employees") !== -1 && text.indexOf("firstname") !== -1) {
        return {
          rows: [{
            firstname: "Grace",
            lastname: "Hopper",
            email: "grace@example.com",
            phone_number: "09170000000",
            role_name: "Owner",
            is_owner_role: true,
          }],
        };
      }
      if (text.indexOf("companies_subscription") !== -1) {
        return {
          rows: [subscriptionRow({
            company_id: "CO-9",
            company_name: "Growth Co",
            subscription_id: 3,
            plan_slug: "growth",
            billing_cycle: "monthly",
            subscription_row: { effective_entitlements: { jobs: 6, users: 3, video: 100 } },
          })],
        };
      }
      if (text.indexOf("subscription_lifecycle_events") !== -1) {
        return {
          rows: [{
            event_type: "renewed",
            previous_status: "active",
            new_status: "active",
            plan_slug: "growth",
            created_at: "2026-09-01T00:00:00.000Z",
          }],
        };
      }
      return { rows: [] };
    };

    const res = mockRes();
    await admin.getCompany(req({}, { companyId: "CO-9" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.company_name, "Growth Co");
    assert.equal(res.body.data.open_jobs_count, 4);
    assert.equal(res.body.data.admins[0].email, "grace@example.com");
    assert.equal(res.body.data.admins[0].phone, "09170000000");
    assert.equal(res.body.data.subscription.plan_slug, "growth");
    assert.deepEqual(res.body.data.subscription.entitlements, [
      { label: "Jobs", used: 4, limit: 6 },
      { label: "Admins", used: 2, limit: 3 },
      { label: "Videos", used: 9, limit: 100 },
    ]);
    assert.equal(res.body.data.history[0].kind, "subscription");
    const usage = calls.find((call) => call.sql.indexOf("jobs_used") !== -1);
    assert.match(usage.sql, /job_status_id = 2/);
    assert.equal(calls.some((call) => /password/i.test(call.sql)), false);
  });

  test("catalog Growth caps are 15/5/100 when no effective entitlements are stored", () => {
    const row = subscriptionRow({
      company_id: "CO-9",
      subscription_id: 3,
      plan_slug: "growth",
      subscription_row: {},
    });
    const normalized = admin.normalizeSubscriptionRow(row, MANILA_NOW);
    assert.equal(normalized.plan_slug, "growth");
    assert.equal(normalized.mrr_php, 3490);
    assert.deepEqual(admin.entitlementMeters(row, normalized.plan_slug, { jobs: 4, admins: 2, videos: 9 }), [
      { label: "Jobs", used: 4, limit: 15 },
      { label: "Admins", used: 2, limit: 5 },
      { label: "Videos", used: 9, limit: 100 },
    ]);
  });
});
