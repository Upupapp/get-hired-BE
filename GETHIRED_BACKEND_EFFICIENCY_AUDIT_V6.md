# GETHIRED BACKEND EFFICIENCY AUDIT V6
**Date:** 2026-07-01 | **Scope:** LinkedIn OIDC BE endpoints + pre-existing V5 items | **Baseline:** V5

---

## §1 V6 LinkedIn OIDC BE Endpoints

### POST /auth/linkedin/start
- Redirects browser to LinkedIn authorization URL
- Stateless — generates state + nonce, stores in session/Redis
- No DB query on this endpoint
- Performance: O(1) — no concern

### POST /auth/linkedin/complete
- Exchanges ticket (short-lived BE-side token) for LinkedIn user data
- Likely calls: (1) validate ticket (Redis lookup or DB lookup), (2) find or create user, (3) generate JWT
- DB queries expected: `SELECT * FROM users WHERE linkedin_sub = $1` + possible `INSERT INTO users`
- Index needed: `users.linkedin_sub` should be indexed. If not, this is a sequential scan on every LinkedIn sign-in.
- **Recommendation:** Verify `CREATE INDEX ON users(linkedin_sub)` exists or `linkedin_sub` is unique-constrained (which auto-creates an index).

### POST /auth/linkedin/choose-role
- Updates new user's role after LinkedIn sign-in
- Expected: `UPDATE users SET role = $1 WHERE id = $2` — O(1) with PK lookup

### DELETE /auth/linkedin/unlink
- Requires valid Firebase ID token in Authorization header
- Expected: `UPDATE user_credentials SET linkedin_sub = NULL WHERE user_id = $1` or similar
- O(1) with PK/user_id index

### GET /auth/linkedin/link-status
- Returns whether current user's account has LinkedIn linked
- Expected: `SELECT linkedin_sub IS NOT NULL FROM users WHERE id = $1` — O(1)

---

## §2 Pre-existing Backend Concerns (V5, Status Unchanged)

| Concern | V5 Status | V6 Status |
|---|---|---|
| Dashboard pipeline-overview N+1 | Documented | Still open |
| Applicant profile multiple queries | Documented | Still open |
| Full-text search without tsvector index | Documented | Still open |
| User credentials email index | Verified ✅ | Still correct |

---

## §3 LinkedIn OIDC Token/Ticket Design

From the FE `LinkedInCompleteComponent`, the flow is:
1. BE generates a short-lived `ticket` (likely a signed JWT or UUID stored in Redis)
2. BE redirects to `/linkedin/complete?ticket=<ticket>`
3. FE calls `POST /auth/linkedin/complete` with `{ ticket }` in body
4. BE validates ticket, retrieves LinkedIn user data, and responds

This avoids storing LinkedIn access tokens in the URL (OAuth tokens in URLs are a security risk — they appear in server logs, browser history, and Referer headers). The ticket is short-lived and single-use. Correct pattern.

**Efficiency note:** If ticket is stored in Redis with TTL, the lookup is O(1) with microsecond latency. If stored in DB, ensure the `ticket` column is indexed.

---

## §4 Rate Limiting (V6 Routes)

From memory: BE has a 4-tier rate limiter (`globalLimiter/authLimiter/writeLimiter/sensitiveLimiter`). LinkedIn auth routes should be under `authLimiter`. Verify `/auth/linkedin/*` routes are covered by `authLimiter` to prevent brute-force ticket guessing.

---

## §5 Recommendations

1. Verify `linkedin_sub` column is indexed on `users` table
2. Verify LinkedIn auth routes are under `authLimiter`
3. Confirm ticket storage uses Redis (preferred) not DB for latency
4. Confirm ticket is invalidated (deleted/flagged) after first use — replay attack prevention
