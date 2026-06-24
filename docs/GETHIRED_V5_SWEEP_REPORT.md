# GETHIRED V5 SWEEP REPORT

**Date:** 2026-06-24  
**Scope:** 9 FE files changed in the V5 deployment  
**Overall verdict:** CONDITIONAL PASS — no P0 issues; 2 P1s, 4 P2s, 3 P3s

---

## Executive Summary

V5 ships four meaningful improvements: mobile bottom nav (B02), optional interview questions (B04), post-publish applicants redirect (B05), and the onboarding checklist (B07). All four are functionally correct. No route is broken. No data integrity breach was introduced.

Two P1 issues require attention before the next push:

1. **`onboardingSteps()` is called twice per change-detection cycle** — the template calls the method directly inside `*ngIf` and again inside `*ngFor` on the same value, causing two independent array builds per tick. With Angular's default change detection this recalculates on every mouse move. Memoize or bind to a field.
2. **Step 3 of the checklist ("Review your first applicants") has an inverted done-condition** — `done: (this.needsReviewCount || 0) > 0` marks the step as done when there _are_ pending applicants, but semantically "Review your first applicants" should be done when at least one application has ever been received (or reviewed), not while they're still waiting. The current logic means the step disappears once reviewCount drops to zero _before_ any application ever arrived, and re-appears once applicants arrive — the opposite of a checklist.

---

## 1. Route Integrity

### 1.1 Post-publish route — `/recruiter/jobs/applicants?id=X`

**Status: PASS**

Route exists and is guarded. Evidence chain:

- `app.routing.module.ts` mounts `/recruiter` → `EmployerPanelModule` with `canActivate: [AuthGuard]` and `data: { role: '2' }`.
- `AuthGuard.checkUserLogin()` checks `localStorage.state === 'true'` and validates the role string. Wrong role redirects; unauthenticated redirects to `/signin`. Role-2 gate is enforced.
- `employer-panel.module.ts` registers `/recruiter/jobs` → `EmployerJobsModule`.
- `employer-jobs.module.ts` registers `{ path: 'applicants', component: EmployerApplicantsComponent }`.
- `EmployerApplicantsComponent` is a single-line shell: `<app-job-applicants></app-job-applicants>`.
- `JobApplicantsComponent` reads `params.id` from query params in its constructor. Route fully resolves.

**Minor concern (P3):** If `afterSubmit()` fires before the facade's `success$` emits a new jobId for a brand-new job (i.e., `this.jobId` is still `null` because the job was created, not edited), the fallback branch `navigateByUrl('recruiter/jobs/list')` runs. The `this.jobId` value is set from query params at construction time, so for a new-create flow (no `?id=` in URL) the fallback always fires. This is acceptable behaviour but should be noted so employers know the redirect lands on the list, not the new job. See P3 #1 in the Open Issues table.

### 1.2 Interview route still alive after sidebar removal

**Status: PASS**

- `employer-panel.module.ts` retains: `{ path: 'interview', loadChildren: () => import('./employer-interview/employer-interview.module') }`.
- The route is not removed — only the sidebar entry is. `/recruiter/interview` still loads `EmployerInterviewComponent` for bookmarked users.
- B03 (implement the interview page) is still open in backlog.

### 1.3 Mobile nav vs sidebar alignment

**Status: MINOR MISMATCH (P2)**

Mobile nav has 5 items. Sidebar has 5 items. But the items do not fully align:

| Position | Mobile nav route | Mobile nav label | Sidebar item | Sidebar route |
|----------|-----------------|-----------------|--------------|---------------|
| 1 | `/recruiter/dashboard` | Home | Dashboard | `dashboard` |
| 2 | `/recruiter/jobs/list` | Jobs | Jobs | `jobs` |
| 3 | `/recruiter/jobs/create` | Post Job | — (no sidebar item) | — |
| 4 | `/recruiter/company/details` | Company | Company | `company/details` |
| 5 | `/recruiter/subscription` | Account | Subscription | `subscription` |
| — | — | — | Candidates | `contacts` |

