# GETHIRED_SECURE_REPORT_RECENT_V1.md
Generated: 2026-06-25 (this session) | Scope: Security audit of commits 97cd657..9c0666b

---

## AUDIT SCOPE — COMMITS AUDITED

| Commit | Message |
|--------|---------|
| `9c0666b` | fix(security/P2): register delete route + close BOLA gap in post-delete response |
| `ba6b31b` | fix(security/P2-01): derive companyId from JWT on basiclist + expiredlist |
| `d4e34c7` | fix(security): restrict CORS to app_url instead of wildcard |
| `d321447` | fix(security/F-08): child-table BOLA hardening + Promise.all fix for interview questions |
| `97cd657` | fix(security): PayMongo webhook HMAC signature verification |
| `a0fca7a` | fix(security/qa11): 2 BOLA guards, PII log removal, security headers |
| `7f58650` | feat(security): add express-rate-limit 4-tier middleware |

---

## CHECKLIST: COMMITTED FIXES VERIFIED

### 1. P2 deleteJob

| Check | Result | Evidence |
|-------|--------|----------|
| Route registered with verifyAuth | PASS | `jobsRoute.js` line 33: `router.delete("/job/delete", verifyAuth, deleteJob)` |
| DELETE query uses `company_id=$2` | PASS | `jobsController.js` line 239: `WHERE job_id=$1 AND company_id=$2` |
| companyId NOT read from req.body/req.query | PASS | Only `const { jobId } = req.body` — companyId entirely removed from destructure |
| 0-row returns 404 not 403 | PASS | `jobsController.js` lines 245-248: `status.notfound` returned when `rowCount === 0` |
| Post-delete response scoped to JWT | PASS | `getBasicJobList(callerCompany.companyId, 0)` — never any caller-supplied ID |

### 2. P2-01 basiclist / expiredlist

| Check | Result | Evidence |
|-------|--------|----------|
| req.query.id gone from getJobBasicListOfCompany | PASS | Controller lines 192-203: only `getUserCompany(req.user.uid)` — no req.query.id |
| req.query.id gone from getExpiredJobListOfCompany | PASS | Controller lines 205-216: same pattern |
| getUserCompany(req.user.uid) used | PASS | Both functions confirmed; same BOLA pattern as all other protected endpoints |

### 3. CORS

| Check | Result | Evidence |
|-------|--------|----------|
| `app.use(cors({ origin: env.app_url }))` | PASS | `server.js` line 89 |
| Wide-open `cors()` removed | PASS | No bare `cors()` call anywhere in server.js |
| env.app_url configured | PASS | `env.js` line 23: defaults to `http://localhost:4200`, uses `process.env.APP_URL` in prod |
| Webhooks unaffected (server-to-server) | PASS | PayMongo → BE calls have no browser Origin header; CORS not involved |
| No legitimate cross-origin use broken | PASS | Only origin is the Angular SPA — correctly whitelisted via app_url |

### 4. PayMongo HMAC

| Check | Result | Evidence |
|-------|--------|----------|
| Constant-time comparison | PASS | `crypto.timingSafeEqual(a, b)` — `paymentController.js` lines 89-93 |
| 5-minute replay window | PASS | `Math.abs(Math.floor(Date.now()/1000) - parseInt(timestamp,10)) > 300` — line 77 |
| rawBody capture in server.js | PASS | `verify: (req, _res, buf) => { req.rawBody = buf; }` — `server.js` line 92 |
| Fallback when rawBody absent | PASS | Falls back to `JSON.stringify(req.body)` — line 79 (defensive, rawBody always present) |
| Accepts live (`li`) and test (`te`) sigs | PASS | `const sig = parts.li \|\| parts.te` — line 85 |
| Rejects unsigned requests with 400 | PASS | `!verifyPaymongoSignature(req)` → `res.status(400).json(...)` — lines 99-101 |

### 5. F-08 Interview BOLA hardening

| Check | Result | Evidence |
|-------|--------|----------|
| updateQuestionById has company subquery when companyId provided | PASS | `interview.service.js` lines 93-102: subquery on `job_interview_template.company_id=$7` |
| interviewQuestionsUpdate threads callerCompanyId | PASS | `job.service.js` line 347: `companyId = null` param, passed through on line 356 |
| jobsController.updateJob passes callerCompany.companyId | PASS | Lines 374-379: `callerCompany.companyId` passed as 4th arg |

### 6. Rate limiting tiers

| Tier | Config | Application |
|------|--------|-------------|
| globalLimiter | 500 req/15min | `app.use(globalLimiter)` line 114 — all routes |
| authLimiter | 20 req/15min | `app.use("/api/auth", authLimiter)` line 117 |
| writeLimiter | 100 req/15min (POST/PUT/DELETE only) | `app.use("/api", writeLimiter)` line 120 |
| sensitiveLimiter | 10 req/hr | Lines 123-125: changepassword, getpwresetlink, archive |

---

## NEW GAPS FOUND THIS SESSION

### P0 — FIXED THIS SESSION

#### SQLi-01: SQL Injection in getPublishedJobs() — UNAUTHENTICATED public endpoint

- **File:** `services/job.service.js` (was line 42)
- **Caller:** `getAllPublishedJobs` in `jobsController.js` line 617 → `GET /api/job/published` (no auth, public)
- **Root cause:**
  ```js
  // BEFORE (vulnerable):
  const filter = companyId ? `and j.company_id = '${companyId}'` : "";
  // companyId = req.query.id (user-controlled, unauthenticated)
  ```
