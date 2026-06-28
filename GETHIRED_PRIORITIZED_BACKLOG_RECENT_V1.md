# GetHired Prioritized Backlog — Post-Deployment (V1 UPDATED)
**Scope:** Recent deployment findings + full known backlog combined
**Date:** 2026-06-25
**Format:** P0 (launch-blocker) → P3 (polish/perf/debt)

---

## P0 — Must fix before ANY production traffic is trusted

---

### P0-01 · Firebase Service Account Key Rotation + Git History Purge

| Field | Value |
|-------|-------|
| **ID** | P0-01 |
| **Title** | Rotate Firebase service account keys and purge from git history |
| **Source** | NEW-01 (carried from P0-SEC-01) |
| **Problem** | `middleware/firebaseApp.js:5` loads the key from `env.projectName + '-serviceAccountKey.json'` on disk. Prior sessions confirmed these JSON files were committed to git. The recent "Firebase rotation" in the deployment notes is unconfirmed as a history purge — the git log shows no BFG/filter-repo run. Anyone with repo access holds valid server-side Firebase credentials. |
| **Impact** | Complete Firebase project compromise: arbitrary token minting, all user data, all Storage assets. |
| **Acceptance criteria** | (1) Old key revoked in Firebase Console. (2) `git log --all -- "*.json"` returns no service account hits. (3) Production server loads key via `process.env.FIREBASE_SERVICE_ACCOUNT_JSON`. (4) New key confirmed working in staging. |
| **Effort** | S (2-4 hours) |
| **Priority** | P0 |

---

## P1 — Fix before real users onboard / before beta

---

### P1-01 · Verify PayMongo Webhook Secret Is Provisioned in Production

| Field | Value |
|-------|-------|
| **ID** | P1-01 |
| **Title** | Verify `PAYMONGO_WEBHOOK_SECRET` is set in Linode production `.env` |
| **Source** | NEW-02 |
| **Problem** | `verifyPaymongoSignature()` returns `false` (reject-all) when the env var is missing. The local `.env` does not contain this variable. If production also lacks it, every legitimate PayMongo webhook is rejected with 400 — subscriptions never activate. |
| **Impact** | Silent payment activation failure — employers pay but never get subscription access. |
| **Acceptance criteria** | (1) SSH into Linode, confirm `PAYMONGO_WEBHOOK_SECRET` is in `.env`. (2) Fire a test webhook from PayMongo dashboard; server returns 200. (3) Subscription row confirmed in DB after test event. |
| **Effort** | XS (30 min verification) |
| **Priority** | P1 |

---

### P1-02 · Email Enumeration via Login Error Differentiation

| Field | Value |
|-------|-------|
| **ID** | P1-02 |
| **Title** | Normalize login error messages to prevent email enumeration |
| **Source** | OLD-02 |
| **Problem** | `loginUser` returns "User does not exist. Please Register." for unknown emails, and a different message for wrong password. This allows an attacker to enumerate valid email addresses by observing which error they get. |
| **Impact** | Email list harvesting; enables targeted phishing and credential stuffing. |
| **Acceptance criteria** | Both "email not found" and "wrong password" paths return the same generic message: "Invalid email or password." Status code must also be identical (both 401). |
| **Effort** | XS (15 min) |
| **Priority** | P1 |

---

## P2 — Fix before launch / before broader beta

---

### P2-01 · CORS Allowlist — Add www Variant and Dev Origin

| Field | Value |
|-------|-------|
| **ID** | P2-01 |
| **Title** | Replace single-string CORS origin with allowlist array |
| **Source** | NEW-03 |
| **Problem** | `cors({ origin: env.app_url })` accepts only one origin. `https://www.gethiredonline.app` and `http://localhost:4200` are rejected, which may break real users on the www variant and blocks all local FE development. |
| **Fix** | `cors({ origin: ['https://gethiredonline.app', 'https://www.gethiredonline.app', ...(isDev ? ['http://localhost:4200'] : [])] })` |
| **File** | `server.js:89` |
| **Effort** | XS (15 min) |
| **Priority** | P2 |

---

### P2-02 · deleteJob Must Guard Against Cascading Applicant History Loss

