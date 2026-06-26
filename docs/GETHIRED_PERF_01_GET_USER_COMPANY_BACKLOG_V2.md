# PERF-01 Backlog
**GETHIRED_PERF_01_GET_USER_COMPANY_BACKLOG_V2**
Run: 2026-06-26 | BE HEAD: ba5c735

---

## Deferred / Not In PERF-01

### P2 — Thread req Into Service Layer

**What:** `services/message.service.js` and `services/match/matchReadinessBridgeService.js` call `getUserCompany(callerUid)` directly. These services receive uid but not `req`.

**Why deferred:** Changing service signatures to accept `req` is a larger refactor with potential for cascading changes. The services are called from controllers that do have `req` — but threading `req` through the service layer introduces Express coupling into what is currently pure business-logic code.

**Options when doing this:**
1. Pass `req` through service signatures (Express coupling, not ideal)
2. Use `AsyncLocalStorage` to propagate request context without threading (no Express coupling, more complex setup)
3. Create a separate `requestContext` service that wraps `AsyncLocalStorage`
4. Refactor services to accept a `companyContext` parameter instead of re-fetching

**Effort:** Medium. **Risk:** Low if done carefully.

---

### P3 — Short-TTL Shared Cache for Multi-Request Dashboard Load

**What:** The employer dashboard loads 4-5 separate API requests in parallel on page open, each making its own `getUserCompany` DB call. The request-scoped cache (PERF-01) doesn't help across these — they're separate `req` objects.

**Option:** A process-level LRU cache with TTL=5s, max 100 entries, keyed by uid. This would deduplicate all 4-5 concurrent dashboard requests for the same employer.

**Requirements before implementing:**
- LRU-cache or similar package added to dependencies
- Invalidation: cache must be cleared if `company_employees` changes (e.g., user leaves company)
- Max size to prevent unbounded memory growth
- TTL must be short enough that stale subscription/role changes don't persist
- Security review: ensure different uids are strictly separated (same as PERF-01 requirement)

**Estimated savings:** ~3 getUserCompany queries per employer dashboard page load (from 4 to 1 per 5s window).

**Effort:** Medium. **Risk:** Medium (cross-request state is inherently riskier than request-scoped state).

---

### P3 — Consolidated Employer Context Endpoint

**What:** Instead of caching getUserCompany separately in each controller, expose a single `GET /api/employer/context` that returns company + subscription + permissions in one DB call. Angular's employer NgRx store loads this once, subsequent component-level data fetches don't re-fetch company context.

**This is the architecturally cleanest solution** but requires FE changes (NgRx store, selector refactor).

**Effort:** High. **Risk:** Medium (requires FE + BE coordination).

---

### P4 — Automated Test Coverage for getUserCompanyForRequest

**What:** Add a Jest/Mocha test suite if one is introduced. Unit test the cache contract (hit/miss/error/concurrent). Integration test that patched controllers return same responses as before.

**Currently:** No test runner in `get-hired-BE`. Test coverage is zero.

**Effort:** High (requires test infrastructure setup first). Tracked separately.

---

### P4 — Production Cache Hit Rate Monitoring

**What:** Add non-PII metrics (cache_hit=1, cache_miss=0) to a metrics endpoint or PM2 log. Use this to validate the cache is being exercised in production.

**Currently deferred:** No metrics infrastructure exists.

---

## PERF-01 Scope Boundary

The following were evaluated and **explicitly excluded from PERF-01**:

| Excluded Item | Reason |
|--------------|--------|
| Cross-request caching | Too much invalidation/stale-data risk without proper TTL + invalidation |
| Service-layer req threading | Service signature refactor beyond P2 scope |
| getUserCompanyByEmail caching | Different function, different call pattern, not in scope |
| getSpecificCompany (id) caching | Fetches by DB company_id (not uid), different key space, not in scope |
| Redis/external cache | Infrastructure dependency, no Redis in current stack |
| Clone of returned object | Unnecessary — no mutation found at any call site |
