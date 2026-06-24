# GETHIRED SWEEP — RECENT DEPLOYMENT: Applicant Completeness View
**Generated:** 2026-06-24
**BE HEAD:** faa2232 | **FE HEAD:** 76c545e
**Scope:** Applicant-facing completeness view + SECURE/STITCH/NOTIFY fixes in applicationController.js and applicationSnapshotService.js

---

## Executive Summary

**What was deployed:** The applicant-facing completeness view — the second surface of the snapshot system. After applications load, a parallel `forkJoin` fires one `GET /applicant/application/snapshot` call per application, results are stored in a `Map<string,any>`, and each row renders a skeleton shimmer → score+badge → tips → disclaimer card. Simultaneously, three security/correctness fixes landed on the BE: an enumeration oracle collapse on the employer snapshot endpoint (404→403), an `Array.isArray` guard on `getUserCompany`'s empty-array return shape, and NOTIFY-pass rewrites of error messages and reason strings. The employer-side applicant panel also received BRAND skeleton shimmer, aria-live scope correction, and a STITCH reset fix for `snapshotSummary`.

**Architecture quality:** Good. The FE parallel load pattern is idiomatic RxJS, error isolation is correct, and the skeleton/state machine is clean. The BE ownership check on the applicant endpoint is direct and correct. The three BE fixes are all targeted and clearly motivated. Main concerns: N calls per page load with no caching or batching; a latent template bug where `null` snapshots are silently hidden rather than explaining the gap to the user; and the `forkJoin` completing only when ALL calls complete, meaning a slow single call delays the entire batch reveal.

**Top 5 risks:**
1. [HIGH] `forkJoin` waits for ALL N snapshot calls before setting `snapshotsLoaded = true`. If one call is slow (e.g. a network hiccup), every other row's snapshot is also delayed. Per-call loading state was not implemented.
2. [HIGH] N+1 API calls: one `GET /applicant/application/snapshot` per application, issued in parallel but with no cap. An applicant with 30 applications fires 30 concurrent calls. No caching, no batching endpoint exists.
3. [MEDIUM] The null/failed snapshot state (`snapSilent`) renders nothing — no message, no icon. A user who applied before completeness tracking was enabled sees an empty gap beneath their application with no explanation. The "no snapshot" message only appears when `snap` is truthy but `snap.hasSnapshot` is false.
4. [MEDIUM] `retry()` calls `ngOnInit()` directly. While functional, this resets `applications` to `[]` and clears `snapshotsMap` before `ngOnInit` itself reassigns them, creating a flicker; the bigger concern is that `loading$` in `job-applicants.component.ts` subscribes in a field initializer without `takeUntil`, which is a different component but shows the same pattern leak risk.
5. [LOW] The `getApplicationSnapshot` and `getCompletenessSnapshot` retrieval functions use `SELECT *`, meaning any future column added to these tables auto-exposes to callers without a review gate.

**Top 5 strengths:**
1. Per-call `catchError(() => of({ id, data: null }))` ensures a single failed snapshot call cannot affect the others or break the applications list.
2. The applicant ownership check is direct and correct: `appRows[0].candidate_id !== uid` returns 403 before touching the snapshot tables, preventing IDOR.
3. The `Array.isArray` guard on `getUserCompany` correctly handles the `[]` empty return shape that `!callerCompany` alone would miss (truthy empty array).
4. The enumeration oracle fix is well-reasoned: collapsing both "not found" and "wrong company" to 403 on the employer endpoint prevents Company B from probing valid applicationIds by comparing response codes.
5. The NOTIFY reason strings are second-person, action-oriented, and factually grounded — they explain the *value* of completing each section, not just what is missing.

---

## §1 System Map

### Applicant Completeness View — Data Flow

```
Applicant opens "My Applications"
  └─ ApplicantApplicationsService.getMyApplications()
       └─ GET /applicant/userprofile or equivalent list endpoint
            └─ ngOnInit: applications[] populated, loading=false
                 └─ loadSnapshots() fires
                      └─ Filter: apps with jobApplicationId
                           └─ Map: one Observable per app
                                └─ ApplicationService.getApplicationSnapshot(jobApplicationId)
                                     └─ GET /applicant/application/snapshot?applicationId=<id>
                                          └─ verifyAuth middleware
                                               └─ getApplicantApplicationSnapshot()
                                                    ├─ SELECT candidate_id FROM job_applicants (ownership check)
                                                    ├─ 403 if not owner
                                                    └─ Promise.all([getApplicationSnapshot, getCompletenessSnapshot])
                                                         └─ 200: { applicationId, hasSnapshot, completenessScore,
                                                                    completenessLevel, missingRequired,
                                                                    missingRecommended, disclaimerNote, privacyNote }
                      └─ forkJoin(calls) — waits for ALL
                           └─ results.forEach → snapshotsMap.set(id, data)
                                └─ snapshotsLoaded = true
                                     └─ Template renders per-row:
                                          ├─ !snapshotsLoaded → skeleton shimmer
                                          ├─ snap truthy + hasSnapshot=true → score+badge+tips+disclaimer
                                          ├─ snap truthy + hasSnapshot=false → "Snapshot not available" message
                                          └─ snap null (catchError) → empty (snapSilent)
```

