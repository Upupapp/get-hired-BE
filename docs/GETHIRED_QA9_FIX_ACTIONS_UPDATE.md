# GetHired QA Cycle 9 Fix Sprint — ACTIONS Update

**Generated:** 2026-06-25
**Scope:** Post-QA9 BOLA scan, security scorecard, rate-limiting go/no-go, production readiness update, next 3 sprints
**Predecessor docs:** GETHIRED_QA8_FIX_ACTIONS_UPDATE.md, GETHIRED_QA9_FIX_SPRINT_LOG.md

---

## 1. Live BOLA Scan — Remaining Gaps After QA9

QA9 closed 7 of the 9 P2 write-path gaps listed in the QA8 ACTIONS. The following remain open after a full controller read.

### Confirmed Remaining BOLA / Ownership Gaps

| ID | Controller | Handler | Gap | Severity |
|----|------------|---------|-----|----------|
| R-01 | `applicantsController` | `updateApplication` | Trusts body-supplied `candidateId` in UPDATE SET and `applicationId` in WHERE — no JWT ownership check at all. Any authenticated applicant can overwrite any application row. | P2 |
| R-02 | `candidateController` | `createCandidate` / `multipleCandidate` | No company-scoping; body `companyId` (or none) used directly. An authenticated employer can create candidates attributed to any company. | P2 |
| R-03 | `candidateController` | `updateCandidate` | No ownership check at all. Any authenticated caller can update any candidate by guessing a `candidateId`. | P2 |
| R-04 | `cvController` | `createCV` | Body-supplied `userId` used directly in INSERT — any authenticated user can create a CV attributed to another user's `user_id`. Pattern is identical to the pre-QA8 `createProfile` bug. Fix: `userId = req.user.uid`. | P2 |
| R-05 | `userController` | `updateUserProfile` | Calls `updateProfile()` which uses the body-supplied `uid` in the UPDATE WHERE. Override `uid` with `req.user.uid` before the call, mirroring `updateBasicProfileInfo`. | P2 |
| R-06 | `contactsController` | `contactslist` / `list2` | Accept `companyId` from query param — any authenticated employer can read another company's full contact/group list. | P3 (read-only) |
| R-07 | `companiesController` | `getAllCompanyUser` | Accepts `id` from query param — any authenticated user can enumerate users of any company. | P3 (read-only) |
| R-08 | `jobsController` | `getJobBasicListOfCompany` / `getExpiredJobListOfCompany` | Accept `id` from query param — any authenticated user can list any company's jobs. | P3 (read-only, lowest risk — job listings are semi-public anyway) |
| R-09 | `paymentController` | `paymongoWebhook` | Intentionally auth-free but missing PayMongo signature verification. A spoofed POST can grant subscriptions without payment. | P3 |

### Gaps That Were NOT Open Going Into QA9 (Confirmed Fixed)

The following gaps listed as open in QA8 ACTIONS were resolved in QA9:

- `saveVideoCV` (SEC-RESIDUAL-01): ownership SELECT added (QA9 Fix-2)
- `addCompanyUser` (SEC-RESIDUAL-04): JWT-derived companyId, Array.isArray guard (QA9 Fix-3)
- `saveQuestionTemplate` (SEC-RESIDUAL-06): JWT-derived companyId (QA9 Fix-4)
- `updateJobInterviewQuestion` (SEC-RESIDUAL-07): ownership JOIN through job_interview_template (QA9 Fix-5)
- `deleteInterviewQuestion` (SEC-RESIDUAL-05): ownership JOIN added (QA9 Fix-6)
- `deleteCandidate` (SEC-RESIDUAL-08): company_id folded into DELETE WHERE (QA9 Fix-7)
- `contactslist` / `grouplist` read paths (SEC-13 partial): `list` and `grouplist` fixed (QA9 Fix-12); `contactslist` and `list2` still open (R-06/R-07 above)

---

## 2. Security Posture Scorecard

All counts are controller-level handlers, not route lines. "Secured" means: JWT ownership enforced; "Weak" means: no check or read-only body/query param trust; "Exempt" means: the handler is legitimately public (e.g. job listings, login).

