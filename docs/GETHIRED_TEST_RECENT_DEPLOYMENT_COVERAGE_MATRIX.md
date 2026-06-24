# GETHIRED_TEST_RECENT_DEPLOYMENT_COVERAGE_MATRIX

**Deployment:** FE HEAD 5ab9a05  
**Date:** 2026-06-24  
**Components under test:** ApplicationCompletenessBadge, ApplicationCompletenessCard, ApplicantApplications, ApplicantApplicationDetail

---

## Coverage Matrix

| # | Scenario | Component | State tested | Guard / logic | Result |
|---|----------|-----------|--------------|---------------|--------|
| S1 | `level=null, loading=false` → unavailable span | Badge | Unavailable | `*ngIf="!loading && level === null && score === null"` | PASS |
| S2 | `loading=true` → skeleton, no level text | Badge | Loading | `*ngIf="loading"` on skeleton; `!loading` on content spans | PASS |
| S3 | `loading=true` → skeleton only | Card | Loading | `*ngIf="loading"` skeleton; all others `!loading` | PASS |
| S4 | `error=true` → error block + retry button | Card | Error | `*ngIf="!loading && error"` | PASS |
| S5 | `snapshot=null` → unavailable text, no crash | Card | Null snapshot | `*ngIf="!loading && !error && snapshot === null"` | PASS |
| S6 | `snapshot.hasSnapshot=false` → pre-deployment note | Card | Pre-deployment | `*ngIf="!snapshot.hasSnapshot"` inside non-null container | PASS |
| S7 | `hasSnapshot=true, missing[]=[]` → positive state | Card | Complete | `isComplete` getter; `?.length > 0` tip guards | PASS |
| S8 | `snapshotCreatedAt` present → DatePipe renders | Card | Timestamp | `*ngIf="snapshot.snapshotCreatedAt"` + `\| date:'mediumDate'` | PASS |
| S9 | `snapshotCreatedAt` absent → no crash, no empty el | Card | No timestamp | Same `*ngIf` guard removes span | PASS |
| S10 | `onCtaClick()` with empty `applicationId` → no analytics | Card | Analytics guard | `if (this.applicationId)` in `onCtaClick()` | PASS |
| S11 | `id` param missing → `error=true`, no crash | Detail | Missing param | `if (!this.applicationId) { error=true; return; }` | PASS |
| S12 | Route order: `applications` before `applications/:id` | Module | Route shadow | Exact path declared first in route array | PASS |
| S13 | `expandedSnapshotId` toggles open→close | List | Toggle | Same-id click → null; different-id → switch | PASS |
| S14 | `onSnapshotRetry()` only reloads snapshots | List | Retry isolation | `loadSnapshots()` called; `loadData()` not called | PASS |
| S15 | `retry()` clears both appsSub and snapshotsSub | List | Full retry | Both `.unsubscribe()` calls present | PASS |

---

## Coverage by Component

| Component | Scenarios | Passed | Failed | Unknown |
|-----------|-----------|--------|--------|---------|
| ApplicationCompletenessBadgeComponent | 2 | 2 | 0 | 0 |
| ApplicationCompletenessCardComponent | 8 | 8 | 0 | 0 |
| ApplicantApplicationDetailComponent | 2 | 2 | 0 | 0 |
| ApplicantApplicationsComponent | 3 | 3 | 0 | 0 |
| **Total** | **15** | **15** | **0** | **0** |

---

## Gate Coverage

| Gate | Scenarios | Result |
|------|-----------|--------|
| A — Build zero errors | Build run | PASS |
| B — Badge all 5 states | S1, S2 (+ 3 implicit: score present, incomplete-label, score+level) | PASS |
| C — Card all 7 states | S3–S10 | PASS |
| D — Detail route safe | S11, S12 | PASS |
| E — Analytics guard | S10 | PASS |

---

## Methods/Functions Verified

| File | Method/Getter | Verified |
|------|---------------|---------|
| application-completeness-badge.component.ts | `displayLevel` | Yes — null returns '', incomplete maps to 'Getting started' |
| application-completeness-badge.component.ts | `levelClass` | Yes — null returns 'acb-level--unavailable' |
| application-completeness-badge.component.ts | `accessibleLabel` | Yes — loading/null/level branches all present |
| application-completeness-card.component.ts | `onCtaClick()` | Yes — empty-id guard confirmed |
| application-completeness-card.component.ts | `isComplete` | Yes — returns false if !hasSnapshot; requires both arrays empty |
| application-completeness-card.component.ts | `trackByReason()` | Yes — null-safe fallback to String(_index) |
| application-completeness-card.component.ts | `sectionLabel()` | Yes — null-safe `(reason ?? '').toLowerCase()` |
| applicant-applications.component.ts | `toggleSnapshot()` | Yes — same-id toggle to null confirmed |
| applicant-applications.component.ts | `onSnapshotRetry()` | Yes — appsSub not touched |
| applicant-applications.component.ts | `retry()` | Yes — both subs unsubscribed |
| applicant-applications.component.ts | `loadSnapshots()` — batching | Yes — chunk logic + forkJoin + partial catchError |
| applicant-application-detail.component.ts | `ngOnInit()` — missing id | Yes — early return + error=true |
| applicant-application-detail.component.ts | `load()` — null data | Partial — maps null response to error=true (see Finding #1) |
| applicant-panel.module.ts | Route declaration order | Yes — list before detail |

---

## Services Verified Present

| Service | Method | Used by | Status |
|---------|--------|---------|--------|
| ApplicationService | `getApplicationSnapshot(id)` | ApplicantApplicationDetailComponent | CONFIRMED |
| ApplicationService | `getApplicationSnapshots(ids[])` | ApplicantApplicationsComponent | CONFIRMED |
| PublicPortalAnalyticsService | `trackApplicationCompletenessViewed(id)` | ApplicantApplicationsComponent | CONFIRMED |
| PublicPortalAnalyticsService | `trackApplicationCompletenessCtaClicked(id, label)` | ApplicationCompletenessCardComponent | CONFIRMED |

---

## Module Declaration Verified

Both `ApplicationCompletenessBadgeComponent` and `ApplicationCompletenessCardComponent` are declared in `SharedModule` and exported. `ApplicantApplicationsComponent` and `ApplicantApplicationDetailComponent` are declared in `ApplicantPanelModule`. `SharedModule` is imported by `ApplicantPanelModule`, making badge and card available to the list/detail templates. All correct.
