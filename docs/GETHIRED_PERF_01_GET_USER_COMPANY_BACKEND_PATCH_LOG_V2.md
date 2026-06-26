# PERF-01 Backend Patch Log
**GETHIRED_PERF_01_GET_USER_COMPANY_BACKEND_PATCH_LOG_V2**
Run: 2026-06-26 | Commit: ba5c735

---

## Summary

Added `getUserCompanyForRequest(req, uid)` to `controllers/companiesController.js` and patched **38 call sites** across **8 controllers** to use it.

## New Code Added (companiesController.js)

```js
const getRequestCache = (req) => {
  if (!req.getHiredRequestCache) {
    req.getHiredRequestCache = new Map();
  }
  return req.getHiredRequestCache;
};

const getUserCompanyForRequest = (req, uid) => {
  if (!uid) { return getUserCompany(uid); }
  const cache = getRequestCache(req);
  const key = 'getUserCompany:' + uid;
  if (cache.has(key)) { return cache.get(key); }
  const promise = getUserCompany(uid).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, promise);
  return promise;
};
```

`getUserCompanyForRequest` exported alongside the unchanged `getUserCompany`.

## Patched Call Sites

| File | Old Pattern | New Pattern | Sites |
|------|------------|-------------|-------|
| applicationController.js | `getUserCompany(uid)` | `getUserCompanyForRequest(req, uid)` | 1 |
| candidateController.js | `getUserCompany(req.user.uid)` | `getUserCompanyForRequest(req, req.user.uid)` | 5 |
| contactsController.js | `getUserCompany(req.user.uid)` | `getUserCompanyForRequest(req, req.user.uid)` | 11 |
| employerController.js | `getUserCompany(uid)` | `getUserCompanyForRequest(req, uid)` | 2 |
| interviewController.js | `callerBelongsToCompany(uid, cid)` / direct | `callerBelongsToCompanyForRequest(req, uid, cid)` | 4 |
| jobsController.js | `getUserCompany(uid/req.user.uid)` | `getUserCompanyForRequest(req, uid/req.user.uid)` | 10 |
| subscriptionController.js | `getUserCompany(req.user.uid)` | `getUserCompanyForRequest(req, req.user.uid)` | 2 |
| companiesController.js | `getUserCompany(uid/req.user.uid)` | `getUserCompanyForRequest(req, uid/req.user.uid)` | 7 |

**Total: 38 call sites patched.**

## interviewController Refactor

Old `callerBelongsToCompany(uid, companyId)` helper called `getUserCompany` without req. Added `callerBelongsToCompanyForRequest(req, uid, companyId)` which uses the cached version. All 4 handler call sites updated to use the req-aware version. Old non-req helper removed (no longer called anywhere).

## Intentional Non-Patched Callers

| File | Reason |
|------|--------|
| `userController.js:66` | Login handler; uses `credentials.id` (DB PK), not Firebase UID; no Firebase-verified `req.user` at this point in the auth flow |
| `services/message.service.js:23` | Service receives `callerUid` but not `req`; signature cannot accept `req` without broader service refactor (backlog) |
| `services/match/matchReadinessBridgeService.js:49` | Same — service doesn't receive `req` |

## Authorization Impact

**None.** All 38 patched call sites still use `req.user.uid` (Firebase-verified UID from `verifyAuth` middleware). The cache key is `'getUserCompany:' + uid`, ensuring strict per-uid isolation. Cache is request-scoped — no cross-user or cross-request data sharing.

## Response Shape Impact

**None.** `getUserCompanyForRequest` returns the resolved value of `getUserCompany(uid)`, which is the same object. No deep clone is performed (clone was evaluated and rejected — clone would defeat performance benefit and the object is not mutated by callers in the same request).

## ESM / Acorn Compatibility

No optional chaining (`?.`) or nullish coalescing (`??`) used. All guards use `&&` and `||`. Compatible with esm v3.2.25 / Acorn 6/7. Build verified: PM2 restart 21, online.

## Deployment

- Commit: `ba5c735`
- Linode: deployed, PM2 restart 21, status online
- Verified: `curl -s -o /dev/null -w "%{http_code}" https://api.gethiredonline.app/api/jobs/public` → 200
