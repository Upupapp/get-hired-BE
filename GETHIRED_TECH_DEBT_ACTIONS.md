# GETHIRED TECH DEBT ACTIONS
## QA Cycle 11

**Generated:** 2026-06-25

---

## TD-01 — CORS Wildcard (Security/Debt)
**Priority:** P1
**File:** `server.js:26-36, 90`
The `corsOption` block is defined but commented out, replaced by `app.use(cors())`. 
**Action:** Uncomment and apply `corsOption`. Add `ALLOWED_ORIGINS` env var.
See GETHIRED_SECURITY_ACTIONS.md SEC-02 for implementation details.

---

## TD-02 — 50MB JSON Body Limit (Security/Debt)
**Priority:** P1
**File:** `server.js:92-93`
Blanket 50MB limit is a DoS surface.
**Action:** Reduce to 1MB globally. See SEC-03.

---

## TD-03 — applicationStatusId Hardcode in FE
**Priority:** P2
**File:** `recruiter-interview-hub.component.ts:80`
`i.applicationStatusId === 3` magic number for "Under Review" filter.
**Action:** Extract to shared constant `APPLICATION_STATUS_IDS.UNDER_REVIEW = 3`. If status IDs are DB-driven, fetch them from a status endpoint and filter by name.

---

## TD-04 — getListByUser Always Returns null
**Priority:** P2
**File:** `controllers/interviewController.js:228`
`successMessage.data = null` — the service call is commented out.
**Action:** Implement `getInterviewsOfUser(uid)` and wire it up. See AE-01.

---

## TD-05 — Commented-Out deleteJob Route
**Priority:** P2
**File:** `routes/jobsRoute.js:27`
`// router.delete("/jobs/delete", deleteJob)` — dead import + silent missing feature.
**Action:** Uncomment, add BOLA ownership check, add FE soft-delete UI. See AE-07.

---

## TD-06 — Shared `successMessage`/`errorMessage` Objects Are Mutation-Unsafe
**Priority:** P2 (latent / intermittent)
**File:** All controllers import `{ successMessage, errorMessage }` from `helpers/status.js` and mutate `.data` / `.error` directly on the shared object. Under concurrent requests this is a race condition — one request's `.data` can be overwritten by another before `res.send()`.
**Action:** Replace shared mutation pattern with inline response objects:
```javascript
// Instead of:
successMessage.data = dbResponse;
return res.status(status.success).send(successMessage);
// Use:
return res.status(status.success).json({ data: dbResponse });
```
**Effort:** L — requires touching all controllers. Recommend: fix incrementally, starting with highest-traffic routes.

---

## TD-07 — No Test Runner Configured
**Priority:** P2
**File:** `package.json:6`
`"test": "echo \"Error: no test specified\" && exit 1"` — any CI step running `npm test` exits 1 immediately.
**Action:**
1. Install Jest or Mocha: `npm install --save-dev jest @babel/core babel-jest`
2. Add `.babelrc` for ES module support (needed given `esm` usage)
3. Create `tests/` directory
4. Update `package.json` test script to `jest --coverage`
**Acceptance Criteria:**
- [ ] `npm test` exits 0 when no test files exist (pending mode)
- [ ] `npm test` runs and reports coverage when test files are added

---

## TD-08 — `now = new Date()` at Module Load Time
**Priority:** P2 (subtle bug)
**File:** `controllers/interviewController.js:20`, `controllers/paymentController.js:7`
`const now = new Date()` is evaluated ONCE when the module is loaded. In `paymentController.js:112`, `paid_at=$12` uses this stale `now` — any payment processed more than seconds after server start uses the server start time, not the actual payment time.
**Action:** Move `const now = new Date()` inside each function body that needs it, or use `new Date()` inline in the query parameter array.
**Priority:** P2 — this actively corrupts `paid_at` timestamps in the payment flow.

---

## TD-09 — Unused `babel-polyfill` Import
**Priority:** P3
**File:** `server.js:2`
`import "babel-polyfill"` — deprecated since Babel 7 (replaced by `@babel/polyfill`, itself deprecated in favor of `core-js/stable` + `regenerator-runtime`). Adds ~100KB to the server bundle unnecessarily.
**Action:** Remove the import; verify server starts without it. If needed, replace with targeted `core-js` imports.

---

## TD-10 — `moment` Dependency (Deprecated)
**Priority:** P3
`moment` is in dependencies (`package.json:44`). Moment.js is in maintenance-only mode. If used only for date formatting, replace with native `Intl` or `date-fns`.
**Action:** Audit usage with `grep -r "moment(" --include="*.js"`. Replace with native alternatives. Remove from package.json.
