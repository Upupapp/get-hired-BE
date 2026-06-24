# GetHired V5 Test Report
**Date:** 2026-06-24
**Scope:** 9 FE files changed in V5 deployment
**Build:** PASS (0 errors, 3 warnings — all pre-existing)

---

## 1. Build Result

**Status: PASS**

Command: `npx ng build --configuration production`
Build time: 27,768ms

**Warnings (3 total — all pre-existing, none introduced by V5):**
1. `add-contact-group.component.scss` — autoprefixer: `start` value has mixed support (use `flex-start`) — lines 344–345. Not a V5 file.
2. `excel-downloader.service.ts` — CommonJS dependency on `xlsx` causes optimization bailout. Not a V5 file.
3. `legend+* -> Cannot read property 'type' of undefined` — 1 autoprefixer rule skipped in CSS processing. Pre-existing.

**Errors:** 0

**Bundle sizes (no regression):**
- main chunk: 2.40 MB (within 5 MB error budget)
- styles: 485 kB (well under 150 kB component style budget; global styles are exempt)
- employer-panel module: 555 kB + 298 kB + 208 kB + 162 kB lazy chunks (no new anomalies)

---

## 2. Logic Correctness

### 2a. job-create.component.ts
File: `src/app/job/job-create/job-create.component.ts`

**Publish flow — interview questions are now optional:**

The old interview-step subscriber (lines 229–237) is commented out correctly:
```ts
// Made Interview Optional
// this.subscriptions.add(
//   this.jobForm.controls.interview.statusChanges...
//   this.interviewValid = status === 'VALID';
// );
```

The `jobInfo.statusChanges` subscriber (lines 217–227) now sets both `this.interviewValid` AND unlocks stepper step 3 (`stepperItems[3].disabled`):
```ts
this.interviewValid = status === 'VALID';
this.stepperItems[3].disabled = status != 'VALID';
```
This is correct: step 4 (Preview) is now gated on `jobInfo` being valid, not on having interview questions.

**Scenario (a) — job with no interview questions — publish OK:**
`publishJobPost()` checks `isReadyToPublish` which depends on: `jobTypeId`, `jobLevelId`, `jobCity`, `jobCountry`, `jobDescription`, `workSetupId`, and banner. Interview questions are absent from this check. Result: publishes correctly without questions.

**Scenario (b) — job with interview questions — publish OK:**
Same path. Interview questions are included via `formatJob()` which spreads `interview.value` regardless of count. No guard blocks publishing when questions are present.

**Scenario (c) — post-publish navigation:**
```ts
if (this.jobId) {
  this.router.navigate(['/recruiter/jobs/applicants'], { queryParams: { id: this.jobId } });
} else {
  this.router.navigateByUrl('recruiter/jobs/list');
}
```
`this.jobId` is populated via `this.route.queryParams.subscribe(params => { this.jobId = params.id; })` in the constructor. The route `/recruiter/jobs/applicants?id=[jobId]` is a valid route under `employer-jobs.module` (confirmed via existing applicants functionality).

**FINDING — MEDIUM — jobId is `any`, never coerced:**
`public jobId: any = null` (line 32). When navigating after a **new** job is created (not editing), `this.jobId` is null because there is no `?id=` on the create route. In this case the fallback to `jobs/list` is correct, but the employer does not land on the new job's applicant page. The facade's `success$` emits `'published'` but does not include the newly created job's ID in the event payload — so there is no way to redirect to the new job's applicant view without a backend change. This is an accepted limitation, not a V5 regression.

**FINDING — LOW — `companyId` unguarded at publish time:**
In `publishJobPost()`, the missing-field report includes a `companyId == ''` check (line 396) but `isReadyToPublish` at line 354 does not include `companyId` in its boolean expression. A publish can succeed with an empty `companyId` and the validation snackbar would not fire the company warning. Low severity: `companyId` is set from localStorage before publish is invoked in normal flow.

