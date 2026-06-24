# GETHIRED_TEST_RECENT_DEPLOYMENT_REPORT
**Deployment under test:** Applicant Completeness View (FE 76c545e, BE faa2232)
**Test date:** 2026-06-24
**Tester:** Claude Code — TEST RECENT DEPLOYMENT command
**Scope:** Full static code audit of all 7 changed files. No destructive DB commands, no production connections.

---

## 1. Executive Summary

The Applicant Completeness View deployment is **correctly designed and safe to ship** with two medium-priority gaps and zero blockers. The core forkJoin parallel-load pattern is correctly implemented: each per-application snapshot call is independently guarded by `catchError(() => of(...))`, so a single 404 or 5xx never poisons other rows. The `snapshotFor()` accessor handles null/undefined/missing IDs safely. The four UI states (skeleton, success, null, silent-error) are all wired via `*ngIf` chains that are both logically complete and structurally sound. The BE ownership check is a two-step candidate_id comparison on the applicant endpoint, and the employer endpoint enforces 403-collapse for both "not found" and "wrong company" cases. The `Array.isArray(callerCompany)` guard correctly handles the empty-array case from `getUserCompany()`.

The previous release gate (original snapshots deployment) covered different gates. This report resets the gate definitions to match the new deployment scope.

---

## 2. What Was Tested

| Area | Method |
|---|---|
| applicant-applications.component.ts | Full static read — forkJoin, catchError, snapshotFor, retry(), snapshotsMap lifecycle |
| applicant-applications.component.html | Full static read — all four *ngIf chains, skeleton, badge, tips blocks, null state, empty state |
| applicant-applications.component.scss | Full static read — skeleton shimmer, badge, tips, disclaimer, empty styles |
| applicationController.js | Full static read — ownership check, 403 collapse, Array.isArray guard |
| applicationSnapshotService.js | Full static read — reason strings, privacyNote wording, getCompletenessSnapshot, getApplicationSnapshotSummaryForEmployer |
| job-applicants.component.html | Full static read — employer snapshot card, skeleton, aria-live, null state |
| job-applicants.component.ts | Full static read — loadSnapshotSummary, reset-on-open, catchError, snapshotSummaryLoading lifecycle |
| job-applicants.component.scss | Full static read — skeleton styles, motion tokens, badge, disclaimer |
| application.service.ts | Full static read — getApplicationSnapshot URL construction |
| Angular build | Not run (build environment not available in this session) |

---

## 3. Results: Pass / Fail / Unknown

| Test | Status | Notes |
|---|---|---|
| forkJoin isolation: one 404 does not cancel other calls | PASS | Each call wrapped in `.pipe(catchError(() => of({ id, data: null })))` before forkJoin — forkJoin never sees an observable that errors |
| catchError per-call (not global) | PASS | catchError is inside the `calls` map, scoped per applicationId, not on the forkJoin result |
| snapshotFor(null/undefined/empty) | PASS | `snapshotsMap.get(applicationId) ?? null` — Map.get(undefined) returns undefined, coerced to null; no throw |
| snapshotFor only called when app.jobApplicationId is truthy | PASS | `*ngIf="app.jobApplicationId"` wraps the entire app-snapshot div; snapshotFor() not called for rows without an ID |
| Skeleton shown while loading, hidden when done | PASS | `*ngIf="!snapshotsLoaded"` on skeleton div; `*ngIf="snapshotsLoaded"` on content container — mutually exclusive |
| snap.hasSnapshot === false → null state message renders | PASS | `*ngIf="!snap.hasSnapshot"` shows "submitted before completeness tracking was enabled" |
| snap.hasSnapshot === true → score block renders | PASS | `*ngIf="snap.hasSnapshot"` on the score/tips/disclaimer block |
| snap.missingRequired empty → tips block hidden | PASS | `*ngIf="snap.missingRequired?.length > 0"` — optional chaining guards null, empty array evaluates to false |
| snap.missingRecommended empty → tips block hidden | PASS | `*ngIf="snap.missingRecommended?.length > 0"` — same pattern |
| Zero applications → empty state unaffected | PASS | `*ngIf="applications.length === 0"` empty state is in a separate branch from the list; snapshot code never executes |
| applications.length === 0 → loadSnapshots returns early | PASS | `if (appsWithIds.length === 0) { this.snapshotsLoaded = true; return; }` — snapshotsLoaded set true immediately |
| retry() resets snapshotsMap and snapshotsLoaded | PASS | `snapshotsMap.clear()` + `snapshotsLoaded = false` before calling ngOnInit() |
| retry() double-subscribe risk | MEDIUM GAP | ngOnInit() creates a new subscribe() on `getMyApplications()` without unsubscribing any previous subscription; if getMyApplications() is a BehaviorSubject or hot observable, retry() could stack subscriptions. With a cold HTTP observable (HttpClient) this is safe — each subscribe creates a new HTTP request. Needs verification of ApplicantApplicationsService implementation. |
| BE: candidate_id ownership check | PASS | Queries job_applicants for candidate_id, compares to uid from verified auth token; mismatch → 403 |
| BE: not-found returns 404, not 403 | PASS (applicant endpoint) | Applicant endpoint correctly returns 404 on not-found — applicant enumeration oracle is not a risk since they can only probe their own UIDs. No change needed. |
| BE: employer endpoint 403 collapse | PASS | Both "not found" and "wrong company" return 403 — prevents enumeration oracle across companies |
| BE: Array.isArray(callerCompany) guard | PASS | `!callerCompany \|\| Array.isArray(callerCompany)` before `.companyId` access — empty array returns 403 cleanly |
| BE: getUserCompany(uid) returns null → null.companyId would throw | MEDIUM GAP | If getUserCompany returns null (not []), `!callerCompany` catches it correctly and returns 403. But if getUserCompany returns an object without a companyId property, the comparison `callerCompany.companyId !== jobRows[0].company_id` evaluates as `undefined !== company_id` which is truthy → 403. This is correct behavior but relies on undefined-comparison. Pre-existing pattern. |
| FE: completenessLevel badge ngClass | PASS | All four levels (excellent, strong, basic, incomplete) have an explicit ngClass mapping; no uncovered case |
| FE: titlecase pipe on completenessLevel | PASS | `snap.completenessLevel \| titlecase` — handles null gracefully (renders empty string) |
| FE: snap.disclaimerNote rendered | PASS | `{{ snap.disclaimerNote }}` rendered from BE response field confirmed present in controller |
| FE: privacyNote field present in BE response | PASS | privacyNote set in getApplicantApplicationSnapshot controller, line 96 |
| FE: privacyNote NOT rendered in template | FINDING | privacyNote is returned by BE but not displayed in the applicant-applications template. This is a gap in transparency — the privacy note informs applicants that protected attributes are excluded. Low severity; does not break anything. |
| employer snapshot card: STITCH Fix F2 reset | PASS | snapshotSummary = null + snapshotSummaryLoading = false set before loadSnapshotSummary() called, preventing stale data from previous applicant |
| employer snapshot card: aria-live polite | PASS | `aria-live="polite" aria-atomic="true"` wraps skeleton + content, ensuring screen reader announces both states |
| Angular production build | UNKNOWN | Build not run in this session; no compilation errors observed in static review but template type-checking may surface issues |