### Employer Applicant Detail — Snapshot Summary

```
Employer clicks applicant in job-applicants panel
  └─ viewMenu() → dialog result with applicationId
       └─ snapshotSummary = null; snapshotSummaryLoading = true  ← STITCH fix
            └─ loadSnapshotSummary(appId)
                 └─ JobService.getApplicantSnapshotSummary(applicationId)
                      └─ GET /job/applicant/snapshot-summary?applicationId=<id>
                           └─ verifyAuth → getEmployerApplicantSnapshotSummary()
                                ├─ SELECT job_id FROM job_applicants (403 if missing)
                                ├─ SELECT company_id FROM jobs
                                ├─ getUserCompany(uid) → Array.isArray guard  ← STITCH fix
                                └─ callerCompany.companyId === job.company_id → 403 if mismatch
                                     └─ getApplicationSnapshotSummaryForEmployer(applicationId)
                                          └─ { completenessScore, completenessLevel, matchScore,
                                               matchLevel, hasSnapshot, matchDisclaimer }
                 └─ Template: snapshotSummaryLoading → shimmer skeleton
                              snapshotSummary.hasSnapshot=false → calm empty message
                              snapshotSummary.hasSnapshot=true → scores + badges + disclaimer
```

---

## §2 API Contract

### Applicant Endpoint

| Attribute | FE Call | BE Route | Match |
|---|---|---|---|
| URL | `/applicant/application/snapshot?applicationId=<id>` | `router.get("/applicant/application/snapshot", verifyAuth, getApplicantApplicationSnapshot)` | Yes |
| Auth | Firebase token via `baseService.get` | `verifyAuth` middleware | Yes |
| Query param | `applicationId` (string, URL-encoded) | `req.query.applicationId` | Yes |
| Response shape | `res?.data ?? null` | `successMessage.data = { applicationId, hasSnapshot, completenessScore, completenessLevel, missingRequired, missingRecommended, disclaimerNote, privacyNote }` | Yes |

