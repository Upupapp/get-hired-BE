# GETHIRED SECURITY RISK REGISTER — QA Cycle 11
Generated: 2026-06-25

Format: ID | Severity | OWASP Category | Finding | Status | Action

---

## P0 — Critical (Block Release)

None identified in QA11. All prior P0s resolved (confirmed in QA10).

---

## P1 — High (Fix Before Beta)

### P1-01: Service Account Keys in Repository Root
- **Severity:** P1 / Critical
- **Files:** `gethired-serviceAccountKey.json`, `jobhunt-serviceAccountKey.json` (BE repo root)
- **OWASP:** A07:2021 Identification and Authentication Failures / Secret Exposure
- **Finding:** Two Firebase/GCP service account key files sit in the BE repo root and are tracked by git. Anyone with repo read access (current or historical clones) can use these to authenticate as the service account, bypassing all user-level access controls. This was flagged in prior cycles — status is still OPEN.
- **Status:** OPEN (flagged QA1, unresolved through QA11)
- **Action Required:** Rotate both service account keys immediately (external action); add to .gitignore; confirm git history does not contain previous key values (if so, treat history as compromised and rotate again).

---

## P2 — High (Fix Within 1 Sprint)

### P2-01: PayMongo Webhook — No Signature Verification
- **Severity:** P2
- **File:** `controllers/paymentController.js`, `routes/paymentRoute.js`
- **OWASP:** A07 — Broken Authentication
- **Finding:** `POST /api/payment/paymongowebhook` accepts any POST with the correct JSON structure and processes it as a real payment event — including updating transaction records and triggering subscription creation. No HMAC signature check against PayMongo's `x-paymongo-signature` header. A malicious actor could replay or forge a `link.payment.paid` event to create fraudulent subscriptions without paying.
- **Status:** OPEN (flagged in all prior SECURE passes)
- **Remediation:** Read `req.headers['x-paymongo-signature']`; compute HMAC-SHA256 of `req.rawBody` with the webhook secret; reject if mismatch. Requires `express.raw()` to capture raw body before JSON parsing.

### P2-02: saveGroupInterview — No Company Ownership Guard
- **Severity:** P2
- **File:** `controllers/interviewController.js` — `saveGroupInterview()`
- **OWASP:** A01:2021 Broken Access Control (BOLA)
- **Finding:** `POST /api/interview/savegroupinterview` calls `createGroupInterview(req.body, uid)` without first confirming the caller belongs to the company referenced in `req.body`. Any authenticated user (including applicants) could create a group interview attributed to any company by supplying a target `companyId` in the body.
- **Status:** NEW — found QA11
- **Remediation:** Add `getUserCompany(uid)` guard before `createGroupInterview()`, identical to the pattern in `saveQuestionTemplate()`.

### P2-03: getJobApplicantDetails — No BOLA Check
- **Severity:** P2
- **File:** `controllers/jobsController.js` — `getJobApplicantDetails()`, `controllers/candidateController.js`
- **OWASP:** A01:2021 Broken Access Control (BOLA)
- **Finding:** `GET /api/job/applicantdetails` and `GET /api/candidates/applicantdetails` both call `applicationOfApplicant(jobId, id)` with no check that the caller's company owns the job. Any authenticated employer can see any applicant's details by guessing/supplying a jobId from another company.
- **Status:** NEW — found QA11
- **Remediation:** Derive companyId from `getUserCompany(req.user.uid)`, fetch `getJobCompanyId(jobId)`, reject with 403 if mismatch.

