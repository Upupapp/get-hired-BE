# GETHIRED ACTIONS — Recent Deployment Report
## Applicant Completeness UI — Badge + Card + Detail Route Cycle
**Generated:** 2026-06-24
**Deployment:** FE 5ab9a05 / BE 422d340 (BE unchanged this cycle)
**Previous deployment:** FE 20a44c5 / BE 422d340
**Scope:** ApplicationCompletenessBadgeComponent, ApplicationCompletenessCardComponent, ApplicantApplicationDetailComponent (/user/applications/:id), CTA analytics wiring, snapshotCreatedAt display, "View full details" list link

---

## Executive Summary

This deployment completes the applicant-facing completeness UI originally scoped as a 19-criterion acceptance specification. All 19/19 criteria are now met. The two items deferred from the previous cycle — a dedicated application detail route and CTA click analytics — are both shipped. The `snapshotCreatedAt` ("Captured on...") timestamp is now visible on the detail page via the single endpoint, resolving the list-view UX gap without changing the batch endpoint.

Five items from the prior backlog are resolved this cycle. Three new items are identified below.

**The outstanding hard blocker (SNAP-P0-001) has not changed: the DDL must be confirmed applied to production before the batch endpoint is functional and before the backfill script can be run.** Every applicant currently sees "Snapshot not available" if the tables are missing, because `catchError` silences all 500s from the batch endpoint.

---

## Status of Previously Open Items

### SNAP-P0-001 — Confirm DDL applied to production
**Status: STILL OPEN — manual ops only**
No code change in this cycle. This is still the single hardest blocker. Required before:
- Batch endpoint can return real data (currently silent 500 if tables missing)
- Backfill script can run
- Detail page can show completeness (single endpoint also queries these tables)

Verification query:
```sql
SELECT to_regclass('gethired.application_snapshots');
SELECT to_regclass('gethired.application_completeness_snapshots');
SELECT to_regclass('gethired.match_snapshots');
```
Each must return a non-null result.

### BACKFILL-P0-001 — No pre-flight DDL check in backfill script
**Status: STILL OPEN**
No code change in this cycle. The backfill script still relies on a manual check. Operator must complete section 1 of the launch checklist before running.

### SNAP-P1-003 — Completeness distribution dashboard endpoint for employers
**Status: STILL OPEN**
Not in scope for this cycle. P1 — next meaningful feature after infrastructure is confirmed.

### BATCH-P2-001 — Batch endpoint source filter excludes backfill rows
**Status: STILL OPEN**
No BE changes this cycle. Backfilled applications still show "not available" to applicants.

### BACKFILL-P2-001 — No progress resume from crash
**Status: STILL OPEN**

### BACKFILL-P2-002 — Backfill data not visually distinguished in FE
**Status: STILL OPEN** (contingent on BATCH-P2-001)

### COMP-P2-007 — Fragment anchors for completeness tip deep-links
**Status: STILL OPEN**
CTAs still route to `/user/profile/edit` (top of form) rather than the relevant section. Now applies to both the list-view card CTAs and the detail page card CTAs.

### COMP-P2-008 — Shared snapshotsLoaded flag (batch-wide spin)
**Status: STILL OPEN**
The list component still reveals all rows simultaneously when the batch call resolves. This is the same structural gap as the prior cycle.

### COMP-P3-009 — Fix retry() to call private method not ngOnInit()
**Status: RESOLVED**
Confirmed in release gate: `retry()` now calls `loadData()` not `ngOnInit()`. The `ApplicantApplicationsComponent` refactor used `loadData()` as the extraction target. The new `ApplicantApplicationDetailComponent` was also written correctly with a private `load()` method from the start.

### COMP-P3-010 — Disclaimer does not say score is frozen at submission time
**Status: STILL OPEN**
The `disclaimerNote` string in `applicationController.js` is unchanged. No BE changes this cycle.

### SNAP-P2-001 — snapshot_hash integrity verification
**Status: STILL OPEN**

### SNAP-P2-002 — Match score formula divergence
**Status: STILL OPEN**

### SNAP-P2-003 — Unit tests for applicationSnapshotService.js
**Status: STILL OPEN**

### SNAP-P2-004 — Admin view for snapshot data
**Status: STILL OPEN**