The mobile nav omits Candidates (`/recruiter/contacts`) entirely and substitutes a "Post Job" shortcut that has no sidebar equivalent. This is a deliberate design choice (shortcuts vs menus), but it means Candidates is unreachable from mobile without deep-linking or knowing the URL. If this is intentional, document it. If not, Candidates should replace or augment one of the mobile nav slots.

Also: mobile nav item 4 uses the label "Company" but routes to `/recruiter/company/details`. This matches the sidebar's `company/details` route, which resolves correctly to `EmployerCompanyComponent` (confirmed via `employer-settings.module.ts`). No breakage, but the aria-label on the nav item reads "Company profile" while the label text reads "Company" — minor aria inconsistency.

### 1.4 Signup redirect after employer creation

**Status: PASS — routes to `/verify?mode=registered`, not directly to recruiter panel**

`SignupComponent.openVerification()` always navigates to `../verify?mode=registered`. There is no role-based fork at signup success — both employer (role=2) and applicant (role=3) land on the verify screen. The employer-specific copy in the form is cosmetic only; post-submit flow is identical. This is correct: the user must verify email before the auth guard will let them into `/recruiter`.

---

## 2. State and Data Integrity

### 2.1 onboardingSteps() — dual call problem (P1)

In `company-dashboard.component.html`:

```html
*ngIf="!pipelineLoading && onboardingSteps(dashboard.company, dashboard.charts).length > 0"
```
and:
```html
*ngFor="let step of onboardingSteps(dashboard.company, dashboard.charts)"
```

`onboardingSteps()` is a pure-ish method called twice per cycle. Angular's default change detection calls the template binding on every event (mouse, keyboard, timers). Each call builds a fresh array with 3 step objects and closures. On a typical dashboard load with 2–3 API responses arriving, this fires 6–12 times minimum.

**Fix:** Bind the result to a component property and call it once in `ngOnInit` and after pipeline data arrives. Or make it a getter backed by a memoized field.

### 2.2 Step 3 done-condition is semantically inverted (P1)

```typescript
{
  title: 'Review your first applicants',
  done: (this.needsReviewCount || 0) > 0,
  ...
}
```

`needsReviewCount` is the number of applicants currently in `statusId === 1` (pending) or `statusId === 3` (under review). This means:

- When 0 applicants are pending: `done = false` → step shows as incomplete.
- When ≥1 applicant is pending: `done = true` → step shows as complete.
- When all applicants are reviewed/moved: `done = false` → step re-appears as incomplete.

The checklist step should track "has the employer ever received an applicant" or "has the employer ever reviewed an applicant" — not the current pending count. A persistent counter from the backend, or using `byStage.reduce((sum, s) => sum + s.count, 0) > 0` (total applications ever, not just pending), would be more accurate.

**Current behaviour:** An employer who has reviewed all their applicants sees this step as "not done" again, which is confusing and counterproductive. The section may also refuse to auto-collapse if `needsReviewCount` drops to 0 after having been > 0, but other steps are done — need to test.

### 2.3 Auto-collapse logic correctness

**Status: PASS (with caveats)**

The section hides when `onboardingSteps().length === 0`, which happens only when `allDone === true`. `allDone` requires all three steps' `done` flags to be `true`. Due to the bug in §2.2, the third step can oscillate between true and false. In practice, the section may never fully collapse for active employers.

### 2.4 Null safety on dashboard data

**Status: PASS**

- `company?.companyLogoUrl`, `company?.companyDetails`, `company?.companyCity` — all use optional chaining.
- `charts?.activeJobs` — optional chaining used throughout the template.
- `dashboard.company` could be `null` if the API returns no company (new employer). `companyProfileMissingFields()` handles this with `if (!company) { return []; }`.
- `onboardingSteps()` also uses `company?.companyLogoUrl` etc., safe.
- `byStage` initialised to `[]`; `needsReview` initialised to `[]`; both safe for `*ngFor`.
- `pipelineBarMax` initialised to `1` (avoids divide-by-zero in the bar height calculation `stage.count / pipelineBarMax`).
- `needsReview[0]?.jobId` in the Action Center — uses optional chaining, safe.
- `applicant.candidateName.charAt(0)` in the review list — **not guarded**. If `candidateName` is `null` or `undefined` (e.g., partial data from BE), this throws. (P2 — pre-existing risk, not V5-introduced, but exposed by the review section V5 depends on.)

