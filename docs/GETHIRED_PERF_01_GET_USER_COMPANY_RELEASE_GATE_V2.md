# PERF-01 Release Gate
**GETHIRED_PERF_01_GET_USER_COMPANY_RELEASE_GATE_V2**
Run: 2026-06-26 | BE HEAD: ba5c735

---

## Release Gate Checklist

### Code Quality

| Check | Status |
|-------|--------|
| No optional chaining (`?.`) in BE source | ✅ PASS — verified by grep, none in changed files |
| No nullish coalescing (`??`) in BE source | ✅ PASS — verified by grep, none in changed files |
| No raw `${variable}` SQL interpolation introduced | ✅ PASS — getUserCompanyForRequest delegates to existing getUserCompany which uses $1 |
| No `console.log` added with uid/PII | ✅ PASS — no logging added |
| `getUserCompany` original export preserved | ✅ PASS — still exported alongside `getUserCompanyForRequest` |

### Functional Correctness

| Check | Status |
|-------|--------|
| All 38 call sites patched | ✅ PASS — grep confirms 0 unintentional `getUserCompany(req.user.uid)` calls |
| 3 intentional non-patched callers documented | ✅ PASS — userController, message.service, matchReadinessBridgeService |
| `callerBelongsToCompany` (old non-req helper) removed | ✅ PASS — no references remain |
| `callerBelongsToCompanyForRequest` covers all 4 interview call sites | ✅ PASS |
| jobsController import cleaned (getUserCompany unused import removed) | ✅ PASS |
| interviewController import cleaned | ✅ PASS |

### Authorization

| Check | Status |
|-------|--------|
| All patched sites use `req.user.uid` (Firebase-verified, not client-supplied) | ✅ PASS |
| Cache key uses uid — no cross-user sharing | ✅ PASS |
| Cache scoped to `req` object — no cross-request sharing | ✅ PASS |
| Error path clears cache (no negative caching) | ✅ PASS |
| `userController.js:66` (login, `credentials.id`) NOT patched | ✅ PASS |

### Deployment

| Check | Status |
|-------|--------|
| Git commit pushed to GitHub | ✅ PASS — ba5c735 |
| Linode deploy: `git pull --ff-only` fast-forward clean | ✅ PASS |
| PM2 restart 21 — status online | ✅ PASS |
| No esm parse error on startup | ✅ PASS — PM2 online immediately |

### Documentation

| Document | Status |
|----------|--------|
| CURRENT_STATE_AUDIT_V2 | ✅ Created |
| CACHE_DESIGN_CONTRACT_V2 | ✅ Created |
| BACKEND_PATCH_LOG_V2 | ✅ Created |
| INSTRUMENTATION_LOG_V2 | ✅ Created |
| RELATED_ROUTE_SWEEP_V2 | ✅ Created |
| FRONTEND_COMPATIBILITY_LOG_V2 | ✅ Created |
| FRONTEND_HAPTICS_EFFECTS_LOG_V2 | ✅ Created |
| FRONTEND_ACCESSIBILITY_LOG_V2 | ✅ Created |
| TEST_LOG_V2 | ✅ Created |
| PERFORMANCE_REGRESSION_SWEEP_V2 | ✅ Created |
| RELEASE_GATE_V2 | ✅ This file |
| BACKLOG_V2 | ✅ Created |
| FINAL_REPORT_V2 | ✅ Created |

---

## Release Decision

**SHIP.** All gate checks pass. PERF-01 is a zero-regression, backward-compatible optimization. The architecture is correct, the authorization surface is unchanged, and the deployment is clean.

---

## Rollback Procedure

If a production issue is observed after PERF-01:

```bash
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git revert ba5c735 --no-edit && git push origin main && pm2 restart gethired --update-env"
```

`git revert ba5c735` will produce a new commit that restores all controllers to `getUserCompany` direct calls, cleanly reversing the patch without force-push.
