# GetHired V5 OPTIMIZE Report
**Date:** 2026-06-24  
**Scope:** 9 FE files changed in the V5 deployment  
**Auditor:** Claude Code (claude-sonnet-4-6)

---

## Applied Fixes

### FIX 1 — Remove layout-triggering `min-height` from pipeline bar transition
**File:** `src/app/company/company-dashboard/company-dashboard.component.scss`  
**Line:** 350–351

| | Before | After |
|---|---|---|
| transition | `background 0.18s ease, min-height 0.3s ease` | `background 0.18s ease` |

**Reason:** `min-height` transitions are not GPU-compositable — they trigger layout (reflow) on every animation frame. The bar height is driven by `[style.height.%]` binding, which is already not animated. Only the background color hover state needed a transition. Removing `min-height` eliminates the layout cost entirely.  
**Risk:** None. The bar still resizes correctly (the height binding is untouched); only the animated-resize-on-hover behaviour is removed, which was never visible anyway since `min-height` only changes on hover in the old pipeline-bar hover rule (which doesn't exist — it's a static property).

---

### FIX 2 — Add `.emp-dash-pipeline-bar` to `prefers-reduced-motion` block
**File:** `src/app/company/company-dashboard/company-dashboard.component.scss`  
**Line:** ~670 (inside the `@media (prefers-reduced-motion: reduce)` block)

| | Before | After |
|---|---|---|
| missing rule | (pipeline bar not covered) | `.emp-dash-pipeline-bar { transition: none; }` added |

**Reason:** The `@media (prefers-reduced-motion: reduce)` block at the bottom of the file suppressed transitions on action cards, KPI cards, and pipeline stages, but NOT on the pipeline bar itself. The bar's `background 0.18s ease` transition remained active for reduced-motion users.  
**Risk:** None.

---

### FIX 3 — Memoize `onboardingSteps()` — was called twice per CD cycle
**Files:**  
- `src/app/company/company-dashboard/company-dashboard.component.ts`  
- `src/app/company/company-dashboard/company-dashboard.component.html`

**Before (HTML lines 164, 169):**
```html
*ngIf="!pipelineLoading && onboardingSteps(dashboard.company, dashboard.charts).length > 0"
*ngFor="let step of onboardingSteps(dashboard.company, dashboard.charts)"
```

**After (HTML lines 164, 169):**
```html
*ngIf="!pipelineLoading && cachedOnboardingSteps.length > 0"
*ngFor="let step of cachedOnboardingSteps; trackBy: trackOnboardingStep"
```

**TS changes:**
- Added `cachedOnboardingSteps` property (initialized to `[]`)
- Added private `_lastDashboardCompany` / `_lastDashboardCharts` fields
- Added private `_refreshOnboardingCache()` method that updates the property
- Added `tap()` operator to `dashboard$` pipe to store latest company/charts and call `_refreshOnboardingCache()`
- Added call to `_refreshOnboardingCache()` at the end of pipeline `next` handler (after `needsReviewCount` is set, so the "review your first applicants" step reflects real data)
- Added `tap` to `import { map, tap } from 'rxjs'`

**Reason:** `onboardingSteps()` creates new arrays and objects on every call. Angular's default change detection (CheckAlways) runs on every async event (mouse move, HTTP response, router event, etc.). With two template calls, the method ran N×2 times per second during active use, allocating GC pressure. By caching the result as a component property and refreshing it only when the underlying data changes, we eliminate all redundant calls.

**Why the cache is correct:** The result of `onboardingSteps()` depends on three things: `company` (from `dashboard$`), `charts.activeJobs` (from `dashboard$`), and `needsReviewCount` (from the pipeline API). The cache is refreshed once when `dashboard$` emits (via `tap`) and once when the pipeline response arrives (the second caller). Both are the only moments the result can change.

**Risk:** Low. The `onboardingSteps()` method itself is unchanged and remains callable. The cache initializes to `[]` so the section is hidden (correct) until both data sources have resolved.

---

### FIX 4 — Add `trackBy` to `*ngFor` loops
**File:** `src/app/company/company-dashboard/company-dashboard.component.html`  
**File (TS):** `src/app/company/company-dashboard/company-dashboard.component.ts`

Three loops now have trackBy:

| Loop | trackBy function | Key used |
|---|---|---|
| `*ngFor="let stage of byStage"` | `trackByStageId` | `stage.statusId` |
| `*ngFor="let applicant of needsReview"` | `trackByApplicationId` | `applicant.applicationId` |
| `*ngFor="let step of cachedOnboardingSteps"` | `trackOnboardingStep` | `index` |

**Reason:** Without `trackBy`, Angular destroys and recreates all DOM nodes in a `*ngFor` list on every change detection cycle where the array reference changes. The pipeline and review lists are replaced wholesale when the API returns, causing unnecessary DOM churn. `trackBy` lets Angular reuse existing DOM nodes.

The onboarding step trackBy uses `index` because the list is always length 0–3, items are stable within a session, and there is no natural unique id.  
**Risk:** None.

---

### FIX 5 — Declare `OnDestroy` interface on `EmployerSidebarComponent`
**File:** `src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts`  
**Line:** class declaration

| Before | After |
|---|---|
| `implements OnInit` | `implements OnInit, OnDestroy` |
| `import { Component, Input, OnInit, HostListener }` | `import { Component, Input, OnInit, OnDestroy, HostListener }` |

**Reason:** `ngOnDestroy()` was already present and correctly unsubscribes `this.req` (the router events subscription). However, the interface was not declared. Under `strictMetadataEmit` or strict compiler mode, this is a type error. More practically, if the method is ever renamed or removed by accident, the compiler cannot catch it without the interface.  
**Risk:** None — no behaviour change. The `ngOnDestroy` body is unchanged.

---

### FIX 6 — Remove unused imports from `EmployerSidebarComponent`
**File:** `src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts`

| Removed | Reason |
|---|---|
| `ActivatedRoute` from `@angular/router` | Imported but never injected or referenced anywhere in the class |
| `EmployeeFacade` from `@main/employee/state/employee.facade` | Same — imported, never used |

**Reason:** Dead imports add to bundle analysis noise and slow down compilation on some build setups. Neither was used anywhere in the component class or template.  
**Risk:** None.

---

### FIX 7 — Remove `console.log` debug calls from sidebar
**File:** `src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts`  
**Lines:** 46–47 (in `ngOnInit`)

```ts
// Before:
console.log('Secret')
console.log(this.user);

// After: removed (replaced with explanatory comment)
```

**Reason:** Production console output leaks user object structure to browser dev tools, aids reconnaissance, and creates noise in error monitoring tools.  
**Risk:** None.

---

## Deferred Findings (not applied)

### D1 — `companyProfileMissingFields()` called once per CD cycle via `*ngIf` alias
**File:** `company-dashboard.component.html` line 41  
**Severity:** Low  
**Detail:** `*ngIf="companyProfileMissingFields(dashboard.company) as missingFields"` runs once per CD cycle but the result is aliased and reused within the `ng-container` block (not called again). This is the correct pattern. The cost is one array allocation per cycle. A stricter fix would cache this alongside `cachedOnboardingSteps`, but the single call is already much cheaper than the double `onboardingSteps()` call fixed above. Defer until performance profiling shows it as a hotspot.  
**Approach if needed:** Add `cachedMissingFields: string[]` property, refresh in `_refreshOnboardingCache()` (same trigger points), and replace `companyProfileMissingFields(dashboard.company)` in the template with `cachedMissingFields`.

---

### D2 — Mobile nav `outline: none` removes default focus ring
**File:** `src/app/employer-panel/employer-panel.component.scss` line 125  
**Severity:** Low (accessibility)  
**Detail:** `.gh-mobile-nav-item { outline: none; }` removes the browser default focus ring. A `:focus-visible` rule does exist and provides a custom ring, so keyboard users are not completely without feedback. However, some browsers and AT combinations rely on `:focus` rather than `:focus-visible`. The safest pattern is `outline: none` on `:focus` (legacy) while keeping `:focus-visible`, but not removing the default at the element level.  
**Approach:** Change `outline: none` at the base level to nothing (remove it), and keep only the `:focus-visible` rule. Or add `:focus:not(:focus-visible) { outline: none; }` to suppress the ring only for mouse clicks while preserving it for keyboard.  
**Why deferred:** Behaviour change to a new component — needs manual testing on mobile + desktop keyboard.

---