**FINDING — LOW — `job.jobCity != ''` and `job.jobDescription != ''` are falsy-unsafe:**
If `jobCity` or `jobDescription` is `null` or `undefined` (not empty string), the check `!= ''` evaluates to `true`, so publish may proceed even if these fields were never filled. Should use `!!job.jobCity` and `!!job.jobDescription` for robustness.

---

### 2b. company-dashboard.component.ts
File: `src/app/company/company-dashboard/company-dashboard.component.ts`

**onboardingSteps() analysis:**

```ts
onboardingSteps(company: Model.Company, charts: any): Array<{...}> {
  const hasLogo = !!(company?.companyLogoUrl);
  const hasDescription = !!(company?.companyDetails);
  const hasLocation = !!(company?.companyCity);
  const hasActiveJob = (charts?.activeJobs || 0) > 0;
  ...
}
```

All four property accesses use optional chaining (`?.`) — null-safe. ✓

Step 3 (Review applicants) uses `this.needsReviewCount` which is set from the pipeline API response:
```ts
done: (this.needsReviewCount || 0) > 0,
```
`this.needsReviewCount` defaults to `0` in the class declaration. Safe. ✓

**Auto-collapse logic:**
```ts
const allDone = steps.every(s => s.done);
return allDone ? [] : steps;
```
Returns empty array when all steps are complete; the template `*ngIf` hides the section when the array is empty. Correct. ✓

**FINDING — MEDIUM — onboardingSteps() is called twice per template tick:**
The template calls `onboardingSteps(dashboard.company, dashboard.charts)` twice:
- Line 164: in the `*ngIf` guard on the `<section>`
- Line 169: in the `*ngFor` loop

Each call rebuilds the 3-step array and the `allDone` check. This means 6 closures are allocated per change-detection cycle. With Angular's default change detection and the async pipe triggering re-renders, this will fire frequently. The performance impact is low (3 steps, no I/O) but the pattern is inconsistent with the rest of the file where `needsReviewCount` is cached as a class property precisely to avoid per-tick recomputation.

**Recommended fix:** Compute once in `ngOnInit` or in the pipeline `next` callback and store as `onboardingStepsCache: Array<...> = []`, updating when pipeline data arrives.

**FINDING — LOW — Step 3 completion logic is semantically wrong:**
```ts
done: (this.needsReviewCount || 0) > 0,
```
This marks "Review your first applicants" as **done** when there ARE applicants needing review. The intended meaning should be that the employer has previously reviewed at least one applicant (e.g. `reviewedCount > 0`). With the current logic, the step is only "done" when there's a backlog — i.e., the employer has never caught up. Once they clear all applicants, `needsReviewCount` returns to 0 and the step appears incomplete again, which will confuse returning employers who have already reviewed applicants.

This is a logic bug that cannot be fixed purely client-side without a new API field (e.g. `dashboard.charts.totalReviewed` or `dashboard.charts.hasEverReviewed`). For now, the checklist will permanently show step 3 as incomplete for any employer who keeps their queue clear.

---

### 2c. employer-sidebar.component.ts
File: `src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts`

**5 nav items after restructure:**
1. Dashboard → `route: 'dashboard'` → `/recruiter/dashboard` ✓ (registered in employer-panel.module.ts)
2. Jobs → `route: 'jobs'` → loads `employer-jobs.module` ✓
3. Candidates → `route: 'contacts'` → loads `employer-contacts.module` ✓ (rename only, route unchanged)
4. Company → `route: 'company/details'` → loads `employer-settings.module` via `company` path ✓
5. Subscription → `route: 'subscription'` → loads `employer-subscription.module` ✓

All 5 routes are registered in `employer-panel.module.ts` `const routes`. ✓

**Active-state detection (`subRouteActive` method):**
The method matches on `route.match('jobs')` for the Jobs tab, checks exact match for expired, and uses `this.location === '/recruiter/' + route` for simple routes. After the V5 restructure:
- "Candidates" uses `route: 'contacts'` so active detection resolves to `/recruiter/contacts` — correct.
- "Company" uses `route: 'company/details'` — the condition `this.location === '/recruiter/' + route` resolves to `/recruiter/company/details` which matches the actual route. ✓
- "Subscription" resolves to `/recruiter/subscription`. ✓
- Dashboard resolves to `/recruiter/dashboard`. ✓