### SNAP-P3-001 — Surface tips in applicant dashboard
**Status: STILL OPEN**
Tips are visible on My Applications and now on the detail page. Dashboard widget not built.

### SNAP-P3-002/003/004/005 — Webhook, DISCLAIMER relocation, getUserCompany, video comment
**Status: STILL OPEN**

### Backlog item: dedicated application detail route
**Status: RESOLVED**
`ApplicantApplicationDetailComponent` at `/user/applications/:id` is now shipped. Uses the single `GET /applicant/application/snapshot` endpoint (richer: includes `snapshotCreatedAt`). Reads job metadata from router navigation state. Back button navigates to `/user/applications`. Declared in `applicant-panel.module.ts`. Route confirmed in FE 5ab9a05.

### Backlog item: per-application deep-link from list to detail page
**Status: RESOLVED**
"View full details →" link in the expanded snapshot section of each list row navigates to `/user/applications/:id` passing `{ jobTitle, companyName, status }` via router state. Applicants can go from the list badge directly to the full detail view.

### Backlog item: CTA click analytics (trackApplicationCompletenessCtaClicked)
**Status: RESOLVED**
`onCtaClick(ctaLabel)` is now wired as a `(click)` handler on both CTA `<a>` elements in `ApplicationCompletenessCardComponent`. Calls `analytics.trackApplicationCompletenessCtaClicked(applicationId, ctaLabel)`. The `applicationId` is passed as `@Input()` to the card component. Fires on both "Update your profile" and "Add to your profile" clicks.

### Backlog item: snapshotCreatedAt display ("Captured on...")
**Status: RESOLVED (on detail page; not on list view)**
The detail page shows `snapshotCreatedAt` as "Captured Jan 15, 2026" when present (the single endpoint returns this field). The list-view card does not show it (batch endpoint does not return `snapshotCreatedAt`) — this is a known and accepted UX gap (tracked as DETAIL-P3-001 below). Applicants can navigate to the detail page to see the timestamp.

### Backlog item: badge_viewed (impression) analytics event
**Status: STILL OPEN**
Tracked as DETAIL-P2-002 below. `trackApplicationCompletenessViewed` fires on card expand. A badge impression event on initial list render has not been added (by design: would fire on every load, too noisy).

### Backlog item: unit tests for badge + card components
**Status: STILL OPEN**
Test specifications are documented in `GETHIRED_APPLICANT_APPLICATION_COMPLETENESS_TEST_LOG_V2.md`. No Angular component tests written. Tracked as COMP-TEST-P2-001.

---

## New Findings From This Deployment

### DETAIL-P2-001 — Direct navigation to /user/applications/:id loses job metadata
**Severity: P2**
`ApplicantApplicationDetailComponent.ngOnInit()` reads job metadata (jobTitle, companyName, status) from `this.router.getCurrentNavigation()?.extras?.state` with a fallback to `window.history.state`. When a user navigates directly to `/user/applications/abc123` (bookmark, back button from an external page, email link), `getCurrentNavigation()` is null and `window.history.state` may be stale or empty. In that case, `jobTitle` and `companyName` are empty strings, the header renders "Application Details" instead of the job name, and the status badge is absent.

The completeness data itself loads correctly (the route param `:id` is extracted from `paramMap`). The metadata gap is a UX degradation only, not a data error.

**Fix options:**
1. If a per-application REST endpoint returning job title/company name/status exists (or can be added), call it as a fallback when state is empty.
2. If `ApplicationService.getAppliedJobsList()` is cached in a shared service, read from there by `applicationId`.
3. Accept the current behavior and display "Application Details" as the heading when state is absent — lowest effort, already implemented as the fallback.

**Current behavior:** option 3 is the active fallback. No error, no broken layout.

### DETAIL-P2-002 — badge_viewed (impression) analytics event still untracked
**Severity: P2**
`trackApplicationCompletenessViewed` fires when the user expands the card (toggle event). There is no event for:
- Badge render in the list (impression: "user saw this badge")
- Detail page load (impression: "user navigated to the detail page")

Without impression tracking, the funnel is: badge_rendered (unknown) → card_expanded (tracked) → cta_clicked (now tracked). The conversion rate from impression to expand cannot be computed.

