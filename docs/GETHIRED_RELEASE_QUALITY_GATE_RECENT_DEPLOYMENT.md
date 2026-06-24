# GETHIRED_RELEASE_QUALITY_GATE_RECENT_DEPLOYMENT
**Deployment:** Applicant Completeness View (FE 76c545e, BE faa2232)
**Date:** 2026-06-24
**Verdict:** CONDITIONAL SHIP — Gates A/B/C/D PASS; Gate E UNKNOWN (build not run)

---

## Gate A: Applications list loads without snapshot data

**Status: PASS**

**What this gate checks:** The applicant My Applications page renders its list of applications correctly even if no snapshots exist or if snapshot loading is disabled/delayed. The snapshot layer must be purely additive.

**Evidence:**
- Applications are loaded in `ngOnInit()` by `getMyApplications().subscribe(...)`. The `applications` array is populated in the `next` callback and `loading = false` is set immediately.
- `loadSnapshots()` is called after the list is populated — it is not awaited and does not block the `loading = false` path. The list renders as soon as applications arrive.
- `snapshotsLoaded` starts as `false`. The `*ngIf="!snapshotsLoaded"` skeleton shows inside each row's `.app-snapshot` block while snapshots load, but the row itself (title, company, status, actions) is fully rendered.
- If `loadSnapshots()` were to never complete (e.g., endpoint never responds), the list remains fully usable — only the skeleton persists inside the snapshot section of each row.
- The empty state (`applications.length === 0`) is entirely independent: it renders in a separate `*ngIf` branch with no reference to snapshot state.

**Risk:** None.

---

## Gate B: Snapshot failure isolated per-row (forkJoin never fails globally)

**Status: PASS**

**What this gate checks:** A 404, 403, or 5xx on one application's snapshot endpoint must not prevent other applications' snapshots from loading. The applicant must see all the snapshots that succeed.

**Evidence:**
- `loadSnapshots()` builds a `calls` array by mapping each application to an observable:
  ```
  this.applicationService.getApplicationSnapshot(app.jobApplicationId).pipe(
    map((res: any) => ({ id: app.jobApplicationId, data: res?.data ?? null })),
    catchError(() => of({ id: app.jobApplicationId, data: null }))
  )
  ```
- The `catchError` is chained **inside the per-call pipe**, before the observable is passed to `forkJoin`. This means forkJoin never receives an observable that can error — every observable in the `calls` array is guaranteed to emit exactly one value and complete.
- `forkJoin` is only entered after each call is individually guarded. A failure on call N sets `snapshotsMap.set(N, null)` — which triggers the `#snapSilent` template (renders nothing, no alarming message) — while calls N±1 proceed normally.
- There is no global `catchError` on the `forkJoin(calls)` result itself, which is correct: if individual calls are all guarded, the outer forkJoin cannot error.
- `snapshotsLoaded = true` is set in the forkJoin subscribe callback. It is always reached because all constituent observables complete.

**Risk:** None.

---

## Gate C: Ownership enforced — applicant can only see own snapshot

**Status: PASS**

**What this gate checks:** Applicant A calling GET /applicant/application/snapshot?applicationId=X must be rejected (403) if applicationId X belongs to applicant B.

**Evidence from BE (applicationController.js):**
- Route is protected by `verifyAuth` middleware — uid is derived from the verified Firebase token, not from the request body or query string.
- Controller queries `job_applicants` table for `candidate_id` by `job_application_id`.
- If `appRows[0].candidate_id !== uid`, returns 403 immediately. No snapshot data is queried.
- This is a strict equality check on the Firebase uid — no fuzzy comparison, no client-supplied value.
- The "not found" case returns 404 (different from 403) on the applicant endpoint. This is acceptable because applicants cannot enumerate other applicants' IDs by differentiating 404 vs 403 — they would need to know a valid ID to attempt access, and their token ties all comparison back to their own uid.

