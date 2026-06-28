# GETHIRED_SEARCH_SECURITY_AUDIT_V1
_Generated: 2026-06-28_

## Security controls implemented

### 1. SQL injection prevention
- All search queries use parameterised `db.query(sql, [param1, param2, ...])`.
- `plainto_tsquery('english', $1)` — user query is a bound parameter, never string-concatenated.
- Sort field comes from `parseSort()` whitelist, never from client string.
- No dynamic SQL generation in any search service function.

**Status: PASS**

### 2. BOLA (Broken Object Level Authorization)
- `/search/employer`: `company_id` resolved via `getCompanyForUser(uid)` → `SELECT company_id FROM company_users WHERE uid = $1`. Never from `req.query` or `req.body`.
- `/search/applicant`: `user_id` = Firebase uid from token. Never from request.
- Test: attacker cannot view another company's jobs by passing a different `company_id` query param — the param is ignored.

**Status: PASS**

### 3. Authentication bypass
- `/search/employer` and `/search/applicant` use `verifyAuth` middleware (Firebase token validation).
- `/search/public` and `/search/autocomplete` use `optionalVerifyAuth` — anonymous access allowed but uid is null if not present.
- No endpoint can be accessed with a fake or expired token.

**Status: PASS**

### 4. Rate limiting
- Anonymous autocomplete: 200 req/15 min (express-rate-limit, in-memory for single instance).
- Authenticated autocomplete: unlimited (legitimate user, session-bound).
- `/search/public`: inherits global rate limiter from `server.js` `globalLimiter`.
- Rate limit responses return 429 with JSON error body.

**Status: PASS**

### 5. Input validation
- `q` max 200 chars — prevents degenerate tsquery with thousands of tokens.
- Page is parseInt'd and clamped to ≥ 1.
- Sort, workSetup, employmentType are whitelisted — no arbitrary string reaches SQL.
- `sanitiseString` returns `''` for null/undefined/non-string input.

**Status: PASS**

### 6. Error information leakage
- `sendError(res, status, code, message)` always returns a structured JSON error with a code string.
- DB errors are caught and converted to `INTERNAL_ERROR / "Search temporarily unavailable"`.
- No stack traces, no SQL, no table names, no DB credentials in any error response.

**Status: PASS**

### 7. Draft/unpublished job leakage
- Public query always includes `WHERE j.status = 'published'`.
- No client parameter can change this — `status` is not in `parsePublicSearchParams`.

**Status: PASS**

### 8. Cross-tenant / cross-company applicant data
- `/search/employer` adds `WHERE j.company_id = $companyId` where `$companyId` is from JWT→DB.
- No path exists to search jobs or applicants of a different company within these endpoints.

**Status: PASS**

## Outstanding risks (deferred)

| Risk | Severity | Mitigation plan |
|---|---|---|
| Rate limiter is in-memory (resets on pm2 restart) | Low | Redis-backed rate limit in backlog; current 200/15min is restrictive enough for known traffic |
| `plainto_tsquery` with very long inputs can be slow | Low | 200-char cap limits maximum tsquery term count |
| No per-IP search logging | Low | Add analytics pipeline (backlog) |
| Admin search role not fully scoped yet | Low | Admin sees same as public for now; full admin scope deferred |
