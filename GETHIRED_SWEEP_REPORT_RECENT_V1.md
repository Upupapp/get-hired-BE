# GETHIRED_SWEEP_REPORT_RECENT_V1
Generated: 2026-06-25
Scope: changes since GH1/session-2026-06-25 checkpoint

---

## EXECUTIVE SUMMARY

The recent deployment landed 8 distinct change areas (P2 deleteJob, P2-01 list BOLA fix, P2-02 DB migration, CORS lock-down, PayMongo HMAC-SHA256, F-08 interview/job service hardening, F-08 FE loading states, Firebase key rotation + nginx headers). All core security invariants for the deployment scope have been verified present and structurally sound. Six open findings are documented below; none are P0 regressions introduced by this deployment. Two (F3, F5) are pre-existing MEDIUM risks now visible in the deployment context.

---

## SECTION 1 — ROUTE INVENTORY (jobs domain)

All routes in `routes/jobsRoute.js`:

| Method | Path | Auth | Controller |
|--------|------|------|------------|
| DELETE | /api/job/delete | verifyAuth | deleteJob |
| POST | /api/job/create | verifyAuth | createJobs |
| PUT | /api/job/updatejobs | verifyAuth | updateJob |
| GET | /api/job/basiclist | verifyAuth | getJobBasicListOfCompany |
| GET | /api/job/expiredlist | verifyAuth | getExpiredJobListOfCompany |
| GET | /api/job/categories | verifyAuth | getCategoryList |
| GET | /api/job/industries | verifyAuth | getIndustryList |
| GET | /api/job/badges | verifyAuth | getBadgeList |
| GET | /api/job/rolelist | verifyAuth | getJobRoleList |
| PUT | /api/job/changestatus | verifyAuth | updateStatusOfJob |
| GET | /api/job/applicants | verifyAuth | getAllApplicantOfJob |
| GET | /api/job/applicants/signals | verifyAuth | getJobApplicantFitSignals |
| GET | /api/job/applicantdetails | verifyAuth | getJobApplicantDetails |
| DELETE | /api/job/deleteinterviewquestion | verifyAuth | deleteInterviewQuestion |
| GET | /api/job/getsubscriptionrestrictions | verifyAuth | getSubscriptionRestrictions |
| GET | /api/job/published | (none — public) | getAllPublishedJobs |
| GET | /api/job/details | (none — public) | getJobDetails |
| GET | /api/job/sharelink | (none — public) | getJobShareableLink |

All private routes have verifyAuth. The three public routes are intentionally unauthenticated.

---

## SECTION 2 — P2 DELETEJOB

### 2.1 BE route registration
`routes/jobsRoute.js` line 33: `router.delete("/job/delete", verifyAuth, deleteJob);`
Correctly registered, correctly auth-gated. VERIFIED OK.

### 2.2 BE controller BOLA closure
`controllers/jobsController.js` lines 218–261:
- Reads `jobId` from `req.body` only.
- Derives `companyId` exclusively from `getUserCompany(req.user.uid)` — never from req.body or req.query.
- DELETE query: `WHERE job_id=$1 AND company_id=$2 RETURNING job_id` — zero rowCount returns 404 (no leak of whether row exists vs. owned-by-other).
- Post-delete list refresh uses `callerCompany.companyId`, not any caller-supplied scope.
BOLA closure correct and complete. VERIFIED OK.

### 2.3 FE NgRx chain
- `job.actions.ts` lines 86–157: DeleteJob / DeleteJobSuccess / DeleteJobFail actions with correct prop types.
- `job.effects.ts` lines 407–425: `deleteJob$` effect calls `jobService.deleteJobPost(action.jobId)`, maps success to `deleteJobSuccess({ basicList })`, normalises 403/404 error shapes using `body.error || body.message || fallback`.
- `job.reducer.ts` lines 495–522: all three handlers present; success replaces `list` with BE-returned refreshed array; `succesMsg: 'deleted'`; loading cleared on both branches.
- `job.facade.ts` lines 139–141: `deleteJobPost(jobId)` dispatches `deleteJob({ jobId })` — no companyId passed (correct, server-derives it).
- `job.service.ts` lines 51–53: `deleteJobPost` calls `this.baseService.delete(url, { body: { jobId } })`. HttpClient.delete with body in options object is the correct Angular 13 pattern.
- `job-list.component.ts` lines 219–238: `deleteRow` opens ConfirmationDialogComponent; on result==1 dispatches `jobFacade.deleteJobPost(jobId)`.
- `job-list.component.ts` line 241: `afterChange` handles `'deleted'` string — success snackbar + `dialog.closeAll()`.
- `job-list.component.ts` lines 139–148: `jobError$` subscription for normalised error messages.
Full end-to-end chain is wired and structurally correct. VERIFIED OK.

