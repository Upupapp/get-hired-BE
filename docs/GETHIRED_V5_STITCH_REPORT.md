# GETHIRED V5 STITCH REPORT
Integration Audit — V5 FE Deployment (9 changed files)
Date: 2026-06-24

---

## Executive Summary

V5 shipped 9 FE files across 4 concerns: (1) job publish flow with post-publish deep-link
navigation, (2) mobile bottom nav bar, (3) employer sidebar restructure, (4) company
dashboard onboarding checklist, and (5) signup employer-specific copy.

**Overall verdict: conditionally sound, 4 actionable gaps found.**

The most critical gap is the post-publish jobId navigation (B05): the FE navigates to
`/recruiter/jobs/applicants?id=[jobId]` using `this.jobId` which is the query-param jobId
from the edit URL — not the jobId returned by the create endpoint. For a brand-new job,
`this.jobId` is null at publish time, causing the fallback branch (`/recruiter/jobs/list`)
to fire instead of the intended deep-link. The applicants component at that route is also
an empty stub. Everything else (routes, guards, dashboard data flow, signup role handling)
is wired correctly with adequate error handling.

Severity codes: P0 = broken in production, P1 = silent failure, P2 = degraded UX.

---

## 1. API Contract Findings

### 1.1 Job Create/Update — POST /job/create · PUT /job/updatejobs

**FE call path:**
`JobCreateComponent.publishJobPost()` → `JobFacade.saveJob(job)` →
`JobActions.saveJob` → `job$` effect → `JobService.saveJob(job)`.

`JobService.saveJob` branches:
- `job.jobId && job.jobId != ''` → `PUT /job/updatejobs`
- else → `POST /job/create`

**Response shape returned by BE:**
Both endpoints call `mappedJob(rows[0])` (BE: `services/job.service.js` line 681).
The mapped object includes `jobId: raw.job_id` as a top-level field. The effect
(`job.effects.ts` line 88) receives `res.data` as `Model.Job` and dispatches
`saveJobSuccess({ job })`. The reducer stores `action.job` in `state.selected` and
sets `succesMsg` to `'published'` when `action.job.jobStatusId == 2`.

**Critical gap (P0) — jobId for post-publish navigation:**

`afterSubmit()` in `job-create.component.ts` (line 465) reads:
```ts
if (this.jobId) {
  this.router.navigate(['/recruiter/jobs/applicants'], { queryParams: { id: this.jobId } });
} else {
  this.router.navigateByUrl('recruiter/jobs/list');
}
```

`this.jobId` is populated only from `this.route.queryParams` (constructor, line 112).
For a *new* job (no `?id=` param), `this.jobId` is null throughout the component's
lifetime. The `saveJobSuccess` action stores the newly created job (including its
server-assigned `jobId`) in `state.selected`, but `afterSubmit()` never reads from
the store. The post-publish deep-link to the applicants view therefore **never fires for
new job creation** — it silently falls through to `/recruiter/jobs/list`.

For job *edits* (where `?id=` is already in the URL), `this.jobId` is present and the
navigation fires correctly.

**jobId field name confirmed:** BE `mappedJob` exposes `jobId` (camelCase). Effect
accesses it as `res.data` typed as `Model.Job`. Field name is consistent.

**Error handling:**
The `catchError` in the effect dispatches `saveJobFail` with `err.error.error`.
The reducer sets `loading: false, succesMsg: null`. `afterSubmit` only handles
`'asDraft'` and `'published'` strings; on failure `succesMsg` is `null` so
`afterSubmit` is called with `null` and silently does nothing. No user-facing error
is shown when job save fails. This is a pre-existing gap, not V5-specific (P2).

### 1.2 Dashboard Pipeline Overview — GET /company/dashboard/pipeline-overview

**FE call path:**
`CompanyDashboardComponent.loadPipelineOverview()` → `CompanyService.getDashboardPipelineOverview()`
→ `GET /company/dashboard/pipeline-overview`.

**BE response shape (confirmed, `company.service.js` line 356):**
```json
{
  "data": {
    "byStage": [{ "statusId": number, "label": string, "count": number }],
    "needsReview": [{ "applicationId": string, "jobId": string,
                      "candidateName": string, "jobTitle": string,
                      "statusId": number, "submittedDate": string }]
  }
}
```

**FE consumption (confirmed, `company-dashboard.component.ts` lines 84-88):**
```ts
this.byStage = res?.data?.byStage || [];
this.needsReview = res?.data?.needsReview || [];
```
Optional chaining + fallback arrays: null/undefined safe.

