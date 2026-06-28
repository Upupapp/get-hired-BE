# GETHIRED TEST REPORT — RECENT DEPLOYMENT
**Scope:** B04, B05, B09, B13 + Domain migration  
**Date:** 2026-06-25  
**Test type:** Static code inspection (no live DB, no real HTTP calls)  
**Angular version:** 13.2.x / CLI 13.2.5, Karma/Jasmine test framework

---

## Phase 0 — Tooling Inventory

**Package.json scripts:**
- `npm test` → `ng test` (Karma + Jasmine)
- `build-prod` → `ng build --configuration=production`
- No Jest; Karma + Jasmine 4.0.x only.

**Angular CLI version:** 13.2.5  
**Test runner:** Karma 6.3.17 / Jasmine 4.0.1  

**Existing spec files for changed areas:**
- `create-interview.component.spec.ts` — exists
- `preview-job-post-step.component.spec.ts` — exists
- No spec files for `JobReadinessBarComponent`, `JobReadinessChipsComponent`, `EmployerJobDashboardComponent`, or `JobReadinessService` (none exist).

**Status:** PASS (tooling present; missing specs for new B13/B05 components noted as gap).

---

## Phase 1 — B04 Regression: Interview Questions Optional

**File inspected:** `src/app/job/job-create/job-create.component.ts`  
**Method:** `publishJobPost()` (lines 390–451)

**Gate logic (verbatim):**
```
this.isReadyToPublish = !!(
  job.jobTypeId &&
  job.jobLevelId &&
  job.jobCity != null && job.jobCity !== '' &&
  job.jobCountry != null && job.jobCountry !== '' &&
  job.jobDescription != null && job.jobDescription !== '' &&
  job.workSetupId &&
  (job.bannerFile[0] || job.jobBanner != "") &&
  job.companyId
)
```

**Interview questions are NOT in this gate.** Zero reference to `interviewQuestions`, `interviewTemplateId`, or any interview check in the publish condition.

**Comment in code confirms intent:**
> "B04 V5: Interview questions are now optional for publish."

**Interview step disabled behavior:** The interview statusChanges subscription is commented out (lines 279–285), which means the stepper no longer blocks progression at step 3.

**Step 3 label:** "Create Interview (Optional)" — explicitly labelled optional in `stepperItems` array.

**Result:** PASS — publish does not require interview/video questions.

---

## Phase 2 — B05 Test: EmployerJobDashboardComponent

**Module declaration:**  
`src/app/employer-panel/employer-jobs/employer-jobs.module.ts`  
- `EmployerJobDashboardComponent` imported and declared in `declarations[]` array. PASS.

**Route registration:**
```typescript
{ path: 'dashboard', component: EmployerJobDashboardComponent }
```
Defined in the `routes` array in `employer-jobs.module.ts`. PASS.

**Post-publish navigation (B05):**  
`src/app/job/job-create/job-create.component.ts`, `afterSubmit()`, lines 510–524.  
On `event === 'published'`:
- If `this.jobId` is set → navigate to `/recruiter/jobs/dashboard?id=<this.jobId>`.
- Else → read `jobFacade.jobDetails$.pipe(take(1))` and navigate to `/recruiter/jobs/dashboard?id=<job.jobId>`.

**Null/undefined jobId fallback:**  
`src/app/employer-panel/employer-jobs/employer-job-dashboard/employer-job-dashboard.component.ts`, lines 82–93.  
If `jobId` is null:
```typescript
this.jobFacade.jobDetails$.pipe(take(1)).subscribe(selected => {
  if (selected && selected.jobId) {
    this.jobId = selected.jobId;
    this.jobFacade.getJobById(this.jobId);
  } else {
    this.router.navigate(['/recruiter/jobs/list']); // fallback
  }
});
```
**Falls back to `/recruiter/jobs/list` on no jobId.** No snackbar message at this fallback path (the snackbar is fired in `job-create.component.ts` afterSubmit, not in the dashboard). The snackbar "Your job was published. View all jobs." fires from `job-create` before navigating. PASS (fallback navigates safely; the snackbar exists on the publishing side).

