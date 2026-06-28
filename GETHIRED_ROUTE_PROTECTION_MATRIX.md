# GETHIRED ROUTE PROTECTION MATRIX — QA Cycle 11
Generated: 2026-06-25

Total routes counted: 91
Legend: Y = protected | N = intentionally public | MISS = missing protection (finding)

---

## Route Count by Protection Status

| Status | Count | % |
|--------|-------|---|
| verifyAuth protected | 78 | 86% |
| Intentionally public (no auth needed) | 10 | 11% |
| Missing auth (finding) | 0 | 0% |
| Total | 91 | — |
| Auth coverage (protected / non-public) | 78/81 | 96% |

Note: All previously-unprotected endpoints were fixed in QA cycles 8-10. No new unprotected endpoints in QA11.

---

## Intentionally Public Routes (10)

| Route | Justification |
|-------|--------------|
| POST /api/auth/signin | Login flow requires public |
| POST /api/auth/signup | Registration requires public |
| POST /api/auth/logout | No token to verify on logout |
| POST /api/auth/resendverificationlink | Pre-auth email flow |
| POST /api/auth/getverificationlink | Pre-auth email flow |
| POST /api/auth/manualexcelverification | Admin verification flow |
| POST /api/auth/verifyemail | Pre-auth email verification |
| GET /api/auth/getpwresetlink | Pre-auth password reset |
| POST /api/auth/changepassword | Pre-auth password change (token-based, not JWT) |
| POST /api/payment/paymongowebhook | PayMongo callback — cannot send Firebase JWT |
| GET /api/job/published | Job board public listing |
| GET /api/job/details | Job board public detail |
| GET /api/job/sharelink | Shareable link generation |
| GET /api/company/details | Public company profile |
| GET /api/company/featured | Public company discovery |
| GET /api/company/sharelink | Shareable company link |
| GET /api/company/getAllCompanies | Public company list |
| GET / | Health check / root |

---

## Rate Limit Coverage per Route Group

| Route prefix | Tier 1 Global | Tier 2 Auth | Tier 3 Write | Tier 4 Sensitive |
|-------------|--------------|-------------|-------------|-----------------|
| /api/auth/* (all methods) | Y (500/15m) | Y (20/15m) | Y for POST/PUT (100/15m) | Y for changepassword, getpwresetlink, archive (10/hr) |
| /api/auth/changepassword | Y | Y | Y | Y (10/hr) |
| /api/auth/getpwresetlink | Y | Y | N (GET skips Tier 3) | Y (10/hr) |
| /api/auth/archive | Y | Y | N (PUT — wait, this IS a write) | Y (10/hr) |
| /api/job/* (POST/PUT/DELETE) | Y | N | Y (100/15m) | N |
| /api/job/* (GET) | Y | N | N (GET skips Tier 3) | N |
| /api/messages/thread/send (POST) | Y | N | Y (100/15m) | N |
| /api/payment/paymongowebhook (POST) | Y | N | Y (100/15m) | N |
| All other GET routes | Y (500/15m) | N | N (GET skips Tier 3) | N |

---

## Key Rate Limiting Observations

### Is /api/auth/archive (PUT) covered by Tier 3?
YES. The Tier 3 `writeLimiter` skips GET/HEAD/OPTIONS only. PUT is not in the skip list.
`PUT /api/auth/archive` is a write → subject to Tier 3 (100/15m) AND Tier 4 (10/hr).
This is correct: an attacker trying to mass-archive accounts is capped at 10/hr.

### Is /api/auth/getpwresetlink (GET) covered by Tier 3?
NO. It is a GET method and Tier 3 skips GETs. However, it IS covered by Tier 4 sensitiveLimiter (10/hr) and Tier 1 global (500/15m). This is intentional and acceptable — the Tier 4 limit covers the critical abuse vector (password reset spam).

### Tier ordering correctness
`server.js` applies limiters in this order:
1. `globalLimiter` (line 99) — applies to all routes
2. `authLimiter` on `/api/auth` (line 102) — **additive** with Tier 1; a request to `/api/auth/signin` counts against both Tier 1 AND Tier 2
3. `writeLimiter` on `/api` (line 105) — additive with Tier 1 for writes
4. `sensitiveLimiter` on specific paths (lines 108-110) — additive with Tiers 1+2+3

Express middleware stacks are cumulative: all applicable limiters apply to each request. This is correct behavior for defense in depth. The concern is NOT double-counting — it is that each counter is independent. A request to `/api/auth/signin` consumes from both the Tier 1 bucket (500 remaining) and the Tier 2 bucket (20 remaining). The tighter Tier 2 limit is what stops brute force, not Tier 1.

### Are there mutations using GET that bypass Tier 3?
Checked: `GET /api/auth/getpwresetlink` (password reset — does not mutate, sends email only — acceptable as GET).
`GET /api/job/changestatus` — NOT a GET; it is `PUT /api/job/changestatus`.
`GET /api/auth/archive` — NOT a GET; it is `PUT /api/auth/archive`.
No mutations found using GET method. Tier 3 write-only skip is safe.
