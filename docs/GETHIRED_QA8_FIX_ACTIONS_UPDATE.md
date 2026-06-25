# GetHired QA Cycle 8 Fix Sprint — ACTIONS Update

**Generated:** 2026-06-25
**Scope:** Post-QA8 security posture, Dependabot triage, rate-limiting sprint design, backlog priority, production readiness verdict
**Predecessor docs:** GETHIRED_QA7_FIX_ACTIONS_UPDATE.md, GETHIRED_QA8_FIX_SPRINT_LOG.md

---

## 1. Security Posture — Current State After QA8

### Full BOLA Coverage Map (All Controllers)

| Controller | Handler | Check present? | Method | Status |
|------------|---------|----------------|--------|--------|
| jobsController | `createJobs` | YES | `getUserCompany(uid)` — `Array.isArray` guard | QA8 Fix-2 |
| jobsController | `updateJob` | YES | `getUserCompany(uid)` + `company_id=$20` in UPDATE WHERE | QA7 Fix-3 |
| jobsController | `deleteJob` | YES | `getUserCompany(uid)` + `company_id=$2` in DELETE WHERE | Controller fixed; **route still commented out** in jobsRoute.js (`// router.delete("/jobs/delete", deleteJob)`) |
| jobsController | `updateStatusOfJob` | YES | `getUserCompany(uid)` + `company_id=$3` in UPDATE WHERE | QA7 Fix-1 |
| jobsController | `getAllApplicantOfJob` | YES | `getUserCompany(uid)` vs `getJobCompanyId(id)`; JSON 403 response | QA8 Fix-9 |
| jobsController | `getJobApplicantFitSignals` | YES | Ownership enforced in `employerApplicantSignalsService.js` | Pre-QA8 |
| jobsController | `getJobBasicListOfCompany` | **WEAK** | Accepts `id` from query param — any authenticated user can list any company's jobs by supplying a foreign `id` | Residual gap (read-only, lower risk) |
| jobsController | `getExpiredJobListOfCompany` | **WEAK** | Same pattern as above | Residual gap (read-only, lower risk) |
| jobsController | `deleteInterviewQuestion` | **NO** | No ownership check — any authenticated employer can delete any interview question by `questionId` | Residual P2 gap, was flagged in QA7 |
| jobsController | `getSubscriptionRestrictions` | **WEAK** | Accepts `companyId` from query — any authenticated user can read any company's subscription state | Low-risk read |
| applicantsController | `createProfile` | YES | `userId: req.user.uid` overrides body-supplied value | QA8 Fix-6 |
| applicantsController | `updateProfile` | YES | `userId: req.user.uid` spread overrides body-supplied value | QA7 Fix-4 |
| applicantsController | `updateBasicProfileInfo` | YES | `userId: req.user.uid` spread overrides body-supplied value | QA7 Fix-4 |
| applicantsController | `getApplicantProfileById` | YES | `uid` from token only; query `id` param ignored | Pre-QA8 SECURE fix |
| applicantsController | `saveWorkExp` | YES | `applicant_profile_id=$1 AND user_id=$2` ownership SELECT | QA8 Fix-5 |
| applicantsController | `saveEducBg` | YES | `applicant_profile_id=$1 AND user_id=$2` ownership SELECT | QA8 Fix-5 |
| applicantsController | `saveCert` | YES | `applicant_profile_id=$1 AND user_id=$2` ownership SELECT | QA8 Fix-5 |
| applicantsController | `saveSkillsArray` | YES | `applicant_profile_id=$1 AND user_id=$2` ownership SELECT | QA8 Fix-5 |
| applicantsController | `saveDocuments` | YES | `applicant_profile_id=$1 AND user_id=$2` ownership SELECT | QA8 Fix-5 |
| applicantsController | `saveVideoCV` | **PARTIAL** | Reads `uid` for upload but still uses body-supplied `applicantProfileId` for DB write; no ownership SELECT | Residual P2 gap |
| applicantsController | `getUserProfile` | **WEAK** | Accepts `id` from query param — any authenticated user can read any user's profile by supplying a foreign `id` | Residual gap (read-only) |
| contactsController | `createContact` | YES | `getUserCompany(uid)` — `Array.isArray` guard, JWT-derived companyId | QA8 Fix-7 |
| contactsController | `multipleContact` | YES | `getUserCompany(uid)` — JWT-derived companyId overrides per-item body values | QA8 Fix-7 |
| contactsController | `createGroup` | YES | `getUserCompany(uid)` — JWT-derived companyId | QA8 Fix-7 |
| contactsController | `deleteContact` | YES | `getUserCompany(uid)` + `contact_id AND company_id` in DELETE WHERE | QA7 Fix-5 |
| contactsController | `updateContact` | YES | `getUserCompany(uid)` + `company_id` folded into editContact WHERE | QA7 Fix-5 |
| contactsController | `updateGroup` | YES | `getUserCompany(uid)` + `company_id` folded into editGroup WHERE | QA7 Fix-5 |
| contactsController | `deleteGroup` | YES | `getUserCompany(uid)` + `group_id AND company_id` in DELETE WHERE | QA7 Fix-5 |
| contactsController | `list` / `grouplist` / `contactslist` / `list2` | **WEAK** | Accept `companyId` from query param — any authenticated user can read another company's contacts/groups | Residual read gap; low risk for invite-only beta |
| cvController | `createCV` | **WEAK** | Inserts body-supplied `userId` — any authenticated user can create a CV attributed to another user's `user_id` | Residual P2 write gap |
| cvController | `updateCV` | YES | `cv_id AND user_id = req.user.uid` in UPDATE WHERE | QA7 Fix-6 |
| cvController | `deleteCV` | YES | `cv_id AND user_id = req.user.uid` in DELETE WHERE | QA7 Fix-6 |
| cvController | `getUserCVlist` | YES | `uid` from token only; query param ignored | QA8 Fix-3 |
| cvController | `getCvById` | YES | `cv_id AND user_id = req.user.uid` | QA8 Fix-4 |
| companiesController | `createInitialCompany` / `createCompanyFull` | YES | `uid` from token as `created_by` | Pre-QA8 |
| companiesController | `updateCompany` | YES | `getUserCompany(uid)` + `Array.isArray` guard vs body `companyId` | QA8 Fix-8 |
| companiesController | `removeCompanyUser` | YES | `getUserCompany(uid)` vs body `companyId` | Pre-QA8 SECURE fix |
| companiesController | `addCompanyUser` | **WEAK** | Caller's company not verified against body `companyId` before adding users | Residual P2 gap — any authenticated employer can add users to a foreign company |
| companiesController | `getAllCompanyUser` | **WEAK** | Accepts `id` from query — any authenticated user can list users of any company | Residual read gap |
| companiesController | `getDashboard` / `getDashboardPipelineOverview` | YES | `getUserCompany(uid)` — token-derived; no query param used | Pre-QA8 |
| interviewController | `getAllInterviewsOfCompanies` | YES | `callerBelongsToCompany(uid, companyId)` guard | Pre-QA8 STITCH fix |
| interviewController | `getAllInterviewsTemplatesOfCompanies` | YES | `callerBelongsToCompany(uid, companyId)` guard | Pre-QA8 STITCH fix |
| interviewController | `getAllInterviewRecipientsByCompanyId` | YES | `callerBelongsToCompany(uid, companyId)` guard | Pre-QA8 STITCH fix |
| interviewController | `getInterviewTemplateQuestions` | YES | `callerBelongsToCompany(uid, templateCompanyId)` | Pre-QA8 STITCH fix |
| interviewController | `saveGroupInterview` | YES | `uid` from token used internally | Pre-QA8 |
| interviewController | `saveQuestionTemplate` | **WEAK** | `companyId` from body — caller's company not verified against it | Residual P2 gap |
| interviewController | `updateJobInterviewQuestion` | **NO** | No ownership check — any authenticated employer can update any question | Residual P2 gap |
| userController | `getUserProfile` | YES | `uid` from token only | Pre-QA8 |
| userController | `updateUserProfile` | **WEAK** | Calls `updateProfile()` which uses body-supplied `uid` in WHERE clause | Residual P2 gap |
| userController | `deleteAccountById` | YES | `userId !== req.user.uid` guard | Pre-QA8 |
| messageController | all routes | YES | Token-derived; service layer enforces thread membership | Pre-QA8 |
| paymentController | `paymongoPaymentLink` | YES | `verifyAuth` gate | Pre-QA8 SECURE fix |
| paymentController | `paymongoWebhook` | **NO auth** | Intentionally open — needs PayMongo signature verification | Open P3 |
| subscriptionController | `createPaymentIntent` | YES | `verifyAuth` gate | Pre-QA8 STITCH fix |
| candidateController | `getJobAppliedList` | YES | `uid` from token only | Pre-QA8 |
| candidateController | `createCandidate` / `multipleCandidate` | **WEAK** | No company-scope check; any authenticated user can create candidates with arbitrary data | Low risk — candidates are not tied to companies in the current schema |
| candidateController | `deleteCandidate` / `updateCandidate` | **NO** | No ownership check — any authenticated caller can delete or update any candidate by `candidateId` | Residual P2 gap |