### 2.5 companyId null race in job-create

**Status: PRE-EXISTING P2 (not V5-introduced)**

`this.companyId` is populated inside an async callback:
```typescript
this.asyncLocalStorage.getItem('user').then(user => {
  this.companyId = JSON.parse(user).companyId;
  ...
});
```
If the user is very fast and calls `publishJobPost()` before this resolves, `companyId` is `undefined`, `job.companyId` is `undefined`, and `job.companyId == ''` evaluates to `false` (undefined == '' is false in JS), so the "missing company" check does NOT fire and the job is sent to the BE with no companyId. This is a pre-existing race; V5 did not change it but did not fix it either.

---

## 3. Regression Risks

### 3.1 Removing interview questions as a publish blocker

**Status: ACCEPTABLE RISK — no data integrity breach found**

The `publishJobPost()` condition now requires: `jobTypeId`, `jobLevelId`, `jobCity`, `jobCountry`, `jobDescription`, `workSetupId`, and banner. Interview questions are no longer required.

Backend review of `get-hired-BE` shows no job-publish endpoint validation that asserts `interviewQuestions.length > 0`. The interview questions flow through a separate `interviewController.js` and are stored relationally — jobs without questions are valid BE-side. The applicants flow (`job-applicants.component.ts`) handles zero interview questions gracefully (question list is empty, not an error state). No downstream system was found that hard-requires questions on a published job.

**One concern (P3):** The stepper UI in `job-create` still shows "Create Interview" as step 3 and "Preview Job Post" as step 4. The UI communicates to employers that interview is a required step, even though it is now skippable at publish. The step name and its position in the stepper may mislead employers into thinking they must complete it. The stepperItems array still includes `title: "Create Interview"` as item index 2. Consider renaming it "Add Interview (optional)" or moving to a non-linear flow — currently a UX lie. (P2)

### 3.2 Contacts → Candidates rename

**Status: NO BREAKAGE**

- The route is unchanged: sidebar entry with `title: 'Candidates'` still routes to `/recruiter/contacts`. All sub-routes (`/recruiter/contacts/list`, `/recruiter/contacts/groups`, `/recruiter/contacts/candidates`) are unchanged.
- Deep links to `/recruiter/contacts/**` continue to work.
- Any existing bookmarks, emails, or internal links using the old path are unaffected.
- The `subRouteActive()` method in the sidebar still matches on `'contacts'` string — works.

**One issue (P3):** The sidebar active-state check for the Candidates item uses `location?.match(item?.route)`, where `item.route = 'contacts'`. This matches the string `contacts` anywhere in the URL, including potential future URLs like `/recruiter/contacts-export`. Not a V5 regression but a latent fragility.

### 3.3 Company Profile → Company rename

**Status: NO BREAKAGE**

- Route `company/details` unchanged in `employer-settings.module.ts`.
- Sidebar item changed from `title: 'Company Profile'` to `title: 'Company'` with `route: 'company/details'`. No route change.
- Mobile nav item 4 routes to `/recruiter/company/details` — same route. Correct.
- `goToCompanyProfile()` in `company-dashboard.component.ts` still navigates to `/recruiter/company/details`. Correct.

### 3.4 Mobile nav bar — layout conflicts

**Status: PASS (minor)**