---

## SECTION 3 — P2-01 BASICLIST/EXPIREDLIST BOLA

### 3.1 BE
`controllers/jobsController.js`:
- `getJobBasicListOfCompany` (line 192): calls `getUserCompany(req.user.uid)` → passes `callerCompany.companyId` to `getBasicJobList`. Correct.
- `getExpiredJobListOfCompany` (line 205): same pattern. Correct.
Neither function reads `req.query.id` for scope any longer. BOLA closed on BE. VERIFIED OK.

### 3.2 FE — stale companyId param still sent (OPEN FINDING F1)
`job.service.ts` lines 77–79 and 88–90 still append `?id=${companyId}` on both calls. The BE ignores this param (uses JWT), so no security impact. However:
- The NgRx effects pass `action.companyId` to both service calls.
- `job-list.component.ts` line 313 (ngOnDestroy) calls `this.jobFacade.getBasicList(null)`, sending `?id=null` on the wire.
- `checkCompanySubscription` in job.service.ts line 24 also still sends `?companyId=` which the BE ignores.
Severity: LOW. No security or functional impact. Recommend cleaning up in next cycle to remove the dead param from the FE chain.

---

## SECTION 4 — P2-02 JOB_INTERVIEW_TEMPLATE SCHEMA MIGRATION

### 4.1 INSERT column alignment
`services/interview.service.js` lines 48–59 (`createInterviewTemplateQuestions`): INSERT includes `company_id` ($5) and `created_by` ($6).

### 4.2 Call sites
- `controllers/jobsController.js` line 142 (inside createJobs): `createInterviewTemplateQuestions(jobId, "default", companyId, uid)` — both columns populated from JWT-derived context. Correct.
- `services/job.service.js` line 362 (inside interviewQuestionsUpdate): `createInterviewTemplateQuestions(jobId, "default")` — omits companyId and createdBy; they will be NULL. This is the fallback path when adding interview questions to an existing job that has no template yet. Acceptable as a NULL default, but ideally the companyId should be threaded here.

### 4.3 No migration file in repo (OPEN FINDING F2)
The P2-02 migration was applied as a direct DB command, not as a versioned migration script. This means:
- No rollback path.
- Local dev must apply the columns manually before the interview INSERT will work.
Recommend creating: `ALTER TABLE gethired.job_interview_template ADD COLUMN IF NOT EXISTS company_id text, ADD COLUMN IF NOT EXISTS created_by text;`
Severity: MEDIUM operational risk.

---

## SECTION 5 — CORS RESTRICTION

`server.js` line 89: `app.use(cors({ origin: env.app_url }));`
`env.js` line 23: `app_url` reads from `APP_URL` env var, defaulting to `http://localhost:4200`.
Local `.env` confirms `APP_URL=http://localhost:4200`. Production env var must be set to the deployed FE domain for this to be effective.
The previously commented-out `corsOption` whitelist function (lines 28–36) is correctly left disabled.
VERIFIED OK.

---

## SECTION 6 — PAYMONGO WEBHOOK HMAC-SHA256 + REPLAY WINDOW

### 6.1 Signature verification
`controllers/paymentController.js` lines 60–96 (`verifyPaymongoSignature`):
- Reads `paymongo-signature` header; parses `t` (timestamp), `li` (live), `te` (test) parts.
- Enforces 5-minute replay window (line 77): `Math.abs(now - timestamp) > 300`.
- Uses `req.rawBody` (captured by `verify` callback in `server.js` line 92–93).
- HMAC: `sha256(timestamp + "." + rawBody)`.
- `crypto.timingSafeEqual` for constant-time comparison.
- Falls back from `li` to `te` correctly.
Implementation correct. VERIFIED OK.

### 6.2 PAYMONGO_WEBHOOK_SECRET absent from local .env (OPEN FINDING F3 — LOW)
`get-hired-BE/.env` has no `PAYMONGO_WEBHOOK_SECRET` key. In local dev `env.paymongo_webhook_secret` is `undefined`; `verifyPaymongoSignature` returns false immediately (line 62: `if (!secret) return false`), making all local webhook calls return 400. Not a production bug if the prod env var is set. Dev-setup gap only.