| Field | Value |
|-------|-------|
| **ID** | P2-02 |
| **Title** | Add cascade-loss guard to deleteJob or implement soft-delete |
| **Source** | NEW-04 |
| **Problem** | `DELETE FROM jobs WHERE job_id=$1` cascades to `job_applicants`, `applicant_covered_letter`, `applicant_resume`, `applicant_government_files`, `interview_answers`, `message_threads`, and `messages`. Deleting a job silently and permanently destroys all applicant history for that job. No FE warning exists. |
| **Short-term fix** | Query `job_applicants` count before deleting. If count > 0, return 409 with a warning message. FE must surface this warning prominently before the employer can force-delete. |
| **Long-term fix** | Add `is_deleted BOOLEAN DEFAULT false` to `jobs` table. Filter all list queries on `is_deleted = false`. Set `is_deleted = true` instead of hard-deleting. |
| **Files** | `controllers/jobsController.js` (deleteJob), `db/` (schema) |
| **Effort** | S (short-term guard: 2h), M (soft-delete: 4-6h) |
| **Priority** | P2 |

---

### P2-03 · Fix Module-Level `now = new Date()` in Subscription and Services

| Field | Value |
|-------|-------|
| **ID** | P2-03 |
| **Title** | Replace module-level `now` with inline `new Date()` calls |
| **Source** | NEW-05 |
| **Problem** | `const now = new Date()` at module scope is evaluated once at server start. All subsequent DB inserts that reference `now` use the server-start timestamp, not the transaction time. Most critical: `subscriptionController.js` uses this for `created_at` and `payment_date` on every subscription record. |
| **Files** | `controllers/subscriptionController.js:18,45,94,96` · `controllers/companiesController.js:49` · `controllers/employerController.js:9` · `services/interview.service.js:7` · `services/applicant.service.js:10` · `services/application.service.js:16` · `services/company.service.js:7` |
| **Fix** | Replace every `now` reference at point of use with `new Date()`. Delete the module-level `const now`. |
| **Effort** | S (1-2h across all files) |
| **Priority** | P2 |

---

### P2-04 · Remove PII Console.log in Login Flow

| Field | Value |
|-------|-------|
| **ID** | P2-04 |
| **Title** | Remove PII-leaking `console.log` calls from userController |
| **Source** | NEW-06 |
| **Problem** | `console.log(endSubs)` + `console.log(nowMili)` at lines 80-81 log subscription expiry dates on every login. `console.log(verify)` at lines 217 and 528 log Firebase email verification objects that may contain email addresses and one-time verification URLs. All written to `be_out.log` in plaintext. |
| **Files** | `controllers/userController.js:80,81,217,528` |
| **Fix** | Remove the four `console.log` calls. Replace with `console.info('[login] subscription active:', isActive)` (no dates/emails/links) if operational visibility needed. |
| **Effort** | XS (15 min) |
| **Priority** | P2 |

---

### P2-05 · addCompanyUserByEmail Returns Raw Error Strings

| Field | Value |
|-------|-------|
| **ID** | P2-05 |
| **Title** | Normalize error handling in `addCompanyUserByEmail` |
| **Source** | OLD-01 |
| **Problem** | When Firebase registration fails, `addCompanyUserByEmail` returns `{ msg: "Failed to Create credentials", status: "failed" }` without setting an HTTP status — the outer caller at line 504 doesn't check the return value for failure either. Error detail from Firebase bubbles raw or is silently swallowed. |
| **Files** | `controllers/companiesController.js:525-585` |
| **Effort** | S (1h) |
| **Priority** | P2 |

---

### P2-06 · deleteCV Leaves Firebase Storage Files Orphaned

| Field | Value |
|-------|-------|
| **ID** | P2-06 |
| **Title** | Delete Firebase Storage file when CV row is deleted |
| **Source** | OLD-03 |
| **Problem** | `deleteCV` removes the DB row but does not call Firebase Storage delete. Every deleted CV leaves an orphaned file consuming storage quota indefinitely. |
| **Files** | `controllers/cvController.js:132-155` |
| **Fix** | After successful DB delete, call `admin.storage().bucket().file(storagePath).delete()`. Must retrieve the storage path from the DB row before deleting. |
| **Effort** | S (2h) |
| **Priority** | P2 |

---

### P2-07 · listRecruiterThreads Has No LIMIT