**FINDING — INFO — `sidebarItems` built in `ngOnChanges` not `ngOnInit`:**
Items are rebuilt on every `@Input()` change. For a component that receives only `[user]`, this fires whenever the parent re-renders. Not a bug, but worth noting: if `TranslateService` returns different values on subsequent calls (language switch), the items will update correctly. If language never changes, this is a minor extra allocation per user-data update.

**FINDING — INFO — Interviews route removed but module still loaded:**
The `interview` path is still registered in `employer-panel.module.ts` (line 38). The sidebar no longer links to it, but the route exists. Not a bug — it prevents 404s if any existing links or bookmarks point there. Intentional per the V5 comments.

---

### 2d. signup.component.ts + signup.component.html

**Role param detection:**
```ts
const requestedRole = this.activatedRoute.snapshot.queryParamMap.get('role');
if (requestedRole === '2' || requestedRole === '3') {
  this.registerForm.patchValue({ role: Number(requestedRole) });
}
```
Only `'2'` and `'3'` are accepted — any other value is ignored. `Number('2')` = `2`, matching the option `[value]="2"` in the select. ✓

**Can ?role=2 be spoofed for auth bypass?**
No. The `role` field is used only to:
1. Pre-select the `<select>` dropdown
2. Control display copy (title, CTA text, subtitle)

The actual role value submitted to the backend comes from `this.registerForm.get('role').value`, which the user can change in the select at any time before submitting. There is no server-side trust of the query param; the form control value is what gets sent. A user could set `role=2` via the URL or the dropdown — both lead to the same outcome. No auth risk. ✓

**Display copy conditioned on `role_validators?.value === 2`:**
The getter `role_validators` returns `this.registerForm.get('role')` which is a `FormControl`. Accessing `.value` on a `FormControl` is always safe, even before the form is initialized — Angular initializes controls with the value passed to the builder (null in this case). Optional chaining on the getter itself (`role_validators?.value`) guards against the theoretical case where the getter returns null. ✓

**Degradation when ?role param is absent or invalid:**
- Title falls through to `#genericTitle` template. ✓
- Subtitle (`*ngIf="role_validators?.value === 2"`) is hidden. ✓
- Submit button shows generic i18n text. ✓
- Sign-in prompt shows generic i18n text. ✓

---

## 3. Template Correctness

### 3a. employer-panel.component.html — Mobile nav bar

**routerLinks:**
- `/recruiter/dashboard` ✓
- `/recruiter/jobs/list` ✓
- `/recruiter/jobs/create` ✓
- `/recruiter/company/details` ✓
- `/recruiter/subscription` ✓

All 5 routerLinks resolve to registered routes in `employer-panel.module.ts`. ✓

**Aria labels:**
All 5 `<a>` elements have `aria-label` attributes:
- `aria-label="Dashboard"` ✓
- `aria-label="Jobs"` ✓
- `aria-label="Post a job"` ✓
- `aria-label="Company profile"` ✓
- `aria-label="Subscription"` ✓

**Icons:**
All 5 SVGs carry `aria-hidden="true" focusable="false"`. ✓ Decorative icons correctly excluded from screen-reader output.

**FINDING — LOW — "Post Job" item missing `routerLinkActive`:**
The create-job item (line 43) does not have `routerLinkActive="gh-mobile-nav-item--active"`. When the user is on the create-job page, the "Post Job" tab will not receive the active color. All other 4 items have `routerLinkActive`. This is a minor visual inconsistency but not a functional bug. The `--create` modifier class gives it a persistent highlighted style regardless.