**Result:** PASS — component declared, route registered, fallback exists.

---

## Phase 3 — B09 Test: Company Profile Subtabs

**File:** `src/app/employer-panel/employer-company/employer-company.component.ts` and `.html`

**Three subtabs confirmed:**
```typescript
subtabs = [
  { id: 1, label: 'Company Profile' },
  { id: 2, label: 'Employer Brand' },
  { id: 3, label: 'Benefits & Culture' },
];
```
PASS — 3 tabs render.

**Brand tab (Tab 2) data sources:**
- `company$ | async as company` (CompanyFacade `companyDetails$`)
- Logo: `company.companyLogoUrl`
- Overview: `company.companyDetails`
- Mission & Values → marked "Coming soon" — no fake data presented.
- Why Work With Us → marked "Coming soon" — no fake data presented.

**PASS** — Brand tab only uses `company_details` / `company_logo` from the store.

**Benefits tab (Tab 3) data sources:**
- Work Arrangement: `company.workSetupId` matched against `workSetup$ | async`
- Team Size: `company.numberOfEmployee`
- Health & Insurance → marked "Coming soon"
- Leave & Flexibility → marked "Coming soon"
- Learning & Growth → marked "Coming soon"

**PASS** — Benefits tab only uses `work_setup_id` and `numberOfEmployee`. No fake data.

**Empty states:** All missing-data sections show "Coming soon" or a neutral empty state that guides user to the Profile tab. No invented counts or fabricated text.

**Result:** PASS — all 3 tabs render with real-only data; backlogged sections are clearly marked "Coming soon".

---

## Phase 4 — B13 Core Test: JobReadinessService

**File:** `src/app/job/services/job-readiness.service.ts`

**canPublish logic:**
```typescript
canPublish = blockingItems.length === 0;
```
Blocking items are pushed only for: `jobTitle`, `jobType`, `jobLevel`, `jobCity`, `jobCountry`, `description`, `workSetup`, `banner`, `company`.

**Exact match with publishJobPost():**  
Compared `publishJobPost()` gate vs `evaluate()` blocking checks:

| Field | publishJobPost() | evaluate() blockingItem | Match? |
|-------|----------------|------------------------|--------|
| jobTypeId | ✓ | ✓ | YES |
| jobLevelId | ✓ | ✓ | YES |
| jobCity | ✓ | ✓ | YES |
| jobCountry | ✓ | ✓ | YES |
| jobDescription | ✓ | ✓ | YES |
| workSetupId | ✓ | ✓ | YES |
| banner | ✓ | ✓ | YES |
| companyId | ✓ | ✓ | YES |
| jobTitle | NOT checked in publishJobPost() | IS a blockingItem | MINOR DIVERGENCE |

**Note:** `jobTitle` is a `Validators.required` field in the form, and the publish gate would fail if the form were invalid, but `publishJobPost()` itself calls `formatJob()` without checking `jobTitle` explicitly. The service adds it as a blocking item for UX guidance (it will be caught by form validation before publish is ever called). This is a conservative over-check, not an under-check — it does not create false confidence.

**Interview/video questions:**
- `interviewQuestions` → `pushRec()` only (recommended, line 163). NEVER `pushRequired()`.
- Section status: `blocking: false` explicitly (line 265, comment "B04: NEVER blocking").
- `optionalItems` includes `videoQuestions` and `brandDetails` — correctly placed.

**PASS** — interview questions are never in blockingItems.

**No forbidden copy scan:**  
Searched service, bar, chips, and dashboard templates for: AI, guaranteed, top ranked, matched, video evaluated, shown to all, perfect.  
Results: The word "matched" appears only in comment text within the service (`// No AI, no MATCH`) — not in any user-facing label or copy. All user-facing strings use neutral, accurate copy.  
**PASS** — no forbidden copy found in user-facing output.

**readinessPercent determinism:**
```typescript
const readinessPercent = totalWeight === 0 ? 0
  : Math.min(100, Math.round((totalDone / totalWeight) * 100));
```
Pure arithmetic from the input object. No `Math.random()`, no HTTP call, no async operation anywhere in `evaluate()`. The entire method is synchronous.  
**PASS** — `readinessPercent` is deterministic.

