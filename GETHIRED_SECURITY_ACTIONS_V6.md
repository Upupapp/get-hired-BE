# GETHIRED SECURITY ACTIONS — V6
**Date:** 2026-07-01 | **Scope:** All security findings — BOLA, secrets, rate limiting, payment, session, headers

---

## Security Posture Summary V6

| Category | Status |
|---|---|
| BOLA / authorization scoping | PASS — all endpoints use JWT-derived IDs |
| Firebase Auth middleware | PASS — verifyAuth on all write routes |
| CORS | PASS — scoped to env.app_url (d4e34c7) |
| PayMongo HMAC code | PASS — commit 97cd657 |
| PayMongo env var on Linode | OPEN — must verify (SEC-ACT-001) |
| Rate limiting (global 4-tier) | PASS — confirmed present in server.js |
| Auth-tier rate limiting (10/15min) | NEEDS VERIFY |
| Firebase service account in git history | OPEN — P0 (SEC-ACT-002) |
| Raw Firebase error leakage | CLOSED — commit 6a7755c |
| Cross-tenant candidate scope | CLOSED — commit d5bba41 |
| X-Content-Type-Options header (BE API) | PASS |
| X-Content-Type-Options (nginx static) | OPEN — not verified |
| X-Frame-Options header | PASS |
| File upload MIME verification | PASS — magic-byte check (helpers/fileSignature.js) |
| SQL injection | LOW RISK — parameterized queries throughout |
| XSS | LOW RISK — Angular template interpolation encodes |
| LinkedIn OIDC security | PASS — OIDC standard flow, state param |
| Google OAuth security | PASS — new client, correct requestUri |

---

## Open Security Actions

### SEC-ACT-001 — Confirm PayMongo Webhook Secret on Linode
**Action ID:** GH-ACT-091
**Priority:** P0
**Category:** Security / Ops
**Problem:** HMAC signature verification code is shipped (commit 97cd657). `PAYMONGO_WEBHOOK_SECRET` presence on Linode production has not been verified. If absent, all payment webhook events are rejected 400 — subscriptions cannot activate.
**Why it matters:** Payment processing is blocked without the secret. Revenue from employer subscriptions is at risk.
**User/business impact:** Employers who subscribe cannot activate premium features. Revenue events not recorded.
**Technical impact:** `verifyPaymongoSignature()` in `controllers/paymentController.js` returns false when env var is missing, causing 400 response to all webhook deliveries.
**Scope:** Verify env var presence. Set if missing.
**Non-scope:** Changing PayMongo webhook code (already correct).
**Affected repo:** BE (ops)
**Affected files:** `/root/get-hired-BE/.env` on Linode, `controllers/paymentController.js`
**Affected roles:** Paying employers
**Dependencies:** PayMongo dashboard access
**Blockers:** Requires PayMongo dashboard login
**Risk level:** High — payment processing blocked
**Priority:** P0
**MoSCoW:** Must
**Estimated effort:** XS (5-10 minutes)
**Suggested owner:** Paul
**Acceptance criteria:**
1. `ssh root@139.162.11.242 "pm2 env 0 | grep PAYMONGO"` returns non-empty value
2. Test webhook from PayMongo dashboard returns HTTP 200 in PM2 logs
**Test requirements:** Fire test PayMongo webhook; observe PM2 logs
**Rollback notes:** If new secret breaks, restore old value from PayMongo dashboard
**Release gate:** Payment processing required before public launch
**Recommended command:** SECURE
**Status:** OPEN

---