**FINDING — LOW — Nav `<nav>` sits outside `<section>` but is inside the `employee$` ngIf:**
The mobile nav is inside `*ngIf="employee$ | async as employee"` (line 1). This means the nav is invisible until the employee profile resolves. If the profile fetch is slow, mobile users see no navigation. The desktop sidebar has the same constraint (it also receives `[user]="employee"`), so this is consistent behavior — but it may be surprising on first load. Not a V5 regression.

**FINDING — INFO — No safe-area padding for notched phones in HTML:**
`env(safe-area-inset-bottom, 0px)` is applied in SCSS for the nav bar — correct. The `#sub-company-component` media query adds `padding-bottom: 72px` on mobile to prevent content being obscured. This is correct. ✓

---

### 3b. company-dashboard.component.html — Onboarding checklist

**Null safety of `*ngIf` guards:**
- `*ngIf="!pipelineLoading && onboardingSteps(dashboard.company, dashboard.charts).length > 0"` — the `dashboard` object is guaranteed non-null by the outer `*ngIf="dashboard$ | async as dashboard"` at line 2. `dashboard.company` and `dashboard.charts` may be null if the API returns them as null, but `onboardingSteps()` uses optional chaining throughout. ✓
- `*ngFor="let step of onboardingSteps(dashboard.company, dashboard.charts)"` — same protection. ✓

**Auto-collapse:**
`onboardingSteps()` returns `[]` when all done → `length > 0` is `false` → section is hidden. ✓

**Loading/error states:**
Section gated behind `!pipelineLoading` — it will not flash on screen while pipeline data is being fetched. ✓ No explicit error state guard — if `pipelineError` is true, the section could theoretically be shown with stale `needsReviewCount = 0` and incomplete company data, but since step completion uses `dashboard.company` (not pipeline data), the checklist would still render correctly with whatever data is available.

**FINDING — LOW — `step.action()` called inline in template:**
```html
(click)="step.action()"
```
Each `action` is a closure returning `void`. The template calls the closure; if `action` were undefined the click would throw. The `onboardingSteps()` method always provides an `action` for every step. ✓ But this is a fragile pattern — if a future step is added without an `action`, the error would be silent until user clicks.

**FINDING — INFO — `candidateName.charAt(0)` is unguarded in review cards:**
Line 146: `{{ applicant.candidateName.charAt(0) }}` — if `candidateName` is null or empty string from the API, this throws `TypeError: Cannot read properties of null`. The `needsReview` array comes from `res?.data?.needsReview || []`, so individual items may have null names. Recommend: `{{ applicant.candidateName?.charAt(0) || '?' }}`.

---

### 3c. signup.component.html — Employer copy

**Conditional title visibility:**
```html
*ngIf="role_validators?.value === 2; else genericTitle"
```
When role is null (not selected), `null === 2` is false → falls to `#genericTitle`. ✓
When role is 2, employer title shown. ✓
When role is 3, generic title shown. ✓

**Subtitle visibility:**
```html
*ngIf="role_validators?.value === 2"
```
Correct. Only shown for employer role. ✓

**Submit button CTA:**
```html
*ngIf="role_validators?.value === 2; else genericSubmit"
```
Both employer and generic branches handle `submitting` state correctly with separate copy. ✓

**Sign-in prompt:**
```html
*ngIf="role_validators?.value === 2" → "Already have an employer account?"
*ngIf="role_validators?.value !== 2" → i18n generic
```
When role is null, `null !== 2` is true → generic prompt shown. When role is 2, employer prompt shown. ✓

**FINDING — INFO — `aria-busy` on submit button uses string `'true'`:**
```html
[attr.aria-busy]="submitting ? 'true' : null"
```
Setting `aria-busy` to the string `'true'` is correct per the ARIA spec (attribute values are always strings). When `submitting` is false, `aria-busy` attribute is removed (null). ✓

---

## 4. Test Coverage Gaps

None of the 4 changed TypeScript components have spec files. Zero existing test coverage for V5 changes.

### Priority test cases to write:

**P1 — job-create.component.ts:**
- `publishJobPost()` with no interview questions: should call `jobFacade.saveJob()` when required fields are filled
- `publishJobPost()` with interview questions: should also call `jobFacade.saveJob()`
- `afterSubmit('published')` when `this.jobId` is set: should navigate to `/recruiter/jobs/applicants?id=[jobId]`
- `afterSubmit('published')` when `this.jobId` is null: should navigate to `recruiter/jobs/list`
- `publishJobPost()` with missing `jobCity` null (not empty string): verify current behavior (possible false positive)

**P1 — company-dashboard.component.ts:**
- `onboardingSteps()` with null company: returns 3 incomplete steps
- `onboardingSteps()` with partial company (has logo, no description): returns steps with correct `done` flags
- `onboardingSteps()` with complete company + activeJobs > 0 + needsReviewCount > 0: returns `[]` (all done)
- `onboardingSteps()` with complete company + activeJobs = 0: returns steps (not all done)
- `companyProfileMissingFields()` with null company: returns `[]`
- `companyProfileMissingFields()` with complete company: returns `[]`

**P2 — employer-sidebar.component.ts:**
- `ngOnChanges()` renders exactly 5 sidebar items
- `subRouteActive('contacts')` returns true when location is `/recruiter/contacts/list`
- `subRouteActive('company/details')` returns true when location is `/recruiter/company/details`
- `subRouteActive('subscription')` returns true when location is `/recruiter/subscription`

**P2 — signup.component.html / signup.component.ts:**
- With `?role=2` query param: form pre-populated with role=2, employer title visible
- With `?role=3` query param: form pre-populated with role=3, generic title visible
- With `?role=99` query param: form not pre-populated (invalid value ignored)
- With no role param: form not pre-populated, generic title visible

---

## 5. TypeScript Issues

### 5a. No explicit return types on public methods (strict mode concern)

The project uses `strict: true` in schematics (`angular.json`). However the `tsconfig.app.json` may not enforce `noImplicitReturns` for all public methods. Findings per file:

**job-create.component.ts:**
- `publishJobPost()`: no return type annotation. Returns `void` implicitly. ✓ acceptable
- `formatJob(status)`: `status` parameter has no type (`any` inferred). Low severity.
- `afterSubmit(event)`: `event` parameter untyped. Low severity.
- `onLoad(isLoading)`: `isLoading` untyped. Low severity.

**company-dashboard.component.ts:**
- `onboardingSteps(company: Model.Company, charts: any)`: `charts` typed as `any`. The return type is annotated inline. Acceptable but `charts` should be typed.
- `companyProfileMissingFields(company: Model.Company): string[]`: fully typed. ✓

**employer-sidebar.component.ts:**
- `subRouteActive(route)`: `route` parameter untyped. Returns `boolean` implicitly. Low severity.
- `changeRoute(route)`: `route` untyped. Low severity.

**signup.component.ts:**
- `register(event)`: `event` untyped. Low severity.
- `showError(err: any)`: typed as `any`. Low severity.

### 5b. Null/undefined access risks

**FINDING — MEDIUM — `candidateName.charAt(0)` unguarded:**
`company-dashboard.component.html` line 146. If API returns a `needsReview` item with `candidateName: null`, Angular throws at render time. Fix: `{{ applicant.candidateName?.charAt(0) || '?' }}`.

**FINDING — LOW — `companyId` parsed from localStorage without null guard:**
`job-create.component.ts` line 120:
```ts
this.companyId = JSON.parse(user).companyId;
```
If `user` is null (no localStorage entry), `JSON.parse(null)` returns `null`, and accessing `.companyId` on null throws. The `asyncLocalStorage.getItem` wrapper resolves even when the value is null. This pre-existed V5 but is in the same file.

**FINDING — LOW — `publishJobPost()` falsy-unsafe string checks:**
Lines 358–360:
```ts
job.jobCity != '' &&
job.jobCountry != '' &&
job.jobDescription != ''
```
These pass when values are `null` or `undefined` because `null != ''` is `true`. Should be `!!job.jobCity && !!job.jobCountry && !!job.jobDescription` or checked with `?.trim()`.