### P2-04: Missing Security Headers
- **Severity:** P2
- **File:** `server.js`
- **OWASP:** A05:2021 Security Misconfiguration
- **Finding:** No `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, or `Content-Security-Policy` headers set. The nosniff header is particularly relevant given the MIME spoofing fix in `fileSignature.js` — a browser serving API responses without nosniff could sniff content types.
- **Status:** OPEN (carried from prior cycles)
- **Remediation:** Add `app.use((req, res, next) => { res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('X-XSS-Protection','0'); next(); })` to server.js, or install `helmet`.

### P2-05: Unrestricted CORS in Production
- **Severity:** P2
- **File:** `server.js` line 90 — `app.use(cors())`
- **OWASP:** A05:2021 Security Misconfiguration
- **Finding:** `cors()` called with no options allows any origin. The whitelist array is defined but the restrictive `corsOption` is commented out. For a beta launch, this means any website can make authenticated cross-origin requests if the user's browser also has a valid session cookie.
- **Status:** OPEN (carried from prior cycles)
- **Remediation:** Uncomment and enable `corsOption` for production. Allow only the production FE origin.

---

## P3 — Medium (Fix Within 2 Sprints)

### P3-01: Email Enumeration on Login
- **Severity:** P3
- **File:** `controllers/userController.js` — `loginUser()`
- **Finding:** Returns "User does not exist. Please Register." when account not found, versus a different message for wrong password. An attacker can confirm which emails are registered.
- **Status:** OPEN (carried)
- **Remediation:** Return identical "Invalid email or password" for both cases.

### P3-02: Video Upload MIME Not Magic-Byte Checked
- **Severity:** P3
- **File:** `helpers/fileSignature.js`, `controllers/applicantsController.js`
- **Finding:** Video CVs uploaded via `saveVideoCV()` bypass the magic-byte check that covers PDF/DOCX/images.
- **Status:** OPEN (carried, intentionally deferred)

### P3-03: Admin Route Lacks Role Enforcement
- **Severity:** P3
- **File:** `routes/adminRoute.js`, `controllers/adminController.js`
- **Finding:** `/api/admin/userprofile` uses `verifyAuth` but no role check verifies the caller is actually an admin. Any authenticated user can call this endpoint.
- **Status:** OPEN (carried)

### P3-04: npm Dependency Vulnerabilities (273 total)
- **Severity:** P3 (transitive; not directly exploitable from current public surface)
- **Finding:** `npm audit` reports 17 critical, 138 high, 99 moderate, 19 low. Main chains: `bcrypt > @mapbox/node-pre-gyp > tar` (path traversal, arbitrary file overwrite), `axios` (SSRF, prototype pollution, CSRF, DoS). The `tar` vulnerabilities affect the native build step for bcrypt, not runtime request handling. The axios vulnerabilities affect outbound PayMongo API calls.
- **Status:** NEW — full count confirmed QA11
- **Remediation (phased):** (1) Replace `bcrypt` with `bcryptjs` (already in package.json — just remove bcrypt); (2) upgrade axios to latest; (3) remove deprecated `request` package (also has vulns via qs, uuid).

### P3-05: express.json 50MB Limit
- **Severity:** P3
- **File:** `server.js` line 92
- **Finding:** `express.json({ limit: "50mb" })` allows 50MB JSON bodies. While needed for base64 file uploads, this enables DoS via large payload floods at 500 req/15min (Tier 1 limit).
- **Status:** OPEN (deferred — requires splitting upload vs API body limits)

### P3-06: deleteCV — Orphaned Storage Object
- **Severity:** P3
- **File:** `controllers/cvController.js`
- **Finding:** `DELETE /cv/delete` removes the DB row but does not delete the file from Firebase Storage. CVs accumulate as orphaned blobs.
- **Status:** OPEN (carried)

### P3-07: applicantEmail Returned to Recruiter via Message Threads
- **Severity:** P3 (privacy — may be intentional)
- **File:** `services/message.service.js` — `listRecruiterThreads()`
- **Finding:** `applicantEmail` is included in the response mapping. Whether a recruiter should see the applicant's raw email via the messages list is a product decision. If the platform is the communication channel, exposing the email may allow off-platform contact, circumventing potential future monetization or safety controls.
- **Status:** NEW — QA11 (document intent; consider stripping `applicantEmail` from the thread list if off-platform contact is undesired)
- **Recommendation:** Confirm with product owner. If off-platform contact is not intended, remove `applicantEmail` from the `listRecruiterThreads` response map.

---

## Resolved Since Last Report (QA10 → QA11)

| ID | Finding | Resolution |
|----|---------|-----------|
| QA10-RL-01 | No rate limiting anywhere in codebase | RESOLVED — 4-tier rate limiting deployed in server.js |
| QA10-BOLA-12 | Interview hub unauthenticated | RESOLVED — GET /api/interview/hub has verifyAuth + getUserCompany guard |
| QA10-BOLA-13 | getInterviewHub trusts client companyId | RESOLVED — companyId derived from JWT exclusively |