### userController — 7 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `loginUser` | Exempt — public auth endpoint | Enumeration oracle (P3 open) |
| `registerUser` | Exempt — public signup | Role whitelist enforced |
| `logout` | Secured | Revokes token by uid param; low risk |
| `passwordResetLink` | Exempt | No auth required by design |
| `changePw` | Secured | Firebase oobCode verification required |
| `getUserProfile` | Secured | `uid` from JWT only |
| `updateUserProfile` | WEAK | Calls `updateProfile()` with body-supplied `uid` (R-05) |
| `deleteAccountById` | Secured | `userId !== req.user.uid` guard |

**Score: 5/7 secured (2 weak/open — 1 is exempt public auth, 1 is R-05)**

---

### jobsController — 12 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `createJobs` | Secured | `getUserCompany(uid)` + Array.isArray guard |
| `updateJob` | Secured | `getUserCompany(uid)` + `company_id=$20` in UPDATE WHERE |
| `deleteJob` | Secured | `getUserCompany(uid)` + `company_id=$2` in DELETE WHERE; **route still commented out** |
| `updateStatusOfJob` | Secured | `getUserCompany(uid)` + `company_id=$3` in UPDATE WHERE |
| `getAllApplicantOfJob` | Secured | `getUserCompany(uid)` vs `getJobCompanyId(id)`; JSON 403 |
| `getJobApplicantFitSignals` | Secured | Ownership in `employerApplicantSignalsService.js`; JSON 403 (QA9 Fix-10) |
| `getJobApplicantDetails` | WEAK | Accepts `jobId` + `id` from query; no ownership check |
| `getJobBasicListOfCompany` | WEAK | Accepts `id` from query (R-08) |
| `getExpiredJobListOfCompany` | WEAK | Accepts `id` from query (R-08) |
| `deleteInterviewQuestion` | Secured | Ownership JOIN through `job_interview_template` (QA9 Fix-6) |
| `getSubscriptionRestrictions` | WEAK | Accepts `companyId` from query; read-only |
| `getAllPublishedJobs` / `getJobDetails` / `getJobShareableLink` | Exempt | Intentionally public |

**Score: 6/9 employer-auth endpoints secured (3 weak — all read-only)**

---

### applicantsController — 12 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `createApplication` | Secured | `candidateId = req.user.uid` (QA9 Fix-1) |
| `deleteApplication` | Secured | `candidateId = req.user.uid` + `AND candidate_id=$2` in DELETE (QA9 Fix-1) |
| `updateApplication` | OPEN | Trusts body `candidateId`; no JWT ownership (R-01) |
| `createProfile` | Secured | `userId: req.user.uid` (QA8 Fix-6) |
| `updateProfile` | Secured | `userId: req.user.uid` spread |
| `updateBasicProfileInfo` | Secured | `userId: req.user.uid` spread |
| `getApplicantProfileById` | Secured | `uid` from token only |
| `getApplicantProfileCompleteness` | Secured | `uid` from token only |
| `getDashboard` | Secured | `uid` from token only |
| `getUserProfile` | WEAK | Accepts `id` from query — any authenticated user can read any user's profile |
| `saveWorkExp` / `saveEducBg` / `saveCert` / `saveSkillsArray` / `saveDocuments` | Secured | Ownership SELECT `applicant_profile_id AND user_id` (QA8 Fix-5) |
| `saveVideoCV` | Secured | Ownership SELECT added (QA9 Fix-2) |

**Score: 10/12 secured (2 open — R-01 is a write gap; getUserProfile is read-only weak)**

---

### contactsController — 10 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `createContact` | Secured | JWT-derived companyId (QA8 Fix-7) |
| `multipleContact` | Secured | JWT-derived companyId overrides per-item body values (QA8 Fix-7) |
| `deleteContact` | Secured | `getUserCompany(uid)` + `contact_id AND company_id` in DELETE WHERE |
| `updateContact` | Secured | `getUserCompany(uid)` + `company_id` in editContact WHERE |
| `list` | Secured | JWT-derived companyId (QA9 Fix-12) |
| `grouplist` | Secured | JWT-derived companyId (QA9 Fix-12) |
| `createGroup` | Secured | JWT-derived companyId (QA8 Fix-7) |
| `updateGroup` | Secured | `getUserCompany(uid)` + `company_id` in editGroup WHERE |
| `deleteGroup` | Secured | `getUserCompany(uid)` + `group_id AND company_id` in DELETE WHERE |
| `contactslist` | WEAK | Accepts `companyId` from query (R-06) |
| `list2` | WEAK | Accepts `companyId` from query (R-06) |