- **Exploit:** `GET /api/job/published?id=anything' OR '1'='1'--` dumps all rows across all companies. Full `jobs` table enumerable with zero authentication.
- **Severity:** P0 — unauthenticated, trivially exploitable, public surface
- **Fix applied:**
  ```js
  // AFTER (fixed):
  // companyId branch: WHERE j.job_status_id = 2 AND j.company_id = $1, params = [companyId]
  // no-companyId branch: WHERE j.job_status_id = 2, params = []
  ```
- **Commit:** Applied in this session — not yet committed (see Fix Log)

---

### P2 — FIXED THIS SESSION

#### FE-01: FE job.service.ts sent dead ?id= query param after P2-01 BE fix

- **File:** `get-hired-FE/src/app/job/job.service.ts` lines 78, 89
- **Issue:** `getJobBasicList` sent `?id=${companyId}` and `getJobExpiredList` sent `?id=${companyId}`. The BE no longer reads this param (JWT-only), but the FE was still sending it — meaning any developer reading the URL would think the param is live, and a future BE regression could reintroduce the vulnerability.
- **Risk:** Not actively exploitable (BE ignores it), but creates a misleading API contract and increases regress-back-in risk.
- **Fix applied:** Both methods now send no query param; `companyId` arg renamed `_companyId?` (optional, unused) to keep callers compatible without breaking the signature.

#### ENV-01: Staging env.js branches missing paymongo_webhook_secret

- **File:** `env.js` staging switch cases `jobhunt` and `eucannajobs`
- **Issue:** Neither staging config included `paymongo_webhook_secret` — `env.paymongo_webhook_secret` would be `undefined`. The `verifyPaymongoSignature` function already fails-closed (`if (!secret) return false`), so webhooks are **rejected** in staging rather than accepted unauthenticated. No active exploit.
- **Risk:** (1) No way to test the webhook flow in staging without the prod secret. (2) If the fail-closed guard were ever removed, staging would be wide-open.
- **Fix applied:** Added `paymongo_webhook_secret: process.env.PAYMONGO_WEBHOOK_SECRET_DEV` and `..._EUCANNAJOBS` to each staging branch. Operator must add the env vars to staging `.env` files.

---

### P2 — FLAGGED AS BACKLOG (not fixed this session)

#### FE-02: checkCompanySubscription sends ?companyId= in URL

- **File:** `job.service.ts` line 24, `company.service.ts` line 20
- Both send `?companyId=${companyId}` to `/getsubscriptionrestrictions`
- BE (`getSubscriptionRestrictions` in jobsController) already ignores this param (uses JWT)
- Same pattern as FE-01 — dead param, not actively exploitable, but misleading
- **Backlog:** Clean up both service files to remove the param

#### INFO-01: payment.failed webhook logs full data object

- **File:** `paymentController.js` line 216: `console.log(data)` on payment.failed events
- `data` may contain PII depending on PayMongo event shape
- Inconsistent with the QA11 PII fix on payment.paid
- **Backlog:** Replace with `console.log('[paymentController] payment.failed id:', data && data.id)`

#### INFO-02: interviewController uses verify+match pattern rather than pure JWT derivation

- `getAllInterviewsOfCompanies`, `getAllInterviewsTemplatesOfCompanies`, `getAllInterviewRecipientsByCompanyId` take `companyId` from `req.query` and verify via `callerBelongsToCompany(uid, companyId)`
- Semantically equivalent to JWT derivation (ownership verified), but FE controls which companyId it requests; two DB round-trips instead of one; 403 shape is observable
- Not a BOLA gap — ownership is verified. Slightly weaker pattern but not exploitable.
- **Backlog:** Migrate to pure `getUserCompany(uid)` pattern in a future sprint

---

## ADDITIONAL SURFACE SWEEP

### Did registering the delete route expose new attack surface?

- Route is `DELETE /api/job/delete` with `verifyAuth` — unauthenticated callers receive 401
- Body accepts only `{ jobId }` — no companyId, no elevation vector
- Ownership gate: `WHERE job_id=$1 AND company_id=$2` with JWT-derived `$2` — cross-company delete impossible
- 0-row returns 404 (not 403) — no existence oracle
- Post-delete response scoped to caller's own company — no cross-company leak
- **Verdict: No new attack surface introduced.**

### Does the NgRx delete chain send companyId to the backend?

- `job.service.ts` line 52: `{ body: { jobId } }` — only jobId in body
- `job.actions.ts` line 144: `props<{ jobId: string }>()` — no companyId in action
- `job.effects.ts` line 410: dispatches `action.jobId` only
- **Verdict: NgRx chain does NOT send companyId.**

### Does the CORS change break any legitimate cross-origin use case?

- `env.app_url` = `https://gethiredonline.app` (prod), `http://localhost:4200` (dev)
- PayMongo webhook: server-to-server, no browser Origin header — CORS not involved
- Firebase Admin SDK: server-to-server — CORS not involved
- REST API clients (Postman/curl): no Origin header — CORS not involved
- Only the Angular SPA makes cross-origin browser requests — correctly whitelisted
- **Verdict: No legitimate cross-origin use case broken.**

### Remaining routes that still use companyId from req.body/req.query for ownership decisions?

Scan result on all controller files for `req.body.companyId`, `req.query.companyId`, `req.query.id`:
- Only comments in `jobsController.js` lines 81, 227 (documenting the removed pattern)
- `interviewController.js` reads `req.query.companyId` but passes it to `callerBelongsToCompany()` which verifies it against JWT — this is a valid guard, not a BOLA gap
- **Verdict: No live code reads companyId from request for unguarded ownership decisions.**
