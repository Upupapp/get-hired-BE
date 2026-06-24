# GetHired — Application History Badge Integration Log V2

**Date:** 2026-06-24  
**Phase:** 8

---

## Changes to applicant-applications.component.ts

### New Fields
- `expandedSnapshotId: string | null` — tracks which application's card is expanded
- `snapshotsError: boolean` — tracks if snapshot batch fetch errored (was silently lost before)

### Methods Added / Changed
- `loadData()` — private method extracted from `ngOnInit()`; `retry()` now calls `loadData()` not `ngOnInit()`
- `toggleSnapshot(applicationId)` — expand/collapse the completeness card + fire analytics
- `onSnapshotRetry()` — retry only the snapshots fetch (not the full app list)
- `trackByAppId()` — proper trackBy for application list (was not present before)
- `retry()` — now calls `loadData()` instead of `ngOnInit()` (fixes minor convention smell)

### Analytics
- Injected `PublicPortalAnalyticsService`
- Calls `analytics.trackApplicationCompletenessViewed(applicationId)` on expand

---

## Changes to applicant-applications.component.html

### Layout Change
- Added `.application-row-header` flexbox row: left side = job info, right side = badge toggle
- `.application-row-info` contains h3/p/status
- `.application-row-badge` contains the toggle button

### Toggle Button (`app-completeness-toggle`)
- `aria-expanded` bound to `expandedSnapshotId === app.jobApplicationId`
- `aria-controls` bound to `'completeness-' + app.jobApplicationId`
- Contains `<app-application-completeness-badge>` + chevron span
- Chevron: rotates 90°→270° on open (motion-safe transition)

### Badge Inputs
- `[level]`: `snapshotsLoaded ? snapshotFor(id)?.completenessLevel ?? null : null`
- `[score]`: `snapshotsLoaded ? snapshotFor(id)?.completenessScore ?? null : null`
- `[loading]`: `!snapshotsLoaded`
- Badge is null-safe: shows skeleton while loading, "Unavailable" for fetch-fail entries

### Card Integration
- `<app-application-completeness-card>` placed in `.app-snapshot` div
- Only rendered when `expandedSnapshotId === app.jobApplicationId`
- Receives: `[snapshot]`, `[loading]`, `[error]`, `(retryClick)`
- Card handles all 5 states internally

### Unchanged
- Message thread section unchanged
- Empty state unchanged
- Applications error state unchanged

---

## Changes to applicant-applications.component.scss

### Removed
- All inline snapshot styles (moved to card component SCSS)
- `@keyframes gh-app-shimmer`, `%app-skeleton-base`, skeleton line/badge styles
- `.app-snapshot-*` classes (badge, label, score, tips, disclaimer, cta, empty, unavailable)
- `@keyframes app-snapshot-fadein`, `.app-snapshot-reveal`

### Added
- `.application-row-header` flexbox layout
- `.application-row-info` + `.application-row-badge` layout
- `.app-completeness-toggle` button styles (no border, focus-visible ring)
- `.app-completeness-toggle-chevron` with rotation transition (motion-safe)
- `.app-snapshot` border-top separator (retained)
- `@media (max-width: 480px)` responsive stacking