### SEC-ACT-002 — Firebase Service Account Key Git History Purge
**Action ID:** ACT-013 / P0-FIREBASE
**Priority:** P0
**Category:** Security / Secrets
**Problem:** `jobhunt-serviceAccountKey.json` exists in get-hired-BE git history. Valid Firebase Admin SDK credentials accessible to anyone with repo read access.
**Why it matters:** Firebase Admin SDK credentials enable full user management, custom token issuance, and Firestore access — catastrophic if accessed by a malicious actor.
**User/business impact:** All user accounts and Firebase data at risk until rotated.
**Technical impact:** Requires Firebase key rotation + git history rewrite + force push.
**Scope:** Rotate Firebase service account key. Purge file from git history. Force-push. Update Linode.
**Non-scope:** Changing any application code.
**Affected repo:** BE (git history)
**Affected roles:** All users
**Dependencies:** Firebase Console access, coordination with any collaborators
**Blockers:** Must coordinate force-push with all repo collaborators
**Risk level:** Critical
**Priority:** P0
**MoSCoW:** Must
**Estimated effort:** L (~4 hours)
**Suggested owner:** Paul
**Acceptance criteria:**
1. `git log --all --full-history -- jobhunt-serviceAccountKey.json` returns no results
2. Production sign-in works with new key
3. Old service account key revoked in Firebase Console
**Test requirements:** Manual sign-in test post-rotation
**Rollback notes:** Keep old key offline until new key confirmed working; revoke old key only after new key verified
**Release gate:** Required before public launch / any public repo access
**Recommended command:** SECURE
**Status:** OPEN

---

### SEC-ACT-003 — Auth-Tier Rate Limiting Verification + Easy Job Post Limit
**Action ID:** P1-RATE-LIMIT / ACT-012
**Priority:** P1
**Category:** Security / Rate Limiting
**Problem:** Global 4-tier rate limiter exists in server.js (confirmed V5). Auth-specific tier (10 req/15min on sign-in/sign-up/reset-password) needs smoke-test verification. Easy Job Post endpoint (CPU-intensive AI extraction) has no per-user limit.
**Why it matters:** Brute-force on auth endpoints. DoS risk on AI extraction endpoint.
**User/business impact:** Auth brute-force → account takeover. Extraction abuse → server overload, degraded experience for all users.
**Technical impact:** Verify existing middleware applies correctly to auth routes. Add new per-user limiter on Easy Job Post route.
**Scope:** Smoke-test auth rate limiting. Add `express-rate-limit` on Easy Job Post routes keyed by `req.user.uid` (5 req/hour).
**Non-scope:** Redesigning the rate limiting architecture.
**Affected repo:** BE
**Affected files:** `server.js`, `middleware/rateLimiter.js`, `routes/easyJobPostRoutes.js`
**Affected roles:** All users (auth); Employers (Easy Job Post)
**Dependencies:** None
**Risk level:** Medium
**Priority:** P1
**MoSCoW:** Must
**Estimated effort:** S (2-4 hours)
**Suggested owner:** BE developer
**Acceptance criteria:**
1. 11+ consecutive sign-in requests to `/api/auth/signin` return HTTP 429
2. 6th Easy Job Post request within an hour from same user returns 429
**Test requirements:** Manual smoke-test with curl loops (see EXEC-PACK-D.1)
**Rollback notes:** Remove Easy Job Post limiter if false-positive reports from legitimate employers
**Release gate:** Security pre-launch requirement
**Recommended command:** SECURE
**Status:** OPEN

---

### SEC-ACT-004 — Stale noindex on Fast SPA Navigation
**Action ID:** SEC-V5-01
**Priority:** P2
**Category:** Security / SEO hygiene
**Problem:** When a user navigates from a missing-job page (noindex set) to a valid job page via SPA routing, the `noindex` meta tag may persist until the next Angular Meta update.
**Why it matters:** Valid job pages could temporarily show `noindex` to Googlebot if crawled during SPA navigation. Low probability, but clean-up is trivial.
**Scope:** Add `ngOnDestroy` hook to reset robots meta tag.
**Affected repo:** FE
**Affected files:** `src/app/jobs/job-posts-details/job-posts-details.component.ts`
**Risk level:** Very low
**Priority:** P2
**MoSCoW:** Should
**Estimated effort:** XS (15 minutes)
**Suggested owner:** FE developer
**Acceptance criteria:** Navigating from error-state job URL to valid job URL shows `index, follow` in meta tag within the same SPA session.
**Rollback notes:** None — trivially reversible
**Status:** OPEN

