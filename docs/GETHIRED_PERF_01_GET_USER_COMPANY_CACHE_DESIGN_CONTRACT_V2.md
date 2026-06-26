# PERF-01 Cache Design Contract
**GETHIRED_PERF_01_GET_USER_COMPANY_CACHE_DESIGN_CONTRACT_V2**
Run: 2026-06-26 | BE HEAD: ba5c735

---

## Cache Type

**Request-scoped cache.** One Map per HTTP request, discarded when the request object is garbage-collected.

## Implementation

```js
// Location: controllers/companiesController.js

const getRequestCache = (req) => {
  if (!req.getHiredRequestCache) {
    req.getHiredRequestCache = new Map();
  }
  return req.getHiredRequestCache;
};

const getUserCompanyForRequest = (req, uid) => {
  if (!uid) {
    return getUserCompany(uid);
  }
  const cache = getRequestCache(req);
  const key = 'getUserCompany:' + uid;
  if (cache.has(key)) {
    return cache.get(key);          // hit: same Promise returned
  }
  const promise = getUserCompany(uid).catch((error) => {
    cache.delete(key);              // error: remove so next call retries
    throw error;
  });
  cache.set(key, promise);          // miss: store Promise immediately (singleflight)
  return promise;
};
```

## Cache Lifetime

One HTTP request only. The cache lives on `req.getHiredRequestCache` — Node.js garbage-collects it when the request object is released after the response is sent.

## Cache Location

`req.getHiredRequestCache` — a property on the Express request object. No middleware needed; the property is lazily initialized on first call.

## Cache Key

`'getUserCompany:' + uid`

One entry per Firebase UID. Different uids in the same request always use different keys. This key namespace is safe from collision with other future cache entries (prefixed with the function name).

## In-Flight Deduplication (Singleflight)

The Promise is stored **before** it resolves. Any subsequent same-uid call within the same request returns the same pending Promise — they all await the same DB round-trip. This eliminates redundant concurrent lookups.

## Required Behavior

| Scenario | Behavior |
|----------|----------|
| First call, uid X | Cache miss → DB query → Promise stored → Promise returned |
| Second call, uid X, same request | Cache hit → same Promise returned, no new DB query |
| Concurrent calls, uid X, same request | All share the same pending Promise, one DB query |
| uid Y, same request | Separate cache key → separate DB query → no data mixing |
| DB error | Promise rejects → `cache.delete(key)` → error rethrown → next call can retry |
| uid null/undefined | Bypasses cache, calls `getUserCompany(uid)` directly (preserves existing null behavior) |
| Separate HTTP requests, same uid | Separate `req` objects → separate Maps → no cross-request leakage |

## What Is NOT Cached (Cross-Request)

Cross-request caching is **not part of this P2**. Reasons:
- Company membership, subscription, and role can change between requests
- A company can be deactivated or an employee removed mid-session
- No invalidation mechanism exists in this codebase
- Request-scoped cache is sufficient to eliminate within-request duplicates

**Cross-request cache** documented in backlog (BACKLOG_V2.md) with required: TTL, max size, invalidation on membership change, security review.

## Original Function Preserved

`getUserCompany(uid)` remains exported and unchanged. Used by:
- `userController.js` login flow (`credentials.id` — not Firebase UID)
- `services/message.service.js` (no req in service scope)
- `services/match/matchReadinessBridgeService.js` (no req in service scope)
- Direct test usage
