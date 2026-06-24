# GETHIRED_OPTIMIZE_RECENT_DEPLOYMENT_REPORT
Scope: Application Snapshots System — Applicant Completeness View + Employer Applicant Card  
Deployment: FE 76c545e / BE faa2232  
Date: 2026-06-24  
Auditor: OPTIMIZE command (recent deployment mode)

---

## Session history

**Session 1 (prior):** Employer-side audit — `job-applicants.component.html` + `job-applicants.component.scss`. Applied: `aria-live`, badge `aria-label`s, snapshot card region label. Build: PASS.

**Session 2 (this run):** Applicant-side audit — `applicant-applications.component.ts/html/scss`. Applied: `@keyframes` name collision fix, `aria-live` on snapshot container, `trackBy` on tip loops. Build: PASS.

---

## 1. Performance Audit

### 1.1 `snapshotFor()` method calls per change-detection cycle

**Finding: ACCEPTABLE — single Map.get(), called twice per row max.**

`snapshotFor(app.jobApplicationId)` is called at most twice per row per CD cycle:
- Once for `*ngIf="snapshotFor(app.jobApplicationId) as snap"` (the outer guard)
- Once resolved via the `as snap` alias for inner bindings (no second method call — the `as` alias captures the result once)

`Map.get()` is O(1). With typical applicant list sizes (under 50 applications), the total cost per CD cycle is negligible. No memoization needed.

**Note:** Angular's default `Zone.js` triggers change detection on any async event (HTTP, setTimeout, DOM events). Because `snapshotsLoaded` gates the inner template, the `snapshotFor()` call only evaluates when `snapshotsLoaded` is true — after which the map is frozen (no further writes). The cost is bounded.

**Verdict:** No optimization needed. The pattern is correct.

### 1.2 `*ngIf="snapshotFor(id) as snap"` with null values

**Finding: CORRECT — null → `#snapSilent` branch.**

When `snapshotsMap.has(id)` is true but value is `null` (API error / catchError path), `snapshotFor()` returns `null`. Angular's `*ngIf ... as snap` evaluates the falsy null, renders `#snapSilent` (empty), and shows nothing. This is the intended "silent failure" behavior documented in the template comment.

**Edge case verified:** If `snapshotsMap.has(id)` is false (app was filtered out in `loadSnapshots`), `Map.get()` returns `undefined`, and `?? null` normalizes it to null. Same result: `#snapSilent`.

### 1.3 `forkJoin` over N snapshot calls

**Finding: EFFICIENT — all N calls parallel, unblocked by order.**

`loadSnapshots()` uses `forkJoin(calls)` which fires all N HTTP requests concurrently and resolves when all complete. `snapshotsLoaded` is set to true only then. This is correct: the template shows a single skeleton (not N skeletons) until all are ready.

**Acceptable trade-off:** For a user with 20+ applications, N=20 concurrent snapshot calls fire at once. At current scale this is fine. If scale requires it, a batched endpoint could replace this, but that is an architectural change beyond this scope.

---

## 2. @keyframes Name Collision

**Finding: REAL BUG — two `@keyframes gh-shimmer` definitions in global CSS scope.**

Angular's `ViewEncapsulation.Emulated` scopes class selectors to component shadow DOM (using `_ngcontent-xxx` attribute selectors), but `@keyframes` are NOT scoped — they compile into the global CSS scope. Both files defined:

```scss
@keyframes gh-shimmer { ... }
```

- `applicant-applications.component.scss` — used -200px / calc(200px + 100%) offsets
- `job-applicants.component.scss` — used -400px / 400px offsets (different values)

Whichever loaded last would win globally, potentially breaking the shimmer animation on the component that loaded first.

**Fix applied:** Renamed in `applicant-applications.component.scss` to `gh-app-shimmer` and updated the `animation:` reference. The employer-side `gh-shimmer` is left intact (it is the more complete implementation with `%gh-skeleton-base`, `ambient-motion-safe`, etc.).

---

## 3. Accessibility Audit

### 3.1 `aria-live` on async snapshot container (applicant side)

**Finding: MISSING — added.**

The `.app-snapshot` div loaded async content after the initial page render, but had no `aria-live` attribute. Screen readers would not announce the snapshot when it appeared.

**Fix applied:** Added `aria-live="polite" aria-atomic="true"` to the `.app-snapshot` container.

Note: The employer-side snapshot card had this fixed in Session 1 (pre-existing fix in the current file state).

### 3.2 Level badges — text equivalents

**Finding: ADEQUATE — both color and text are present.**

The completeness-level badge renders `{{ snap.completenessLevel | titlecase }}` (visible text) alongside the color class. Color is NOT the sole conveyor of meaning. `[attr.aria-label]` is already present on the badge (`'Completeness level: ' + snap.completenessLevel`), so screen readers get both context and value.