| Field | Value |
|-------|-------|
| **ID** | P2-07 |
| **Title** | Add LIMIT to `listRecruiterThreads` query |
| **Source** | OLD-04 |
| **Problem** | `services/message.service.js:187` runs `SELECT ... FROM message_threads WHERE company_id = $1 ORDER BY updated_at DESC` with no LIMIT. A recruiter with hundreds of conversations will receive the full unbound result set, causing slow response and high memory usage. |
| **Fix** | Add `LIMIT 50 OFFSET $2` and accept a `page` parameter in the controller. |
| **Effort** | XS (30 min) |
| **Priority** | P2 |

---

### P2-08 · pg Pool max: 1 Serializes All DB Queries

| Field | Value |
|-------|-------|
| **ID** | P2-08 |
| **Title** | Increase pg pool max from 1 to production-appropriate value |
| **Source** | OLD-05 |
| **Problem** | `db/dbQuery.js:6` — `max: 1` means every concurrent request queues behind every other DB call. Under any load (>1 concurrent user), all queries serialize, creating latency spikes and timeouts. |
| **Fix** | Set `max: 10` (or `parseInt(process.env.DB_POOL_MAX) || 10`). Linode Postgres default connection limit is typically 100; 10 is safe. |
| **Effort** | XS (5 min) |
| **Priority** | P2 |

---

### P2-09 · getListByUser (AE-01) Always Returns null

| Field | Value |
|-------|-------|
| **ID** | P2-09 |
| **Title** | Implement `getListByUser` applicant interview list endpoint |
| **Source** | OLD-07 |
| **Problem** | `controllers/interviewController.js:232` — the handler returns `null` with HTTP 200. The underlying service call is commented out. Applicants cannot see their scheduled interviews. |
| **Fix** | Uncomment the service call; implement `getInterviewsOfUser(uid)` querying `group_interviews` where applicant_uid matches. |
| **Effort** | S (2-3h including service method) |
| **Priority** | P2 |

---

### P2-10 · Mobile Drawer Missing Focus Trap

| Field | Value |
|-------|-------|
| **ID** | P2-10 |
| **Title** | Add focus trap to mobile sidebar/drawer component |
| **Source** | OLD-10 |
| **Problem** | When the mobile navigation drawer opens, keyboard focus is not trapped inside it. Tab key escapes the drawer, making the component unusable for keyboard users and failing WCAG 2.1 SC 2.1.2. |
| **Files** | FE sidebar/drawer component |
| **Fix** | Add Angular CDK `FocusTrap` (CDK `a11y` module). |
| **Effort** | S (1-2h) |
| **Priority** | P2 |

---

### P2-11 · bcrypt Native Binding — Replace with bcryptjs

| Field | Value |
|-------|-------|
| **ID** | P2-11 |
| **Title** | Remove `bcrypt`, keep `bcryptjs` |
| **Source** | OLD-11 |
| **Problem** | `package.json` lists both `bcrypt ^5.0.1` and `bcryptjs ^2.4.3`. `bcrypt` has a native C++ binding that can fail on some Node versions and has had CVEs. `bcryptjs` is a pure-JS drop-in replacement that is safe and already installed. |
| **Fix** | Remove `bcrypt` from `package.json`. Find all `import/require('bcrypt')` and change to `bcryptjs`. The API is identical. |
| **Effort** | XS (30 min) |
| **Priority** | P2 |

---

### P2-12 · Upgrade axios 0.x to 1.x

| Field | Value |
|-------|-------|
| **ID** | P2-12 |
| **Title** | Upgrade `axios` from 0.27.x to 1.x in BE |
| **Source** | OLD-12 |
| **Problem** | `axios` 0.x has known security advisories (SSRF via redirect, CSRF token header exposure). 1.x includes fixes and better TypeScript types. |
| **Fix** | `npm install axios@latest`. Test PayMongo API calls and any other axios consumers. |
| **Effort** | S (1-2h including testing) |
| **Priority** | P2 |

---

### P2-13 · Remove Deprecated `request` Package

| Field | Value |
|-------|-------|
| **ID** | P2-13 |
| **Title** | Remove the `request` package (deprecated since 2020) |
| **Source** | OLD-13 |
| **Problem** | `package.json:50` includes `request ^2.88.2`, which has been officially deprecated and receives no security updates. |
| **Fix** | `grep -r "require('request')"` to find all callers; replace with `axios`. Remove from `package.json`. |
| **Effort** | S (1-2h) |
| **Priority** | P2 |

---

## P3 — Polish / perf / debt (post-launch)

---

### P3-01 · Add Webhook Rate-Limit Exemption

