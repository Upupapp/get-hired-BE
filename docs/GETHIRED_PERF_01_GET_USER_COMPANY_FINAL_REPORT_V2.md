# PERF-01 Final Report
**GETHIRED_PERF_01_GET_USER_COMPANY_FINAL_REPORT_V2**
Run: 2026-06-26 | BE HEAD: ba5c735 | FE HEAD: 553ce0c

---

## What Was Built

**Request-scoped cache + singleflight pattern for `getUserCompany(uid)`.**

Added `getUserCompanyForRequest(req, uid)` to `controllers/companiesController.js`. This function wraps `getUserCompany` with a per-request Map that stores the pending Promise on first miss. Any subsequent same-uid call within the same HTTP request returns the same Promise — they all share the same DB round-trip. Failed promises are evicted from the cache so callers can retry.

---

## Why

`getUserCompany(uid)` is the most-called DB function in the entire backend. It runs a 3-table JOIN (company_employees + companies + industry) every time any employer/recruiter performs any action. Each employer dashboard page load triggers 4-5 simultaneous HTTP requests, each issuing this same query for the same uid in the same browser page-load window.

PERF-01 establishes the correct architecture: the function is idempotent (same uid → same company context within a request), its result is safe to share within a request scope, and deduplication is zero-risk at this scope.

---

## Scope of Changes

| File | Change |
|------|--------|
| `controllers/companiesController.js` | Added `getRequestCache`, `getUserCompanyForRequest`, export; 7 internal call sites patched |
| `controllers/contactsController.js` | Import updated; 11 call sites patched |
| `controllers/candidateController.js` | Import updated; 5 call sites patched |
| `controllers/jobsController.js` | Import updated (unused `getUserCompany` removed); 10 call sites patched |
| `controllers/interviewController.js` | Import updated; `callerBelongsToCompanyForRequest` helper added; `callerBelongsToCompany` (old non-req helper) removed; 4 call sites patched |
| `controllers/applicationController.js` | Import updated; 1 call site patched |
| `controllers/employerController.js` | Import updated; 2 call sites patched |
| `controllers/subscriptionController.js` | Import updated; 2 call sites patched |

**Total: 38 call sites patched across 8 controllers.**

**Intentionally not patched:** `userController.js:66` (login, different ID type), `services/message.service.js:23` and `services/match/matchReadinessBridgeService.js:49` (no req in service scope).

---

## Authorization: Unchanged

All 38 patched sites continue to use `req.user.uid` — the Firebase-verified uid set by `verifyAuth` middleware. The cache key is `'getUserCompany:' + uid`, ensuring strict per-uid isolation. Cache is request-scoped (one Map per req object), guaranteeing zero cross-user or cross-request data leakage.

---

## ESM Compatibility

No optional chaining (`?.`) or nullish coalescing (`??`) used. All guards use `&&` and `||`. Build passed on PM2 with esm v3.2.25 / Acorn 6/7 (restart 21, online, 14.5mb).

---

## Performance Impact

**Today (no handler calls getUserCompany 2x):** Zero measurable DB savings per individual request. The cache is set and then never hit within the same request for current code.

**Singleflight value (real):** If any handler ever issues 2 async getUserCompany calls before either resolves (possible if a future feature refactor adds a second lookup), only 1 DB query executes — the second caller gets the in-flight Promise.

**Forward-looking value (architectural):** Any future handler that evolves to call getUserCompany 2x (e.g., a combined company+subscription endpoint, or a service that both checks auth and fetches company details) automatically gets deduplication for free, with no code changes required.

**Multi-request dashboard value (not addressed here):** The 4 parallel dashboard HTTP requests still issue 4 getUserCompany queries (separate req objects). Documented in BACKLOG_V2.md as P3.

---

## Production Deployment

- Commit: `ba5c735`
- GitHub: pushed
- Linode: deployed, PM2 restart 21, online
- Rollback: `git revert ba5c735` (see RELEASE_GATE_V2.md)

---

## Document Index

| Document | Purpose |
|----------|---------|
| CURRENT_STATE_AUDIT_V2 | Pre-patch analysis: call sites, uid sources, duplicate patterns |
| CACHE_DESIGN_CONTRACT_V2 | Cache type, key, lifetime, required behaviors |
| BACKEND_PATCH_LOG_V2 | All 38 call sites, file-by-file change log |
| INSTRUMENTATION_LOG_V2 | Observability approach for cache hit/miss monitoring |
| RELATED_ROUTE_SWEEP_V2 | Route-by-route impact table |
| FRONTEND_COMPATIBILITY_LOG_V2 | Zero FE contract changes confirmed |
| FRONTEND_HAPTICS_EFFECTS_LOG_V2 | FE haptics baseline for PERF-01-touched routes |
| FRONTEND_ACCESSIBILITY_LOG_V2 | A11y baseline — no changes needed |
| TEST_LOG_V2 | 7 structural contract tests (pass); PM2 smoke (pass) |
| PERFORMANCE_REGRESSION_SWEEP_V2 | 6 regression checks — all pass |
| RELEASE_GATE_V2 | Go/no-go checklist — all pass |
| BACKLOG_V2 | Deferred items: service-layer req threading, cross-request cache, consolidated endpoint |
| FINAL_REPORT_V2 | This file |

---

## Status

**COMPLETE. Shipped.** All 13 required output documents created. 38 call sites patched. 0 regressions. BE deployed.
