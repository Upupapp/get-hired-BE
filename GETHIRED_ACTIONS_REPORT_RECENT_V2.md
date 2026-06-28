# GETHIRED ACTIONS REPORT — RECENT SPRINT V2

Scope: items NOT yet fixed after the security sprint + bug/perf sprint.
Generated: 2026-06-25

---

## REMAINING SECURITY GAPS

### SEC-01 | P1 | `getUserProfile` in applicantsController trusts caller-supplied id | S
`GET /api/applicant/userprofile` is auth-gated (verifyAuth) but the handler (`getUserProfile` at line 238 of applicantsController.js) reads `id` from `req.query` and passes it directly to `getUserProfileById`. Any authenticated user can fetch any other user's profile rows by supplying a different id. Fix: replace `req.query.id` with `req.user.uid`.

### SEC-02 | P1 | `GET /job/details` leaks application status for any uid | S
`getJobDetails` (jobsController.js line 601) is a public endpoint (no auth). It accepts an optional `uid` query param and uses it to check if that user has applied — no verification that the caller owns that uid. Anyone can probe whether a specific user (by uid) applied to any job. Fix: drop the uid param or require auth and derive uid from token.

### SEC-03 | P2 | Video CV uploads skip magic-byte verification | M
`uploadInStorage` (helpers/uploader.js line 13) only runs `matchesDeclaredType` when `withCodecs == 0`. The `withCodecs = 1` path (video CV) decodes and uploads without checking file signatures. A malicious user can spoof any content as video/webm and upload it to Firebase Storage. Fix: add container-header checks for common video MIME types (webm: 0x1A45DFA3, mp4: ftyp marker at offset 4) or enforce an allowlist at the storage bucket ACL level.

### SEC-04 | P2 | `GET /company/getAllCompanies` is unauthenticated and returns full company enumeration | S
`getAllCompanies` (companiesRoute.js line 53) has no `verifyAuth` middleware and returns `company_id` + `company_name` for every company in the DB. This enables enumeration-based BOLA attacks against all other company-scoped endpoints. Either add `verifyAuth` or remove the endpoint if no legitimate frontend consumer exists (none was found).

### SEC-05 | P2 | `verifyRoles` middleware reads uid from `req.body`/`req.query` instead of JWT | S
`verifyRoles` (middleware/verifyRoles.js line 17) does a DB role lookup using `uid = req.body.uid || req.query.uid` — caller-supplied. An attacker can pass any uid to impersonate roles. `verifyRoles` is currently unused across all route files, but if ever wired in it would be bypassable. Fix: read uid from `req.user.uid` (set by verifyAuth) and apply verifyAuth before verifyRoles.

### SEC-06 | P2 | `getCompanySubscriptions` 403 returns bare string instead of JSON | S
`subscriptionController.js` line 129 returns `res.status(403).send("Forbidden")` — inconsistent with the JSON error shape adopted everywhere else this sprint. Minor but breaks FE error-handling uniformity.

### SEC-07 | P2 | Rate limiting is in-memory — no persistence across restarts or multi-node | M
All four rate limiters use the default in-memory store. A server restart resets all counters. If the app ever runs on more than one Linode node, the limit is per-node, not global. Fix: wire `rate-limit-redis` against an existing Redis instance, or document the current single-server assumption in the deploy runbook.

---

## REMAINING PERFORMANCE ISSUES

### PERF-01 | P2 | `getUserCompany` is called 2–4× per request on many employer endpoints | M
Every employer mutation (createJobs, updateJob, deleteJob, updateStatus, addCompanyUser, createCandidate, etc.) calls `getUserCompany(uid)` independently. On a single request to `updateJob` there are at least 2 DB round-trips just for ownership. Fix: add a short-TTL in-process cache (e.g. `node-cache` keyed by uid, TTL 30 s) or pass the resolved company through a middleware and attach to `req.company`.

### PERF-02 | P2 | No DB indexes confirmed on hot join columns | M
The `company_employees.employee_uuid` column drives every single `getUserCompany` lookup, and `job_applicants.job_id` + `candidate_id` drive applicant list queries. No index existence check was done this sprint. At scale these become sequential scans. Verify indexes exist on: `company_employees(employee_uuid)`, `job_applicants(job_id)`, `job_applicants(candidate_id)`, `message_threads(company_id)`.

### PERF-03 | P3 | `getDashboard` (employer) fires 6 separate DB calls sequentially | S
`companiesController.getDashboard` runs `getUserCompany`, `charts`, `statistic`, `totalContacts`, `graph`, `cities`, `contactList` one after another — no `Promise.all`. At cold start with a full dataset this adds several hundred ms. Fix: wrap independent calls in `Promise.all`.

---

## REMAINING UX/COPY GAPS

### UX-01 | P1 | No `is_read` column in `message_threads` — unread badge always 0 | M
Confirmed in message.service.js comment (line 171): "No is_read column exists in the schema." The recruiter messages widget in the employer dashboard cannot show unread counts. This is a visible product gap for any employer who relies on messages. Fix: add `is_read` boolean column + DDL migration; update `listRecruiterThreads` query.

### UX-02 | P2 | `getListByUser` in interviewController stubs out with `null` | S
`GET /interview/getlistbyuser` always returns `null` (line with `return res.status(status.success).json(successResponse(null))`). If any FE component calls this endpoint, it silently gets nothing. Either implement or remove the route.

### UX-03 | P2 | `getUserCredentials` endpoint returns a token from Firebase but is not route-protected | S
`getUserCredentials` (userController.js line 308) is exported but not mounted in userRoute.js — no route exists for it. If it were wired without `verifyAuth` it would hand out auth tokens. Leave it dead code or remove it; document the intent.