- Fixed `position: fixed; bottom: 0; z-index: 999` — sits above page content.
- `@media (max-width: 767px)` adds `padding-bottom: 72px` to `#sub-company-component` to prevent content being hidden behind the bar. This correctly matches the Bootstrap `md` breakpoint.
- `env(safe-area-inset-bottom, 0px)` applied for iOS notch. Correct.
- `d-flex d-md-none` hides it on desktop. Correct.
- Sidebar is `d-none d-md-block`. The two never appear simultaneously. No conflict.
- The mobile nav sits inside the `*ngIf="employee$ | async as employee"` block, so it inherits the same auth gate as the panel. No unauthenticated render risk.
- **Note (P3):** If any page within the employer panel uses `position: fixed` elements near the bottom (e.g. snackbars, FABs), `z-index: 999` on the nav bar may overlap them. Angular Material snackbars use `z-index: 1000` by default, so they should sit above. Not a bug, but worth monitoring.

---

## 4. Backlog Status Delta

### Items addressed in V5

| Item | Title | Status |
|------|-------|--------|
| B02 | Mobile bottom nav | SHIPPED — 5-item mobile nav bar |
| B04 | Make interview questions optional | SHIPPED — condition removed from `publishJobPost()` |
| B05 | Post-publish route to job-level view | SHIPPED — navigates to `/recruiter/jobs/applicants?id=X` |
| B07 | Onboarding checklist UI | SHIPPED — 3-step checklist in dashboard |
| B08 | prefers-reduced-motion | PARTIALLY SHIPPED — CSS `@media (prefers-reduced-motion: reduce)` blocks present in dashboard SCSS and signup SCSS; Angular animations (`mainAnimations`) not yet gated |

### Items still open (not addressed in V5)

| Item | Title | Priority |
|------|-------|----------|
| B01 | Global messages route | P1 |
| B03 | Implement /recruiter/interview page | P1 |
| B06 | Pipeline bar click to filtered list | P2 |
| B09 | Sidebar keyboard nav and ARIA | P2 |
| B10 | inviteApplicant() | P3 |
| B11 | Company profile completeness backend score | P3 |
| B12 | Job quality readiness panel | P2 |
| B13 | Job sharing CTA | P2 |
| B14 | Draft auto-save | P3 |
| B15 | Analytics instrumentation | P3 |

---

## 5. Per-File Findings

### File 1: job-create/job-create.component.ts

**B04 implementation (lines 350–405):** Correct. The condition checks 7 required fields. Interview is no longer in the list. The commented-out `interview.statusChanges` subscription (lines 230–237) is already present, not a V5 addition — consistent with the approach.

**B05 implementation (lines 464–469):** Navigates to `/recruiter/jobs/applicants` with `{ queryParams: { id: this.jobId } }`. Correct. Falls back to `recruiter/jobs/list` if `this.jobId` is null.

**Issue — new-job fallback always fires (P3):** For a job being created for the first time (no `?id=` in URL), `this.jobId` is `null` at construction time and never updated from the facade's response. The navigation after publish always falls back to the list. The `afterSubmit` handler does not capture the newly-assigned jobId from the BE response. Backlog item B05's acceptance criteria says "navigate to the new job's applicant view" but the new jobId is not currently surfaced from `jobFacade.success$`.

**Console.log leaks (lines 131, 322, 347, 348, 409):** Multiple `console.log` calls including `console.log('Secret')` in sidebar (noted separately). Not V5-introduced but not removed. Low risk; should be cleaned before production.

**Subscription leak risk:** `loading$` is subscribed in the field initializer (`subscribe(this.onLoad.bind(this))`) and never unsubscribed. This is a pre-existing issue, not V5-introduced.

**interviewValid flag (lines 222–224):** When `jobInfo.statusChanges` fires VALID, both `interviewValid` and `stepperItems[3].disabled` are set as if the interview step passed too. This means the "Preview Job Post" step unlocks when job info is valid, regardless of interview step state. This is the correct V5 behaviour (interview optional), and it's implemented via the jobInfo subscription, not the (now commented-out) interview subscription. Logic is sound but tightly coupled.

---

### File 2: employer-panel/employer-panel.component.html

**Mobile nav (lines 20–71):** Well-structured. `aria-label` on `<nav>`, `aria-hidden` on SVGs, `focusable="false"` on SVGs. `routerLinkActive` binding for active state. `min-width: 44px; min-height: 44px` touch targets via SCSS.