| Field | Value |
|-------|-------|
| **ID** | P3-01 |
| **Source** | NEW-07 |
| **Problem** | PayMongo webhook POST is subject to Tier 3 write limiter (100/15min). Under burst purchases, PayMongo may get 429 and delay subscription activation. |
| **Fix** | Skip `writeLimiter` for `req.path === '/payment/paymongowebhook'`. |
| **Effort** | XS (10 min) |
| **Priority** | P3 |

---

### P3-02 · Add Remaining Security Headers (HSTS, CSP, Referrer-Policy)

| Field | Value |
|-------|-------|
| **ID** | P3-02 |
| **Source** | NEW-08 |
| **Problem** | Recent deployment added X-Content-Type-Options, X-Frame-Options, X-XSS-Protection. Missing: HSTS, Content-Security-Policy, Referrer-Policy. |
| **Fix** | `npm install helmet`; `app.use(helmet())` — replace the manual header block. |
| **Effort** | XS (30 min) |
| **Priority** | P3 |

---

### P3-03 · Lazy-Load RecordRTC (~600KB) in FE Bundle

| Field | Value |
|-------|-------|
| **ID** | P3-03 |
| **Source** | OLD-06 |
| **Problem** | `recordrtc` is in the root FE bundle, adding ~600KB to initial load. It is only needed for the video interview recording screen. |
| **Fix** | Dynamic `import('recordrtc')` inside the component that uses it. Angular's code-splitting will put it in a lazy chunk. |
| **Effort** | S (1-2h) |
| **Priority** | P3 |

---

### P3-04 · Add recruiter_last_read_at Column for Message Read-State

| Field | Value |
|-------|-------|
| **ID** | P3-04 |
| **Source** | OLD-08 |
| **Problem** | Messages DDL has no `is_read` or `recruiter_last_read_at` column. Recruiters cannot see which threads have unread messages. `needsReply` is the only actionability signal available (last message was from applicant). |
| **Fix** | Add `recruiter_last_read_at TIMESTAMP` to `message_threads`. Update on every `GET /messages/:threadId` call by recruiter. Surface unread badge in inbox list. |
| **Effort** | M (4-6h schema + BE + FE) |
| **Priority** | P3 |

---

### P3-05 · IH Active Filter Chip Contrast (3.7:1 Below WCAG AA)

| Field | Value |
|-------|-------|
| **ID** | P3-05 |
| **Source** | OLD-09 |
| **Problem** | Interview Hub active filter chip foreground/background contrast is approximately 3.7:1, below the WCAG AA minimum of 4.5:1 for text. |
| **Fix** | Darken the active chip background or lighten the text color until contrast >= 4.5:1. Use a color-contrast checker tool (e.g. WebAIM). |
| **Effort** | XS (15 min) |
| **Priority** | P3 |

---

### P3-06 · Subscription Tables Not Confirmed in Production DB

| Field | Value |
|-------|-------|
| **ID** | P3-06 |
| **Source** | OLD-14 |
| **Problem** | `subscriptionController.js` and `paymentController.js` reference `cart_table`, `subscription`, and `companies_subscription`. These do not appear in the confirmed 39-table production schema. Monetization flows will throw DB errors on first real payment. |
| **Fix** | Apply the subscription DDL to production. Confirm tables exist via `\dt` before enabling payment links for real users. |
| **Effort** | S (1h DDL + verification) |
| **Priority** | P3 (but blocks monetization) |

---

### P3-07 · Fixed USD→PHP Rate `price * 55`

| Field | Value |
|-------|-------|
| **ID** | P3-07 |
| **Source** | OLD-15 |
| **Problem** | `subscriptionController.js:39` — `const amnt = parseFloat(price * 55).toFixed(2)`. This is a hardcoded exchange rate that will become incorrect as FX rates change. |
| **Fix** | Either use a live FX API (e.g., Open Exchange Rates) or price subscriptions natively in PHP. |
| **Effort** | M |
| **Priority** | P3 |

---

## Backlog Summary

| Priority | Count | Items |
|---------|-------|-------|
| P0 | 1 | P0-01 |
| P1 | 2 | P1-01, P1-02 |
| P2 | 13 | P2-01 through P2-13 |
| P3 | 7 | P3-01 through P3-07 |
| **Total** | **23** | |

---

*Generated 2026-06-25. Planning only — no code changes.*