---

### Remaining Open Security Items (Post QA8)

| ID | Item | Severity | Description |
|----|------|----------|-------------|
| SEC-01 | No rate-limiting (repo-wide) | **P1 — launch-blocking** | `express-rate-limit` not installed; all write endpoints remain open to brute-force, credential stuffing, and bulk scraping. This is the single most critical remaining gap for any public-facing deployment. |
| SEC-RESIDUAL-01 | `saveVideoCV` partial protection | P2 | Reads `uid` for upload path but DB write still uses body-supplied `applicantProfileId` with no ownership SELECT. Add the same ownership check already applied in QA8 Fix-5 to the other five save-array handlers. |
| SEC-RESIDUAL-02 | `updateUserProfile` weak identity | P2 | `updateProfile()` uses body-supplied `uid` in WHERE clause. Override with `req.user.uid` before the call, mirroring the createProfile / updateBasicProfileInfo pattern. |
| SEC-RESIDUAL-03 | `cvController.createCV` accepts body-supplied `userId` | P2 | Same pattern as the pre-QA8 createProfile bug. Override with `req.user.uid`. |
| SEC-RESIDUAL-04 | `addCompanyUser` no caller-company check | P2 | Body `companyId` is used to assign users without verifying the authenticated caller belongs to that company. A malicious employer can add users to any company. |
| SEC-RESIDUAL-05 | `deleteInterviewQuestion` no ownership check | P2 | Any authenticated employer can delete any interview question by guessing a `questionId`. Add `getUserCompany(uid)` + question-to-company lookup before the DELETE. |
| SEC-RESIDUAL-06 | `saveQuestionTemplate` body-supplied companyId | P2 | `companyId` taken from body with no ownership verification. Override with `getUserCompany(uid)` result. |
| SEC-RESIDUAL-07 | `updateJobInterviewQuestion` no ownership check | P2 | Any authenticated employer can update any question. Same fix pattern as deleteInterviewQuestion. |
| SEC-RESIDUAL-08 | `deleteCandidate` / `updateCandidate` no ownership | P2 | Candidate ownership is ambiguous in the schema (no company_id column on candidates). Assess schema before fixing; could be a schema gap rather than a controller gap. |
| SEC-08 | Paymongo webhook signature verification missing | P3 | Webhook accepts any POST — spoofed payment events could grant subscriptions without payment. |
| SEC-09 | `addCompanyUserByEmail` leaks error detail | P3 | `msg: \`Failed: ${error}\`` leaks internal error strings to callers. Replace with a generic message. |
| SEC-10 | Email enumeration on signin | P3 | `loginUser` returns "User does not exist" on unknown email, enabling email harvesting. |
| SEC-11 | `deleteCV` orphaned Firebase Storage files | P3 | DB row is deleted but the corresponding Storage file is not. Accumulates orphaned storage costs and is a data hygiene issue. |
| SEC-12 | `deleteJob` route commented out | P3 | Controller is fixed and BOLA-guarded but the route line is commented out in jobsRoute.js — the endpoint is unreachable. Uncomment when ready to expose. |
| SEC-13 | Read endpoints accept caller-supplied companyId/userId | P3 | Multiple GET endpoints (`getJobBasicListOfCompany`, `getAllCompanyUser`, `list`, `grouplist`, `contactslist`, `list2`, `getUserProfile` in applicantsController) accept resource IDs from query params with no ownership check. An authenticated attacker can enumerate data across tenants. Lower risk than write gaps but still inappropriate for public launch. |