**Issue — aria-label mismatch (P3):** Mobile nav item 4 has `aria-label="Company profile"` but the visible label is "Company". Screen readers will announce "Company profile" while sighted users see "Company". The sidebar also says "Company" (V5 renamed it). The aria-label should match: `aria-label="Company"`.

**"Post Job" item (line 43):** Has no `routerLinkActive` binding, which is correct (a CTA, not a nav destination). The item also has a custom `--create` class for distinct styling. This is intentional and correct.

**panelLoading fallback (lines 77–89):** Correctly handles `employee$` not yet emitting. The `panelError` template is new and appropriate.

---

### File 3: employer-panel/employer-panel.component.scss

**Mobile nav styles (lines 95–161):** Clean. `env(safe-area-inset-bottom)` for iOS. `@media (max-width: 767px)` padding-bottom on `#sub-company-component`. `outline: none` on `.gh-mobile-nav-item` is counteracted by `:focus-visible` — correct progressive enhancement.

**Issue — `overflow-y: none` on lines 24, 36 (P3):** `overflow-y: none` is not a valid CSS value; `none` is not in the `overflow` spec. The valid values are `auto`, `hidden`, `scroll`, `visible`, or `clip`. Browsers silently treat unknown values as `visible`, so this is functionally a no-op. Not a V5 bug, but it's in the file and worth fixing.

---

### File 4: employer-sidebar/employer-sidebar.component.ts

**Restructure (lines 68–118):** 5 items confirmed. Comments accurately describe backward compat intent. `ngOnChanges` is used to set `sidebarItems` — appropriate since `user` is an `@Input()`.

**Issue — `console.log('Secret')` at line 46:** Debug log remains in production code. Should be removed.

**Issue — missing `ngOnChanges` input changes guard (P3):** `ngOnChanges` rebuilds the full `sidebarItems` array on every input change, including non-`user` input changes. With `@Input() sidebarWidth` also present, any parent binding update triggers a full rebuild. Acceptable performance cost given 5 items, but could be gated with `if (changes['user'])`.

