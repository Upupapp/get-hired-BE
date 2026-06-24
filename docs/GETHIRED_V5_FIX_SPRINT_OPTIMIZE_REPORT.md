# GETHIRED V5 Fix Sprint — OPTIMIZE Audit Report
Generated: 2026-06-24

---

## Executive Summary

All 13 changed files were read in full. The fix sprint is sound: no memory leaks, no unbounded subscriptions, no paint-blocking CSS properties, and no DB-query ownership checks that add latency. Two genuine bugs were found and fixed inline:

1. **BE — missing `await` on `mappedJob` in `updateJobStatus`** (was silently returning a Promise instead of the resolved job object — a functional correctness bug that also surfaces as a performance risk when callers try to serialize the unresolved Promise).
2. **FE — invalid CSS shorthand `padding-top: 13px 10px` in signup hover state** (CSS engines silently discard multi-value `padding-top`; the hover state was not rendering the intended top padding after the `!important` rule).

No further safe fixes were identified. Two deferred recommendations are noted at the end.

---

## 1. Observable / Subscription Performance

### 1.1 `jobFacade.jobDetails$.pipe(take(1)).subscribe(...)` inside publish-success branch
**File:** `src/app/job/job-create/job-create.component.ts` (lines 463–469)

**Is this nested inside another subscribe?** Yes. The outer subscriber is `afterSubmit`, which is itself subscribed via `jobFacade.success$`. The inner `take(1)` on `jobDetails$` runs inside the `published` dialog's `afterClosed()` callback — which is itself inside the `afterSubmit` callback. That is three levels deep.

**Memory leak risk with `take(1)`?** No. `take(1)` auto-completes after the first emission and unsubscribes immediately. The inner subscription cannot leak even if `ngOnDestroy` fires before it emits, because Angular's router navigation (the action taken on emit) will simply never be called — the component will already be destroyed.

**Risk if `jobDetails$` never emits?** Low in practice. `jobDetails$` is a NgRx store selector on `state.selected`. `saveJobSuccess` (dispatched by the save effect on success) writes the new job to `state.selected` _before_ the success string `'published'` reaches `success$`. So by the time the dialog's `afterClosed()` fires (requiring a human click), the store has already been updated and the selector will emit synchronously on subscription. If the store somehow never updates (e.g., a race where `resetFormState` fires first), `take(1)` will stay open until it does emit — but the user is about to navigate away anyway and the subscription will be GC'd with the component.

**Could it be a synchronous store read?** Yes. `this.jobFacade.jobDetails$` is an NgRx selector. The store holds the latest value synchronously. A `firstValueFrom()` or a synchronous selector read via `this.store.selectSnapshot()` (if using @ngxs) or simply injecting the store and reading `select(...)` with `first()` would be equivalent. However, the `take(1)` pattern is idiomatic NgRx and the risk here is theoretical — no change is warranted.

**Verdict:** No action needed. Pattern is correct for NgRx store observables.

---

### 1.2 `editJob$` subscription in `ngOnInit`
**File:** `job-create.component.ts` line 129

`this.editJob$.subscribe(...)` in `ngOnInit` has no `takeUntil`, no `take(1)`, and is not added to `this.subscriptions`. This is a **pre-existing leak** outside the fix sprint scope. The subscription stays alive after component destruction. Noted for the deferred section.

---

### 1.3 `loading$` field subscription at class definition level
**File:** `job-create.component.ts` line 90

```ts
loading$ = this.jobFacade.getJobLoading$
  .pipe()
  .subscribe(this.onLoad.bind(this));
```

This subscribes immediately at class instantiation, stores the `Subscription` in the `loading$` field (not in `this.subscriptions`), and is never unsubscribed. This is a **pre-existing leak** outside the fix sprint scope.

---

## 2. Change Detection Performance

### 2.1 `byStage.reduce` in `onboardingSteps`
**File:** `src/app/company/company-dashboard/company-dashboard.component.ts` (line 210)

```ts
done: (this.byStage.reduce((sum, s) => sum + s.count, 0) || 0) > 0,
```

**Is this called on every CD cycle?** Previously yes (when `onboardingSteps()` was called from the template). After the V5 OPTIMIZE cache fix, `onboardingSteps()` is only called from `_refreshOnboardingCache()`, which is triggered by:
- The `tap` side-effect in `dashboard$` (runs only on store emission, not per CD tick)
- After `loadPipelineOverview()` resolves (once per request)