**Fix:** Add `trackApplicationCompletenessBadgeViewed(applicationId)` to `PublicPortalAnalyticsService`. Fire it once per badge render in the list, guarded to not fire for loading or unavailable states. Alternatively fire on detail page load in `ApplicantApplicationDetailComponent.ngOnInit()` as a "detail_viewed" event. Medium-effort if debounced correctly (must not fire on every scroll past in a virtual list).

### DETAIL-P3-001 — snapshotCreatedAt absent in list-view card ("Captured on..." only on detail page)
**Severity: P3**
The batch endpoint (`GET /applicant/application/snapshots`) does not return `snapshotCreatedAt`. The single endpoint (`GET /applicant/application/snapshot`) does. As a result:
- Detail page: shows "Captured Jan 15, 2026" ✓
- List view expanded card: no timestamp shown

This is the documented design choice from the prior cycle (the commit message acknowledges it: "gracefully omitted for batch-loaded snapshots that don't include timestamp"). It creates a minor UX inconsistency: the same card component shows a timestamp on the detail page but not in the list.

**Fix:** Add `snapshotCreatedAt` to the batch endpoint response. Low-effort BE change: the field is in `application_completeness_snapshots.captured_at`. The batch query already joins this table; adding the column is one-line. The card already renders it when present.

---

## Architecture Notes

- `ApplicantApplicationDetailComponent` is correctly isolated: no dependency on the list component state. Can be used standalone.
- Router state passing (`router.navigate([...], { state: {...} })`) is correct for this use case. The fallback to `window.history.state` covers most back-button scenarios but not cold-start deep links.
- `getApplicationSnapshot()` in `ApplicationService` is already present — the detail component reuses it without modification.
- The card component's `@Input() applicationId` addition is additive and backward-compatible: the list already passes it; any future consumer can also pass it.
- `onCtaClick(ctaLabel)` on the card is a click handler on `<a routerLink>` elements. Navigation still occurs via routerLink — the click handler fires analytics before the navigation completes. This is correct.

---

## Summary Table

| Item | Previous Status | Current Status |
|------|----------------|----------------|
| SNAP-P0-001 (DDL on prod) | STILL OPEN | STILL OPEN |
| BACKFILL-P0-001 (pre-flight check) | NEW | STILL OPEN |
| SNAP-P1-003 (employer distribution endpoint) | OPEN | STILL OPEN |
| BATCH-P2-001 (backfill source filter) | NEW | STILL OPEN |
| BACKFILL-P2-001 (no resume from crash) | NEW | STILL OPEN |
| BACKFILL-P2-002 (backfill data UX distinction) | NEW | STILL OPEN |
| COMP-P2-007 (fragment deep-links) | OPEN | STILL OPEN |
| COMP-P2-008 (shared snapshotsLoaded) | OPEN | STILL OPEN |
| COMP-P3-009 (retry → loadData) | PARTIALLY RESOLVED | RESOLVED |
| COMP-P3-010 (disclaimer copy) | OPEN | STILL OPEN |
| SNAP-P2-001 (snapshot_hash) | OPEN | STILL OPEN |
| SNAP-P2-002 (match score formula) | OPEN | STILL OPEN |
| SNAP-P2-003 (BE unit tests) | OPEN | STILL OPEN |
| SNAP-P2-004 (admin snapshot view) | OPEN | STILL OPEN |
| SNAP-P3-001/002/003/004/005 (misc) | OPEN | STILL OPEN |
| Backlog: dedicated detail route | OPEN | RESOLVED — /user/applications/:id live |
| Backlog: list → detail deep-link | OPEN | RESOLVED — "View full details" link live |
| Backlog: CTA click analytics | OPEN | RESOLVED — onCtaClick() wired |
| Backlog: snapshotCreatedAt display | OPEN | RESOLVED (detail page only; list deferred) |
| Backlog: badge_viewed impression | OPEN | STILL OPEN → DETAIL-P2-002 |
| Backlog: component unit tests | OPEN | STILL OPEN → COMP-TEST-P2-001 |
| NEW: DETAIL-P2-001 (direct nav loses metadata) | — | NEW — P2 |
| NEW: DETAIL-P2-002 (no badge impression event) | — | NEW — P2 |
| NEW: DETAIL-P3-001 (snapshotCreatedAt not in batch) | — | NEW — P3 |
