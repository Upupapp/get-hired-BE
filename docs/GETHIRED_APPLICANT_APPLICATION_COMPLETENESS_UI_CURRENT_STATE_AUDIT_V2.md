# GetHired — Applicant Application Completeness UI: Current State Audit V2

**Date:** 2026-06-24  
**Command:** GETHIRED_APPLICANT_APPLICATION_COMPLETENESS_VIEW_HISTORY_BADGE_NUDGES_TECHY_V2  
**Phase:** 1 — Mandatory Audit

---

## 1. Files Audited

| File | Path | Status |
|------|------|--------|
| applicant-applications.component.ts | src/app/applicant-panel/applicant-applications/ | EXISTS — batch loading with forkJoin/50-ID chunking |
| applicant-applications.component.html | src/app/applicant-panel/applicant-applications/ | EXISTS — inline snapshot badge + card |
| applicant-applications.component.scss | src/app/applicant-panel/applicant-applications/ | EXISTS — shimmer, reveal, tip styles |
| application.service.ts | src/app/application/ | EXISTS — both single + batch endpoints |
| shared.module.ts | src/app/shared/ | EXISTS — 24 components declared |
| colors.scss | src/assets/styles/ | EXISTS — coral brand tokens |
| _motion.scss | src/assets/styles/ | EXISTS — motion tokens + mixins |

---

## 2. What Already Exists

### TypeScript (applicant-applications.component.ts)
- `snapshotsMap: Map<string, any>` — keyed by jobApplicationId
- `snapshotsLoaded: boolean` — global loaded flag (one flag for all batches)
- `appsSub` + `snapshotsSub` — properly unsubscribed in `ngOnDestroy`
- `loadSnapshots()` — 50-ID chunking via forkJoin; per-batch catchError returns `{}`
- `snapshotFor(id)` — O(1) map lookup
- `trackByTipReason(_index, tip)` — proper trackBy for tip lists
- `retry()` — clears map, resets flags, calls `ngOnInit()` directly (minor issue)

### HTML (applicant-applications.component.html)
- Skeleton: 3-element skeleton (medium line + 2 badge placeholders + short line)
- `hasSnapshot: false` state: italic grey text for pre-deployment applications
- `hasSnapshot: true` state: percentage + Bootstrap badge with `ngClass` level colouring
- `missingRequired` tips: amber left-border block + routerLink CTA
- `missingRecommended` tips: blue left-border block (no CTA)
- `disclaimerNote` + `privacyNote`: two-tone grey micro text
- `#snapSilent` template: "Snapshot unavailable right now." soft fallback
- `aria-live="polite"` + `aria-atomic="true"` on the snapshot region
- `role="status"` on the loading skeleton
- `aria-hidden="true"` on the arrow in the CTA
- Bootstrap `badge bg-success/bg-warning/bg-secondary` for level colouring

### SCSS (applicant-applications.component.scss)
- `@keyframes gh-app-shimmer` — scoped name avoids employer-side collision
- `%app-skeleton-base` — Sass placeholder for skeleton shimmer
- `@keyframes app-snapshot-fadein` — fade + 4px translateY reveal
- `.app-snapshot-reveal` — uses `$motion-duration-card` + `$motion-ease-decelerate`
- `@include ambient-motion-safe` on shimmer (correct — removes not slows)
- `@include motion-safe` on reveal animation
- `.app-snapshot-cta` with `:focus-visible` outline (WCAG 2.4.7 compliant)

### application.service.ts
- `getApplicationSnapshot(id)` — single: `/applicant/application/snapshot?applicationId=...`
- `getApplicationSnapshots(ids[])` — batch: `/applicant/application/snapshots?applicationIds=...`

---

## 3. Gaps Identified (What Needs to Be Built)

| # | Gap | Priority |
|---|-----|----------|
| 1 | No reusable `ApplicationCompletenessBadgeComponent` | HIGH — enables list + detail reuse |
| 2 | No reusable `ApplicationCompletenessCardComponent` | HIGH — enables expandable detail |
| 3 | No application detail page/route | MEDIUM — list view is the only view |
| 4 | Missing-field tips show text only, no section icons or deep-link CTAs | MEDIUM |
| 5 | No positive "all complete" state (no missingRequired + no missingRecommended) | HIGH |
| 6 | `hasSnapshot: false` visually identical to fetch-fail state | MEDIUM |
| 7 | `retry()` calls `ngOnInit()` directly — convention smell | LOW |
| 8 | `source` field not used (not in batch response — confirmed not applicable) | NOT APPLICABLE |
| 9 | No analytics events on snapshot viewed / CTA clicked | LOW |
| 10 | No expanded per-application detail section (inline card view) | MEDIUM |

---

## 4. Routing Context
- Profile edit route: `/user/profile` maps to ApplicantProfileModule, `edit` sub-path → ApplicantProfileFormComponent
- Full path: `/user/profile/edit` — confirmed valid
- No deep-link routes to specific profile sections exist (all profile editing is at single edit form)

---

## 5. Analytics Status
- `PublicPortalAnalyticsService` exists at `src/app/public/services/public-portal-analytics.service.ts`
- Pattern: `providedIn: 'root'`, console.debug in non-prod, no-op provider integration point
- No completeness-specific analytics methods exist yet — to be added

---

## 6. Motion Token Status
- `$motion-duration-card: 220ms` — used for snapshot reveal ✓
- `$motion-ease-decelerate` — used for reveal ✓
- `@include motion-safe` — applied to transitions ✓
- `@include ambient-motion-safe` — applied to shimmer ✓
- Naming convention for @keyframes: scoped with `gh-app-` prefix per existing pattern

---

## 7. Shared Module Pattern
- New badge + card components must be added to `SharedModule` `declarations` + `exports`
- SharedModule is imported by `ApplicantPanelModule` via `SharedModule` import
- RouterModule is available via SharedModule's export chain (RouterModule re-exported)

---

## 8. Bootstrap Usage
- Project uses Bootstrap CSS (assets/styles/bootstrap.css) for badge classes (`bg-success`, `bg-warning`, etc.)
- Existing snapshot code uses Bootstrap badge classes — new badge component will use CSS custom classes instead (no Bootstrap dependency) for portability