**Error handling:** `error` callback sets `pipelineError = true` and `pipelineLoading =
false`. Template shows "Couldn't load your action items" with a Retry button. Correct.

**Onboarding checklist data dependency:**
`onboardingSteps(company, charts)` (line 138) reads from `dashboard.company` and
`dashboard.charts` which come from `dashboard$` (the NgRx store, driven by
`CompanyFacade.getCompanyDashboard()` → `GET /company/dashboard`).

- `company.companyLogoUrl`, `company.companyDetails`, `company.companyCity` —
  confirmed fields in BE `mappedCompany()` (`companiesController.js` line 408).
- `charts.activeJobs` — confirmed field in BE `charts()` (`company.service.js` line 192).
- The third step's `done` flag depends on `this.needsReviewCount`, which comes from
  the pipeline endpoint, not the dashboard endpoint. Because the template guards the
  entire `onboarding` section with `*ngIf="!pipelineLoading"`, this cross-dependency
  is safe: checklist is hidden until both data sources are settled.

**Gap (P1) — onboardingSteps() called twice per change-detection tick:**
The template calls `onboardingSteps(dashboard.company, dashboard.charts)` on line 164
(for `*ngIf`) and again on line 169 (for `*ngFor`). Each call re-constructs the steps
array and returns a new reference. Angular's `ngIf` and `ngFor` will each trigger
independent evaluations. This is not a correctness bug (all calls are pure/synchronous
reads of already-fetched data) but it is wasteful and can cause subtle "expression
changed after it was checked" errors if Angular's zone detects the re-construction.
Recommend assigning to a local template variable with `*ngIf="... as steps"` or
pre-computing in `ngOnChanges`.

### 1.3 Job Publish Subscription Check — GET /job/getsubscriptionrestrictions

Called on `ngOnInit` via `JobFacade.getCompanySubscription(this.companyId)`.
`companyId` is read from `localStorage.getItem('user')` asynchronously.
If the subscription endpoint returns an error (company has no plan), the BE throws
`"Company is not subscribed to any plan"` and returns HTTP 500. The effect's `catchError`
dispatches `getCompanySubscriptionFail` with the error payload. `isAllowedToPublish`
starts as `true` and is only set to `false` inside `getCompanyRestrictions`. On failure
the subscription result is never applied, leaving `isAllowedToPublish = true`. This means
a company that fails the subscription check can still publish — a pre-existing gap, not
V5-introduced (P2).

---

## 2. Route Contract Findings

### 2.1 /recruiter/jobs/applicants

**Route defined:** Yes. `employer-jobs.module.ts` line 18:
```ts
{ path: 'applicants', component: EmployerApplicantsComponent }
```
Nested under `recruiter/jobs` via `employer-panel.module.ts` → lazy-loaded
`EmployerJobsModule`. Full resolved path: `/recruiter/jobs/applicants`.

**Accepts ?id= query param:** The route itself is parameterless (no `:id` in the path),
so `?id=` must be read via `ActivatedRoute.queryParams` inside the component.

**Critical gap (P0) — EmployerApplicantsComponent is an empty stub:**
`employer-applicants.component.ts` contains only `constructor(){}` and
`ngOnInit(){}`. The component has a template and SCSS file but **does no work** — it
does not read `?id=` from the route, does not call any API, and renders nothing useful.
A V5 employer who publishes an existing job and is taken to `/recruiter/jobs/applicants?id=X`
sees a blank panel. This defeats the B05 navigation intent entirely.

### 2.2 /recruiter route guard

**Guard wiring (confirmed):** `app.routing.module.ts` line 37:
```ts
{ path: 'recruiter', loadChildren: ..., canActivate: [AuthGuard], data: { role: '2' } }
```

`AuthGuard.checkUserLogin()` reads `state` from localStorage and compares `route.data.role`
against `coreService.getRole()`. On role mismatch it redirects to the correct panel and
returns `false`. Role-2 restriction is correctly enforced.

**No EmployerGuard / InternalEmployerGuard on child routes:** The `dashboard` and `jobs`
child routes in `employer-panel.module.ts` have their `canActivate` guards commented out
(lines 24 and 29). This was pre-existing. The outer `AuthGuard` still enforces the role-2
gate, so this is not a new regression.

### 2.3 /recruiter/company/details

Used by mobile nav "Company" item and sidebar "Company" item.
Route exists: `employer-panel.module.ts` line 32 loads `EmployerSettingsModule` at path
`company`. That module presumably exposes a `details` child route. Not changed in V5;
confirm the sub-route exists if regression-testing mobile nav.

### 2.4 Mobile Nav Route Correctness

All 5 mobile nav links use hardcoded `routerLink` values:

| Nav Item | routerLink | Route exists? |
|----------|-----------|---------------|
| Home | `/recruiter/dashboard` | Yes (employer-panel.module.ts line 22) |
| Jobs | `/recruiter/jobs/list` | Yes (employer-jobs.module.ts line 14) |
| Post Job | `/recruiter/jobs/create` | Yes (employer-jobs.module.ts line 16) |
| Company | `/recruiter/company/details` | Depends on employer-settings sub-routing |
| Account | `/recruiter/subscription` | Yes (employer-panel.module.ts line 44) |

All use `routerLinkActive="gh-mobile-nav-item--active"` for active state — correct Angular
directive usage. The "Post Job" item intentionally has no `routerLinkActive` (it is a CTA,
not a current-location indicator) — this is intentional per V5 comment.

---

## 3. Cross-Component Data Flow Findings

### 3.1 Dashboard Onboarding Checklist

Data source is entirely client-side: `onboardingSteps()` derives all three step states
from data already fetched by existing endpoints (`/company/dashboard` and
`/company/dashboard/pipeline-overview`). No new API calls introduced. There are no
fake counts or fake progress values — all flags are derived from real fields confirmed
in BE mappers. This is correctly implemented.

One safe concern: if `dashboard$` emits before `pipelineLoading` completes, the checklist's
third step (`done: (this.needsReviewCount || 0) > 0`) evaluates `needsReviewCount = 0`
(its initial value). The section is hidden by `*ngIf="!pipelineLoading"` so this never
shows the wrong state to users. Correct.

### 3.2 Mobile Nav Auth State

The mobile nav `<nav>` is rendered inside `*ngIf="employee$ | async as employee"`. It
is therefore only shown once the employee profile has been fetched. Unauthenticated users
see the `#panelLoading` fallback, never the nav bar. Auth state is handled correctly.

The nav bar itself contains no auth checks on individual items — all 5 items are visible
to any role-2 user who can reach the employer panel. This is appropriate for a mobile
bottom nav.

### 3.3 Signup ?role=2 Flow

`SignupComponent.ngOnInit()` reads `?role=` from `ActivatedRoute.snapshot.queryParamMap`
and patches the form's `role` FormControl when the value is `'2'` or `'3'`. The
template reads `role_validators?.value === 2` (number, not string) to toggle employer
copy. `patchValue({ role: Number(requestedRole) })` converts correctly — match is safe.

The `register()` method (line 88) calls `this.registerForm.get('role').value` and
passes it in `credentials.role` to `AuthFacade.signUp(credentials)`. The BE
`registerUser` handler (`userController.js` line 101) destructures `role` from the body
and validates it against `ALLOWED_ROLES = [2, 3]`. The role value flows end-to-end
from query param → form → store → BE.

The employer-specific copy (title, subtitle, CTA, footer sign-in link) is display-only
toggling — it does not change what the form submits. Correct.

**One cosmetic gap (P2):** The subtitle `<p class="gh-signup-subtitle">` has no
equivalent `*ngIf` guard for the applicant role — it is only shown when
`role_validators?.value === 2`, so it collapses correctly. However there is no
`gh-signup-subtitle` style for role-3 (applicant) users, and the translation key
fallback `{{ 'CREATE_ACCOUNT.CREATE_ACCOUNT_TEXT' | translate }}` for `#genericTitle`
has no employer-specific equivalent. This means the subtitle `<p>` tag is simply absent
for role-3 users, which is fine.

### 3.4 Sidebar V5 Restructure

`EmployerSidebarComponent.ngOnChanges()` (called whenever the `@Input() user` changes)
rebuilds `sidebarItems` from scratch. The sidebar makes **no API calls** — it uses only
`TranslateService` for i18n strings and the router for active-route detection.

Translation keys used:
- `JOB_POSTS_PAGE.SIDEBAR_JOB_POSTS` — pre-existing key, not V5-introduced
- `JOB_POSTS_PAGE.SIDEBAR_EXPIRED_JOBS` — pre-existing
- `CONTACTS_CANDIDATES.SIDEBAR_CANDIDATE` — pre-existing
- `ADMIN_DASHOBOARD.SIDEBAR_SUBCRIPTIONS` — pre-existing (note: typo in key name
  is pre-existing, do not "fix" it without updating translation files simultaneously)

No badge counts (unread messages etc.) are present — the V5 sidebar dropped Interviews
and does not show any numeric badges. No new API surface introduced.

---

## 4. BE Endpoint Audit

### 4.1 POST /job/create Response

