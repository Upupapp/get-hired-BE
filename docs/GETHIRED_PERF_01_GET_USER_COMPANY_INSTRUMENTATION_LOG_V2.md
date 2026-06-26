# PERF-01 Instrumentation Log
**GETHIRED_PERF_01_GET_USER_COMPANY_INSTRUMENTATION_LOG_V2**
Run: 2026-06-26 | BE HEAD: ba5c735

---

## Instrumentation Added

### Cache Hit/Miss Counters

No runtime instrumentation was added to the production cache path. The cache implementation is intentionally minimal:

```js
const getUserCompanyForRequest = (req, uid) => {
  if (!uid) { return getUserCompany(uid); }
  const cache = getRequestCache(req);
  const key = 'getUserCompany:' + uid;
  if (cache.has(key)) { return cache.get(key); }          // HIT
  const promise = getUserCompany(uid).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, promise);                                 // MISS
  return promise;
};
```

**Rationale:** Adding `console.log` or counter to the production path would:
- Flood PM2 logs at scale (every employer action)
- Expose uid values to log files (PII risk)
- Add measurable overhead to the hot path

### Debug Instrumentation (Development Only)

To verify cache behavior during development, add this wrapper in local env only (never commit):

```js
const getUserCompanyForRequest = (req, uid) => {
  if (!uid) { return getUserCompany(uid); }
  const cache = getRequestCache(req);
  const key = 'getUserCompany:' + uid;
  if (cache.has(key)) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[PERF-01] cache HIT for', key.substring(0, 30) + '…');
    }
    return cache.get(key);
  }
  const promise = getUserCompany(uid).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, promise);
  return promise;
};
```

### DB-Layer Timing

The existing PostgreSQL `pg` client does not provide query timing by default. To profile `getUserCompany` query latency:

```js
const getUserCompany = async (id) => {
  const t0 = Date.now();
  const result = await dbQuery.query(searchQuery, [id]);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PERF-01] getUserCompany db time:', Date.now() - t0, 'ms');
  }
  // ... rest of function
};
```

**Query estimated latency:** 2-8ms on Linode PG (co-located same datacenter). At employer dashboard load, 4 parallel requests each issue 1 getUserCompany → eliminated by cache to 1 per concurrent request within the same HTTP call.

---

## What Can Be Observed Without Code Changes

### PM2 Log Monitoring

```bash
ssh root@139.162.11.242 "pm2 logs gethired --lines 50"
```

Errors from `getUserCompanyForRequest` (DB failure path) will appear as `[companiesController] error:` — same as before patch.

### Database Query Log (PostgreSQL)

On the production DB, enable slow query log (threshold 50ms) to see if any `getUserCompany` pattern appears under load. On Supabase, this is available in the dashboard under "Logs > Postgres".

---

## Performance Claim

The P2 claim is: **within a single HTTP request**, if `getUserCompanyForRequest(req, uid)` is called N times with the same uid, exactly **1 DB query** executes.

This claim is verified by the request-scoped cache design (CACHE_DESIGN_CONTRACT_V2.md) and unit-testable without production instrumentation (see TEST_LOG_V2.md).