**Edge cases verified:**
- Missing `applicationId`: BE returns 400 with safe error. FE would receive an error response → `catchError` → `data: null` → silent null state (handled).
- Application not owned by caller: BE returns 403. FE `catchError` catches → null. (Correct — should never happen in normal flow since FE only calls for the logged-in user's own applications.)
- No snapshot row in DB (pre-deployment application): BE returns `hasSnapshot: false`. Template shows the "submitted before completeness tracking was enabled" message. (Correct.)
- No completeness row in DB: `comp` is null, BE returns `completenessScore: null`, `completenessLevel: null`. Template renders the score section only when `snap.hasSnapshot` is true — if hasSnapshot is false this path is skipped cleanly. **GAP:** if `hasSnapshot` is true but `comp` is null (snapshot exists, completeness row missing), the score row renders `null%` and `null` level badge. This edge case is unlikely but possible if completeness insert failed silently.

### Employer Endpoint

| Attribute | FE Call | BE Route | Match |
|---|---|---|---|
| URL | `/job/applicant/snapshot-summary?applicationId=<id>` | `router.get("/job/applicant/snapshot-summary", verifyAuth, getEmployerApplicantSnapshotSummary)` | Yes |
| Auth | Firebase token via `baseService.get` | `verifyAuth` middleware | Yes |
| Response shape | `res?.data` | `successMessage.data = summary` | Yes |

**Edge cases verified:**
- `applicationId` absent: 400 with safe message. FE `catchError` → `of(null)` → `snapshotSummary = null` → card hidden (correct).
- Application not found: 403 (enumeration oracle fix). FE `catchError` → null (correct).
- Company mismatch: 403. FE `catchError` → null (correct).

---

## §3 Error Isolation

### forkJoin + catchError Pattern

The pattern used is:

```typescript
const calls = appsWithIds.map(app =>
  this.applicationService.getApplicationSnapshot(app.jobApplicationId).pipe(
    map((res: any) => ({ id: app.jobApplicationId, data: res?.data ?? null })),
    catchError(() => of({ id: app.jobApplicationId, data: null }))
  )
);
forkJoin(calls).subscribe(results => {
  results.forEach(({ id, data }) => this.snapshotsMap.set(id, data));
  this.snapshotsLoaded = true;
});
```

**Assessment:**
- A single failed call: `catchError` converts it to `of({ id, data: null })`. This stream completes normally, so `forkJoin` is not interrupted. Other calls are unaffected. **Correct.**
- The applications list: snapshots are loaded *after* `this.loading = false` in the `next` handler. A snapshot failure cannot affect the applications list render. **Correct.**
- `forkJoin` itself: only fails if one of the inner observables errors *before* `catchError` fires. Since `catchError` is applied per-call, `forkJoin` will always complete. **Correct.**

**One latent concern:** `forkJoin` waits for ALL calls to complete before emitting. If one call takes 8 seconds due to a slow DB query (e.g. large `application_completeness_snapshots` table without an index on `application_id`), all rows show the skeleton for 8 seconds even if the other 9 calls completed in 200ms. A `combineLatest` + individual loading flags per row would eliminate this, but at significant template complexity cost.

**Does a slow/failed snapshot break the applications list?** No. The applications list renders immediately on `loading = false`. Snapshot state (`snapshotsLoaded`) is decoupled.

---

## §4 Security Review

### Applicant Endpoint Ownership Check

```javascript
const { rows: appRows } = await dbQuery.query(
  `SELECT candidate_id, job_id FROM ${dbSchema}.job_applicants WHERE job_application_id = $1 LIMIT 1`,
  [applicationId]
);
if (!appRows || appRows.length === 0) {
  return res.status(status.notfound).send({ status: "error", error: "Application not found." });
}
if (appRows[0].candidate_id !== uid) {
  return res.status(403).send({ status: "error", error: "Forbidden." });
}
```

**Assessment: Correct.** The check is pre-snapshot-fetch. No snapshot data is loaded until ownership is confirmed. `uid` comes from `req.user` (Firebase-verified JWT), not from the request body or query string. The 404/403 split here is intentional and appropriate: applicants should know whether their own application exists (404 = "you didn't apply here" vs 403 = "you tried to read someone else's"). The employer endpoint is the one where enumeration is a risk — and that is correctly collapsed to 403.

**Note:** The applicant 404 could still reveal that a specific `applicationId` exists (to a probing applicant). However, since `applicationId` values are UUIDs and the applicant would have had to submit the application to know the ID, this is a minimal practical risk.

### Array.isArray Guard on getUserCompany

```javascript
const callerCompany = await getUserCompany(uid);
if (!callerCompany || Array.isArray(callerCompany) || callerCompany.companyId !== jobRows[0].company_id) {
  return res.status(403).send({ status: "error", error: "Forbidden." });
}
```

**Assessment: Correct and necessary.** `getUserCompany` returns `[]` (an empty array, not `null`) when no company row is found. An empty array is truthy in JavaScript, so `!callerCompany` would pass. `Array.isArray([])` is `true`, catching this case. The guard order is also correct: `!callerCompany` (null/undefined) first, then `Array.isArray` (empty array), then `companyId` check (wrong company). All three cases map to 403, giving no information to the caller about which branch fired.

**Cross-reference:** The same pattern was already applied in `getDashboardPipelineOverview` in `companiesController.js`. The STITCH fix brought `applicationController.js` into alignment with that established pattern. **Consistent.**

### Enumeration Oracle Fix

```javascript
// Before: 404 for not-found, 403 for wrong company
// After:  403 for both
if (!appRows || appRows.length === 0) {
  return res.status(403).send({ status: "error", error: "Forbidden." });
}
```

**Assessment: Correct.** A recruiter from Company B cannot determine whether an `applicationId` is valid by comparing response codes. 403 for both states is the standard approach. The FE handles both identically via `catchError(() => of(null))`.

---

## §5 Performance Review

### N Calls Per Page Load

**Pattern:** One `GET /applicant/application/snapshot` call per application, fired in parallel via `forkJoin`.

**Current state:**
- Calls are parallel (not sequential), so wall-clock time is bounded by the slowest single call, not the sum.
- Each call executes 1 ownership query + 2 snapshot retrieval queries = 3 DB queries.
- For a user with 10 applications: 10 parallel calls → 30 DB queries total on a single page load.

**Scale concern:**
| Applications | Parallel calls | DB queries | Risk |
|---|---|---|---|
| 1–5 | Low | 3–15 | Acceptable |
| 6–15 | Medium | 18–45 | Moderate |
| 16–30 | High | 48–90 | Concerning |
| 30+ | Very high | 90+ | High — browser connection limits, server connection pool saturation |

**No caching exists.** Each page visit or `retry()` refires all calls. There is no HTTP cache header on the endpoint, no in-memory cache on the BE, and no service-level cache on the FE.

**Missing index risk:** `getCompletenessSnapshot` queries `application_completeness_snapshots WHERE application_id = $1`. If this table lacks an index on `application_id`, each retrieval is a full table scan. This compounds with N parallel calls.

**Mitigation options (not yet implemented):**
1. Batch endpoint: `GET /applicant/application/snapshots?ids=id1,id2,id3` — single call, single response.
2. FE-side simple cache: store results in a service-level Map that survives route navigation, so re-opening the page does not refetch.
3. DB index: ensure `application_id` is indexed on both snapshot tables.

---

## §6 UX/State Review

### Applicant View — State Machine

| State | Trigger | Template behavior | Assessment |
|---|---|---|---|
| Loading (applications) | `loading = true` | `app-inline-loading` spinner | Correct |
| Error (applications) | `error = true` | Error block with retry button | Correct |
| Empty applications | `applications.length === 0` | Empty state with "Find jobs" CTA | Correct |
| Loading snapshots | `!snapshotsLoaded` | Skeleton shimmer per row | Correct |
| Snapshot success, hasSnapshot=true | `snap.hasSnapshot` | Score + badge + tips + disclaimer | Correct |
| Snapshot success, hasSnapshot=false | `!snap.hasSnapshot` | "Submitted before completeness tracking" message | Correct |
| Snapshot call failed | `catchError` → `data: null` | `snapSilent` — renders nothing | **Concern (see below)** |
| No jobApplicationId on app | `!app.jobApplicationId` | Snapshot div not rendered | Correct |

**Concern — silent null state:** When a snapshot call fails (network error, server error, 403), `snapshotsMap.get(id)` returns `undefined` (never set for that key), which the template resolves via `snapshotFor()` as `null`. The `*ngIf="snapshotFor(app.jobApplicationId) as snap"` block fails because `null` is falsy, so `snapSilent` fires — rendering nothing. The user sees no indication that the completeness section failed to load. This is a deliberate choice ("don't alarm the user") but creates an invisible gap in the UI for what could be a systemic outage.

**Concern — all-or-nothing reveal:** Because `snapshotsLoaded` is a single boolean set when `forkJoin` completes, every row shows a skeleton until the slowest call finishes. There is no per-row reveal.

### Employer View — State Machine

| State | Template behavior | Assessment |
|---|---|---|
| `snapshotSummaryLoading = true` | Shimmer skeleton (3 lines + 2 badge placeholders) | Correct |
| `snapshotSummary = null` (failed or no appId) | Card hidden entirely | Correct |
| `snapshotSummary.hasSnapshot = false` | Calm muted empty message | Correct |
| `snapshotSummary.hasSnapshot = true` | Completeness score + match level + disclaimer | Correct |
| `snapshotSummaryLoading = false && snapshotSummary = null` | Card hidden | Correct |

**STITCH fix correctness:** `snapshotSummary = null; snapshotSummaryLoading = false` are reset unconditionally before `loadSnapshotSummary` is called, even if the next applicant has no `applicationId`. This prevents a prior applicant's card persisting into the next applicant's panel. **Correct.**

---

## §7 Copy Review

### Reason Strings (missingRequired / missingRecommended)

| Field | Reason string | Assessment |
|---|---|---|
| basic_profile | "Helps employers understand your current professional focus" | Clear, second-person implied, value-framed |
| work_experience | "Helps employers understand your work history" | Clear, functional |
| skills | "Lets employers see what you can do and how you align with the role" | Strong — names alignment benefit |
| education | "Gives employers a fuller picture of your background" | Good, soft tone appropriate for optional field |
| cv_submitted | "A CV gives employers more detail to review alongside your application" | Clear, accurate |
| video_answers | "Video answers let you present yourself beyond a written application" | Good — positions as an opportunity |
| certifications | "Certifications can strengthen your profile for roles that require specific credentials" | Appropriate — hedged with "can" and "for roles that require" |

**Overall assessment:** All strings are second-person, action-oriented, and explain the value of completing the section. None are alarm-tone or finger-pointing. The word "employers" is used consistently, which is accurate (the data is shared with employers). **Pass.**

**One minor gap:** The tip heading "Complete your profile to strengthen future applications:" implies these tips apply to future applications but not the current one. This is technically accurate (the snapshot is already captured), but may confuse users who think they can update and resubmit. A clarifying phrase like "...future applications (this application's snapshot is already captured)" would remove the ambiguity.

### disclaimerNote

```
"Application completeness measures submitted information, not candidate quality. It is not a hiring score."
```

**Assessment:** Clear, accurate, non-alarming. Explicitly separates completeness from quality/hiring, which is the key risk of misinterpretation. **Pass.**

### privacyNote

```
"Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring."
```

**Assessment:** Specific, reassuring, examples provided. Uses plain-English category names rather than technical field names. **Pass.**

### Employer matchDisclaimer

Sourced from `DISCLAIMER` constant in `employerApplicantSignalsService.js` — not changed in this deployment. Not re-reviewed here.

---

## §8 Risk Register

| ID | Area | Severity | Description | Fix Required |
|---|---|---|---|---|
| R01 | Performance | HIGH | `forkJoin` blocks all row reveals until the slowest call completes. A single slow DB call holds every row's skeleton indefinitely. | No (acceptable now, revisit at scale) |
| R02 | Performance | HIGH | N parallel API calls per page load with no batching endpoint and no client-side cache. Degrades linearly with application count. | No (must address before scale) |
| R03 | UX | MEDIUM | Failed snapshot calls render completely silently (`snapSilent` is an empty template). Users with systemic snapshot failures see unexplained gaps. | No |
| R04 | Data integrity | MEDIUM | `hasSnapshot=true` + missing completeness row renders `null%` score and `null` level badge. Possible if completeness insert failed silently at submission time. | No (edge case, low probability) |
| R05 | Security | LOW | Applicant endpoint returns 404 for unknown `applicationId` (not 403 as on employer endpoint). UUID-format IDs make enumeration impractical, but the split is inconsistent. | No |
| R06 | Data quality | LOW | `SELECT *` in `getApplicationSnapshot`, `getCompletenessSnapshot`, `getMatchSnapshot` retrieval helpers exposes any future column automatically. | No |
| R07 | Maintainability | LOW | `retry()` calls `ngOnInit()` directly. This works but is non-idiomatic and could cause double-subscription issues if `loading$` subscription is added to this component in future. | No |
| R08 | DB | LOW | No confirmed index on `application_id` for snapshot tables. Each N+1 retrieval may be a full table scan at low row counts, will degrade as table grows. | Verify index exists |
| R09 | UX | LOW | Tips heading says "to strengthen future applications" — technically correct but may confuse users expecting to update the current application. | No (copy polish only) |

---

## §9 Opportunity Register

| ID | Area | Description | Effort |
|---|---|---|---|
| O01 | Performance | Implement a batch snapshot endpoint `GET /applicant/application/snapshots?ids=...` returning a map in one call, reducing N calls to 1. | Medium |
| O02 | Performance | Add a service-level cache in `ApplicationService` (Map keyed by applicationId, cleared on logout) to avoid refetching on re-navigation. | Low |
| O03 | UX | Replace the all-or-nothing `snapshotsLoaded` flag with per-row loading state, so fast-resolving snapshots render immediately while slow ones still shimmer. | Medium |
| O04 | UX | Add a minimal fallback in `snapSilent` (e.g. a muted "Completeness not available" line) so users know the section exists and why it is empty. | Low |
| O05 | Copy | Refine the required tip heading to clarify the snapshot is already captured: "Add these to strengthen future applications — this application's snapshot is already recorded." | Low |
| O06 | DB | Verify and add explicit indexes on `application_id` for all three snapshot tables; add FK constraints to prevent orphan rows if applications are deleted. | Low |
| O07 | Security | Normalize applicant endpoint to return 403 (not 404) for unknown `applicationId`, matching employer endpoint convention and reducing information leakage. | Low |
| O08 | Employer UX | Surface `missingRequired` / `missingRecommended` tips on the employer snapshot card (currently only shows score + match level). Gives recruiters richer context for profile gaps. | Medium |
| O09 | Testing | Add unit tests for: `loadSnapshots()` with all-fail, partial-fail, and all-success scenarios; `snapshotFor()` null/undefined key behavior; `snapshotsLoaded` timing correctness. | Medium |
| O10 | Observability | Log a warning (server-side) when `completenessScore` is returned as null despite `hasSnapshot=true`, to surface the data integrity gap in R04. | Low |