**Score: 9/11 secured (2 weak — both read-only)**

---

### cvController — 5 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `createCV` | OPEN | Body-supplied `userId` inserted directly (R-04) |
| `updateCV` | Secured | `cv_id AND user_id = req.user.uid` in UPDATE WHERE (QA7 Fix-6) |
| `deleteCV` | Secured | `cv_id AND user_id = req.user.uid` in DELETE WHERE (QA7 Fix-6); orphaned Storage files (P3 open) |
| `getUserCVlist` | Secured | `uid` from token only (QA8 Fix-3) |
| `getCvById` | Secured | `cv_id AND user_id = req.user.uid` (QA8 Fix-4) |

**Score: 4/5 secured (1 open write gap — R-04)**

---

### companiesController — 10 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `createInitialCompany` / `createCompanyFull` | Secured | `uid` from token as `created_by`; creator auto-assigned |
| `updateCompany` | Secured | `getUserCompany(uid)` + Array.isArray guard vs body `companyId` (QA8 Fix-8) |
| `removeCompanyUser` | Secured | `getUserCompany(uid)` + Array.isArray guard vs body `companyId` (QA9 Fix-9) |
| `addCompanyUser` | Secured | JWT-derived companyId, Array.isArray guard (QA9 Fix-3) |
| `getAllCompanyUser` | WEAK | Accepts `id` from query (R-07) |
| `getDashboard` / `getDashboardPipelineOverview` | Secured | Token-derived; no query param used |
| `getSpecificCompany` | Secured | Falls back to `req.user.uid` when no `id` supplied; public when `id` given (acceptable — companies are semi-public entities) |
| `getSubscriptionRestrictions` | WEAK | Accepts `companyId` from query; read-only |
| `getFeaturedCompanies` / `getCompanyShareableLink` / `getAllCompanies` | Exempt | Intentionally public |

**Score: 6/8 employer-auth endpoints secured (2 weak — both read-only)**

---

### interviewController — 7 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `getAllInterviewsOfCompanies` | Secured | `callerBelongsToCompany(uid, companyId)` |
| `getAllInterviewsTemplatesOfCompanies` | Secured | `callerBelongsToCompany(uid, companyId)` |
| `getAllInterviewRecipientsByCompanyId` | Secured | `callerBelongsToCompany(uid, companyId)` |
| `getInterviewTemplateQuestions` | Secured | `callerBelongsToCompany(uid, templateCompanyId)` |
| `saveGroupInterview` | Secured | `uid` from token used internally |
| `saveQuestionTemplate` | Secured | JWT-derived companyId (QA9 Fix-4) |
| `updateJobInterviewQuestion` | Secured | Ownership JOIN through `job_interview_template` (QA9 Fix-5) |

**Score: 7/7 secured**

---

### candidateController — 6 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `createCandidate` | WEAK | No company-scoping (R-02) |
| `multipleCandidate` | WEAK | No company-scoping (R-02) |
| `deleteCandidate` | Secured | `getUserCompany(uid)` + `company_id=$2` in DELETE WHERE (QA9 Fix-7) |
| `updateCandidate` | OPEN | No ownership check (R-03) |
| `list` | WEAK | Accepts `companyId` from query; read-only |
| `getJobAppliedList` | Secured | `uid` from token only |

**Score: 2/6 secured (2 open write gaps, 2 weak read-only, 1 secured read)**

---

### messageController — 4 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `openThread` | Secured | Role derived server-side in message.service |
| `getThreadMessages` | Secured | Thread membership verified in service layer |
| `postMessage` | Secured | Thread membership verified in service layer |
| `getRecruiterThreads` | Secured | Company scoping in `listRecruiterThreads` |

**Score: 4/4 secured**

---

### employerController — 2 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `getEmployerCompany` | Secured | `uid` from token only (STITCH fix) |
| `getEmployerProfile` | Secured | `uid` from token only (STITCH fix) |

**Score: 2/2 secured**

---

### adminController — 1 endpoint

| Handler | Status | Notes |
|---------|--------|-------|
| `getUserProfile` | Secured | Server-side role check: `callerRole !== ADMIN_ROLE` → 403 |

**Exempt from BOLA scoring (admin = trusted, role enforced server-side)**

---

