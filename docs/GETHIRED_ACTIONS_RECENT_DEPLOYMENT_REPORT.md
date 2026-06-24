# GETHIRED ACTIONS — Recent Deployment Report
## Applicant Completeness View
**Generated:** 2026-06-24
**Deployment:** FE 76c545e / BE faa2232
**Scope:** Applicant "My Applications" page — completeness score + level badge + improvement tips per application row; forkJoin snapshot loading; skeleton per row; graceful null for pre-snapshot applications; BE safe error messages, Array.isArray guard, 403 enumeration oracle fix, reason strings rewritten; employer snapshot card BRAND skeleton + OPTIMIZE aria-labels + STITCH stale-state fix

---

## Executive Summary

This deployment closes the single biggest gap from the previous cycle: **SNAP-P1-001 is now RESOLVED**. Applicants can see completeness scores and improvement tips on the "My Applications" page. The implementation is architecturally correct — `forkJoin` fires all snapshot calls in parallel rather than sequentially, per-row skeletons show while in-flight, and `catchError` correctly silences individual call failures without breaking the page.

The previous P0 blocker (SNAP-P0-001: DDL applied to production) remains unverified by code — it requires a direct DB query and cannot be confirmed here. SNAP-P1-004 (companyId NOT NULL risk) was **partially addressed**: `application.service.js` already passes `companyId: job.companyId || null`, but no guard prevents the null value from reaching the INSERT. The DDL column is still `NOT NULL`. The risk remains open.

**Three structural UX gaps were introduced by this deployment that need follow-up actions** (see backlog). No regressions were found. The BE guards and error messages are correct. The employer card STITCH stale-state fix is verified in the controller (Array.isArray guard on `getUserCompany` return). The 403 enumeration oracle fix is in place (`getEmployerApplicantSnapshotSummary` returns 403 for both "not found" and "wrong company").

---

## Status of Previous Open Items

### SNAP-P0-001 — Confirm DDL applied to production
**Status: STILL OPEN**
No code change touches this. This requires manual ops verification:
```sql
SELECT to_regclass('gethired.application_snapshots');
SELECT to_regclass('gethired.application_completeness_snapshots');
SELECT to_regclass('gethired.match_snapshots');
```
Until confirmed, every new application may be silently dropping all three snapshots.

### SNAP-P1-004 — company_id NOT NULL constraint risk
**Status: STILL OPEN — not fixed in this deployment**
`services/application.service.js` line 150:
```js
companyId: job.companyId || null,
```
The null is passed through into `createApplicationSnapshots`, which passes it into all three `persist*` functions. The DDL declares `company_id varchar NOT NULL` on all three tables. A null companyId still causes a Postgres NOT NULL violation, silently swallowed by the `.catch()`. No guard was added in this deployment.

### SNAP-P1-002 — Backfill script for existing applications
**Status: STILL OPEN**
No backfill script was created in this deployment cycle. All applications submitted before the snapshot system was deployed still have no rows in `application_snapshots`, `application_completeness_snapshots`, or `match_snapshots`. The "My Applications" page gracefully shows the pre-snapshot message for these rows (`!snap.hasSnapshot` path), so the user-facing experience is handled — but the underlying data gap persists.

### SNAP-P1-001 — Applicant self-view completeness UI
**Status: RESOLVED**
`ApplicantApplicationsComponent` now calls `ApplicationService.getApplicationSnapshot()` for every application via `forkJoin`, populates `snapshotsMap`, and the template renders completeness score, level badge, required improvement tips, and recommended tips per row. The disclaimer note is rendered. The graceful null path for pre-snapshot applications is in place (`!snap.hasSnapshot` → text message). `catchError` silences per-application failures without breaking the page.

### SNAP-P2-002 — Match score formula divergence
**Status: STILL OPEN**
`persistMatchSnapshot` in `applicationSnapshotService.js` lines 404–411 still hand-rolls its own score: `(matchedRequired / (matchedRequired + missingRequired)) * 60 + (hasCv ? 40 : 0)`. `employerApplicantSignalsService` uses `jobRequiredSkills.length` as the denominator, which differs when the matched + missing subset is smaller than the full required list. The formula divergence is live in production.

---

## New Findings — Applicant Completeness View

### N API calls on page load (one per application)

**Severity: P1**
`loadSnapshots()` in `ApplicantApplicationsComponent` builds one HTTP call per application:
```ts
const calls = appsWithIds.map(app =>
  this.applicationService.getApplicationSnapshot(app.jobApplicationId).pipe(...)
);
forkJoin(calls).subscribe(...);
```
`forkJoin` fires them in parallel, which is better than sequential — but for a user with 10 applications, this is still 10 HTTP requests to `GET /applicant/application/snapshot?applicationId=...` on every page load. There is no batch endpoint. As application counts grow, this becomes a noticeable waterfall in network dev tools and a load on the BE.

**Opportunity:** A single `GET /applicant/application/snapshots?applicationIds=id1,id2,...` endpoint (or a POST with a body array) would collapse N calls to 1. The controller and service already have all the logic; only the loop and the ownership check need to be adapted.

### `snapshotFor()` called multiple times per row in template

**Severity: P2**
The template calls `snapshotFor(app.jobApplicationId)` in multiple `*ngIf` expressions on the same row:

```html
<ng-container *ngIf="snapshotFor(app.jobApplicationId) as snap; else snapSilent">
  ...
  <p *ngIf="!snap.hasSnapshot">...</p>
  <ng-container *ngIf="snap.hasSnapshot">
    ...
    <div *ngIf="snap.missingRequired?.length > 0">...</div>
    <div *ngIf="snap.missingRecommended?.length > 0">...</div>
```
The outer `*ngIf="snapshotFor(app.jobApplicationId) as snap"` only calls `snapshotFor` once via Angular's `as` binding — this is correct for that block. However, if any other template location (future changes, debugging additions) calls `snapshotFor(app.jobApplicationId)` outside the `as` binding, it will re-call the Map lookup on every change detection cycle. Currently `snapshotFor` is a simple `Map.get()` which is O(1) and harmless, but the pattern is worth noting for maintainability.

**Opportunity:** This is low-risk as-is. If the completeness view grows (more tip categories, more badge conditions), consider computing the snapshot once in the component class and exposing a pre-indexed array, or using Angular `trackBy` to minimize re-renders.

### No CTA from completeness tips to profile edit page

**Severity: P1**
The improvement tips UI (`snap.missingRequired` and `snap.missingRecommended` lists) shows the applicant what is missing (e.g., "Add work experience", "Add skills") but provides no way to act on the tip. The "My Applications" page is a dead end — the user must manually navigate away to find the profile edit page.

The profile edit route exists at `/user/profile/edit` (confirmed in `ApplicantProfileModule` routes: `{ path: 'edit', component: ApplicantProfileFormComponent }`). The `Router` is already injected in `ApplicantApplicationsComponent`. A "Fix this now" button per tip would close the loop immediately.

### Missing tip deep-links to profile edit sections

**Severity: P2**
Even if a CTA to `/user/profile/edit` is added, the profile edit page (`ApplicantProfileFormComponent`) has no fragment-based section anchoring. A tip like "Add work experience" could navigate to `/user/profile/edit#work-experience`, but the route does not currently support fragment navigation to individual sections. The tip fields map cleanly to identifiable sections: `work_experience`, `skills`, `education`, `cv_submitted`, `certifications`. Adding `id` attributes to the section headings in the profile form and using `router.navigate(['/user/profile/edit'], { fragment: 'work-experience' })` would create a complete guided flow.

### `snapshotsLoaded` flag is shared across all rows — single slow fetch blocks all skeletons

**Severity: P2**
`forkJoin` waits for ALL calls to complete before setting `snapshotsLoaded = true`. If one application's snapshot call is slow (e.g., a cold DB query for a large profile), all rows continue showing skeletons until that last call resolves. If one call errors and `catchError` returns `of({ id, data: null })`, the others are not affected — that part is correct. But there is no per-row loaded state. An applicant with 5 quick-responding applications and 1 slow one will see all 5 as skeletons while waiting for the 6th.

**Opportunity:** Track per-row loaded state (`snapshotsLoaded` as a `Set<string>` of resolved IDs rather than a single boolean). This is a UX polish item; the current behavior is not broken.

### `retry()` calls `ngOnInit()` directly

**Severity: P3**
`retry()` in `ApplicantApplicationsComponent` calls `this.ngOnInit()`. Angular's change-detection cycle does not expect `ngOnInit` to be called more than once on a live component instance — while this works today, it bypasses Angular's lifecycle contract. The correct pattern is to extract the data-loading logic into a private method and call that from both `ngOnInit` and `retry()`. This is a maintainability item.

### Completeness score displayed at submission time — no re-score path

**Severity: P3**
The completeness score shown on the "My Applications" page reflects the profile state at the time of submission (via the snapshot). If an applicant fills in their missing work experience after applying, their score on the "My Applications" page will not update — the snapshot is intentionally immutable (that is correct behavior for the application record). However, there is no UI indication that this is the "at submission" score, nor any mechanism to request a re-score against current profile data. This creates a potential confusion: applicant adds work experience, checks "My Applications", still sees "incomplete" — thinks their profile is broken. The `disclaimerNote` field in the API response is rendered but does not explicitly say "as of your application date."

---

## Architecture Notes

- `GET /applicant/application/snapshot` correctly enforces `candidate_id === uid` — no cross-applicant data exposure confirmed.
- `Array.isArray(callerCompany)` guard in `getEmployerApplicantSnapshotSummary` is correct: `getUserCompany` returns `[]` when no company exists, which is truthy in a Boolean context without the guard.
- 403 enumeration oracle fix is confirmed in place: both "application not found" and "wrong company" return 403 in the employer endpoint.
- `forkJoin` with `catchError → of(null)` per call correctly prevents one failure from cancelling sibling calls — this is the right pattern for non-critical parallel data enrichment.

---

## Summary

| Item | Status |
|------|--------|
| SNAP-P0-001 (DDL on prod) | STILL OPEN — manual ops required |
| SNAP-P1-001 (applicant self-view UI) | RESOLVED |
| SNAP-P1-002 (backfill script) | STILL OPEN |
| SNAP-P1-004 (companyId null risk) | STILL OPEN |
| SNAP-P2-002 (match score divergence) | STILL OPEN |
| New: N API calls on load | NEW — P1 |
| New: No CTA to profile edit from tips | NEW — P1 |
| New: snapshotFor() template pattern | NEW — P2 |
| New: Missing tip deep-links | NEW — P2 |
| New: forkJoin shared skeleton flag | NEW — P2 |
| New: retry() calls ngOnInit directly | NEW — P3 |
| New: Score reflects submission time only | NEW — P3 |