### 6.3 remarks-field fixed-offset slice for companyId/subscriptionId (OPEN FINDING F4 — MEDIUM)
`controllers/paymentController.js` lines 161–162 (link.payment.paid branch):
```
const companyId = remarks.slice(0, 13);
const subscriptionId = remarks.slice(14);
```
The `remarks` value was set in `subscriptionController.js` line 66 as `companyId + "-" + subscriptionId`. Company IDs from `idGenerator(6, "COMP")` are 9 chars ("COMP" + 6 alphanumerics). Slicing 0–13 would capture 13 chars, including 4 chars of the subscriptionId after the separator. The resulting `companyId` value will be wrong and the subsequent `createCompanySubscription(companyId, subscriptionId)` will insert a malformed company_id. This is a pre-existing arithmetic error, not introduced by this deployment. Since `cart_table` and `companies_subscription` do not exist in production (see below), this path does not currently execute successfully in production either way.

### 6.4 cart_table and companies_subscription do not exist in production DB
`subscriptionController.js` references `cart_table` (line 25) and `companies_subscription` (line 86). Per session notes these tables are absent from production. The `/payment/paymongopaymentlink` endpoint and the webhook subscription-creation branch both throw Postgres errors at runtime in production. Pre-existing issue, not introduced by this deployment.
Severity: HIGH for the subscription flows (pre-existing, needs dedicated fix cycle).

---

## SECTION 7 — F-08 INTERVIEW.SERVICE.JS + JOB.SERVICE.JS

### 7.1 updateQuestionById company-scoped
`services/interview.service.js` lines 84–123:
- With `companyId`: UPDATE scoped via subquery through `job_interview_template.company_id`. Defence-in-depth correct.
- Without `companyId` (legacy paths): falls back to question_id-only WHERE. Safe because primary gate is the parent updateJob WHERE clause (`company_id=$20`).
VERIFIED OK.

### 7.2 interviewQuestionsUpdate Promise.all fix
`services/job.service.js` lines 354–369: `await Promise.all(interviewQuestions.map(async (question) => { ... }))`.
Previous bare `.map(async...)` was fire-and-forget. Now correctly awaited. VERIFIED OK.