`createJobs` (`jobsController.js` line 38):
- Generates `jobId` server-side via `idGenerator(6, "JB")` (line 41).
- Inserts and calls `mappedJob(rows[0])` (line 146). `mappedJob` is async and includes
  `jobId: raw.job_id`.
- Returns `{ data: mappedJob_result }` via `successMessage`.

**The response does include `jobId`** — but the FE currently ignores it (see gap 1.1).

### 4.2 PUT /job/updatejobs Response

`updateJob` (`jobsController.js` line 211):
- Returns `mappedJob(rows[0])` — same shape as create.
- Note: `mappedJob` is called without `await` on line 311 (`const dbResponse = mappedJob(rows[0])`)
  while in `createJobs` it is called without `await` as well (line 146 uses
  `successMessage.data = dbResponse` where `dbResponse = await mappedJob(rows[0])`).
  Actually line 146: `const dbResponse = await mappedJob(rows[0])` — checked, correct.
  Line 311 (updateJob): `const dbResponse = mappedJob(rows[0])` — missing `await`.
  `mappedJob` is async (it calls `getJobBadges`, `getJobArrayDetails`, etc. internally
  with `await`). Calling it without `await` means `dbResponse` is a Promise, not the
  resolved object. **This is a pre-existing bug** in the update path — the returned
  `data` field is a Promise object, not the job object. V5 navigates to the applicants
  page after update using `this.jobId` (the pre-existing query param), so the response
  shape does not affect V5 navigation. However any consumer reading `res.data.jobId`
  after an update will get `undefined` (P1, pre-existing).

### 4.3 GET /company/dashboard

Confirmed wired: `companiesRoute.js` line 37. Returns:
```json
{
  "data": { "company": {...}, "charts": {...}, "statistic": {...},
            "graph": [...], "jobViews": [...], "totalContacts": number }
}
```
Company object uses `mappedCompany()` which includes `companyLogoUrl`, `companyDetails`,
`companyCity` — all fields consumed by `companyProfileMissingFields()` in V5. Confirmed
field names match. The dashboard endpoint also calls `getUserCompany()` which itself
uses `mappedCompany()` — consistent.

### 4.4 GET /company/dashboard/pipeline-overview

Confirmed wired: `companiesRoute.js` line 38. Auth-guarded (`verifyAuth`). Returns
`{ data: { byStage: [...], needsReview: [...] } }`. Field names match FE consumption.
`getDashboardPipelineOverview` controller defensively checks for the array-not-found
case from `getUserCompany()` (line 370).

### 4.5 POST /auth/signup Role Handling

`registerUser` (`userController.js` line 100) correctly:
- Validates `ALLOWED_ROLES = [2, 3]`, rejects role=1.
- Converts to `Number(role)` before the check.
- Passes `role` (the original string from destructuring, line 101) into `dbData`.
  Note: `dbData.role = role` stores the *string* from `req.body`, not the converted
  number. If the DB column expects an integer, this may cause a type coercion. This
  is pre-existing behavior, not V5-introduced. Needs verification against DB schema.

---

## 5. Anti-Corruption Layer Gaps

### 5.1 Null/Undefined Safety

| Component | API call | Null guard | Verdict |
|-----------|---------|-----------|---------|
| CompanyDashboardComponent | `/company/dashboard` | `dashboard$ \| async` with `*ngIf`, all template bindings use `\|\| 0` / `?.` | Safe |
| CompanyDashboardComponent | `/company/dashboard/pipeline-overview` | `res?.data?.byStage \|\| []` | Safe |
| JobCreateComponent | `/job/create`, `/job/updatejobs` | Success path: no null guard on `res.data` before storing in store; effect line 89: `const job: Model.Job = res.data` (no guard, but `saveJobSuccess` just passes it through) | Acceptable |
| SignupComponent | `/auth/signup` | Success handled via `combineLatest([success$, loading$])` with `catchError` | Safe |
| EmployerApplicantsComponent | None (stub) | N/A — but when real data is added, guards will need to be added | Flag |

### 5.2 HTTP Error Handling

| Endpoint | 401 | 403 | 500 |
|----------|-----|-----|-----|
| /job/create or /job/updatejobs | Effect catchError dispatches fail action; no user-facing error message shown (P2 pre-existing) | Same | Same |
| /company/dashboard | NgRx loading$ observable; template shows skeleton forever if error (P2 pre-existing) | Same | Same |
| /company/dashboard/pipeline-overview | `pipelineError = true`, template shows "Couldn't load..." + Retry button | Correct | Correct |
| /auth/signup | `error$` subscription calls `showError()` which sets `this.error`; template shows alert banner | Correct | Correct |