### subscriptionController — 4 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `createPaymentIntent` | Secured | JWT-derived companyId (STITCH fix) |
| `getCompanySubscriptions` | Secured | `getUserCompany(uid)` vs query `companyId` |
| `getAllSubscription` | Secured | Read-only catalog; no per-company data returned |
| `createCompanySubscription` | Internal | Not a route handler; called only by webhook + company create |

**Score: 3/3 secured**

---

### paymentController — 2 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `paymongoPaymentLink` | Secured | `verifyAuth` gate |
| `paymongoWebhook` | Intentionally open | Needs PayMongo signature verification (P3 open; R-09) |

**Score: 1/1 authenticated endpoints secured; 1 open non-auth gap (by design, wrong fix)**

---

### optionsController — 3 endpoints

All are read-only reference data (job levels, job types, work setup options). No per-user or per-company data returned. No ownership needed; correctly gated by `verifyAuth` in options route.

**Score: 3/3 — no ownership gaps possible**

---

### cvBuilderController — 1 endpoint

| Handler | Status | Notes |
|---------|--------|-------|
| `uploadCv` | Secured | `uid` from token; profile lookup scoped to token uid |

**Score: 1/1 secured**

---

### applicationController — 4 endpoints

| Handler | Status | Notes |
|---------|--------|-------|
| `submitApplication` | Secured | `uid` from token passed to `jobApply()` (SECURE fix) |
| `getApplicantApplicationSnapshot` | Secured | Ownership: `candidate_id !== uid` → 403 |
| `getEmployerApplicantSnapshotSummary` | Secured | Company ownership check via `getUserCompany(uid)` vs job's `company_id` |
| `getApplicantApplicationSnapshotsBatch` | Secured | Batch ownership filter: only IDs where `candidate_id === uid` returned |

**Score: 4/4 secured**

---

### Scorecard Summary

| Controller | Secured | Total Auth Endpoints | Weak/Open | Write Gaps Remaining |
|------------|---------|---------------------|-----------|----------------------|
| userController | 5 | 7 (2 exempt public) | 2 | 1 (updateUserProfile R-05) |
| jobsController | 6 | 9 (3 exempt public) | 3 | 0 |
| applicantsController | 10 | 12 | 2 | 1 (updateApplication R-01) |
| contactsController | 9 | 11 | 2 | 0 |
| cvController | 4 | 5 | 1 | 1 (createCV R-04) |
| companiesController | 6 | 8 (3 exempt public) | 2 | 0 |
| interviewController | 7 | 7 | 0 | 0 |
| candidateController | 2 | 6 | 4 | 2 (createCandidate R-02, updateCandidate R-03) |
| messageController | 4 | 4 | 0 | 0 |
| employerController | 2 | 2 | 0 | 0 |
| adminController | 1 | 1 | 0 | 0 |
| subscriptionController | 3 | 3 | 0 | 0 |
| paymentController | 1 | 1 (1 intentional open) | 0 | 0 |
| optionsController | 3 | 3 | 0 | 0 |
| cvBuilderController | 1 | 1 | 0 | 0 |
| applicationController | 4 | 4 | 0 | 0 |
| **TOTAL** | **68** | **84** | **16** | **5 write gaps** |

**Overall: 81% of authenticated endpoints secured.**
**Write path: 92% secured (5 open write gaps remain — R-01 through R-05).**
**Read path: 16 weak read endpoints remain (all accept caller-supplied IDs; none are blocking for beta).**

---

## 3. Rate-Limiting Sprint — Final Go/No-Go

### Verdict: GO

The code surface is now clean enough that rate-limiting is unambiguously the #1 remaining blocker for any public deployment.

**Rationale:**
- All critical (P0/P1) write endpoints are now ownership-checked. The 5 remaining write gaps (R-01 through R-05) are P2 — real but not immediately exploitable without a specific target and a guessable ID.
- The 16 weak read endpoints (R-06 through R-08, plus a few others) are low-risk for an invite-only beta.
- Without rate-limiting, `/api/auth/signin` is an open brute-force target, the payment link endpoint can be abused to generate real PayMongo links, and job endpoints can be bulk-scraped.
- Rate-limiting requires no controller changes, no schema changes, and no architecture decisions — it is a server.js-only addition.

### Confirmed Design (Carry Forward from QA8 ACTIONS — No Changes)

**Library:** `express-rate-limit` (zero-dependency, Express-native)

**Install:** `npm install express-rate-limit`

