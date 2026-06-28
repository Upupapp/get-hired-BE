# GETHIRED_SEARCH_RATE_LIMITING_SPEC_V1
_Generated: 2026-06-28 | File: routes/searchRoutes.js_

## Rate limiters

### autocompleteRateLimit
```javascript
const autocompleteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,
  skip: (req) => !!req.user,  // skip authenticated users
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many autocomplete requests. Please try again later.' }
});
```

- Only applies to **anonymous** users (no Firebase token).
- Authenticated users (`req.user` is set by `optionalVerifyAuth`) are skipped entirely.
- 200 requests / 15 minutes ≈ one request every ~4.5 seconds. At 220ms debounce, a user typing continuously would send ~13 requests/minute, well within limit.
- Response on limit: HTTP 429 JSON.

### Global limiter (server.js)
The existing `globalLimiter` in `server.js` covers all `/api/*` routes including search. The `autocompleteRateLimit` is an additional, stricter limiter stacked on top of global for anonymous autocomplete specifically.

### Auth-required endpoints
`/api/search/employer` and `/api/search/applicant` use `verifyAuth` which rejects unauthenticated requests with 401 before any rate-limit check. Authenticated users are subject to the `globalLimiter` rate limit only.

## Attack scenarios

| Scenario | Mitigation |
|---|---|
| Bot scraping all jobs via `/search/public` | `globalLimiter` limits all anonymous requests to platform-wide threshold |
| Competitive scraper enumerating all job titles via autocomplete | `autocompleteRateLimit` 200/15min on anonymous requests |
| Authenticated employer scraping all companies via employer search | `globalLimiter`; employer search is company-scoped so inter-company data not accessible even without rate-limiting |
| DDoS on search endpoint | Server-level protection (Linode firewall/Cloudflare) is external to app |

## Current limitations
- Rate limit state is **in-memory** (reset on `pm2 restart`). In a multi-instance deployment this would not work correctly. Redis-backed rate limiting should be added before horizontal scaling.
- No per-query rate limiting (same query spammed). Would require Redis with query-specific keys.
- IP spoofing via `X-Forwarded-For` manipulation: `express-rate-limit` uses `req.ip`. Ensure the proxy trust level (`app.set('trust proxy', 1)`) is correct in server.js.
