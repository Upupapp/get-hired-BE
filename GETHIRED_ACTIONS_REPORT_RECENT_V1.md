# GetHired Actions Report — Post-Deployment Audit (V1 UPDATED)
**Scope:** Recent deployment (deleteJob P2, basiclist/expiredlist JWT fix, job_interview_template schema, CORS restriction, PayMongo HMAC, F-08 child BOLA, Firebase key rotation, nginx security headers, rate limiting) + full known backlog
**Date:** 2026-06-25
**Status:** PLANNING ONLY — no code changes in this document

---

## 1. Deployment Summary

Items shipped in the most recent deployment cycle:

| Tag | Description | Status |
|-----|-------------|--------|
| P2-deleteJob | Route un-commented, BOLA closed in post-delete response, NgRx delete chain wired | SHIPPED |
| P2-01 | basiclist/expiredlist JWT fix — companyId derived from JWT not req.body | SHIPPED |
| P2-02 | job_interview_template schema migration (company_id + created_by columns) | SHIPPED |
| CORS | Restricted from wildcard to `env.app_url` single origin | SHIPPED |
| PayMongo HMAC | HMAC-SHA256 webhook signature verification + replay prevention | SHIPPED |
| F-08 | Child-table BOLA (updateQuestionById) + Promise.all fix | SHIPPED |
| Firebase rotation | Key rotated, loaded via env (exact history purge status unconfirmed) | PARTIAL — see NEW-01 |
| Nginx headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection in Express middleware | SHIPPED |
| Rate limiting | 4-tier express-rate-limit (global/auth/write/sensitive) | SHIPPED |

---

## 2. New Issues Found By or Revealed By the Deployment

### NEW-01 — Firebase Key Rotation Git History Purge Not Confirmed (P0)
**File:** `middleware/firebaseApp.js:5`
**Severity:** P0 (carry-over — status unconfirmed)

`firebaseApp.js` still loads the service account key from a local JSON file via `env.projectName + '-serviceAccountKey.json'`. The deployment notes mention "Firebase key rotation" but the recent commit log (`git log --oneline -20`) contains no `git filter-repo` or BFG purge. P0-SEC-01 from the prior backlog remains unresolved until:
1. The old key is confirmed revoked in Firebase Console.
2. `git log --all -- "*.json"` returns no matches for service account files.
3. The production server loads the key from an env var, not a file on disk.

**Action:** Run BFG or `git filter-repo` to purge the JSON files from git history. Move the key load in `firebaseApp.js` to read from `process.env.FIREBASE_SERVICE_ACCOUNT_JSON` (parsed via `JSON.parse`). Force-push and confirm with the revoke test.

---

### NEW-02 — PayMongo Webhook Silent Rejection When Env Var Not Set (P1)
**File:** `controllers/paymentController.js:61-62`
**Severity:** P1 (payment flow breakage)

`verifyPaymongoSignature()` returns `false` when `env.paymongo_webhook_secret` is not set — which makes the webhook handler return 400 for every call. This is the correct secure-by-default behavior (no bypass), but if `PAYMONGO_WEBHOOK_SECRET` is absent from the Linode `.env`, every legitimate PayMongo webhook is rejected. The local `.env` does not contain this variable. Real payments would succeed on PayMongo's side but the subscription would never activate in the DB because every webhook delivery gets 400 and eventually exhausts retries.

**Action:** Verify `PAYMONGO_WEBHOOK_SECRET` is set in the production Linode `.env`. Fire a PayMongo test webhook from the dashboard and confirm the server returns 200.

---

### NEW-03 — CORS Single-Origin Breaks www Variant and Local Dev (P2)
**File:** `server.js:89`
**Severity:** P2 (functional regression risk)

`cors({ origin: env.app_url })` accepts only a single string. If `APP_URL` is `https://gethiredonline.app`, then `https://www.gethiredonline.app` (www redirect) will receive a CORS rejection in the browser. Local development at `http://localhost:4200` is also blocked when `APP_URL` is set to the production domain. CORS was previously wildcard-open, so this is a narrowing — correct directionally — but the implementation is too narrow.

**Action:** Change CORS origin to an allowlist array: `[process.env.APP_URL, 'https://www.gethiredonline.app', 'http://localhost:4200']` (the latter two can be conditional on `NODE_ENV !== 'production'`). See DEC-02 in the decision log.

---

### NEW-04 — deleteJob Hard-Deletes Cascade to Applicant History (P2)
**File:** `controllers/jobsController.js` — deleteJob; `db/applicant_application_ddl.sql` — cascade FKs
**Severity:** P2 (data loss)

The newly-active `DELETE FROM jobs WHERE job_id=$1 AND company_id=$2` cascades via FK to:
- `job_applicants` (ON DELETE CASCADE)
- `applicant_covered_letter` (ON DELETE CASCADE)
- `applicant_resume` (ON DELETE CASCADE)
- `applicant_government_files` (ON DELETE CASCADE)
- `interview_answers` (ON DELETE CASCADE)
- `message_threads` (ON DELETE CASCADE) → `messages` (ON DELETE CASCADE)

Deleting a job permanently and silently destroys all applicant history. This data-loss path did not exist before the route was enabled. No warning exists in the FE delete confirmation flow.

**Action (short term):** Add a BE guard that checks `job_applicants` count before deleting — return 409 if any applicant has applied to this job. Present a blocking warning in the FE. 
**Action (long term):** Implement soft-delete (`is_deleted BOOLEAN DEFAULT false`) on the `jobs` table. Filter `is_deleted = false` in all list queries. Hard-delete only after a retention period or explicit admin action.

---