---

## 6. Recommended Fixes (Prioritized)

### P1 — Fix `candidateName.charAt(0)` null crash
**File:** `src/app/company/company-dashboard/company-dashboard.component.html` line 146
**Change:**
```html
<!-- Before -->
<span class="emp-dash-review-initials" aria-hidden="true">{{ applicant.candidateName.charAt(0) }}</span>
<!-- After -->
<span class="emp-dash-review-initials" aria-hidden="true">{{ applicant.candidateName?.charAt(0) || '?' }}</span>
```
**Risk:** Zero. Pure defensive template guard.

### P2 — Fix onboarding step 3 "done" semantics
**File:** `src/app/company/company-dashboard/company-dashboard.component.ts` line 165
**Issue:** Step 3 is "done" when `needsReviewCount > 0`, which is backwards.
**Short-term fix** (client-side only): mark as done when `needsReviewCount === 0 && !pipelineLoading && !pipelineError` — meaning "you have no pending applicants (queue is clear)". This is not semantically perfect but avoids the permanent-incomplete state.
```ts
done: !this.pipelineLoading && !this.pipelineError && this.needsReviewCount === 0,
```
**Better fix (requires BE):** Add `dashboard.charts.hasReviewedApplicants: boolean` to the dashboard API response. Until that's available, either the short-term fix or suppress step 3 entirely.

### P3 — Cache `onboardingSteps()` result as a class property
**File:** `src/app/company/company-dashboard/company-dashboard.component.ts`
Move the result to a class property `onboardingSteps: Array<...> = []`, compute it in `loadPipelineOverview().next()` callback (when both pipeline and dashboard data are available). Remove the method calls from the template; reference the property directly.

### P3 — Add `routerLinkActive` to the "Post Job" mobile nav item
**File:** `src/app/employer-panel/employer-panel.component.html` line 43
Add `routerLinkActive="gh-mobile-nav-item--active"` for visual consistency when the user is on the create-job page. (The `--create` style override can be preserved alongside it.)

### P3 — Fix falsy-unsafe string checks in `publishJobPost()`
**File:** `src/app/job/job-create/job-create.component.ts` lines 358–360
```ts
// Before
job.jobCity != '' &&
job.jobCountry != '' &&
job.jobDescription != ''
// After
!!job.jobCity &&
!!job.jobCountry &&
!!job.jobDescription
```

### P4 — Write unit tests for V5 logic
No spec files exist for any of the 4 changed TypeScript components. See Section 4 for priority test cases. Start with `onboardingSteps()` (pure function, easy to unit test) and `afterSubmit()` navigation branches in `job-create`.

---

## Summary

| Category | Finding | Severity | Fix Required |
|---|---|---|---|
| Build | PASS, 0 errors, 3 pre-existing warnings | — | No |
| job-create | Interview questions correctly removed from publish gate | — | — |
| job-create | Post-publish navigation correct when editing existing job | — | — |
| job-create | New job creation cannot redirect to new job's applicant page (no jobId from BE) | Low | No (accepted limitation) |
| job-create | `jobCity`/`jobDescription` null != '' passes falsely | Low | P3 |
| job-create | `companyId` not in publish gate boolean | Low | P3 |
| dashboard | `candidateName.charAt(0)` crashes on null | Medium | P1 |
| dashboard | Step 3 "done" logic semantically backwards | Medium | P2 |
| dashboard | `onboardingSteps()` called twice per tick | Low | P3 |
| sidebar | All 5 routes valid and registered | — | — |
| sidebar | Active-state detection correct for renamed routes | — | — |
| mobile nav | All 5 routerLinks valid, aria-labels present | — | — |
| mobile nav | "Post Job" missing `routerLinkActive` | Low | P3 |
| signup | `?role=2` detection safe, no auth risk | — | — |
| signup | All fallback states correct when role absent/invalid | — | — |
| Tests | Zero spec files for all 4 changed TS components | High | P4 |