### D3 — `changeRoute()` in sidebar still has `console.log(route)`
**File:** `src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts` line 127  
**Severity:** Low  
**Detail:** `changeRoute(route)` logs every sidebar navigation to the browser console. Not removed in FIX 7 because `changeRoute` is not a V5-added method (it predates the V5 diff), and the task scope is V5 changes only.  
**Approach:** Remove the `console.log(route)` line in a general cleanup pass.

---

### D4 — Hero reveal animation not behind `will-change`
**File:** `src/app/company/company-dashboard/company-dashboard.component.scss` line 33  
**Severity:** Low  
**Detail:** `.emp-dash-hero-inner` uses `animation: emp-hero-reveal 0.5s ...` which animates `opacity` and `transform`. Both are GPU-compositable (correct). The browser will promote the layer automatically for the animation duration. No `will-change` hint is needed here. No action required.

---

### D5 — Skeleton shimmer is an `infinite` animation
**File:** `src/app/company/company-dashboard/company-dashboard.component.scss` line 461  
**Severity:** Low  
**Detail:** `animation: emp-shimmer 1.4s ease-in-out infinite` runs as long as the skeleton is visible. This is intentional and acceptable for skeleton loaders (they are shown only while loading). The `prefers-reduced-motion` block already sets `animation: none` for all three skeleton classes. No action needed.

---

### D6 — `job-create.component.ts` has `console.log` calls in production paths
**File:** `src/app/job/job-create/job-create.component.ts` lines 131, 320, 347–348, 409  
**Severity:** Low  
**Detail:** Multiple `console.log` calls remain (e.g. `console.log(data)`, `console.log(this.questions)`, `console.log('YOUR JOB')`, `console.log(this.jobForm.controls)`). These predate V5 and are out of scope for this audit's safe-fix criteria (V5-only changes). Flag for a general cleanup pass.

---

### D7 — `loading$` subscription assigned at field init time in `job-create.component.ts`
**File:** `src/app/job/job-create/job-create.component.ts` line 89–91  
**Severity:** Low  
**Detail:** `loading$ = this.jobFacade.getJobLoading$.pipe().subscribe(this.onLoad.bind(this))` creates a subscription at field initialization time (before `ngOnInit`) and stores it as a `Subscription` in a field named `loading$` (misleading — it is not an Observable). This subscription is NOT added to `this.subscriptions` and would not be cleaned up by `ngOnDestroy`. However, `getJobLoading$` is a store selector that typically completes with the store, so in practice leaks are unlikely. Pre-V5, out of scope for safe-fix. Recommend adding to `this.subscriptions` in a cleanup pass.

---

## Summary

| # | File | Type | Status |
|---|---|---|---|
| FIX 1 | company-dashboard.component.scss | CSS perf — remove layout-triggering transition | Applied |
| FIX 2 | company-dashboard.component.scss | CSS a11y — add reduced-motion rule for pipeline bar | Applied |
| FIX 3 | company-dashboard.component.ts/.html | Angular CD — memoize onboardingSteps() | Applied |
| FIX 4 | company-dashboard.component.ts/.html | Angular CD — trackBy on 3 ngFor loops | Applied |
| FIX 5 | employer-sidebar.component.ts | TypeScript — declare OnDestroy interface | Applied |
| FIX 6 | employer-sidebar.component.ts | Bundle — remove 2 unused imports | Applied |
| FIX 7 | employer-sidebar.component.ts | Security — remove console.log(user) | Applied |
| D1 | company-dashboard.component.html | CD cost — companyProfileMissingFields once/cycle | Deferred (low) |
| D2 | employer-panel.component.scss | A11y — outline:none on mobile nav | Deferred (needs testing) |
| D3 | employer-sidebar.component.ts | Debug log in changeRoute | Deferred (pre-V5) |
| D4 | company-dashboard.component.scss | will-change on hero animation | N/A (no action needed) |
| D5 | company-dashboard.component.scss | Infinite shimmer animation | N/A (correctly gated) |
| D6 | job-create.component.ts | console.log calls | Deferred (pre-V5) |
| D7 | job-create.component.ts | Unmanaged loading$ subscription | Deferred (pre-V5, low risk) |

**Files modified:** 4  
- `src/app/company/company-dashboard/company-dashboard.component.ts`  
- `src/app/company/company-dashboard/company-dashboard.component.html`  
- `src/app/company/company-dashboard/company-dashboard.component.scss`  
- `src/app/employer-panel/employer-sidebar/employer-sidebar.component.ts`