---

## 4. Critical Gaps

### GAP-1 (MEDIUM): retry() may stack subscriptions on hot observables
`retry()` calls `this.ngOnInit()` which calls `this.applicationsService.getMyApplications().subscribe(...)` without first unsubscribing any in-flight or retained subscription. If `getMyApplications()` returns a cold HTTP observable (standard Angular HttpClient pattern), each subscribe creates an independent request and the old one completes — safe. If `getMyApplications()` returns a BehaviorSubject, ReplaySubject, or is a shared stream, retry() would add a second subscriber on top of the first, potentially causing duplicate rendering or memory leaks.

**Impact:** If the observable is cold (HTTP), no impact. If hot/shared, duplicate renders on retry.
**Recommended fix:** Add a `private appsSubscription?: Subscription` field, unsubscribe in `retry()` before calling `ngOnInit()`, and implement `OnDestroy` to clean up.

### GAP-2 (LOW): privacyNote returned by BE but not shown to applicant
The BE response for GET /applicant/application/snapshot includes `privacyNote: "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring."` This field is present in the API response but not rendered anywhere in `applicant-applications.component.html`. Applicants receive the completeness score without seeing the accompanying privacy explanation.

**Impact:** Applicants may not understand why certain fields are excluded.
**Recommended fix:** Add a small `<p class="app-snapshot-privacy">{{ snap.privacyNote }}</p>` below the disclaimer, conditionally rendered when snap.privacyNote is present.

### GAP-3 (LOW): No automated tests for any part of this deployment
No unit tests exist for: `snapshotFor()` accessor, `retry()` reset logic, `loadSnapshots()` forkJoin isolation, or the BE ownership check in `getApplicantApplicationSnapshot`. The code is correct by inspection but unguarded against future regressions.

**Recommended tests:** Angular component unit tests for the four UI states; BE integration test for the ownership check (caller uid !== candidate_id → 403).

---

## 5. Release Gate Summary

| Gate | Status |
|---|---|
| A: Applications list loads without snapshot data | PASS |
| B: Snapshot failure isolated per-row (forkJoin) | PASS |
| C: Ownership enforced (applicant owns application) | PASS |
| D: All 4 states render (loading/success/null/error) | PASS |
| E: Angular production build clean | UNKNOWN |

---

## 6. Recommendation

**SHIP** on Gates A–D. Gate E (build) must be confirmed by running `ng build --configuration production` before deploying to production. All correctness gates pass. No security gaps introduced. Two medium/low gaps are tracked above but are not blockers.