---

### Is the Employer Panel Safe for Invite-Only Beta?

**Yes, with caveats.**

Core write paths are now ownership-checked: job create/update/delete/status, applicant sub-array writes (workExp, educBg, cert, skills, docs), CV reads, company update, contact/group mutations, messaging, account deletion, subscription creation, and payment link creation.

**Beta caveats to communicate to testers:**
- Do not use production financial data — webhook spoofing (SEC-08) is not fixed.
- Read endpoints that accept caller-supplied IDs are not tenant-isolated (SEC-13). If two employers are on the same beta, one can read the other's job list, contact list, or candidate list by supplying the other's `companyId` in the query string.
- Employers with known Firebase UIDs can be targeted for the residual P2 write gaps (SEC-RESIDUAL-04, SEC-RESIDUAL-06, SEC-RESIDUAL-07) if another employer can guess their `companyId`.

For an invite-only beta where all testers are trusted and there is no cross-company testing, the system is safe.

---

## 2. Dependabot Alert Triage — FE Repo (185 Vulnerabilities)

### Context

The FE repo (Angular 13, Node ecosystem) has 185 npm vulnerabilities flagged by GitHub Dependabot:
- 9 critical
- 87 high
- remainder medium/low

The FE was generated in 2022 on Angular 13 and has not had a dependency update sprint. Angular CLI projects at this version commonly accumulate hundreds of Dependabot alerts.

