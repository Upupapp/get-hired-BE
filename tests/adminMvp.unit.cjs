/**
 * Admin MVP handlers. Stubs dbQuery so no database is required.
 * Run: node --test tests/adminMvp.unit.cjs
 *
 * Schema assumptions locked in here:
 * - role 1 admin, 2 employer, 3 jobseeker (candidate)
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
    getUserRoleById: async () => 1,
    getUserProfileById: async () => ({ uid: "u1" }),
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
  dbQuery.query = async (sql, params) => {
    calls.push({ sql: String(sql), params: params || [] });
    return { rows: [], rowCount: 0 };
  };
});

function sqlBlob() {
  return calls.map((call) => call.sql).join("\n");
}

describe("admin route gate", () => {
  test("every admin route uses verifyAuth and verifyRoles([1])", () => {
    const src = fs.readFileSync(path.join(__dirname, "../routes/adminRoute.js"), "utf8");
    const lines = src.split("\n").filter((line) => line.indexOf("router.") === 0);
    assert.equal(lines.length, 6);
    lines.forEach((line) => {
      assert.match(line, /verifyAuth/);
      assert.match(line, /verifyRoles\(\[1\]\)/);
    });
    assert.match(src, /router\.get\("\/admin\/dashboard"/);
    assert.match(src, /router\.get\("\/admin\/users"/);
    assert.match(src, /router\.get\("\/admin\/userprofile"/);
    assert.match(src, /router\.get\("\/admin\/jobs"/);
    assert.match(src, /router\.post\("\/admin\/jobs\/:jobId\/unpublish"/);
    assert.match(src, /router\.get\("\/admin\/companies"/);
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
    assert.deepEqual(res.body.data, {
      users_total: 10,
      jobseekers_total: 6,
      employers_total: 3,
      admins_total: 1,
      jobs_active: 4,
      jobs_total: 9,
      applications_7d: 2,
      applications_30d: 7,
      companies_total: 5,
    });
    const sql = sqlBlob();
    assert.match(sql, /role = 3/);
    assert.match(sql, /role = 2/);
    assert.match(sql, /role = 1/);
    assert.match(sql, /job_status_id = 2/);
    assert.match(sql, /date_applied >= NOW\(\) - INTERVAL '7 days'/);
    assert.match(sql, /date_applied >= NOW\(\) - INTERVAL '30 days'/);
    assert.doesNotMatch(sql, /password/i);
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
    });
    assert.equal(Object.prototype.hasOwnProperty.call(res.body.data.items[0], "password"), false);

    const listCall = calls.find((call) => call.sql.indexOf("SELECT") !== -1 && call.sql.indexOf("COUNT(*)") === -1);
    assert.ok(listCall);
    assert.match(listCall.sql, /c\.email/);
    assert.match(listCall.sql, /u\.firstname/);
    assert.match(listCall.sql, /u\.lastname/);
    assert.match(listCall.sql, /c\.created_date/);
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