**JobReadinessBarComponent declared in job.module.ts:** Line 28, 52. PASS.  
**JobReadinessChipsComponent declared in job.module.ts:** Line 29, 53. PASS.

---

## Phase 5 — Animation/Accessibility Test

**_motion.scss mixins:**
```scss
@mixin motion-safe {
  @media (prefers-reduced-motion: reduce) {
    transition: none !important;
    animation: none !important;
  }
}

@mixin ambient-motion-safe {
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
}
```

**job-readiness-bar.component.scss:**
- `.jrb-skeleton` animation (`jrb-shimmer`): uses `@include ambient-motion-safe` — PASS
- `.jrb-level-chip` transition: uses `@include motion-safe` — PASS  
- `.jrb-level-chip--glow` animation: uses `@include ambient-motion-safe` — PASS
- `.jrb-bar-fill` transition: uses `@include motion-safe` — PASS

**job-readiness-chips.component.scss:**
- `.jrc-chip` enter animation: uses `@include ambient-motion-safe` — PASS
- `.jrc-chip--blocking` shake + enter: uses `@include ambient-motion-safe` — PASS
- `.jrc-chip--blocking:hover` scale: uses `@include motion-safe` — PASS
- `.jrc-chip--blocking:active` scale: uses `@include motion-safe` — PASS
- `.jrc-chip--recommended:hover` scale: uses `@include motion-safe` — PASS
- `.jrc-chip--recommended:active` scale: uses `@include motion-safe` — PASS
- `.jrc-all-complete` enter animation: uses `@include ambient-motion-safe` — PASS

**ARIA on progress bar:**
```html
role="progressbar"
[attr.aria-valuemin]="0"
[attr.aria-valuemax]="100"
[attr.aria-valuenow]="result.readinessPercent"
[attr.aria-label]="'Job readiness ' + result.readinessPercent + ' percent'"
```
All three required attributes present. PASS.

**ARIA on chips:**
- Blocking: `[attr.aria-label]="item.label + ' — required to publish. Click to go to this section.'"` — PASS
- Recommended: `[attr.aria-label]="item.label + ' — recommended. Click to go to this section.'"` — PASS
- Complete: `[attr.aria-label]="item.label + ' — complete'"` — PASS
- Optional: `[attr.aria-label]="item.label"` — PASS
- "All complete" panel: `role="status" aria-live="polite"` — PASS

**Result:** PASS — all animations guarded, all chips have ARIA labels, progressbar has aria-valuemin/max/now.

---

## Phase 6 — Build Verification

**Command:** `ng build --configuration production`  
**Outcome:** SUCCESS  
**Build time:** 22,823ms  
**Warnings:** 2 CSS autoprefixer warnings in `add-contact-group.component.scss` (pre-existing, unrelated to recent deployment, use `start` instead of `flex-start`). These are warnings only, not errors.  
**Errors:** 0  
**Result:** PASS — production build succeeds with 0 errors.

---

## Phase 7 — Security Regression: B05 Routes and B13 Data

**New route `/recruiter/jobs/dashboard`:**  
Added in `employer-jobs.module.ts` as a child route within the lazy-loaded `EmployerJobsModule`.

**Guard chain:**
- Root: `/recruiter` → `canActivate: [AuthGuard]` in `app.routing.module.ts` (line 39).
- The parent `EmployerPanelComponent` uses `EmployerGuard` (imported in `employer-panel.module.ts`, line 6).
- InternalEmployerGuard is commented out on the `jobs` child route (pre-existing, unrelated to this deployment).

**FINDING — RISK:** The new `dashboard` route does not have its own `canActivate` guard. It relies on the parent `AuthGuard` at the `/recruiter` level and the component-level `EmployerGuard` at the panel level. This is the same guard posture as all other sibling routes (`list`, `create`, `edit`, `view`, `applicants`) — the gap pre-dates this deployment and is not introduced by B05.

**Action:** No new guard regression introduced by B05. Pre-existing gap documented; add route-level `canActivate: [EmployerGuard]` to all child routes as a future hardening task.