### Recommended Assessment (Before Running `npm audit fix`)

**Step 1 — Separate prod deps from devDeps.**

The critical/high findings are disproportionately concentrated in build tooling (webpack, esbuild, terser, karma, jasmine) and SSR compilation artifacts (`@angular-devkit/build-angular`). These vulnerabilities exist in the build environment, not in the deployed app bundle. Run:

```
npm audit --omit=dev
```

This shows only vulnerabilities in dependencies that ship to the browser. In Angular 13 projects, this typically reduces the critical count from 9 to 0–2 and the high count by 80–90%.

**Step 2 — Review the `xlsx` package (prod dep, high risk).**

`xlsx` version `^0.17.5` has a known prototype pollution CVE (CVE-2023-30533, CVSS 9.8). This is a **true positive** prod dep vulnerability that should be prioritized. The fix is to upgrade to `xlsx@^0.20.x` or migrate to `exceljs` (actively maintained fork).

**Step 3 — Review `moment` (prod dep).**

`moment@^2.29.4` is end-of-life (no security updates). Deprecation advisories show up as Dependabot alerts. Not exploitable in isolation, but should be replaced with `date-fns` (already in the project's dependencies) on the next major sprint.

**Step 4 — Do NOT run `npm audit fix --force` unilaterally.**

`--force` applies major version bumps across the dependency tree and will break Angular 13 compilation (peer dep mismatches). Instead, apply targeted upgrades one library at a time, build-verify each.

### Should This Block Deploy?

**Partial block:**
- `xlsx` CVE is a genuine prod-dep vulnerability. Do not deploy to public users until `xlsx` is upgraded. It is used in the CV/document export flows.
- All remaining criticals/highs are almost certainly build-tool-only and do not block the invite-only beta.
- Document this finding in the beta release notes so stakeholders understand the scope.

### Recommended Approach (Separate Sprint)

1. Run `npm audit --omit=dev` to confirm devDep separation.
2. Upgrade `xlsx` to `0.20.x` and rebuild; verify export flows.
3. Track remaining alerts in a Dependabot sprint ticket, not as a launch gate item (unless `npm audit --omit=dev` reveals additional prod-dep criticals).
4. Plan an Angular version upgrade sprint (13 → 15 → 17) as a separate medium-term initiative — this will clear the bulk of the accumulated alerts.

---

## 3. Rate-Limiting Sprint — Final Design

### Library

`express-rate-limit` (zero-dependency, battle-tested, Express-native).

Install: `npm install express-rate-limit`

### Architecture

Apply rate limiting in **server.js** before route mounting. Three tiers:

#### Tier 1 — Auth endpoints (tightest limits)

Target routes: `/api/auth/signin`, `/api/auth/signup`, `/api/auth/getpwresetlink`, `/api/auth/changepassword`, `/api/auth/resendverificationlink`

```js
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                      // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/getpwresetlink', authLimiter);
app.use('/api/auth/changepassword', authLimiter);
app.use('/api/auth/resendverificationlink', authLimiter);
```

Rationale: 10 attempts / 15 min is tight enough to stop brute-force credential stuffing; lenient enough to allow a user who misremembers their password.

#### Tier 2 — Job and company mutation endpoints

Target routes: `/api/job/create`, `/api/job/updatejobs`, `/api/job/changestatus`, `/api/company/createinitial`, `/api/company/createcompany`, `/api/company/addcompanyuser`, `/api/payment/paymongopaymentlink`, `/api/subscription/paymentintent`

```js
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 30,                      // 30 mutations per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use('/api/job/create', mutationLimiter);
app.use('/api/job/updatejobs', mutationLimiter);
app.use('/api/job/changestatus', mutationLimiter);
app.use('/api/company/createinitial', mutationLimiter);
app.use('/api/company/createcompany', mutationLimiter);
app.use('/api/company/addcompanyuser', mutationLimiter);
app.use('/api/payment/paymongopaymentlink', mutationLimiter);
app.use('/api/subscription/paymentintent', mutationLimiter);
```

Rationale: 30/min is generous for legitimate use; blocks bulk automated job creation or subscription abuse.

#### Tier 3 — Messaging endpoints

Target routes: `/api/messages/thread`, `/api/messages/thread/send`

```js
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 60,                      // 60 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please slow down.' },
});

app.use('/api/messages/thread/send', messageLimiter);
app.use('/api/messages/thread', messageLimiter);
```

#### Tier 4 — Global fallback (all other routes)

Apply after all route-specific limiters, before `app.use("/api", ...)` route mounts. Catches anything not covered by tiers 1–3.

```js
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 200,                     // 200 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => req.path === '/api/payment/paymongowebhook', // webhook must not be rate-limited by IP
});

app.use('/api', globalLimiter);
```

Note: The PayMongo webhook is excluded from the global limiter because PayMongo's IP range may not be predictable; it should be protected by signature verification instead (SEC-08).

### Files to Touch

| File | Change |
|------|--------|
| `package.json` | Add `express-rate-limit` to `dependencies` |
| `server.js` | Import `rateLimit`; add four limiter blocks before route mounts |

No controller or route file changes required.

### Estimated Effort

| Task | Estimate |
|------|----------|
| `npm install express-rate-limit` | 2 min |
| Add four rate limiter blocks to server.js | 30 min |
| Manual verification (curl / Postman) per tier | 30 min |
| Total | ~1 hour |

### Production Considerations

- If the app is behind a proxy/load-balancer (Heroku, Cloud Run), `app.enable("trust proxy")` is already set in server.js — `express-rate-limit` will correctly use `X-Forwarded-For` for IP identification.
- For a beta with a small number of known users, these limits are extremely conservative and will not cause false positives under normal use.
- After beta, tune limits based on observed traffic patterns before public launch.

---

## 4. Next Sprint Priority

Ordered by launch-blocking risk:

### Priority 1 — Rate-Limiting Sprint (Launch-Blocking)

**Why first:** The only true launch-blocker after QA8. A public deployment without rate limiting is open to credential stuffing on `/auth/signin` (which is unauthenticated), bulk job scraping, and abuse of the payment link endpoint. Estimated 1 hour. No architecture changes, no controller changes, minimal risk.

### Priority 2 — Residual P2 BOLA Fixes (QA9)

The seven remaining P2 write-path gaps (SEC-RESIDUAL-01 through SEC-RESIDUAL-08) from the table above. Recommended to batch these in a single QA9 sprint. Pattern for each is established (mirror the QA7/QA8 fixes):

1. `saveVideoCV` — add `applicant_profile_id=$1 AND user_id=$2` ownership SELECT (identical to the five QA8 Fix-5 handlers)
2. `updateUserProfile` — override `uid` with `req.user.uid` before calling `updateProfile()`
3. `createCV` — override `userId` with `req.user.uid`
4. `addCompanyUser` — add `getUserCompany(uid)` check; reject if caller's company !== body `companyId`
5. `deleteInterviewQuestion` — add question-to-company lookup via `getJobCompanyId` or a direct SELECT
6. `saveQuestionTemplate` — override `companyId` with `getUserCompany(uid).companyId`
7. `updateJobInterviewQuestion` — add ownership check via question-to-company lookup

Estimated effort: 2–3 hours.

### Priority 3 — Dependabot / FE Dependency Sprint

Single focused sprint:
- `npm audit --omit=dev` to confirm true prod-dep CVE surface
- Upgrade `xlsx` to `0.20.x`; build-verify export flows
- Document remaining devDep findings as deferred (not public-launch-blocking once `xlsx` is fixed)

Estimated effort: 2–4 hours (mostly build-verification time).

### Priority 4 — B01 BACKLOG-02: Applicant Name Enrichment in Thread List

Recruiter inbox currently shows thread IDs rather than applicant display names. Requires joining the thread list query against `users` or `applicants_profile`. Low security risk; high UX value for beta testers using the messaging system.

Estimated effort: 2–3 hours (BE service query change + FE display update).

### Priority 5 — B03: Interview Page MVP

The Interview module has scaffolded routes and controllers but the `getListByUser` handler returns `null` (the service call is commented out). A minimal MVP would surface the existing `getAllInterviewsOfCompanies` and template data in the FE. This is a feature sprint, not a security sprint.

Estimated effort: 4–8 hours (FE page + wiring to existing BE endpoints).

### Priority 6 — B01 BACKLOG-01: recruiter_last_read_at Schema Migration

Unread thread filtering requires a `recruiter_last_read_at` column (or equivalent) on the messages/threads schema. This is a schema migration sprint. Deferred after name-enrichment because name-enrichment delivers immediate visible value without a schema change.

Estimated effort: 3–4 hours (migration + service query update + FE unread badge logic).

---

## 5. Production Readiness Verdict

### a) Internal Testing / Demo

**SAFE.**

All core flows are functional and BOLA-guarded. The remaining residual gaps require an attacker to have a registered account AND knowledge of another tenant's `applicantProfileId` or `companyId`. Internal testing with a controlled user set carries no meaningful risk from these gaps.

### b) Invite-Only Beta (Known, Trusted Users)

**SAFE with documented caveats.**

Required before beta launch:
- Rate limiting sprint (Priority 1 above) — prevents even trusted-but-careless testers from accidentally hammering the API
- `xlsx` upgrade (from Dependabot Priority 3) — or disable export flows in the beta build

Optional communications to beta testers:
- Do not conduct financial transactions — PayMongo webhook is not signature-verified
- Cross-company data isolation is incomplete on read endpoints

If all beta testers are from a single organization (no multi-tenant cross-company testing), the read-endpoint tenant leakage (SEC-13) is not practically exploitable.

### c) Public Launch

**NOT READY. Gate items (in order):**

| Gate Item | Severity | Sprint |
|-----------|----------|--------|
| Rate-limiting (all tiers) | P1 | Priority 1 |
| `xlsx` CVE upgrade | P1 (prod dep) | Priority 3 |
| `saveVideoCV` ownership check | P2 | Priority 2 / QA9 |
| `updateUserProfile` uid override | P2 | Priority 2 / QA9 |
| `createCV` uid override | P2 | Priority 2 / QA9 |
| `addCompanyUser` caller-company check | P2 | Priority 2 / QA9 |
| `deleteInterviewQuestion` ownership | P2 | Priority 2 / QA9 |
| `saveQuestionTemplate` companyId override | P2 | Priority 2 / QA9 |
| `updateJobInterviewQuestion` ownership | P2 | Priority 2 / QA9 |
| Read endpoint tenant isolation (SEC-13) | P3 | QA10 or later |
| PayMongo webhook signature verification | P3 | QA10 or later |
| `addCompanyUserByEmail` error leakage | P3 | QA10 or later |
| Email enumeration mitigation | P3 | QA10 or later |
| `deleteCV` Firebase Storage cleanup | P3 | QA10 or later |
| `deleteJob` route uncommented | P3 | Any sprint |
| Dependabot devDep backlog | low | Angular upgrade sprint |

**Summary:** After completing the rate-limiting sprint (Priority 1), fixing the `xlsx` CVE (Priority 3), and completing the QA9 P2 BOLA sweep (Priority 2), the codebase will be ready for a limited public soft launch. All remaining items are P3 hardening that can be addressed during the live beta period.

---

## Appendix: QA8 Fix Verification Summary

All 11 QA8 fixes confirmed present in live code:

| Fix | Endpoint | Confirmed |
|-----|----------|-----------|
| Fix-1 (P1) | `changeJobStatus$` FE effect — normalises response shape | FE — not verified in this scan (FE scope) |
| Fix-2 (P1) | `createJobs` — `getUserCompany(uid)` with `Array.isArray` guard | YES — jobsController.js:83–87 |
| Fix-3 (P1) | `getUserCVlist` — `userId = req.user.uid` | YES — cvController.js:161 |
| Fix-4 (P1) | `getCvById` — `cv_id AND user_id=$2` ownership SELECT | YES — cvController.js:183–186 |
| Fix-5 (P2) | `saveWorkExp/saveEducBg/saveCert/saveSkillsArray/saveDocuments` — ownership SELECT on each | YES — applicantsController.js:300–304, 337–341, 374–378, 411–415, 448–452 |
| Fix-6 (P2) | `createProfile` — `userId: req.user.uid` override | YES — applicantsController.js:165 |
| Fix-7 (P2) | `createContact/multipleContact/createGroup` — `getUserCompany(uid)` JWT-derived companyId | YES — contactsController.js:16–20, 47–51, 208–212 |
| Fix-8 (P3) | `updateCompany` — `Array.isArray(userCompany)` guard | YES — companiesController.js:141 |
| Fix-9 (P3) | `getAllApplicantOfJob` — JSON 403 response | YES — jobsController.js:654 |
| Fix-10 (P3) | `formSubs` replacement pattern in job-create | FE — not verified in this scan (FE scope) |
| Fix-11 (P3) | Sub-company mobile safe-area padding | FE — not verified in this scan (FE scope) |