### NEW-05 — Module-Level `now = new Date()` Bug Persists in Subscription Controller (P2)
**Files:**
- `controllers/subscriptionController.js:18` — used for `created_at` and `payment_date` in subscription records (lines 45, 94, 96)
- `controllers/companiesController.js:49`, `controllers/employerController.js:9`
- `services/interview.service.js:7`, `services/applicant.service.js:10`, `services/application.service.js:16`, `services/company.service.js:7`
**Severity:** P2 (data correctness — highest impact in subscriptionController)

`const now = new Date()` at module scope is evaluated once at server startup. Every subscription `created_at` and `payment_date` inserted after the first few seconds of uptime will have the server-start timestamp, not the actual transaction time. This bug already existed; the new `deleteJob` and HMAC features did not fix it, but the P2-01 JWT fix also removed `const now = new Date()` from `interviewController.js` — confirming it is a known pattern. The subscription controller is the most damaging instance because it records financial timestamps.

**Action:** In `subscriptionController.js`, replace `now` references with `new Date()` at the point of use. Apply the same fix to the other files listed. This is a safe, low-risk change.

---

### NEW-06 — PII Console.log Statements Remain in Login Flow (P2)
**File:** `controllers/userController.js:80-81, 217, 528`
**Severity:** P2 (privacy / compliance)

Three locations log to `be_out.log`:
1. `console.log(endSubs)` / `console.log(nowMili)` — logs subscription expiry on every login.
2. `console.log(verify)` at line 217 — logs Firebase email verification response (may contain email address and verification link).
3. `console.log(verify)` at line 528 — same in the internal `getVerification` helper.

This was partially fixed in `paymentController.js` (QA11 FIX-03) but the same pattern remains in `userController.js`. These logs write to `be_out.log` in plaintext on every login and every account invite.

**Action:** Remove `console.log(endSubs)`, `console.log(nowMili)`, and both `console.log(verify)` calls. If operational visibility is needed, replace with `console.info('[login] subscription active:', isActive)` (no dates, no links).

---

### NEW-07 — Rate Limiter May Throttle PayMongo Webhook Delivery (P3)
**File:** `server.js` — Tier 3 `writeLimiter`
**Severity:** P3 (operational risk under burst load)

The `writeLimiter` (100 writes / 15 min per IP) is applied to all POST requests on `/api`. PayMongo's webhook delivery IPs could hit this limit under burst purchase volume and receive 429 responses. PayMongo retries with backoff but subscriptions may activate late or not at all if the retry window is exceeded.

**Action:** Add a `skip` condition to `writeLimiter` to exclude `req.path === '/payment/paymongowebhook'`, or mount the webhook route before the write-limiter middleware.

---

### NEW-08 — Missing Security Headers: CSP, HSTS, Referrer-Policy (P3)
**File:** `server.js` — security header middleware block
**Severity:** P3 (defense-in-depth)

The recent deployment added three headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`). Missing:
- `Strict-Transport-Security` (HSTS) — no enforcement of HTTPS once the domain is known.
- `Referrer-Policy` — no control over referrer data sent to third parties.
- `Content-Security-Policy` — relevant for the API's small HTML responses (root `/` endpoint).

**Action:** Add `helmet` (`npm install helmet`) — one line replaces all manual header middleware and adds the missing headers with sensible defaults. Remove the existing manual header block once helmet is in place.

---

## 3. Pre-Existing Backlog (Unchanged By Deployment)

| ID | Item | Priority | File(s) |
|----|------|---------|---------|
| OLD-01 | `addCompanyUserByEmail` returns raw error strings (no envelope) | P2 | `controllers/companiesController.js:525` |
| OLD-02 | `checkUserIfExistInFirebase` in login leaks email existence (different error per path) | P1 | `controllers/userController.js:58-62` |
| OLD-03 | `deleteCV` leaves Firebase Storage orphaned (no Storage delete call) | P2 | `controllers/cvController.js:132-155` |
| OLD-04 | `listRecruiterThreads` has no LIMIT — unbounded thread list | P2 | `services/message.service.js:187` |
| OLD-05 | pg pool `max: 1` serializes all DB queries; set to 5-10 for production | P2 | `db/dbQuery.js:6` |
| OLD-06 | RecordRTC ~600KB in root FE bundle; lazy-load or dynamic import | P3 | FE `package.json:58` |
| OLD-07 | `getListByUser` always returns null — service call commented out | P2 | `controllers/interviewController.js:232` |
| OLD-08 | `recruiter_last_read_at` column missing — no read-state for messages | P3 | `db/messages_ddl.sql` |
| OLD-09 | IH active filter chip contrast ~3.7:1 (below WCAG AA 4.5:1) | P3 | FE interview hub component |
| OLD-10 | Mobile drawer missing focus trap | P2 | FE sidebar/drawer component |
| OLD-11 | `bcrypt` + `bcryptjs` both in `package.json` — remove native `bcrypt` | P2 | `package.json:29-30` |
| OLD-12 | `axios` 0.27.x — upgrade to 1.x for security fixes | P2 | `package.json:27` |
| OLD-13 | `request` package (deprecated since 2020) — remove; replace callers with `axios` | P2 | `package.json:50` |
| OLD-14 | Subscription/cart/companies_subscription tables not confirmed in production DB | P3 | `controllers/subscriptionController.js:25-28` |
| OLD-15 | Fixed USD→PHP rate `price * 55` hardcoded | P3 | `controllers/subscriptionController.js:39` |

---

## 4. Finding Count

| Priority | New (deployment-revealed) | Pre-existing | Total |
|---------|--------------------------|-------------|-------|
| P0 | 1 | 0 | 1 |
| P1 | 1 | 1 | 2 |
| P2 | 5 | 9 | 14 |
| P3 | 2 | 5 | 7 |
| **Total** | **9** | **15** | **24** |

---

*Report generated 2026-06-25. Planning only — no code changes made.*