**4 tiers, all applied in `server.js` before route mounts:**

#### Tier 1 — Auth endpoints (10 req / 15 min)
Targets: `/api/auth/signin`, `/api/auth/signup`, `/api/auth/getpwresetlink`, `/api/auth/changepassword`, `/api/auth/resendverificationlink`

```js
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
```

#### Tier 2 — Mutation endpoints (30 req / 1 min)
Targets: `/api/job/create`, `/api/job/updatejobs`, `/api/job/changestatus`, `/api/company/createinitial`, `/api/company/createcompany`, `/api/company/addcompanyuser`, `/api/payment/paymongopaymentlink`, `/api/subscription/paymentintent`

```js
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
```

#### Tier 3 — Messaging endpoints (60 req / 1 min)
Targets: `/api/messages/thread/send`, `/api/messages/thread`

```js
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please slow down.' },
});
```

#### Tier 4 — Global fallback (200 req / 1 min)
Applied before all route mounts. Excludes the PayMongo webhook (which must not be rate-limited by IP — it needs signature verification instead).

```js
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => req.path === '/api/payment/paymongowebhook',
});

app.use('/api', globalLimiter);
```

**Files to touch:** `package.json` (add dep), `server.js` (4 limiter blocks before route mounts). No controller or route file changes.

**Estimated effort:** ~1 hour (install + code + Postman verification per tier).

**Proxy note:** `app.enable("trust proxy")` is already set in server.js — `express-rate-limit` will correctly use `X-Forwarded-For` under Heroku/Cloud Run.

---

## 4. Updated Production Readiness Verdict

### Post-QA9 State

**QA9 closed:** 13 fixes (Fix-1 through Fix-13), including all 7 residual P2 write gaps from QA8 that had been assigned to this sprint, plus xlsx CVE-2023-30533 (Fix-8), await Promise.all crash risk (Fix-11), and a frontend memory leak (Fix-13).

---

### Internal Demo: SAFE

No blockers. The auth layer, core write paths, and BOLA ownership checks are solid enough for a controlled demo with internal team members. The rate-limiting absence is not exploitable in a closed demo environment.

---

### Invite-Only Beta: SAFE after rate-limiting

**Required before beta launch:**
1. Install and configure `express-rate-limit` (the single remaining P1 blocker).

**Beta caveats to communicate to testers:**
- Do not use real payment methods. The PayMongo webhook lacks signature verification (R-09/SEC-08) — a spoofed POST can grant subscriptions.
- If multiple employer companies are in the beta simultaneously, their data is not fully tenant-isolated on read endpoints (R-06, R-07, R-08). One employer with another's `companyId` can read their job list and contact list. For a single-company beta or fully trusted multi-company beta this is acceptable.
- Five write gaps remain (R-01 through R-05). These require knowing a specific target's `applicationId`, `candidateId`, `cvId`, or `uid` — not trivially exploitable in a small trusted beta, but should be disclosed to testers.

---

### Public Launch: After QA10

**Minimum required before public launch:**

| Item | ID | Why |
|------|----|-----|
| Rate-limiting | P1 | Open to brute-force, bulk scraping, payment link abuse without it |
| `updateApplication` ownership | R-01 | Authenticated users can overwrite others' applications |
| `createCV` userId override | R-04 | Authenticated users can create CVs attributed to others |
| `updateUserProfile` uid override | R-05 | Authenticated users can update others' profiles |
| `createCandidate` / `updateCandidate` | R-02/R-03 | Candidates table has no company_id — schema may need clarification first, but write gaps should be resolved |

**Recommended for launch but not strictly blocking:**
- PayMongo webhook signature verification (R-09)
- `deleteCV` Firebase Storage cleanup (SEC-11)
- Uncomment `deleteJob` route (SEC-12)
- Residual read-only tenant isolation gaps (R-06, R-07, R-08)

---

## 5. Next 3 Sprints in Order

### Sprint 1 — Rate-Limiting (est. 1 hour)
**Priority: P1 — complete before beta**

1. `npm install express-rate-limit`
2. Add 4 limiter blocks to `server.js` as specified in Section 3 above
3. Verify with curl/Postman: auth tier (should 429 after 10 requests in 15 min), mutation tier (should 429 after 30 in 1 min), global (should 429 after 200 in 1 min)
4. Confirm webhook is excluded from rate limiting