**Translate calls in `ngOnChanges`:** `this.translate.instant(...)` is called synchronously inside `ngOnChanges`. If translations are loaded asynchronously (via ngx-translate's loader), the first render may show empty strings until translations arrive and a subsequent `ngOnChanges` fires. This is a pre-existing pattern; not V5-introduced.

---

### File 5: company-dashboard/company-dashboard.component.html

**Onboarding section (lines 157–190):** Conditionally rendered via `*ngIf`. The `onboardingSteps()` method is called twice per cycle (once in `*ngIf`, once in `*ngFor`). See §2.1 for the P1 impact.

**`companyProfileMissingFields()` called via `*ngIf ... as missingFields`:** This is a single call per cycle (the `as missingFields` alias prevents re-evaluation). Correct pattern.

**`step.action()` call in template (line 184):** Arrow functions stored on step objects call router methods. These closures capture `this` from the component. This is safe in Angular since the component lives as long as the template. Correct.

---

### File 6: company-dashboard/company-dashboard.component.ts

**`onboardingSteps()` (lines 138–173):** Pure in intent but impure in practice — reads `this.needsReviewCount` (instance state), so it's not truly idempotent. See §2.1 and §2.2.

**`pipelineBarMax = Math.max(1, ...this.byStage.map(s => s.count))` (line 89):** Correct — avoids divide-by-zero, ensures bars render even with zero-count stages. But `Math.max(1, ...emptyArray)` returns `1` when `byStage` is empty, which is correct.

**`needsReviewCount` calculation (lines 86–88):** Counts `statusId === 1` (pending) + `statusId === 3` (under review). This is the source of the §2.2 semantics bug for the checklist.

**`loadPipelineOverview()` (lines 79–97):** Independent from `dashboard$`. Error state correctly isolated: `pipelineError` does not affect the dashboard KPI widgets. Correct.

---

### File 7: company-dashboard/company-dashboard.component.scss

**SCSS quality:** Clean. Uses `%skeleton-base` placeholder for DRY shimmer animation. Responsive breakpoints at 767px and 575px are consistent with mobile nav breakpoint.

**Animation (lines 498–507):** `emp-hero-reveal` and `emp-card-reveal` use `opacity` and `transform` — GPU-composited, safe.

**Reduced-motion block (lines 661–673):** Comprehensive. Covers hero, review cards, onboarding steps, skeletons, cards, and kpis. Correct.

**`@import "~assets/styles/motion"` (line 2):** Tilde import alias — depends on webpack config. If the project migrates away from webpack/angular-cli's tilde resolution, this breaks. Pre-existing pattern.

**Missing: `emp-dash-onboarding` not in the reduced-motion block for `.emp-dash-pipeline-bar` transition.** The pipeline bar has `transition: background 0.18s ease, min-height 0.3s ease` (line 350–351), and the pipeline stage cards have `transition` on the bar background on hover. The reduced-motion block disables `.emp-dash-pipeline-stage { transition: none }` but does so by disabling the wrapper stage, not the bar itself. The bar's own transition property is on `.emp-dash-pipeline-bar`, which is not separately targeted in the reduced-motion block. Minor — the hover transition is short but is not fully suppressed. (P3)

---

### File 8: auth/signup/signup.component.html

**Employer-specific copy (lines 71–79):** `role_validators?.value === 2` — correct. The `role_validators` getter returns `this.registerForm.get('role')`, which is a `FormControl`. `.value` is the selected option. Options are `[value]="2"` and `[value]="3"` (number, not string). The comparison `=== 2` is correct.

**`role_validators?.value === 2` on submit button (lines 229–239):** Same condition, same correctness. The submit button's ARIA `aria-busy` binding (`[attr.aria-busy]="submitting ? 'true' : null"`) is correct — null removes the attribute when not busy.

**Employer sign-in link (lines 243–244):** "Already have an employer account? Sign in" — shown only when role=2. The generic login prompt is shown for role≠2. Correct. Both link to `/signin`.

**Issue — `role_validators?.value !== 2` (line 246):** The generic login prompt shows for applicants (role=3), unselected (null), or any other value. This is correct. However, an employer who deselects their role after selecting it will see the generic prompt again, while the title switches back to generic. Consistent.

---

### File 9: auth/signup/signup.component.scss

**`.gh-signup-subtitle` (lines 463–469):** Correct. Scoped class. Font-family Manrope consistent with the rest of the app.

**`.btn-submit` override (lines 471–478):** The file contains two `.btn-submit` selectors (lines 327 and 471). The second adds `transform` to the transition. In SCSS this will compile to two separate CSS rules for `.btn-submit` — the browser will merge them, with later declarations winning for duplicate properties. The first rule has `transition: all 0.4s ease !important`. The second rule adds `transform 100ms ...` to transition. Because of `!important` in the first rule's transition, the second override will be ignored for the `transition` property. The `gh-pressable` micro-scale transform may not fire on the submit button.

**Issue — `!important` on transition blocks V5 motion enhancement (P2):** The existing `.btn-submit:hover` rule uses `transition: all 0.1s ease !important` which overrides the V5 addition of `transition: transform 100ms ...` in the second block. The `@media (prefers-reduced-motion: reduce)` block in the second selector also targets `.btn-submit` but may not win against the `!important`. The gh-pressable scale effect on the submit button likely does not work. Safe to fix by merging both `.btn-submit` blocks.

---

## 6. Open Issues Table

| ID | Severity | File(s) | Description | Fix effort |
|----|----------|---------|-------------|------------|
| V5-01 | P1 | company-dashboard.component.html/.ts | `onboardingSteps()` called twice per CD cycle — causes 2× array rebuild and closure allocation on every event | Bind result to a component field; call once in `ngOnInit` + after `loadPipelineOverview` resolves |
| V5-02 | P1 | company-dashboard.component.ts | Onboarding step 3 done-condition is inverted — marks "done" when applicants are waiting, "not done" when they've been reviewed | Replace `needsReviewCount > 0` with `byStage.reduce((s, x) => s + x.count, 0) > 0` or a persistent "ever had applicants" flag |
| V5-03 | P2 | employer-panel.component.html | Mobile nav omits Candidates link — unreachable from mobile without direct URL | Add Candidates item or document omission as intentional |
| V5-04 | P2 | employer-panel.component.html | `aria-label="Company profile"` on mobile nav item 4 doesn't match visible label "Company" | Change to `aria-label="Company"` |
| V5-05 | P2 | job-create.component.ts | Post-publish redirect always falls back to jobs list for new-create flow because `this.jobId` is not populated from the BE response for a newly created job | Capture jobId from the save response in the facade's `success$` payload and pass it into `afterSubmit` |
| V5-06 | P2 | signup.component.scss | Two `.btn-submit` blocks; first has `transition: all 0.4s ease !important` which overrides V5's motion enhancement block | Merge into one `.btn-submit` block; replace `!important` with specificity |
| V5-07 | P2 | job-create.component.ts | Stepper still shows "Create Interview" as a required-looking step 3 even though interview is now optional | Rename to "Add Interview (optional)" or add "(Optional)" suffix |
| V5-08 | P3 | company-dashboard.component.html | `applicant.candidateName.charAt(0)` — no null guard; throws if candidateName is null/undefined | `(applicant.candidateName || '?').charAt(0)` |
| V5-09 | P3 | job-create.component.ts | `this.jobId` is never updated from the newly created job's response — post-publish always redirects to list for new jobs | See V5-05 |

---

## 7. Recommended Fixes (Safe, Minimal)

### Fix 1 — V5-01: Memoize onboardingSteps (P1, XS effort)

In `company-dashboard.component.ts`:
```typescript
// Add field
onboardingStepsList: Array<{ title: string; desc: string; cta: string; done: boolean; action: () => void; }> = [];

// Call after each data update
private refreshOnboardingSteps(): void {
  if (!this.pipelineLoading) {
    this.dashboard$.pipe(take(1)).subscribe(dash => {
      if (dash) {
        this.onboardingStepsList = this.onboardingSteps(dash.company, dash.charts);
      }
    });
  }
}
```

Then in the template, replace `onboardingSteps(dashboard.company, dashboard.charts)` with `onboardingStepsList` (bound once, not recalculated per tick).

Alternatively: keep the method but assign in `ngOnInit` after both `companyFacade.dashboard$` and pipeline load are complete.

### Fix 2 — V5-02: Fix step 3 done-condition (P1, XS effort)

In `company-dashboard.component.ts`, replace:
```typescript
done: (this.needsReviewCount || 0) > 0,
```
with:
```typescript
done: this.byStage.reduce((sum, s) => sum + s.count, 0) > 0,
```
This marks the step as done as soon as any applicant has ever arrived in any pipeline stage, which persists even after they are reviewed or moved.

### Fix 3 — V5-04: Fix aria-label (P2, XS effort)

In `employer-panel.component.html` line 53, change:
```html
aria-label="Company profile"
```
to:
```html
aria-label="Company"
```

### Fix 4 — V5-06: Merge btn-submit SCSS (P2, XS effort)

In `signup.component.scss`, remove the duplicate `.btn-submit` block at lines 471–478 and merge the `transform` transition into the existing rule at line 327. Remove `!important` from the transition property so the reduced-motion override can win.

### Fix 5 — V5-07: Rename interview step (P2, XS effort)

In `job-create.component.ts` line 71, change:
```typescript
title: "Create Interview",
```
to:
```typescript
title: "Add Interview (optional)",
```

### Fix 6 — V5-08: Guard candidateName (P3, XS effort)

In `company-dashboard.component.html` line 147:
```html
<span class="emp-dash-review-initials" aria-hidden="true">{{ (applicant.candidateName || '?').charAt(0) }}</span>
```

---

*End of GETHIRED V5 SWEEP REPORT*