### UX-04 | P3 | PayMongo webhook ignores the `link.payment.paid` → subscription-not-created case | S
In `paymongoWebhook`, the `status == "paid"` branch creates the subscription, but if `status` is not `"paid"` on a `link.payment.paid` event the handler falls through returning nothing (no `res.status` call). This causes a hanging Express response. Fix: add an explicit fallthrough `return res.status(200).json(...)` at the end of the `link.payment.paid` branch.

---

## TECH DEBT BLOCKING SCALING

### DEBT-01 | P1 | Zero automated tests — no regression net for any of the security fixes | L
No test files exist in the BE repo. Every fix this sprint was manually verified. The next developer to touch `getUserCompany`, `updateJob`, or the BOLA guards has no safety net. Fix: add at minimum one integration test per BOLA-fixed endpoint using `supertest` + a test DB or mock.

### DEBT-02 | P2 | `multipleCandidate` uses a `new Promise` wrapping async forEach — race condition | S
`candidateController.multipleCandidate` wraps async `forEach` in a `new Promise` with `resolve()` called inside the loop. This is a known anti-pattern: the promise can resolve before all async operations complete, silently dropping candidates. Fix: replace with `await Promise.all(candidate.map(...))`.

### DEBT-03 | P2 | `verifyRoles` is dead code with a critical flaw — remove or fix before use | S
See SEC-05. The middleware exists, is importable, but reads uid from the request body. Remove it or fix it before any future developer wires it into a route.

### DEBT-04 | P2 | No structured logging — `console.error/log` only, no log levels or correlation IDs | M
All error logging is raw `console.error`. There is no request-correlation ID, no log level control, and no way to filter by severity in production (`be_out.log` and `be_err.log` both exist). Fix: introduce `pino` or `winston` with a request-id middleware; add structured JSON output for production.

### DEBT-05 | P3 | `firebase.initializeApp` called inside `uploadInStorage` on every upload | S
`uploader.js` calls `firebase.initializeApp(firebaseConfig)` inside the upload Promise on each invocation. Multiple concurrent uploads will call `initializeApp` multiple times; Firebase warns (and in some SDK versions throws) on duplicate initialization. Fix: call `initializeApp` once at module load and reuse the app instance.

---

## MISSING FEATURES BLOCKING PUBLIC LAUNCH

### LAUNCH-01 | P0 | No applicant-facing "apply to job" status feedback after submission | M
`POST /application/apply` (`submitApplication`) exists and is wired, but the FE application flow has no confirmed loading / success / error state after submission (from NOTIFY sweep findings). An applicant has no way to know if their application was received. This is launch-blocking for the applicant side.

### LAUNCH-02 | P0 | No email sent to applicant on application submitted or status change | M
The mailer (`helpers/mailer.js`) supports SendGrid templates but no controller sends a confirmation email on `submitApplication` or when an employer changes `application_status_id`. Applicants will never know their status changed. At minimum: send a confirmation on apply.

### LAUNCH-03 | P1 | Subscription enforcement not applied at job-post time | M
`getSubscriptionRestrictions` returns restrictions, and `createJobs` calls `getUserCompany`, but there is no check in `createJobs` that the company has an active subscription or hasn't exceeded the plan's job-post limit. Any employer can post unlimited jobs regardless of plan. Fix: call `companySubscriptions` inside `createJobs` and enforce plan limits.

### LAUNCH-04 | P1 | Account deletion (`/auth/archive`) only deletes `user_credentials` row | S
`deleteUserAccount` in userController.js deletes from `user_credentials` and Firebase, but leaves behind rows in `users`, `applicants_profile`, `company_employees`, `job_applicants`, etc. This violates basic data-minimisation expectations and will cause FK constraint errors or dangling rows. Fix: cascade-delete or soft-delete all related tables.

### LAUNCH-05 | P2 | No CSP header — stored XSS via Firebase Storage CDN URLs is unmitigated | M
`server.js` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and disables the legacy XSS filter, but no `Content-Security-Policy` header is sent. If any upload bypasses the magic-byte check (video CV path, SEC-03), the CDN URL could serve malicious content without a CSP to block it. Fix: add a restrictive CSP (`default-src 'self'; img-src * data:; media-src *; script-src 'self'`).

---

## PRIORITY SUMMARY

| ID | Sev | Effort | Category |
|----|-----|--------|----------|
| LAUNCH-01 | P0 | M | Launch |
| LAUNCH-02 | P0 | M | Launch |
| SEC-01 | P1 | S | Security |
| SEC-02 | P1 | S | Security |
| DEBT-01 | P1 | L | Debt |
| LAUNCH-03 | P1 | M | Launch |
| LAUNCH-04 | P1 | S | Launch |
| UX-01 | P1 | M | UX |
| SEC-03 | P2 | M | Security |
| SEC-04 | P2 | S | Security |
| SEC-05 | P2 | S | Security |
| SEC-07 | P2 | M | Security |
| PERF-01 | P2 | M | Perf |
| PERF-02 | P2 | M | Perf |
| DEBT-02 | P2 | S | Debt |
| DEBT-03 | P2 | S | Debt |
| DEBT-04 | P2 | M | Debt |
| UX-02 | P2 | S | UX |
| LAUNCH-05 | P2 | M | Launch |
| PERF-03 | P3 | S | Perf |
| DEBT-05 | P3 | S | Debt |
| UX-03 | P3 | S | UX |
| UX-04 | P3 | S | UX |
| SEC-06 | P2 | S | Security |