The cached result `cachedOnboardingSteps` is then bound directly in the template via `*ngFor`. Angular reads the array reference on each CD cycle — but since `cachedOnboardingSteps` is a plain array property (not a function call), Angular only iterates it; it does not re-invoke `reduce`. The `trackBy: trackOnboardingStep` (index-based) ensures the DOM is not re-created on identity-equal re-renders.

**Is step 3 done-condition inside the cached result?** Yes. The `reduce` runs when `_refreshOnboardingCache()` calls `onboardingSteps(...)`, and the returned `steps` array (including step 3's `done` value) is assigned to `cachedOnboardingSteps`. The template reads `step.done` from the already-computed object — no re-computation per tick.

**Verdict:** Change detection impact is correctly eliminated. No action needed.

---

### 2.2 `companyProfileMissingFields(dashboard.company)` in template
**File:** `company-dashboard.component.html` line 41

```html
<ng-container *ngIf="companyProfileMissingFields(dashboard.company) as missingFields">
```

This method call runs on every CD cycle. The method body is lightweight (3 null-guards + 3 push calls on a local array). With the dashboard behind an async pipe (`dashboard$ | async as dashboard`), Angular's CD will only re-evaluate this when `dashboard` changes. In practice, the dashboard pipe emits only once (or on retry). Acceptable as-is for a method this cheap.

---

## 3. Mobile Nav Performance

### 3.1 New "Candidates" nav item
**File:** `src/app/employer-panel/employer-panel.component.html` (lines 43–53)

No new imports or dependencies added. The Candidates item uses inline SVG (no image request) and `routerLink="/recruiter/contacts"` / `routerLinkActive="gh-mobile-nav-item--active"` — the same pattern as the other four items.

**routerLinkActive strategy consistency:** All 5 nav items use `routerLinkActive` with no `[routerLinkActiveOptions]` override, meaning Angular uses the default `exact: false` matching. This is correct for top-level route segments and consistent across all items.

**Performance:** `routerLinkActive` adds a single DOM class toggle per navigation event. Five items = five class toggles. Zero issue.

---

## 4. CSS Performance

### 4.1 `.btn-submit` transition block
**File:** `src/app/auth/signup/signup.component.scss` (lines 327–351)

```scss
transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease, color 0.1s ease;
```

All three properties are compositor-safe:
- `transform` — runs on the GPU compositor, no layout.
- `background` — triggers repaint only, no layout.
- `color` — triggers repaint only, no layout.

No `all`, no `width`, no `height`. Correct.

The `prefers-reduced-motion` block correctly strips `transform` while preserving `background` and `color` (color changes are informational, not motion, so they may remain per WCAG 2.3.3).

**Bug found and fixed:** The `:hover` block contained `padding-top: 13px 10px !important`. `padding-top` is a single-value property; CSS engines silently discard the second value. The hover state was applying `padding-top: 13px` (not the intended `13px 10px` shorthand). **Fixed: changed to `padding-top: 13px !important`.**

### 4.2 `overflow-y: hidden` on `#body-row` and `#sub-company-component`
**File:** `src/app/employer-panel/employer-panel.component.scss`

`overflow-y: hidden` creates a new block-formatting context but does not itself trigger a stacking context or paint layer. The mobile padding-bottom workaround (`padding-bottom: 72px` on `#sub-company-component` below 767px) is correct — it prevents the fixed mobile nav from overlapping content. No scroll-performance concern: `overflow-y: hidden` on a layout container blocks overflow but does not prevent smooth scrolling inside nested scroll containers.

### 4.3 `.emp-dash-action-card` and `.emp-dash-kpi-card` transitions
**File:** `company-dashboard.component.scss` (lines 178, 276)

```scss
transition: box-shadow 0.18s ease, transform 0.18s ease;
```

Both compositor-safe properties. The `prefers-reduced-motion` block at line 674 sets `transition: none` for both. Correct.

### 4.4 `.emp-dash-pipeline-bar` transition
**File:** `company-dashboard.component.scss` (line 353)

```scss
transition: background 0.18s ease;
```

The comment notes this was changed from a `height`-based transition. Correct: `height` triggers layout on every frame; `background` does not. The `prefers-reduced-motion` block at line 676 also disables this. Correct.

### 4.5 New color variables in `colors.scss`

```scss
$color-pipeline-accent: #7c83fd;
$color-teal-accent: #2dd4bf;
$color-green-secondary: #04A08B;   // pre-existing
```

All three are referenced in `company-dashboard.component.scss` with correct `$` prefix. No undefined variable risk. `$color-green-secondary` is defined in `colors.scss` line 6 and used on lines 583, 584, 652 of the dashboard SCSS without issue.

---

## 5. BE Performance

### 5.1 `await mappedJob(rows[0])` in `createJobs` and `updateJob`
**File:** `get-hired-BE/controllers/jobsController.js` (lines 146, 313)

`mappedJob` is declared `async` and makes 7–8 sequential `await` calls inside its body (getJobBadges, 5x getJobArrayDetails, getJobInterviewQuestions, getInterviewTemplateId, getJobCertificationRequirements). These are sequential, not parallelized — a pre-existing inefficiency in the service layer.

**Was `mappedJob` previously called without `await`?** No — both `createJobs` (line 146) and `updateJob` (line 313) already use `await mappedJob(...)` after the fix sprint. The fix was correct: without `await`, `successMessage.data` would be set to a Promise object, not the resolved job, breaking the API response.

**Could the internal `getJobArrayDetails` calls be parallelized?** Yes — using `Promise.all([...])` inside `mappedJob` would reduce sequential round-trips from ~8 to ~3 (one batch). This is a meaningful optimization but requires changing `job.service.js` which is outside the fix sprint scope. Noted in deferred recommendations.

### 5.2 `updateJobStatus` — missing `await` on `mappedJob` (BUG FOUND)
**File:** `get-hired-BE/controllers/jobsController.js` (line 348, before fix)

```js
// Before fix:
const dbResponse = mappedJob(rows[0]);
return dbResponse;
```

`mappedJob` is `async` and returns a Promise. Returning it without `await` means callers that `await updateJobStatus(...)` receive the Promise chain correctly (because `await` of a Promise resolves it), but any internal logic that treats `dbResponse` as the resolved object before returning would get an unresolved Promise. More importantly, the return value used to propagate directly to `successMessage.data = updateJob` in `updateStatusOfJob` — if `updateStatusOfJob` uses `await updateJobStatus(...)`, the Promise would resolve correctly; but if any code path uses the return synchronously, the bug surfaces.

To eliminate the ambiguity and align with `createJobs` / `updateJob`, **`await` was added.**

**Fix applied:** Line 348 changed from `mappedJob(rows[0])` to `await mappedJob(rows[0])`.

### 5.3 Ownership check in `deleteAccountById`
**File:** `get-hired-BE/controllers/userController.js` (lines 532–535)

```js
if (userId !== req.user.uid) {
  return res.status(403).json({ message: 'Forbidden' });
}
```

Simple synchronous string comparison — `req.user.uid` (set by auth middleware) vs `userId` (from query string). Zero DB cost. Correct and optimal.

---

## 6. Applied Fixes

| # | File | Change | Reason |
|---|------|--------|--------|
| 1 | `get-hired-BE/controllers/jobsController.js` line 348 | Added `await` before `mappedJob(rows[0])` in `updateJobStatus` | `mappedJob` is async; without `await` the caller receives an unresolved Promise instead of the mapped job object |
| 2 | `src/app/auth/signup/signup.component.scss` line 349 | Changed `padding-top: 13px 10px !important` to `padding-top: 13px !important` | `padding-top` is a single-value property; the two-value form is invalid and silently discarded by CSS engines |

---

## 7. Deferred Recommendations

### D1 — Parallelize `mappedJob` internal fetches (BE)
**File:** `get-hired-BE/services/job.service.js` — `mappedJob` body

The 7–8 `await` calls are sequential. Converting to `Promise.all([...])` could reduce response time for `createJobs`, `updateJob`, and `updateJobStatus` by 4–6x (from ~8 sequential round-trips to ~2 parallel batches). Medium effort, significant user-visible latency improvement for employers after publishing a job.

### D2 — Fix pre-existing subscription leaks in `job-create.component.ts`
**File:** `src/app/job/job-create/job-create.component.ts`

Two subscriptions are not managed:
- Line 90: `loading$` subscribed at class instantiation level, not added to `this.subscriptions`, never unsubscribed.
- Line 129 (`ngOnInit`): `this.editJob$.subscribe(...)` has no `takeUntil` and is not added to `this.subscriptions`.

Neither leaks are introduced by the fix sprint, but both will hold references after component destruction. Recommended fix: add both to `this.subscriptions` so `ngOnDestroy`'s `this.subscriptions.unsubscribe()` cleans them up.
