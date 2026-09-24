/**
 * Daily product metrics. Stubs dbQuery so no database is required.
 * Run: node --test tests/dailyProductMetrics.unit.cjs
 *
 * Day windows must match helpers/adminScreens.js parseAdminRange
 * (Asia/Manila midnight = 16:00 UTC the previous calendar day).
 */

process.env.is_staging = "false";
process.env.SCHEMA = "gethired";
process.env.NODE_ENV = "test";
delete process.env.DAILY_METRICS_CRON_SECRET;

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

function loadModule(entry) {
  const root = path.join(__dirname, "..");
  const cache = new Map();
  const stubs = new Map();
  stubs.set(path.join(root, "db/dbQuery.js"), { default: dbQuery });
  stubs.set(path.join(root, "env.js"), { default: { schema: "gethired" } });
  stubs.set(path.join(root, "helpers/userDetails.js"), {
    getUserRoleById: async () => 1,
    getUserProfileById: async (id) => ({ uid: id || "u1" }),
  });
  stubs.set(path.join(root, "services/googleIndexing.service.js"), {
    notifyJobUrlDeleted: () => {},
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
    if (trimmed.charAt(0) === "{") return bindNamed(load, trimmed);
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
    if (absPath.endsWith(".cjs")) {
      const exported = require(absPath);
      cache.set(absPath, exported);
      return exported;
    }
    const transformed = transform(fs.readFileSync(absPath, "utf8"));
    const module = { exports: {} };
    const fn = new Function("__load", "module", "exports", transformed);
    fn((spec) => load(resolve(absPath, spec)), module, module.exports);
    cache.set(absPath, module.exports);
    return module.exports;
  }

  return load(path.join(root, entry));
}

const dbQuery = {
  async query() {
    return { rows: [], rowCount: 0 };
  },
};

const metrics = loadModule("services/dailyProductMetrics.js");
const controller = loadModule("controllers/dailyProductMetricsController.js");
const admin = loadModule("controllers/adminController.js");

const calls = [];

function missingTable(label) {
  const error = new Error('relation "gethired.' + label + '" does not exist');
  error.code = "42P01";
  return error;
}

function countRow(overrides) {
  return Object.assign({
    live_jobs: 4,
    new_jobs_day: 1,
    employers_total: 8,
    new_employers_day: 2,
    jobseekers_total: 20,
    new_jobseekers_day: 3,
    applications_total: 15,
    applications_day: 5,
    companies_total: 6,
  }, overrides || {});
}

function installDb(behavior) {
  dbQuery.query = async (sql, params) => {
    calls.push({ sql: String(sql), params: params || [] });
    return behavior(String(sql), params || []);
  };
}

function mockRes() {
  const res = { statusCode: null, body: null, sent: null, headers: {} };
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
  res.set = (key, value) => {
    res.headers[String(key).toLowerCase()] = value;
    return res;
  };
  return res;
}

function mockReq(query, headers) {
  const lowered = {};
  const source = headers || {};
  Object.keys(source).forEach((key) => {
    lowered[String(key).toLowerCase()] = source[key];
  });
  return {
    query: query || {},
    get(name) {
      return lowered[String(name).toLowerCase()] || "";
    },
  };
}

function authed(query) {
  return mockReq(query, { "x-daily-metrics-cron": SECRET });
}

const SECRET = "metrics-test-secret";
const AFTER_MIDNIGHT = new Date("2026-09-24T16:15:00.000Z"); // 2026-09-25 00:15 Manila
const JUST_BEFORE_MIDNIGHT = new Date("2026-09-24T15:59:59.999Z"); // 2026-09-24 23:59:59.999 Manila
const EXACT_MIDNIGHT = new Date("2026-09-24T16:00:00.000Z"); // 2026-09-25 00:00:00 Manila

function handler(now) {
  return controller.buildDailyProductMetricsHandlers({
    now: function () { return now; },
    cronSecret: SECRET,
    loadPayments: admin.loadPayments,
  });
}

beforeEach(() => {
  calls.length = 0;
  delete process.env.DAILY_METRICS_CRON_SECRET;
  installDb(async () => ({ rows: [countRow()], rowCount: 1 }));
});

afterEach(() => {
  delete process.env.DAILY_METRICS_CRON_SECRET;
});

function sqlBlob() {
  return calls.map((call) => call.sql).join("\n");
}

function countsCall() {
  return calls.find((call) => call.sql.indexOf("AS live_jobs") !== -1);
}

function joaCall() {
  return calls.find((call) => call.sql.indexOf("job_opening_alert_subscriptions") !== -1);
}

describe("Manila day window", () => {
  test("omitted day at 00:15 Manila is yesterday, ending at midnight", () => {
    const range = metrics.resolveMetricsDay({}, AFTER_MIDNIGHT);
    assert.equal(range.error, undefined);
    assert.equal(range.from, "2026-09-24");
    assert.equal(range.to, "2026-09-24");
    assert.equal(range.fromAt, "2026-09-23T16:00:00.000Z");
    assert.equal(range.toAt, "2026-09-24T16:00:00.000Z");
    const mtd = metrics.monthToDateRange(range, AFTER_MIDNIGHT);
    assert.equal(mtd.from, "2026-09-01");
    assert.equal(mtd.to, "2026-09-24");
    assert.equal(mtd.fromAt, "2026-08-31T16:00:00.000Z");
    assert.equal(mtd.toAt, "2026-09-24T16:00:00.000Z");
  });

  test("one millisecond before Manila midnight still uses the previous yesterday", () => {
    const range = metrics.resolveMetricsDay({}, JUST_BEFORE_MIDNIGHT);
    assert.equal(range.from, "2026-09-23");
    assert.equal(range.fromAt, "2026-09-22T16:00:00.000Z");
    assert.equal(range.toAt, "2026-09-23T16:00:00.000Z");
  });

  test("the midnight instant belongs to the new Manila day", () => {
    const range = metrics.resolveMetricsDay({}, EXACT_MIDNIGHT);
    assert.equal(range.from, "2026-09-24");
    assert.equal(range.fromAt, "2026-09-23T16:00:00.000Z");
    assert.equal(range.toAt, "2026-09-24T16:00:00.000Z");
    const today = metrics.resolveMetricsDay({ day: "today" }, EXACT_MIDNIGHT);
    assert.equal(today.from, "2026-09-25");
    assert.equal(today.fromAt, "2026-09-24T16:00:00.000Z");
    assert.equal(today.toAt, "2026-09-25T16:00:00.000Z");
  });

  test("explicit day ignores the clock, including month and year boundaries", () => {
    const fixed = metrics.resolveMetricsDay({ day: "2026-09-24" }, new Date("2020-01-01T00:00:00.000Z"));
    assert.equal(fixed.from, "2026-09-24");
    assert.equal(fixed.fromAt, "2026-09-23T16:00:00.000Z");
    assert.equal(fixed.toAt, "2026-09-24T16:00:00.000Z");

    const newYear = metrics.resolveMetricsDay({}, new Date("2025-12-31T16:15:00.000Z"));
    assert.equal(newYear.from, "2025-12-31");
    const december = metrics.monthToDateRange(newYear, new Date("2025-12-31T16:15:00.000Z"));
    assert.equal(december.from, "2025-12-01");
    assert.equal(december.fromAt, "2025-11-30T16:00:00.000Z");
    assert.equal(december.toAt, "2025-12-31T16:00:00.000Z");

    const march = metrics.resolveMetricsDay({}, new Date("2026-02-28T16:15:00.000Z"));
    assert.equal(march.from, "2026-02-28");
    const leap = metrics.resolveMetricsDay({}, new Date("2024-02-29T16:15:00.000Z"));
    assert.equal(leap.from, "2024-02-29");
  });

  test("rejects dates that are not a real Manila calendar day", () => {
    assert.equal(metrics.resolveMetricsDay({ day: "2026-02-31" }, AFTER_MIDNIGHT).error, "day must be YYYY-MM-DD, today, or yesterday.");
    assert.equal(metrics.resolveMetricsDay({ day: "09-24-2026" }, AFTER_MIDNIGHT).error, "day must be YYYY-MM-DD, today, or yesterday.");
    assert.equal(metrics.resolveMetricsDay({ day: "todayy" }, AFTER_MIDNIGHT).error, "day must be YYYY-MM-DD, today, or yesterday.");
  });
});

describe("GET /api/internal/daily-product-metrics", () => {
  test("503 when the cron secret is unset, and 401 when the header does not match", async () => {
    const closed = controller.buildDailyProductMetricsHandlers({ cronSecret: "" });
    const unconfigured = mockRes();
    await closed.getMetrics(mockReq({}), unconfigured);
    assert.equal(unconfigured.statusCode, 503);
    assert.equal(unconfigured.body.status, "error");
    assert.equal(calls.length, 0);

    delete process.env.DAILY_METRICS_CRON_SECRET;
    const production = controller.handlers;
    const alsoClosed = mockRes();
    await production.getMetrics(mockReq({}), alsoClosed);
    assert.equal(alsoClosed.statusCode, 503);
    assert.equal(calls.length, 0);

    process.env.DAILY_METRICS_CRON_SECRET = SECRET;
    const denied = mockRes();
    await production.getMetrics(mockReq({}, { "x-daily-metrics-cron": "nope" }), denied);
    assert.equal(denied.statusCode, 401);
    assert.equal(denied.body.error, "Unauthorized");
    assert.equal(calls.length, 0);
  });

  test("returns yesterday's counts and Finance revenue through the Manila window", async () => {
    installDb(async (sql, params) => {
      if (sql.indexOf("AS live_jobs") !== -1) {
        return { rows: [countRow()] };
      }
      if (sql.indexOf("job_opening_alert_subscriptions") !== -1) {
        return { rows: [{ joa_subscribers_active: 7, joa_subscribers_new_day: 1 }] };
      }
      if (sql.indexOf("payment_transactions") !== -1) {
        if (params[0] === "2026-08-31T16:00:00.000Z") {
          return { rows: [{
            id: "tx1",
            paid_at: "2026-09-24T02:00:00.000Z",
            company_id: "CO-1",
            company_name: "Acme",
            gross_minor: 149000,
            raw_status: "PAID",
            method: "gcash",
            external_id: "pay_1",
            plan_version_id: null,
          }] };
        }
        return { rows: [{
          id: "tx1",
          paid_at: "2026-09-24T02:00:00.000Z",
          company_id: "CO-1",
          company_name: "Acme",
          gross_minor: 149000,
          raw_status: "PAID",
          method: "gcash",
          external_id: "pay_1",
          plan_version_id: null,
        }, {
          id: "tx-fail",
          paid_at: "2026-09-24T03:00:00.000Z",
          company_id: "CO-2",
          company_name: "Beta",
          gross_minor: 500000,
          raw_status: "FAILED",
          method: "gcash",
          external_id: "pay_fail",
          plan_version_id: null,
        }] };
      }
      if (sql.indexOf("payment_attempts") !== -1) return { rows: [] };
      if (sql.indexOf("invoices") !== -1) {
        const rows = [{
          id: "inv-dup",
          paid_at: "2026-09-24T02:00:00.000Z",
          company_id: "CO-1",
          company_name: "Acme",
          amount_php: 1490,
          raw_status: "paid",
          method: "gcash",
          external_id: "pay_1",
          plan_slug: "starter",
        }, {
          id: "inv-refund",
          paid_at: "2026-09-24T04:00:00.000Z",
          company_id: "CO-3",
          company_name: "Gamma",
          amount_php: 3490,
          raw_status: "refunded",
          method: "card",
          external_id: "pay_refund",
          plan_slug: "growth",
        }];
        if (params[0] === "2026-08-31T16:00:00.000Z") {
          rows.push({
            id: "inv-early",
            paid_at: "2026-09-02T01:00:00.000Z",
            company_id: "CO-4",
            company_name: "Delta",
            amount_php: 3490,
            raw_status: "paid",
            method: "gcash",
            external_id: "pay_mtd",
            plan_slug: "growth",
          });
        }
        return { rows: rows };
      }
      return { rows: [] };
    });

    const res = mockRes();
    await handler(AFTER_MIDNIGHT).getMetrics(mockReq({}, {
      "X-Daily-Metrics-Cron": SECRET,
    }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      day: "2026-09-24",
      timezone: "Asia/Manila",
      generated_at: "2026-09-25T00:15:00+08:00",
      revenue_php_day: 1490,
      revenue_php_mtd: 1490 + 3490,
      live_jobs: 4,
      new_jobs_day: 1,
      employers_total: 8,
      new_employers_day: 2,
      jobseekers_total: 20,
      new_jobseekers_day: 3,
      joa_subscribers_active: 7,
      joa_subscribers_new_day: 1,
      joa_available: true,
      applications_total: 15,
      applications_day: 5,
      companies_total: 6,
    });

    assert.deepEqual(countsCall().params, ["2026-09-23T16:00:00.000Z", "2026-09-24T16:00:00.000Z"]);
    assert.deepEqual(joaCall().params, ["2026-09-23T16:00:00.000Z", "2026-09-24T16:00:00.000Z"]);
    const countsSql = countsCall().sql;
    assert.match(countsSql, /FROM gethired\.jobs WHERE job_status_id = 2/);
    assert.match(countsSql, /FROM gethired\.jobs WHERE created_at >= \$1 AND created_at < \$2/);
    assert.match(countsSql, /role = 2 AND is_archive = false AND created_date >= \$1/);
    assert.match(countsSql, /role = 3 AND is_archive = false AND created_date >= \$1/);
    assert.match(countsSql, /FROM gethired\.job_applicants\)/);
    assert.match(countsSql, /date_applied >= \$1 AND date_applied < \$2/);
    assert.match(countsSql, /FROM gethired\.companies\)/);
    assert.doesNotMatch(countsSql, /is_archived/);
    assert.doesNotMatch(countsSql, /lguids/i);
    assert.doesNotMatch(countsSql, /job_status_id = 2 AND created_at/);
    const joaSql = joaCall().sql;
    assert.match(joaSql, /WHERE active = true\) AS joa_subscribers_active/);
    assert.match(joaSql, /WHERE created_at >= \$1 AND created_at < \$2\) AS joa_subscribers_new_day/);
    assert.doesNotMatch(joaSql, /active = true AND created_at/);
    assert.doesNotMatch(sqlBlob(), /UPDATE|DELETE|INSERT/i);

    const dayLedger = calls.find((call) => {
      return call.sql.indexOf("FROM gethired.payment_transactions t") !== -1
        && call.params[0] === "2026-09-23T16:00:00.000Z";
    });
    const mtdLedger = calls.find((call) => {
      return call.sql.indexOf("FROM gethired.payment_transactions t") !== -1
        && call.params[0] === "2026-08-31T16:00:00.000Z";
    });
    assert.ok(dayLedger);
    assert.deepEqual(dayLedger.params, ["2026-09-23T16:00:00.000Z", "2026-09-24T16:00:00.000Z"]);
    assert.deepEqual(mtdLedger.params, ["2026-08-31T16:00:00.000Z", "2026-09-24T16:00:00.000Z"]);
  });

  test("missing JOA and finance tables return zeros and joa_available false", async () => {
    installDb(async (sql) => {
      if (sql.indexOf("job_opening_alert_subscriptions") !== -1) throw missingTable("job_opening_alert_subscriptions");
      if (sql.indexOf("payment_transactions") !== -1) throw missingTable("payment_transactions");
      if (sql.indexOf("payment_attempts") !== -1) throw missingTable("payment_attempts");
      if (sql.indexOf("invoices") !== -1) throw missingTable("invoices");
      if (sql.indexOf("AS live_jobs") !== -1) return { rows: [countRow()] };
      return { rows: [] };
    });

    const res = mockRes();
    await handler(AFTER_MIDNIGHT).getMetrics(authed({ day: "today" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.day, "2026-09-25");
    assert.equal(res.body.revenue_php_day, 0);
    assert.equal(res.body.revenue_php_mtd, 0);
    assert.equal(res.body.joa_subscribers_active, 0);
    assert.equal(res.body.joa_subscribers_new_day, 0);
    assert.equal(res.body.joa_available, false);
    assert.equal(res.body.live_jobs, 4);
    assert.equal(res.body.companies_total, 6);
    assert.equal(calls.some((call) => call.sql.indexOf("FROM gethired.payment_attempts") !== -1), false);
  });

  test("invoice rows still count when the ledger table is missing", async () => {
    installDb(async (sql) => {
      if (sql.indexOf("payment_transactions") !== -1) throw missingTable("payment_transactions");
      if (sql.indexOf("invoices") !== -1) {
        return { rows: [{
          id: "inv-1",
          paid_at: "2026-09-24T02:00:00.000Z",
          company_id: "CO-1",
          company_name: "Acme",
          amount_php: 1490,
          raw_status: "paid",
          method: "gcash",
          external_id: "pay_invoice",
          plan_slug: "starter",
        }] };
      }
      if (sql.indexOf("job_opening_alert_subscriptions") !== -1) {
        return { rows: [{ joa_subscribers_active: 0, joa_subscribers_new_day: 0 }] };
      }
      if (sql.indexOf("AS live_jobs") !== -1) return { rows: [countRow({ live_jobs: 0, companies_total: 1 })] };
      return { rows: [] };
    });

    const res = mockRes();
    await handler(AFTER_MIDNIGHT).getMetrics(authed({ day: "2026-09-24" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.revenue_php_day, 1490);
    assert.equal(res.body.revenue_php_mtd, 1490);
    assert.equal(res.body.joa_available, true);
    assert.equal(calls.some((call) => call.sql.indexOf("FROM gethired.payment_attempts") !== -1), false);
  });

  test("undefined column on the JOA table is treated as unavailable", async () => {
    installDb(async (sql) => {
      if (sql.indexOf("job_opening_alert_subscriptions") !== -1) {
        const error = new Error("column active does not exist");
        error.code = "42703";
        throw error;
      }
      if (sql.indexOf("payment_") !== -1 || sql.indexOf("invoices") !== -1) return { rows: [] };
      if (sql.indexOf("AS live_jobs") !== -1) return { rows: [countRow()] };
      return { rows: [] };
    });
    const res = mockRes();
    await handler(AFTER_MIDNIGHT).getMetrics(authed({}), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.joa_available, false);
    assert.equal(res.body.joa_subscribers_active, 0);
  });

  test("bad day or format does not query, and csv is one row", async () => {
    const badDay = mockRes();
    await handler(AFTER_MIDNIGHT).getMetrics(authed({ day: "2026-02-31" }), badDay);
    assert.equal(badDay.statusCode, 400);
    assert.match(badDay.body.error, /YYYY-MM-DD/);
    assert.equal(calls.length, 0);

    const badFormat = mockRes();
    await handler(AFTER_MIDNIGHT).getMetrics(authed({ format: "xml" }), badFormat);
    assert.equal(badFormat.statusCode, 400);
    assert.equal(badFormat.body.error, "format must be json or csv.");
    assert.equal(calls.length, 0);

    installDb(async (sql) => {
      if (sql.indexOf("AS live_jobs") !== -1) return { rows: [countRow()] };
      if (sql.indexOf("job_opening_alert_subscriptions") !== -1) {
        return { rows: [{ joa_subscribers_active: 0, joa_subscribers_new_day: 0 }] };
      }
      return { rows: [] };
    });
    const csv = mockRes();
    await handler(AFTER_MIDNIGHT).getMetrics(authed({ format: "CSV" }), csv);
    assert.equal(csv.statusCode, 200);
    assert.equal(csv.headers["content-type"], "text/csv; charset=utf-8");
    const lines = csv.sent.trim().split("\n");
    assert.equal(lines.length, 2);
    assert.match(lines[0], /^day,timezone,generated_at,revenue_php_day,/);
    assert.match(lines[1], /^2026-09-24,Asia\/Manila,2026-09-25T00:15:00\+08:00,0,0,4,1,8,2,20,3,0,0,true,15,5,6$/);
  });

  test("a non-schema database error stays a 500 and does not leak SQL", async () => {
    installDb(async () => {
      const error = new Error("password authentication failed for user secret");
      error.code = "28P01";
      throw error;
    });
    const res = mockRes();
    await handler(AFTER_MIDNIGHT).getMetrics(authed({}), res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, "Operation not successful. Please try again.");
    assert.doesNotMatch(JSON.stringify(res.body), /password authentication/);
  });
});

describe("route mount", () => {
  test("the cron route is registered before billing's catch-all auth", () => {
    const server = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
    const route = fs.readFileSync(path.join(__dirname, "../routes/dailyProductMetricsRoutes.js"), "utf8");
    const line = route.split("\n").find((row) => row.indexOf("router.get") === 0);
    assert.match(line, /router\.get\("\/internal\/daily-product-metrics", handlers\.getMetrics\)/);
    assert.doesNotMatch(line, /verifyAuth|verifyRoles/);
    const metricsAt = server.indexOf('app.use("/api", dailyProductMetricsRoutes)');
    const billingAt = server.indexOf('app.use("/api", billingRoutes)');
    assert.ok(metricsAt > 0);
    assert.ok(billingAt > metricsAt);
  });
});