**Additional finding:** The `incomplete` level now renders as "Getting started" via an inline ternary (pre-applied by linter pass), which is more user-friendly than the raw internal label.

### 3.3 Loading skeleton announcement

**Finding: ADEQUATE — `role="status"` and `aria-label` already present.**

The skeleton div has `role="status" aria-label="Loading application snapshot"`. With the `aria-live="polite"` added to its parent (Fix 3.1 above), screen readers will correctly announce the loading state.

---

## 4. Angular Template Pattern Audit

### 4.1 `*ngFor trackBy` on tip loops

**Finding: MISSING — added.**

Both `*ngFor="let tip of snap.missingRequired"` and `*ngFor="let tip of snap.missingRecommended"` lacked `trackBy`. Without it, Angular re-creates all DOM nodes in the list on every change detection cycle where the reference changes.

**Fix applied:** Added `trackBy: trackByTipReason` to both loops, with a new component method:
```ts
trackByTipReason(_index: number, tip: any): string {
  return tip?.reason ?? String(_index);
}
```

`tip.reason` is the natural stable identity (the string explaining what is missing). Falls back to index for any tip without a reason field.

### 4.2 `*ngFor="let tag of job?.tags, 'skill_requirements'"` in job-applicants

**Finding: PRE-EXISTING SYNTAX — no change.**

The `'skill_requirements'` literal in the `ngFor` expression is dead syntax (it has no effect in Angular's `ngFor` directive). It is pre-existing and not introduced by this deployment. Removing it would change no behavior. Deferred as it is out of scope.

---

## 5. SCSS Audit

### 5.1 `@import "src/assets/styles/colors"` path

**Finding: CORRECT — established project convention.**

Over 60 component SCSS files in the project use this exact import path. Angular's SCSS loader resolves it from the workspace root (`src/`). The file exists at `src/assets/styles/colors.scss`. No issue.

### 5.2 `@keyframes gh-shimmer` conflict (see §2 above)

**Fixed** — renamed to `gh-app-shimmer` in the applicant component.

### 5.3 `@keyframes` in global scope vs. component scope

**Finding: Note for future work.**

`@keyframes gh-snapshot-fadein` (employer side, `job-applicants.component.scss`) and `@keyframes app-snapshot-fadein` (applicant side, post-linter pass) use distinct names — no collision. The naming convention (`gh-` prefix for employer, `app-` prefix for applicant) is now consistent.

---

## 6. Employer Card Residual Issues Audit

**Finding: NO RESIDUAL CONFLICTS from prior BRAND/OPTIMIZE agent edits.**

`job-applicants.component.html` (employer side) was reviewed for conflicts:
- `aria-live="polite"` wrapper is present and correct (added in Session 1)
- Badge `aria-label` bindings on both completeness and match-level badges: present and correct
- `role="region" aria-label="Application snapshot summary"` on the card: present and correct
- `gh-snapshot-skeleton` / `gh-skeleton-line` / `gh-skeleton-badge` classes: all defined in `job-applicants.component.scss`
- `@keyframes gh-shimmer` in `job-applicants.component.scss`: retained, now distinct from the renamed `gh-app-shimmer` in applicant side

No duplicate keyframe collision remains in the codebase.

---

## 7. Summary of Findings (Both Sessions)

| # | Finding | Severity | Session | Action |
|---|---------|----------|---------|--------|
| 1 | `@keyframes gh-shimmer` defined in 2 component SCSS files — global scope collision | Medium | 2 | Fixed (renamed applicant to `gh-app-shimmer`) |
| 2 | `aria-live` missing on applicant-side snapshot container | Low/a11y | 2 | Fixed |
| 3 | `trackBy` missing on `missingRequired`/`missingRecommended` `ngFor` loops | Low/perf | 2 | Fixed |
| 4 | `aria-live` missing on employer-side snapshot loading state | Low/a11y | 1 | Fixed (prior session) |
| 5 | `aria-label` missing on completeness + match badges (employer) | Low/a11y | 1 | Fixed (prior session) |
| 6 | `snapshotFor()` called multiple times per row | Info | 2 | No action — O(1) Map.get(), acceptable |
| 7 | `*ngIf ... as snap` with null return | Info | 2 | Verified correct — null → `#snapSilent` |
| 8 | `forkJoin` N concurrent HTTP calls | Low | 2 | Acceptable at current scale; deferred batch endpoint |
| 9 | `jobDetails()` over-fetch on snapshot fire-and-forget path | Medium/perf | 1 | Deferred — requires new service method |
| 10 | No composite index `(application_id, created_at)` | Low/perf | 1 | Deferred — low risk at current volume |
| 11 | `hasAnyMatchSignal()` method call per CD cycle | Low/perf | 1 | Deferred — negligible at current list sizes |
| 12 | `ngFor, 'skill_requirements'` dead syntax (pre-existing) | Info | 2 | Deferred — no behavior change |