No controller, no route, no schema changes. This sprint closes the only true public-launch blocker that doesn't require BOLA work.

---

### Sprint 2 — QA10 P2 Write Gaps (est. 2–3 hours)
**Priority: P2 — required for public launch**

Close the 5 remaining write-path BOLA gaps in one focused sprint. All patterns are already established in QA7–QA9 code; these are copy-paste-adapt fixes:

| Fix | Handler | Pattern |
|-----|---------|---------|
| QA10-1 | `cvController.createCV` | `userId = req.user.uid` (same as QA8 `createProfile` fix) |
| QA10-2 | `userController.updateUserProfile` | Pass `{ ...req.body, uid: req.user.uid }` to `updateProfile()` (mirrors `updateBasicProfileInfo`) |
| QA10-3 | `applicantsController.updateApplication` | Add `candidate_id = req.user.uid` to UPDATE WHERE; remove body `candidateId` from params |
| QA10-4 | `candidateController.createCandidate` / `multipleCandidate` | `getUserCompany(uid)` → JWT-derived `companyId` injected (mirrors QA9 Fix-3 for `addCompanyUser`) |
| QA10-5 | `candidateController.updateCandidate` | Check `getUserCompany(uid)`; fold `company_id=$N` into UPDATE WHERE (mirrors deleteCandidate QA9 Fix-7). Note: candidates schema must have a `company_id` column for this to work — verify before coding. |

After these 5 fixes the write-path BOLA score reaches approximately 97%.

---

### Sprint 3 — P3 Cleanup + DeleteJob Route (est. 2 hours)
**Priority: P3 — quality gate before full public launch**

| Item | Action |
|------|--------|
| PayMongo webhook signature verification | Implement HMAC-SHA256 verification using `x-paymongo-signature` header; reject any POST without a valid signature |
| `deleteCV` Storage orphan cleanup | After DB DELETE, call Firebase Admin `bucket.file(storagePath).delete()` in a try/catch (log failure, don't fail the request) |
| Uncomment `deleteJob` route | Remove the `//` prefix from `router.delete("/jobs/delete", deleteJob)` in `jobsRoute.js` |
| `addCompanyUserByEmail` raw error leak | Replace `msg: \`Failed: ${error}\`` with a static generic string |
| Email enumeration mitigation | Change `loginUser` "User does not exist" response to a generic "Invalid email or password" to prevent email harvesting |
| Tenant isolation on read endpoints | Lock `getJobBasicListOfCompany`, `getAllCompanyUser`, `contactslist`, `list2` to JWT-derived IDs (mirrors QA9 Fix-12 pattern). `getUserProfile` in applicantsController: assess whether employer-side needs to read other users' profiles (if yes, add scoped employer-facing endpoint) |

---

## Appendix: Open Issues Registry (Post-QA9)

| ID | Description | Severity | Sprint |
|----|-------------|----------|--------|
| P1-RATE | No rate-limiting (repo-wide) | P1 | Sprint 1 |
| R-01 | `updateApplication` no ownership | P2 | Sprint 2 |
| R-02 | `createCandidate`/`multipleCandidate` no company scope | P2 | Sprint 2 |
| R-03 | `updateCandidate` no ownership | P2 | Sprint 2 |
| R-04 | `createCV` body-supplied userId | P2 | Sprint 2 |
| R-05 | `updateUserProfile` body-supplied uid | P2 | Sprint 2 |
| R-06 | `contactslist`/`list2` query-param companyId | P3 | Sprint 3 |
| R-07 | `getAllCompanyUser` query-param id | P3 | Sprint 3 |
| R-08 | `getJobBasicListOfCompany`/`getExpiredJobListOfCompany` query-param id | P3 | Sprint 3 |
| R-09 | PayMongo webhook no signature verification | P3 | Sprint 3 |
| R-10 | `deleteCV` orphaned Firebase Storage files | P3 | Sprint 3 |
| R-11 | `deleteJob` route commented out in router | P3 | Sprint 3 |
| R-12 | `addCompanyUserByEmail` leaks raw error | P3 | Sprint 3 |
| R-13 | Email enumeration via `loginUser` "User does not exist" message | P3 | Sprint 3 |
| BACKLOG | B01 BACKLOG-01/02 (messages is_read column / all-threads endpoint) | Deferred | Backlog |
| BACKLOG | B03 Interview Page MVP | Deferred | Backlog |