---

### SEC-ACT-005 — Sitemap Rate Limit
**Action ID:** SEC-SITEMAP-01
**Priority:** P2
**Category:** Security / Rate Limiting
**Problem:** `/sitemap.xml` endpoint has no dedicated rate limit. Each request queries DB for active job URLs. Aggressive crawlers can generate DB query storms.
**Scope:** Add dedicated sitemap-specific rate limiter (30 req/hour per IP).
**Affected repo:** BE
**Affected files:** `server.js` or `routes/sitemapRoutes.js`
**Risk level:** Low
**Priority:** P2
**MoSCoW:** Should
**Estimated effort:** XS (30 minutes)
**Suggested owner:** BE developer
**Acceptance criteria:** 31st request to `/sitemap.xml` from same IP within an hour returns HTTP 429.
**Status:** OPEN

---

### SEC-ACT-006 — X-Content-Type-Options on Nginx Static Files
**Action ID:** SEC-NOSNIFF-01
**Priority:** P2
**Category:** Security / Headers
**Problem:** X-Content-Type-Options: nosniff verified on BE API responses; not verified for Linode nginx static file serving.
**Scope:** Verify header on static files. Add to nginx config if missing.
**Affected repo:** N/A (Linode nginx config)
**Estimated effort:** XS (30 minutes)
**Steps:** `curl -I https://gethiredonline.app/main.js | grep -i x-content-type` — should show `nosniff`. If not: add `add_header X-Content-Type-Options "nosniff" always;` to nginx `location /` block; `nginx -s reload`.
**Status:** OPEN

---

### SEC-ACT-007 — Remove console.log in getShareableLink
**Action ID:** SEC-CONSOLE-01
**Priority:** P3
**Category:** Security / Info Disclosure
**Problem:** `console.log(res.data)` at `job-posts-details.component.ts:136` logs shareable link URL to browser console.
**Risk level:** Very low
**Estimated effort:** XS (5 minutes)
**Status:** OPEN

---

## Closed Security Items V5→V6 (History)

| ID | Fix | Status | Commit |
|----|-----|--------|--------|
| SEC-GIT-CORS | CORS wildcard → origin-scoped | CLOSED | d4e34c7 |
| SEC-PAYMONGO-HMAC | PayMongo webhook HMAC code | CLOSED | 97cd657 |
| SEC-TOKEN-01 | Raw Firebase error in 403 | CLOSED | 6a7755c |
| SEC-DEAD-01 | isMobileViewAllowed dead code | CLOSED | 94e4d39 |
| SEC-CANDIDATE-SCOPE | Cross-tenant candidate oracle | CLOSED | d5bba41 |
| SEC-01 | IDOR on /applicant/userprofile | CLOSED | Prior sprint |
| SEC-02 | IDOR on job details company_id | CLOSED | Prior sprint |
| SEC-07 | BOLA on profile sub-arrays | CLOSED | Prior sprint |
| SEC-HEADERS | X-Content-Type-Options, X-Frame-Options on BE | CLOSED | Prior sprint |
| SEC-MAGIC-BYTE | File upload MIME spoofing | CLOSED | helpers/fileSignature.js |
| SEC-08 | getJobApplicantDetails BOLA | CLOSED | Prior sprint |
| LINKEDIN-OIDC | LinkedIn OAuth — state param, code flow | CLOSED | Session 2026-07-01 |
| GOOGLE-OAUTH | Google OAuth new client + requestUri fix | CLOSED | Session 2026-07-01 |

---

## Top 5 Security Actions (Priority Order)

1. SEC-ACT-001 — Confirm PayMongo secret on Linode (P0, 5 min, blocks payment)
2. SEC-ACT-002 — Firebase key git history purge (P0, 4 hr, blocks public launch)
3. SEC-ACT-003 — Rate limiting verification + Easy Job Post limit (P1, 2-4 hr)
4. SEC-ACT-004 — Stale noindex on SPA navigation (P2, 15 min)
5. SEC-ACT-005 — Sitemap rate limit (P2, 30 min)