The dashboard pipeline endpoint is the only V5 endpoint with a user-facing error + retry
path. All others have silent failures or loading-state deadlocks on error.

### 5.3 Raw Error Message Exposure

`showError()` in signup.component.ts (line 110) sets `this.error = err` directly, and
the template renders `[innerHtml]="error"`. If the BE returns a raw error string (e.g.
`"User is already Registered. Please login instead."`) it is shown directly. This is
pre-existing behavior and does not expose internal stack traces — the BE sends sanitized
error messages. Acceptable.

---

## 6. Recommended Fixes (Safe, Minimal)

### Fix 1 (P0) — Post-publish navigation uses stale jobId for new jobs

**File:** `src/app/job/job-create/job-create.component.ts`

After a successful publish, read `jobId` from the NgRx store (`state.selected.jobId`)
rather than from `this.jobId` (which is only populated for edit flows). The `saveJobSuccess`
action already stores the full job in `state.selected`, including `jobId` for newly
created jobs.

Minimal change — replace `afterSubmit` publish branch:
```ts
// Before (V5):
if (this.jobId) {
  this.router.navigate(['/recruiter/jobs/applicants'], { queryParams: { id: this.jobId } });
} else {
  this.router.navigateByUrl('recruiter/jobs/list');
}

// After:
this.jobFacade.jobDetails$.pipe(take(1)).subscribe(job => {
  const targetId = job?.jobId || this.jobId;
  if (targetId) {
    this.router.navigate(['/recruiter/jobs/applicants'], { queryParams: { id: targetId } });
  } else {
    this.router.navigateByUrl('recruiter/jobs/list');
  }
});
```

Add `take` to imports from `rxjs/operators`. Add `take` to the subscription to prevent
memory leak (it fires once and completes).

### Fix 2 (P0) — EmployerApplicantsComponent is an empty stub

**File:** `src/app/employer-panel/employer-applicants/employer-applicants.component.ts`
and its template.

The component must at minimum read `?id=` from the activated route and display applicants
for that job. At minimum:
```ts
ngOnInit(): void {
  this.route.queryParams.subscribe(params => {
    const jobId = params['id'];
    if (jobId) {
      this.jobFacade.getApplicants(jobId);
    }
  });
}
```
Then the template should consume `jobFacade.applicants$` to show the list. Without
this, the B05 deep-link intent (and the pre-existing `goToApplicants(jobId)` calls in
the dashboard) produce a blank screen.

### Fix 3 (P1) — updateJob missing `await` on mappedJob

**File:** `controllers/jobsController.js` line 311

```js
// Before:
const dbResponse = mappedJob(rows[0]);

// After:
const dbResponse = await mappedJob(rows[0]);
```

Without `await`, `successMessage.data` is set to a Promise instead of the resolved job
object. Any FE consumer calling `PUT /job/updatejobs` and reading `res.data.jobId` gets
`undefined`.

### Fix 4 (P2) — onboardingSteps() called twice per render cycle

**File:** `src/app/company/company-dashboard/company-dashboard.component.html`

Replace:
```html
*ngIf="!pipelineLoading && onboardingSteps(dashboard.company, dashboard.charts).length > 0"
...
*ngFor="let step of onboardingSteps(dashboard.company, dashboard.charts)"
```

With a single `ng-container` binding:
```html
<ng-container *ngIf="!pipelineLoading &&
  (onboardingSteps(dashboard.company, dashboard.charts) as steps) &&
  steps.length > 0">
  ...
  *ngFor="let step of steps"
```

Or pre-compute `steps` in the component's change detection by converting `onboardingSteps`
from a method to a getter or memoized field updated when `dashboard$` emits.

---

## Appendix: V5 File × Finding Matrix

| File | Finding | Severity |
|------|---------|---------|
| job-create.component.ts | Post-publish jobId is query-param, null for new jobs | P0 |
| employer-panel.component.html | Mobile nav routes all verified correct | Clean |
| employer-panel.component.scss | Style-only, no integration surface | Clean |
| employer-sidebar.component.ts | No API calls, translation keys pre-existing | Clean |
| company-dashboard.component.html | onboardingSteps() called twice per tick | P2 |
| company-dashboard.component.ts | Data flow correct; onboardingSteps logic real-data only | Clean |
| company-dashboard.component.scss | Style-only | Clean |
| signup.component.html | ?role=2 toggles copy correctly, form submits role | Clean |
| signup.component.scss | Style-only | Clean |
| employer-applicants.component.ts (dependency) | Empty stub — B05 destination is blank | P0 |
| jobsController.js (BE) | updateJob missing await on mappedJob | P1 |
