# GETHIRED_OPTIMIZE_RECENT_DEPLOYMENT_FIX_LOG
Scope: Application Snapshots System — Applicant Completeness View + Employer Applicant Card  
Deployment: FE 76c545e / BE faa2232  
Date: 2026-06-24  
Build status after all changes: PASS (Angular production build, zero errors)

---

## Session 1 Fixes (Employer side — prior run)

### Fix S1-1: `aria-live` region for employer snapshot loading state
**File:** `get-hired-FE/src/app/job/job-applicants/job-applicants.component.html`  
**Type:** Accessibility  
**Change:** Wrapped all snapshot content (loading + revealed data) in `<div aria-live="polite" aria-atomic="true">`. Added `role="status"` on the skeleton loading element. Screen readers now announce the transition from loading to content without interrupting the user.

### Fix S1-2: `aria-label` on employer completeness badge
**File:** `get-hired-FE/src/app/job/job-applicants/job-applicants.component.html`  
**Type:** Accessibility  
**Change:** Added `[attr.aria-label]="'Completeness level: ' + snapshotSummary.completenessLevel"` to the completeness badge. Screen readers now announce "Completeness level: strong" rather than just "strong".

### Fix S1-3: `aria-label` on employer match-level badge
**File:** `get-hired-FE/src/app/job/job-applicants/job-applicants.component.html`  
**Type:** Accessibility  
**Change:** Added `[attr.aria-label]` with human-readable label (Strong/Partial/Limited/Limited data) on the match-level badge. Screen readers now announce "Match signal strength: Strong" rather than just "strong".

### Fix S1-4: Snapshot card region label improvement
**File:** `get-hired-FE/src/app/job/job-applicants/job-applicants.component.html`  
**Type:** Accessibility (minor)  
**Change:** Updated `aria-label="Application snapshot"` to `aria-label="Application snapshot summary"` on the `role="region"` card.

---

## Session 2 Fixes (Applicant side — this run)

### Fix S2-1: `@keyframes` name collision — rename `gh-shimmer` to `gh-app-shimmer`
**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.scss`  
**Type:** Bug fix / CSS correctness  
**Root cause:** Angular's `ViewEncapsulation.Emulated` does NOT scope `@keyframes` — they leak into the global CSS scope. Both `applicant-applications.component.scss` and `job-applicants.component.scss` defined `@keyframes gh-shimmer` with different offset values (-200px vs -400px). The second to load would silently override the first.  

**Before:**
```scss
@keyframes gh-shimmer {
  0%   { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

.app-skeleton-line {
  animation: gh-shimmer 1.4s ease-in-out infinite;
}
```

**After:**
```scss
@keyframes gh-app-shimmer {
  0%   { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

.app-skeleton-line {
  animation: gh-app-shimmer 1.4s ease-in-out infinite;
}
```

The employer-side `gh-shimmer` in `job-applicants.component.scss` is left intact — it is the more complete implementation (uses `%gh-skeleton-base`, `@include ambient-motion-safe`, etc.) and is now the sole owner of that name.

---

### Fix S2-2: `aria-live` on applicant-side snapshot container
**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`  
**Type:** Accessibility  
**Root cause:** The `.app-snapshot` div renders async content after the initial page load. Without `aria-live`, screen readers would not announce the snapshot when it appeared.

**Before:**
```html
<div class="app-snapshot" *ngIf="app.jobApplicationId" role="region"
     aria-label="Application completeness snapshot">
```

**After:**
```html
<div class="app-snapshot" *ngIf="app.jobApplicationId" role="region"
     aria-label="Application completeness snapshot"
     aria-live="polite" aria-atomic="true">
```

`aria-atomic="true"` ensures the entire section is announced as a unit when it updates, rather than announcing individual sub-element changes.

---

### Fix S2-3: `trackBy` on `missingRequired` and `missingRecommended` loops
**Files:**  
- `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`  
- `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts`  
**Type:** Performance  
**Root cause:** Without `trackBy`, Angular re-creates all DOM list nodes for `missingRequired` and `missingRecommended` on every change detection cycle where the array reference changes. While `snapshotsLoaded` gates the section (it only renders once), the `trackBy` prevents unnecessary re-renders if the parent component ever re-renders or if the data is refreshed.

**HTML before:**
```html
<li *ngFor="let tip of snap.missingRequired">{{ tip.reason }}</li>
...
<li *ngFor="let tip of snap.missingRecommended">{{ tip.reason }}</li>
```

**HTML after:**
```html
<li *ngFor="let tip of snap.missingRequired; trackBy: trackByTipReason">{{ tip.reason }}</li>
...
<li *ngFor="let tip of snap.missingRecommended; trackBy: trackByTipReason">{{ tip.reason }}</li>
```

**TS added (after `snapshotFor()`):**
```ts
trackByTipReason(_index: number, tip: any): string {
  return tip?.reason ?? String(_index);
}
```

`tip.reason` is the natural stable identity for each tip item. Falls back to index for any malformed tip objects.

---

## Deferred Items

| # | Item | Reason deferred |
|---|------|-----------------|
| D1 | `jobDetails()` over-fetch on snapshot fire-and-forget path | Requires new `jobSnapshotFields()` service method; fire-and-forget path only, not on user response path |
| D2 | Composite index `(application_id, created_at)` | DB migration; low risk at current single-row-per-application volume |
| D3 | `hasAnyMatchSignal()` per CD cycle (employer) | Requires stream/async pipe refactor; negligible at typical applicant list sizes |
| D4 | `forkJoin` N concurrent snapshot calls → batched endpoint | Architectural change; acceptable at current scale |
| D5 | `ngFor, 'skill_requirements'` dead syntax in job-applicants | Pre-existing; no behavior change; cosmetic only |

---

## Build Verification

```
Command: npx ng build --configuration production
Working directory: get-hired-FE/
Result: PASS — zero TypeScript/template errors
Pre-existing warnings only:
  - autoprefixer CSS warning in add-contact-group component (unrelated)
  - xlsx CommonJS optimization bailout (pre-existing, unrelated)
Build time: ~20s
```

**Files changed in this session (Session 2):**
1. `src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` — added `trackByTipReason()`
2. `src/app/applicant-panel/applicant-applications/applicant-applications.component.html` — `aria-live`/`aria-atomic` + `trackBy` on both tip loops
3. `src/app/applicant-panel/applicant-applications/applicant-applications.component.scss` — renamed `gh-shimmer` → `gh-app-shimmer`
