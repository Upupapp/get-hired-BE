# PERF-01 Frontend Compatibility Log
**GETHIRED_PERF_01_GET_USER_COMPANY_FRONTEND_COMPATIBILITY_LOG_V2**
Run: 2026-06-26 | FE HEAD: 553ce0c | BE HEAD: ba5c735

---

## Summary

PERF-01 is a backend-only optimization. No contract changes were made to any API response shape or HTTP status codes. Frontend compatibility impact is zero.

---

## Response Contract Analysis

### getUserCompanyForRequest vs getUserCompany — Response Identity

`getUserCompanyForRequest(req, uid)` returns the same Promise that `getUserCompany(uid)` returns on the first call. The resolved value is the **exact same object** (not a copy, not a transformation). All consumers (controllers) continue to receive the same object shape as before.

| Property | Before | After |
|----------|--------|-------|
| Response body shape | Unchanged | Unchanged |
| HTTP status codes | Unchanged | Unchanged |
| Error response format | Unchanged | Unchanged |
| Field names (camelCase) | Unchanged | Unchanged |

### `[]` Empty Array Case Preserved

`getUserCompany` returns `[]` when no company found. The controllers check `Array.isArray(callerCompany)` and return HTTP 403. This path flows unchanged through the new cache — `getUserCompanyForRequest` returns `getUserCompany`'s Promise which resolves to `[]`, the cache stores it, the controller checks and 403s.

---

## Angular Frontend Impact

### Employer Company Context (company.service.ts)

The FE `company.service.ts` calls `GET /employer/company`. Response shape:

```ts
{
  companyId: string,
  companyName: string,
  companyEmail: string,
  // ... (all mapped fields from mappedCompany)
}
```

This shape is **unchanged** by PERF-01. Angular components, NgRx store selectors, and any `Observable<Company>` subscriptions see the same data.

### Employer Dashboard (Angular parallel requests)

The employer dashboard dispatches 4 HTTP requests in parallel on load. PERF-01 does NOT merge these — they are still 4 separate BE requests, each returning their own data. No FE change required or expected.

### Error Handling

FE error interceptors (`HttpInterceptor` / service `.pipe(catchError(...))`) continue to receive the same HTTP error codes (403, 500) as before. No change.

---

## Edge Cases

### Request During Server Startup

PM2 restarted the process (restart 21). During the brief startup window, requests may receive ECONNREFUSED. This is pre-existing behavior unaffected by PERF-01.

### Firebase UID Lifetime

`getUserCompanyForRequest` uses `req.user.uid` which is validated per-request by `verifyAuth`. The cache is request-scoped, so if Firebase's UID changes (token refresh) it always hits a fresh cache — no stale uid ever persists across requests.

---

## Conclusion

No FE changes required or made. Zero regression risk to FE from this patch.