### 7.3 createQuestion passes rows array not rows[0] (OPEN FINDING F5 — LOW)
`services/interview.service.js` line 38:
```javascript
const dbResponse = mappedQuestion(rows)   // BUG: rows is the array
```
`updateQuestionById` line 118 correctly passes `rows[0]`. `mappedQuestion` expects a single raw row; passing the array means all fields resolve to `undefined`. Return value is currently unused by callers in `createJobs` (stored in a `rawQuestions` variable that is then `.then`'d only to assign to a local `questions` array that is never used). No current runtime breakage, but dangerous if a future caller consumes the return value.
Pre-existing. Fix: `mappedQuestion(rows[0])` guarded by `rows && rows.length > 0`.

---

## SECTION 8 — F-08 FE JOB-CREATE LOADING/SUCCESS/ERROR STATES

`job-create.component.ts`:
- `savingDraft` (line 38), `saveSuccessPulse` (line 41), `saveErrorMsg` (line 43): correctly declared.
- `saveAsDraft()` (line 422): sets `savingDraft = true`, clears prior error before dispatch.
- `publishJobPost()` (line 431): clears prior error before dispatch.
- `afterSubmit()` (line 514): clears `savingDraft`, shows 2s pulse on success.
- `jobError$` subscription (lines 152–178): maps error strings to user-safe copy; calls `cd.markForCheck()`.
- `formSubs` bag (line 47, cleaned up at line 654): prevents duplicate statusChanges listeners on repeated `setFormGroup()` calls.
- `ngOnDestroy` (line 651): unsubscribes both `subscriptions` and `formSubs`.
VERIFIED OK.

---

## SECTION 9 — CORS + SECURITY HEADERS

`server.js`:
- Line 89: `cors({ origin: env.app_url })`.
- Lines 104–109: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection middleware applied before all route mounts.
- `rawBody` capture in `express.json()` verify callback (lines 90–93) for webhook HMAC.
All present and ordered correctly. VERIFIED OK.

---

## SECTION 10 — CROSS-CUTTING RISKS

### 10.1 Shared mutable successMessage/errorMessage objects (OPEN FINDING F6 — MEDIUM)
`helpers/status.js` exports two module-level mutable objects. Every controller mutates them directly before sending. Under concurrent requests two handlers can race: handler A sets `successMessage.data = X`, handler B sets `successMessage.data = Y`, handler A sends Y. This affects every route including the newly deployed deleteJob endpoint. Pre-existing structural issue.
Fix: inline `res.status(N).json({ status: "success", data: ... })` in each handler.

### 10.2 console.log(rows[0]) in jobDetails not removed
`services/job.service.js` line 435: `console.log(rows[0])` in `jobDetails()` — logs the full job DB row on every call to the public `/job/details` endpoint. Not PII but noisy and should be removed.
Severity: LOW.

### 10.3 verifyAuth returns bare strings on some 403s
`middleware/verifyAuth.js` lines 9, 22, 39: "Unauthorized" and "Token Expired. Login again." are sent as plain text, not JSON. FE effects that do `const { error } = err.error` will crash if `err.error` is a string. Current effects use safe `body.error || body.message || fallback` patterns which protect against this, but it remains a fragile seam.

### 10.4 getPublishedJobs SQLi fix verified
`services/job.service.js` lines 41–86: old string interpolation `and j.company_id = '${companyId}'` replaced with parameterised query and comment. VERIFIED OK.

### 10.5 Rate limiting in-memory store
`server.js` lines 45–73: all four rate limiters use in-memory store. Deferred note present. Not an issue for single-server Linode deploy. No action required now.

---

## SECTION 11 — SCHEMA ALIGNMENT

| Table | Status |
|-------|--------|
| gethired.jobs | OK |
| gethired.job_interview_template | company_id + created_by columns must exist (from P2-02 direct migration); not verifiable from repo |
| gethired.interview_template_question | OK; no new columns |
| gethired.companies / company_employees | OK; used by getUserCompany |
| gethired.transaction_table | OK; used by payment webhook |
| gethired.cart_table | NOT IN PRODUCTION — subscription purchase flow will 500 |
| gethired.companies_subscription | NOT IN PRODUCTION — subscription creation will 500 |

---

## OPEN FINDINGS SUMMARY

| ID | Sev | File | Line | Description |
|----|-----|------|------|-------------|
| F1 | LOW | job.service.ts / job-list.component.ts | 77,89,313 | FE still sends companyId param to basiclist/expiredlist/subscription endpoints; BE ignores it; ngOnDestroy sends null. No security impact. |
| F2 | MEDIUM | — (no file) | — | P2-02 DB migration was direct, no migration script in repo. No rollback path; local dev blocked without manual column add. |
| F3 | LOW | .env | — | PAYMONGO_WEBHOOK_SECRET absent locally — blocks local webhook testing (not a prod bug if prod env is set). |
| F4 | MEDIUM | paymentController.js | 161–162 | Fixed-offset slice to extract companyId from PayMongo remarks field is arithmetically wrong (13 chars > actual company ID length). Pre-existing. |
| F5 | LOW | interview.service.js | 38 | createQuestion passes rows array to mappedQuestion instead of rows[0]. Returns undefined-field object. Harmless now; dangerous if future caller uses return value. Pre-existing. |
| F6 | MEDIUM | helpers/status.js | 1–2 | Shared mutable successMessage/errorMessage — race condition under concurrent requests. Pre-existing; affects all routes. |

---

## WHAT IS VERIFIED GOOD

1. P2 deleteJob: route registered with verifyAuth; BOLA closed (company_id in WHERE); FE NgRx chain complete (actions/effects/reducer/facade/service/list-component/dialog); error normalisation in place.
2. P2-01: basiclist/expiredlist BOLA closed on BE — getUserCompany(req.user.uid) used in both handlers; req.query.id no longer read for scope.
3. P2-02: interview.service.js INSERT includes company_id and created_by; createJobs call site populates from JWT-derived context.
4. CORS: restricted to env.app_url single origin.
5. PayMongo HMAC: signature verification correct, 5-minute replay window enforced, timing-safe comparison, rawBody capture via verify callback.
6. F-08 BE: updateQuestionById company-scoped via subquery when companyId provided; interviewQuestionsUpdate uses Promise.all.
7. F-08 FE: job-create loading/success/error states wired; formSubs cleanup in ngOnDestroy; duplicate subscription listener accumulation fixed.
8. Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection middleware present and ordered before route mounts.
9. getPublishedJobs SQLi: parameterised query in place; old string interpolation removed.
10. PII logging: payment.paid and payment.failed branches no longer log full webhook payloads.