**B13 service data exposure:**  
`JobReadinessService.evaluate()` accepts only job-form fields and company context. It contains no applicant data fields (no resume, no applicant name, no email, no salary expectation, no private application data). The service exposes: `readinessPercent`, `canPublish`, `blockingItems`, `recommendationItems`, `completedItems`, `optionalItems` — all derived from the job post content itself.  
**PASS** — B13 service does not expose applicant private data.

---

## Phase 8 — Contract Test: JobReadinessService.evaluate()

**Verified:**
1. `evaluate()` is a plain synchronous method (no `Observable`, no `Promise`, no `HttpClient` injection in the service constructor).
2. `@Injectable({ providedIn: 'root' })` — provided globally, no HTTP dependencies.
3. No imports from `@angular/common/http` anywhere in the service file.
4. Accepts `JobReadinessInput` (a plain interface — job form values + company context).
5. Returns `JobReadinessResult` synchronously.
6. The comment at the top of the method: *"Pure function — no side effects, no subscriptions. Safe to call in every form-value-changes emission."*

**PASS** — `evaluate()` is a pure deterministic function with no HTTP calls.

---

## Phase 9 — Regression Checklist (See separate file)

See `GETHIRED_REGRESSION_CHECKLIST_RECENT_V1.md`.

---

## Phase 10 — Release Quality Gate (See separate file)

See `GETHIRED_RELEASE_QUALITY_GATE_RECENT_V1.md`.

---

## Issues Found

### ISSUE-01 — Minor: jobTitle canPublish divergence (low severity)
**Where:** `JobReadinessService.evaluate()` vs `publishJobPost()`  
**What:** Service treats `jobTitle` as a blocking item; `publishJobPost()` does not explicitly check `jobTitle` (relies on Angular Validators.required). A user who somehow bypassed form validation (e.g. programmatic API call) could publish without a title but the readiness bar would correctly show it as required.  
**Risk:** Low — not a regression; the service is more conservative (safer) than the actual gate.  
**Action:** Document; consider adding `jobTitle` to the `publishJobPost()` explicit check in a future pass.

### ISSUE-02 — Minor: no unit specs for new B13/B05 components
**Where:** `JobReadinessBarComponent`, `JobReadinessChipsComponent`, `EmployerJobDashboardComponent`, `JobReadinessService`  
**What:** No `.spec.ts` files exist for any of the B13 or B05 new artifacts. The service is pure and highly testable.  
**Risk:** Low for this release (all logic verified by static inspection); medium for future changes.  
**Action:** Add unit specs, especially for `JobReadinessService.evaluate()` edge cases (all fields missing, all fields present, partial fill).

### ISSUE-03 — Note: employer-jobs child routes lack per-route guards (pre-existing)
**Where:** `employer-jobs.module.ts` routes  
**What:** `canActivate: [InternalEmployerGuard]` is commented out on `create`, `edit` child routes. The `dashboard` route added by B05 follows the same pattern as all siblings — guarded at the `/recruiter` top level only.  
**Risk:** Pre-existing posture, not regressed by this deployment. Authenticated non-employer users could potentially reach recruiter-scoped pages if AuthGuard does not validate role.  
**Action:** Verify AuthGuard checks `role: '2'` data from the route; add `EmployerGuard` per-route as a hardening step.

### ISSUE-04 — Note: `isInterviewRequired: false` hardcoded in preview
**Where:** `preview-job-post-step.component.ts`, line 62  
**What:** `isInterviewRequired: false` is hardcoded regardless of whether questions exist. This is consistent with B04 (questions optional) but means the field is never `true` even if the recruiter added questions intending them to be required.  
**Risk:** Low — aligns with B04 intent (questions are always optional for applicants). No regression.

---

## SECTION B — TARGETED VERIFICATION: 6 RECENT CHANGES (2026-06-25)

This section supplements the above with targeted verification of 6 specific changes
from the most recent commit batch.

---

### B-1 — P2 deleteJob: route, ownership-scoped DELETE, 0-row=404, NgRx chain

**Status: PASS**

**Route registration** (`routes/jobsRoute.js` line 33):
`router.delete("/job/delete", verifyAuth, deleteJob);` — registered with auth middleware.

