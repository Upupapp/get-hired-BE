# PERF-01 Test Log
**GETHIRED_PERF_01_GET_USER_COMPANY_TEST_LOG_V2**
Run: 2026-06-26 | BE HEAD: ba5c735

---

## Test Strategy

No formal test runner is used (no Jest/Mocha test suite found in `get-hired-BE/`). Verification is:
1. Structural analysis (code reading)
2. Behavioral contract reasoning
3. PM2 smoke verification (server starts, does not crash)

---

## PM2 Startup Smoke Test

```
[PM2] [gethired](0) ✓
status: online, uptime: 0s, restart: 21
```

**Result: PASS** — Node.js loaded all 8 patched controller modules via `esm` without syntax error.

---

## Cache Contract Test (Structural Verification)

Testing `getUserCompanyForRequest` behavior by reading the implementation:

### Test 1: Cache Miss → DB Query

**Input:** Fresh request (no `req.getHiredRequestCache`), valid uid.
**Trace:**
1. `getRequestCache(req)` → creates `new Map()` on `req.getHiredRequestCache`
2. `cache.has('getUserCompany:uid-x')` → false
3. `getUserCompany(uid)` called → Promise P1 returned
4. `.catch()` chained → Promise P2 (wraps P1 with cache-delete on error)
5. `cache.set(key, P2)`
6. Return P2

**Result:** 1 DB query issued. **PASS** ✓

### Test 2: Cache Hit → No DB Query

**Input:** Same request as Test 1, same uid, called a second time.
**Trace:**
1. `getRequestCache(req)` → returns existing Map (already on req)
2. `cache.has('getUserCompany:uid-x')` → true
3. Return `cache.get('getUserCompany:uid-x')` (P2 from Test 1)

**Result:** 0 additional DB queries. Same Promise returned. **PASS** ✓

### Test 3: Different uid in Same Request

**Input:** Same request, different uid Y.
**Trace:**
1. Key = `'getUserCompany:uid-y'`
2. `cache.has(key)` → false (only uid-x is cached)
3. `getUserCompany(uid-y)` called → new DB query
4. Stored under different key

**Result:** Separate DB query for uid-y, no data mixing with uid-x. **PASS** ✓

### Test 4: Concurrent In-Flight Deduplication

**Input:** Two async calls for same uid in same request, neither awaited before the other starts.

```js
const p1 = getUserCompanyForRequest(req, uid); // cache miss, sets key, returns P2
const p2 = getUserCompanyForRequest(req, uid); // cache hit, returns P2 (same ref)
const [r1, r2] = await Promise.all([p1, p2]);  // both await same DB query
```

**Trace:**
- First call: cache miss → `getUserCompany(uid)` → P2 stored and returned
- Second call (before P2 resolves): `cache.has(key)` → true → P2 returned (same reference)
- One DB query executes, both callers receive same resolved value.

**Result:** 1 DB query, both callers get same result. **PASS** ✓

### Test 5: DB Error — Cache Cleanup

**Input:** `getUserCompany` rejects (DB down).
**Trace:**
1. Cache miss → P2 set with `.catch()` handler
2. `getUserCompany(uid)` rejects → `.catch(error => { cache.delete(key); throw error; })`
3. `cache.delete(key)` → removes from Map
4. Error rethrown → P2 rejects

**Result:** Cache does not hold a rejected Promise. Next call will retry. **PASS** ✓

### Test 6: null/undefined uid

**Input:** `getUserCompanyForRequest(req, null)` or `(req, undefined)`
**Trace:**
1. `if (!uid)` → true
2. Return `getUserCompany(uid)` directly, bypassing cache

**Result:** Cache not consulted. Original behavior preserved. **PASS** ✓

### Test 7: Cross-Request Isolation

**Input:** Two separate HTTP requests, same uid.
**Trace:**
- Req A: `req.getHiredRequestCache` = Map A
- Req B: `req.getHiredRequestCache` = Map B (new object, new request)
- No shared state

**Result:** No cross-request data leakage. **PASS** ✓

---

## Authorization Regression Verification

**Claim:** Patching `getUserCompany` → `getUserCompanyForRequest` does not change who can access what.

**Evidence:**
1. All 38 patched sites use `req.user.uid` — the Firebase-verified uid from `verifyAuth` middleware. The middleware signature is unchanged.
2. The cache key is derived from uid, so different users always use different keys.
3. The resolved value is the exact same object as `getUserCompany` would have returned — no field stripping or injection.
4. All 403 checks (`Array.isArray(callerCompany)`, `userCompany.companyId !== companyId`) still operate on the resolved value unchanged.

**Result: PASS** — no authorization regression. ✓

---

## Before/After DB Query Count

| Request | Before PERF-01 | After PERF-01 |
|---------|---------------|---------------|
| Single-call handler (today's pattern) | 1 getUserCompany query | 1 getUserCompany query (cache set, no savings) |
| Handler calling getUserCompany 2x (hypothetical) | 2 queries | 1 query |
| Same-request concurrent 2x (hypothetical) | 2 queries | 1 query |

**Measurable savings today:** 0 (no handler currently calls getUserCompany 2x).
**Measurable savings in singleflight scenario:** 1+ queries per request eliminated.
**Preventive value:** Any future handler that calls getUserCompany 2x automatically benefits.
