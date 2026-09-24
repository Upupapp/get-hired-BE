/**
 * Public pageview ingest. Stubs dbQuery. No database required.
 * Run: node --test tests/pageviewIngest.unit.cjs
 */

process.env.is_staging = "false";
process.env.SCHEMA = "gethired";
process.env.NODE_ENV = "test";

const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

function loadController(dbStub) {
  const root = path.join(__dirname, "..");
  const cache = new Map();
  const stubs = new Map();
  stubs.set(path.join(root, "db/dbQuery.js"), { default: dbStub });
  stubs.set(path.join(root, "env.js"), { default: { schema: "gethired" } });

  function resolve(fromFile, spec) {
    const base = path.resolve(path.dirname(fromFile), spec);
    const candidates = [base, base + ".js", path.join(base, "index.js")];
    for (let i = 0; i < candidates.length; i++) {
      if (fs.existsSync(candidates[i]) && fs.statSync(candidates[i]).isFile()) return candidates[i];
    }
    throw new Error("Cannot resolve " + spec + " from " + fromFile);
  }

  function bindImport(clause, spec) {
    const load = "__load(" + JSON.stringify(spec) + ")";
    const trimmed = clause.trim();
    if (trimmed.charAt(0) === "{") {
      const inner = trimmed.slice(1, -1);
      return inner.split(",").map((part) => {
        const bits = part.trim().split(/\s+as\s+/);
        const local = (bits[1] || bits[0]).trim();
        const imported = bits[0].trim();
        return "const " + local + " = " + load + "." + imported + ";";
      }).join("\n");
    }
    return "const " + trimmed + " = " + load + ".default;";
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

  return load(path.join(root, "controllers/pageviewController.js"));
}

const calls = [];
const dbQuery = {
  async query(sql, params) {
    calls.push({ sql: String(sql), params: params || [] });
    return { rows: [], rowCount: 1 };
  },
};
const pageview = loadController(dbQuery);

function mockRes() {
  const res = { statusCode: null, body: null, ended: false };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  res.end = () => {
    res.ended = true;
    return res;
  };
  return res;
}

function req(body, headers) {
  return { body: body || {}, headers: headers || {}, user: null };
}

beforeEach(() => {
  calls.length = 0;
  dbQuery.query = async (sql, params) => {
    calls.push({ sql: String(sql), params: params || [] });
    return { rows: [], rowCount: 1 };
  };
});

describe("POST /api/public/pageview", () => {
  test("rejects a path that does not start with /", async () => {
    const res = mockRes();
    await pageview.postPageview(req(
      { path: "jobs" },
      { origin: "https://gethiredonline.app" }
    ), res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /start with \//);
    assert.equal(calls.length, 0);
  });

  test("rejects an origin that is not on the allow-list", async () => {
    const res = mockRes();
    await pageview.postPageview(req(
      { path: "/jobs" },
      { origin: "https://evil.example" }
    ), res);
    assert.equal(res.statusCode, 403);
    assert.equal(calls.length, 0);
  });

  test("rejects a request with neither Origin nor Referer", async () => {
    const res = mockRes();
    await pageview.postPageview(req({ path: "/jobs" }, {}), res);
    assert.equal(res.statusCode, 403);
    assert.equal(calls.length, 0);
  });

  test("stores a pathname and referrer host and returns 204", async () => {
    const res = mockRes();
    await pageview.postPageview(req({
      path: "/jobs/details/JB-1?email=ada@example.com&token=secret",
      referrer: "https://news.example/story?utm=1",
      session_id: "6BA7B810-9DAD-11D1-80B4-00C04FD430C8",
      is_authenticated: true,
    }, { origin: "https://www.gethiredonline.app" }), res);

    assert.equal(res.statusCode, 204);
    assert.equal(res.ended, true);
    assert.equal(res.body, null);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /INSERT INTO gethired\.site_pageviews \(path, referrer_host, session_id, is_authenticated\)/);
    assert.deepEqual(calls[0].params, [
      "/jobs/details/JB-1",
      "news.example",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      true,
    ]);
    assert.doesNotMatch(calls[0].sql, /ip|user_agent|email|uid/i);
    assert.equal(JSON.stringify(calls[0].params).indexOf("secret"), -1);
    assert.equal(JSON.stringify(calls[0].params).indexOf("ada@example.com"), -1);
  });

  test("accepts a Referer from localhost when Origin is absent", async () => {
    const res = mockRes();
    await pageview.postPageview(req(
      { path: "http://localhost:4200/home?q=1" },
      { referer: "http://localhost:4200/home" }
    ), res);
    assert.equal(res.statusCode, 204);
    assert.equal(calls[0].params[0], "/home");
    assert.equal(calls[0].params[1], null);
    assert.equal(calls[0].params[2], null);
    assert.equal(calls[0].params[3], false);
  });

  test("returns 204 when the insert fails", async () => {
    dbQuery.query = async () => {
      const error = new Error("db down");
      error.code = "57P01";
      throw error;
    };
    const res = mockRes();
    await pageview.postPageview(req(
      { path: "/home" },
      { origin: "http://127.0.0.1:4200" }
    ), res);
    assert.equal(res.statusCode, 204);
    assert.equal(res.ended, true);
  });
});

describe("pageview route wiring", () => {
  test("is mounted before billingRoutes and limited to 60 per minute", () => {
    const server = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
    const mounting = server.slice(server.indexOf("// --- Route mounting ---"));
    const pageviewMount = mounting.indexOf('app.use("/api", pageviewRoutes)');
    const billingMount = mounting.indexOf('app.use("/api", billingRoutes)');
    assert.ok(pageviewMount !== -1);
    assert.ok(pageviewMount < billingMount);
    const route = fs.readFileSync(path.join(__dirname, "../routes/pageviewRoutes.js"), "utf8");
    assert.match(route, /router\.post\("\/public\/pageview", pageviewLimiter, beaconBody, postPageview\)/);
    assert.match(route, /max:\s*60/);
    assert.match(route, /windowMs:\s*60 \* 1000/);
    assert.doesNotMatch(route, /verifyAuth,/);
    const sql = fs.readFileSync(path.join(__dirname, "../db/20260924_site_pageviews.sql"), "utf8");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS gethired\.site_pageviews/);
    assert.match(sql, /site_pageviews_occurred_at_idx/);
    assert.match(sql, /site_pageviews_occurred_path_idx/);
    const table = sql.slice(sql.indexOf("CREATE TABLE"), sql.indexOf(");") + 2);
    assert.doesNotMatch(table, /ip_address|user_agent|\bemail\b|\buid\b/i);
  });
});