**Ownership-scoped DELETE** (`controllers/jobsController.js` lines 238-241):
```js
DELETE FROM gethired.jobs WHERE job_id=$1 AND company_id=$2 RETURNING job_id
```
`company_id=$2` is always `callerCompany.companyId` from `getUserCompany(req.user.uid)`.
Guard at lines 230-233 blocks requests where `getUserCompany` returns `[]`.

**0-row = 404** (lines 245-248): `if (!rowCount || rowCount === 0)` returns `status.notfound`. Both "job doesn't exist" and "wrong company" map to 404, avoiding information leakage.

**NgRx chain** (FE verified):
- `job.actions.ts`: `deleteJob`, `deleteJobSuccess`, `deleteJobFail` defined (lines 144-157).
- `job.effects.ts` lines 408-426: calls `jobService.deleteJobPost(action.jobId)` via DELETE; normalises `body.error || body.message || fallback` in catch.
- `job.reducer.ts` lines 495-522: all three handlers present (loading, list replace, error).
- `job.facade.ts` line 140: `deleteJobPost(jobId)` dispatches correctly.
- `job.service.ts` lines 51-53: sends `DELETE /job/delete` with `{ body: { jobId } }` (no companyId).
- `job-list.component.ts` line 235: UI calls `this.jobFacade.deleteJobPost(jobId)`.

Empty-list edge case: post-delete `getBasicJobList` returns `[]` when all jobs deleted; reducer accepts empty array correctly.

---

### B-2 — P2-01: basiclist/expiredlist derive companyId from JWT

**Status: PASS (BE) | INFO (FE passes redundant param)**

**BE** (`controllers/jobsController.js` lines 192-216):
`getJobBasicListOfCompany` and `getExpiredJobListOfCompany` both call `getUserCompany(req.user.uid)`.
Neither reads `req.query` or `req.body`. The URL query param `?id=...` sent by the FE is completely ignored.

**Edge case — missing guard:** When `getUserCompany` returns `[]` (no company record), `callerCompany.companyId` returns `undefined`. Unlike `deleteJob`, there is no `Array.isArray(callerCompany)` guard here. `getBasicJobList(undefined, 0)` will query Postgres with `$1 = NULL`, returning zero rows rather than an error. Safe (empty list, not a data leak), but inconsistent with the hardened `deleteJob` pattern.

**FE** (`job.service.ts` lines 77-89): Still appends `?id=${companyId}` to both URLs. The BE ignores this. At `job-list.component.ts` line 312, `getBasicList(null)` is called — passing `null` as the param. This is dead weight but harmless.

**NEEDS-MANUAL-VERIFY:** Confirm `getBasicJobList(undefined, 0)` returns `[]` (not a 500) via the pg driver when `$1` is undefined.

---

### B-3 — CORS restricted to env.app_url

**Status: PASS**

`server.js` line 89: `app.use(cors({ origin: env.app_url }));`

`env.js` production branch (line 22-24): reads from `process.env.APP_URL`, falls back to `http://localhost:4200`.

The previously commented-out permissive CORS block is preserved as dead code only (lines 28-36).

Webhook route (`POST /payment/paymongowebhook`) is server-to-server; CORS does not apply to server-to-server calls.

**Minor pre-existing issue in staging branch:** `eucannajobs` and `jobhunt` branches check `APP_URL_DEV` but return `APP_URL` (not `APP_URL_DEV`). Not introduced by the recent CORS change.

---

### B-4 — PayMongo webhook HMAC-SHA256 (verifyPaymongoSignature)

**Status: PASS (logic) | NEEDS-MANUAL-VERIFY (env secret)**

Function at `controllers/paymentController.js` lines 60-96 implements:
1. Fail-closed secret check (`!secret` returns false)
2. Header presence check
3. PayMongo sig header parse (`t=`, `li=`, `te=`)
4. 5-minute replay attack window
5. HMAC-SHA256 over `timestamp.rawBody` (matches PayMongo docs)
6. `crypto.timingSafeEqual` for constant-time comparison