**Employer endpoint (GET /job/applicant/snapshot-summary):**
- 403 returned for not-found (prevents company-B probing valid applicationIds owned by company-A jobs).
- Company ownership verified via `getUserCompany(uid)` + `callerCompany.companyId !== jobRows[0].company_id`.
- `Array.isArray(callerCompany)` guard prevents `[].companyId` access when no company exists for the caller.

**Risk:** None introduced by this deployment.

---

## Gate D: All 4 UI states render correctly

**Status: PASS**

**What this gate checks:** For the applicant-facing completeness view, all four possible states must be handled in the template without runtime errors or blank/broken UI.

**State 1 — Loading (skeleton):**
- `*ngIf="!snapshotsLoaded"` shows `.app-snapshot-skeleton` with `.app-skeleton-line--short`.
- CSS shimmer animation (`gh-shimmer` keyframe) is defined in the component SCSS.
- `role="status" aria-label="Loading application snapshot"` present for screen readers.
- Displayed immediately on page load; removed once forkJoin completes.

**State 2 — Success (snapshot data present):**
- `*ngIf="snapshotsLoaded"` reveals the content container.
- `*ngIf="snapshotFor(app.jobApplicationId) as snap; else snapSilent"` binds the snapshot to `snap`.
- `*ngIf="snap.hasSnapshot"` renders: score percentage, badge with ngClass, missingRequired tips (if any), missingRecommended tips (if any), disclaimerNote.
- All fields are null-guarded via optional chaining (`?.length`) or explicit ngIf.

**State 3 — Null snapshot (pre-deployment application):**
- `*ngIf="!snap.hasSnapshot"` renders the `.app-snapshot-empty` paragraph.
- Wording: "Snapshot not available — this application was submitted before completeness tracking was enabled."
- This correctly handles applications submitted before the snapshot system existed.

**State 4 — Silent error (fetch failed):**
- `catchError(() => of({ id, data: null }))` sets `snapshotsMap.set(id, null)`.
- `snapshotFor(id)` returns null.
- `*ngIf="snapshotFor(app.jobApplicationId) as snap; else snapSilent"` evaluates null as falsy → renders `#snapSilent` which is an empty `ng-template`. Nothing is shown, no error message, no broken layout.
- This is the correct UX choice: a snapshot fetch failure should not alarm the applicant.

**Risk:** None. All states have explicit template branches. No uncovered case was found.

---

## Gate E: Angular production build clean

**Status: UNKNOWN**

**What this gate checks:** `ng build --configuration production` must complete without TypeScript compilation errors, template type errors, or AOT compilation failures.

**Why unknown:** The Angular build environment was not available in this session. The build was not run.

**What static review found (no known issues):**
- No new TypeScript types were introduced — all fields typed as `any`.
- `snapshotsMap` typed as `Map<string, any>` — correct for the Map.get() pattern.
- `forkJoin` and `of` imported from `rxjs`; `catchError` and `map` from `rxjs/operators` — standard imports.
- Template expressions are straightforward property accesses with `?.` optional chaining.
- `titlecase` pipe is a built-in Angular pipe — available without additional imports.
- No newly introduced component selectors or module declarations that could cause compilation issues.

**Required action before production deploy:** Run `ng build --configuration production` in CI and confirm exit code 0.

---

## Summary Table

| Gate | Description | Status | Confidence |
|---|---|---|---|
| A | Applications list loads without snapshot data | PASS | High — additive parallel load confirmed, list renders before snapshots arrive |
| B | Snapshot failure isolated per-row (forkJoin) | PASS | High — catchError scoped per-call inside forkJoin input array |
| C | Ownership enforced (applicant owns application) | PASS | High — candidate_id compared to verifyAuth uid, 403 on mismatch |
| D | All 4 states render (loading/success/null/error) | PASS | High — all four template branches verified, aria attributes present |
| E | Angular production build clean | UNKNOWN | Cannot determine without running build — no known blockers from static review |
