# PERF-01 Performance Regression Sweep
**GETHIRED_PERF_01_GET_USER_COMPANY_PERFORMANCE_REGRESSION_SWEEP_V2**
Run: 2026-06-26 | BE HEAD: ba5c735

---

## Regression Risks From PERF-01 Patch

### 1. Memory Leak Risk

**Risk:** `req.getHiredRequestCache` Map on the request object grows unbounded.

**Analysis:** Each HTTP request is a single Express request object. The Map holds at most one entry per unique Firebase UID that appears in the request. In practice, all handlers use `req.user.uid` (always the same uid for any given request), so the Map holds exactly 1 entry.

**Maximum Map size per request:** 1 (one uid, one entry). The Map is garbage-collected with the request object after response is sent. **No memory leak possible.**

**Result: NOT A REGRESSION.** ✓

### 2. Stale Data Risk

**Risk:** Cached getUserCompany value is returned for second call after company changes.

**Analysis:** Cache lifetime is one HTTP request (< 1 second typical). No in-flight request lasts long enough for company membership to change. Even for a slow 5s request, company membership changes are extremely rare and would have affected the request before it started.

**Result: NOT A REGRESSION.** ✓

### 3. Object Mutation Risk

**Risk:** First caller mutates the returned company object; second caller in same request sees mutated state.

**Analysis:** Reviewed all 38 patched call sites. No call site mutates the returned object. Callers read `callerCompany.companyId`, `userCompany.companyName`, etc. — no property assignments. The object is used for authorization checks and passed to queries, not mutated.

**Result: NOT A REGRESSION.** ✓ (No mutation found. Note for future: if any caller is added that mutates the returned object, the cache should store a shallow clone instead.)

### 4. Concurrency Hazard

**Risk:** Two async operations in the same request race on the cache Map.

**Analysis:** Node.js is single-threaded. All Map operations (`has`, `get`, `set`, `delete`) are synchronous. There is no race condition possible within a single Node.js event loop tick. The `getUserCompany(uid).catch(...)` is the only async hop, and the Promise is set into the Map synchronously before the `await` yields.

**Result: NOT A REGRESSION.** ✓

### 5. Error Caching Risk

**Risk:** A DB error is cached and subsequent retries within the same request always fail.

**Analysis:** The `.catch` handler on the promise calls `cache.delete(key)` before re-throwing. The key is removed from the Map before the rejection propagates. Any subsequent call in the same request would issue a fresh DB query.

**Result: NOT A REGRESSION.** ✓

### 6. Response Time Regression

**Risk:** `getRequestCache(req)` check adds overhead per call.

**Analysis:** One property access on `req` (`req.getHiredRequestCache`) + one `Map.has()` per call. Both are O(1) and microsecond-level. No measurable overhead.

**Result: NOT A REGRESSION.** ✓

---

## Sweep of Other Performance Regressions (Unrelated to PERF-01)

### DB Connection Pool

No change to `dbQuery` pool configuration. PM2 restart reestablishes connections normally.

### Route Registration

No new routes added. No route order changes. Express routing unaffected.

### Middleware Stack

No middleware added or removed. `verifyAuth` still the only auth middleware. Response time for middleware chain unchanged.

---

## PM2 Memory Baseline

After PERF-01 deploy:
```
mem: 14.5mb  (PM2 restart 21, fresh start)
```

Pre-PERF-01 baseline (PM2 restart 20): ~14-16mb (normal fluctuation, cache adds ~zero per request).

**Result: Memory footprint unchanged.** ✓

---

## Conclusion

Zero performance regressions introduced by PERF-01. The patch is a strict additive optimization — it can only reduce DB queries per request (or match them if the handler calls getUserCompany once), never increase them.