`req.rawBody` is populated by `server.js` line 92: `verify: (req, _res, buf) => { req.rawBody = buf; }`.

**padEnd behaviour:** `sig.padEnd(expected.length, "0")` pads the hex string before Buffer decode. If sig is shorter than 64 chars, it pads with ASCII "0" to 64 chars. The subsequent `a.length !== b.length` length check then passes but comparison fails. Safe — wrong sig is still rejected.

**CRITICAL NEEDS-MANUAL-VERIFY:** `PAYMONGO_WEBHOOK_SECRET` is absent from the local `.env` file. If absent from the production `.env`, `!secret` will be `true` on every call and all real PayMongo webhooks will return HTTP 400. Confirm the key exists in the production environment before this is considered PASS.

---

### B-5 — F-08: updateQuestionById company-scoped subquery + Promise.all fix

**Status: PASS**

**updateQuestionById subquery** (`services/interview.service.js` lines 84-122):
When `companyId` is provided, the UPDATE WHERE clause includes:
```sql
AND itq.job_interview_template_id IN (
  SELECT job_interview_template_id FROM gethired.job_interview_template WHERE company_id=$7
)
```
`params` array is `[question, answerDuration, retakes, now, sequence, questionId, companyId]` — 7 params, matching `$1`-`$7`. No off-by-one.

**companyId threading** (`controllers/jobsController.js` lines 371-379): `callerCompany.companyId` is passed to `interviewQuestionsUpdate` as the 4th argument. `interviewQuestionsUpdate` passes it down to `updateQuestionById`.

**Promise.all fix** (`services/job.service.js` lines 354-369):
Previous: bare `.map(async)` without `await Promise.all` → fire-and-forget, errors silently swallowed.
Fixed: `await Promise.all(interviewQuestions.map(async (question) => { ... }))` → all rejections propagate.

**Pre-existing bug (not introduced by F-08):** `createQuestion` at `interview.service.js` line 38 passes `rows` (array) instead of `rows[0]` to `mappedQuestion`. This returns an object with all-undefined fields. Non-blocking: the INSERT succeeds; the return value of `createQuestion` is discarded by `interviewQuestionsUpdate`. The question IS saved correctly in the DB.

---

### B-6 — job_interview_template.company_id column in production DB

**Status: NEEDS-MANUAL-VERIFY**

The `interview.service.js` references `company_id` in `job_interview_template` at:
- Line 57 (INSERT)
- Line 99 (subquery WHERE)
- Line 199 (getAllInterviewTemplates WHERE)

No migration file was found in the scanned directories. The column addition must be confirmed directly on the production database.

**Manual verification command (run on production Postgres):**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'gethired'
  AND table_name = 'job_interview_template'
ORDER BY ordinal_position;
```
Expected: `company_id` appears in result.

If absent: `updateQuestionById` (with companyId) and `createInterviewTemplateQuestions` will throw a Postgres column-not-found error, breaking `updateJob` for any job that has interview questions.

---

## SUMMARY TABLE — 6 RECENT ITEMS

| # | Item | Status | Blocking? |
|---|------|--------|-----------|
| B-1 | P2 deleteJob: route, ownership DELETE, 404, NgRx | PASS | No |
| B-2 | P2-01: basiclist/expiredlist companyId from JWT (BE) | PASS | No |
| B-2a | P2-01: missing Array.isArray guard on callerCompany | INFO | No (empty list, not a leak) |
| B-2b | P2-01: FE still sends redundant ?id= param | INFO | No |
| B-3 | CORS restricted to env.app_url | PASS | No |
| B-4 | PayMongo HMAC-SHA256 logic correct | PASS | No |
| B-4a | PAYMONGO_WEBHOOK_SECRET absent from .env | NEEDS-MANUAL-VERIFY | YES in prod |
| B-5 | F-08: updateQuestionById subquery + Promise.all | PASS | No |
| B-5a | Pre-existing: createQuestion passes rows vs rows[0] | INFO (pre-existing) | No |
| B-6 | job_interview_template.company_id in prod DB | NEEDS-MANUAL-VERIFY | YES in prod |

*Report generated by static code inspection. No production DB or live API calls were made.*
