# GETHIRED STITCH — Recent Deployment Release Gate

**Date:** 2026-06-24  
**Deployment:** Application Snapshots System  
**Gate evaluator:** STITCH v2 automated review

---

## Gate A — Contract Compatibility: FE service paths match BE routes exactly

**Verdict: PASS**

| FE call | BE route | Match |
|---|---|---|
| `${api_url}/applicant/application/snapshot?applicationId=...` | `app.use("/api", ...) + router.get("/applicant/application/snapshot", ...)` = `/api/applicant/application/snapshot` | PASS |
| `${api_url}/job/applicant/snapshot-summary?applicationId=...` | `/api/job/applicant/snapshot-summary` | PASS |
| `api_url` = `https://api-dot-get-hired-363107.et.r.appspot.com/api` (prod) | BE mounts all application routes under `/api` via `server.js` | PASS |

Both new FE service methods use `environment.api_url` (not `this.jobUrl`/`this.applicationUrl`) for the full path, which correctly avoids the `/job` or `/application` prefix clash. The paths are exact matches.

---

## Gate B — Auth/Authorization Safety: Both endpoints reject unauthorized callers

**Verdict: PASS**

| Check | Result |
|---|---|
| Applicant snapshot endpoint has `verifyAuth` middleware | PASS — `router.get("/applicant/application/snapshot", verifyAuth, getApplicantApplicationSnapshot)` |
| Employer snapshot summary endpoint has `verifyAuth` middleware | PASS — `router.get("/job/applicant/snapshot-summary", verifyAuth, getEmployerApplicantSnapshotSummary)` |
| Applicant endpoint checks `candidate_id === uid` before returning data | PASS — ownership check on lines 70-79 of applicationController.js |
| Employer endpoint does 2-hop ownership check (application → job → company → caller) | PASS — all three DB lookups are parameterized; company derived from JWT uid, not request body |
| Cross-company data leak possible? | NO — company_id from DB is compared against caller's company from DB; user cannot self-assert company |
| applicationId spoofing by valid applicant for another applicant's record? | NO — 403 fired on candidate_id mismatch |
| No-company employer gets data? | NO — getUserCompany returns []; callerCompany.companyId is undefined; !== fires 403 |

Post-Fix F3: The no-company case now also has an explicit `Array.isArray(callerCompany)` guard, matching the pattern used in `getDashboardPipelineOverview`.

---

## Gate C — Null Safety: FE handles all null/missing snapshot states

**Verdict: PASS**

| State | Template handling | Result |
|---|---|---|
| HTTP error (403/404/500) | `catchError(() => of(null))` → `snapshotSummary = null` → card hidden by `*ngIf="snapshotSummaryLoading \|\| snapshotSummary"` | PASS |
| `hasSnapshot: false` | `*ngIf="!snapshotSummary.hasSnapshot"` shows "No snapshot available" message | PASS |
| `completenessScore: null` | `*ngIf="snapshotSummary.completenessScore != null"` hides score block | PASS |
| `completenessLevel: null` | ngClass evaluates cleanly; no matching class applied (badge gets no colour class but still renders if score is present) | PASS (minor: badge shows with no colour class when level is null but score is not null — acceptable) |
| `matchLevel: null` | `*ngIf="snapshotSummary.matchLevel"` hides the entire match level block | PASS |
| `matchDisclaimer: null` | Rendered as empty string if null — no visible breakage | PASS |
| Loading state | `snapshotSummaryLoading = true` while request is in flight; template shows "Loading snapshot..." | PASS |
| New applicant opened (stale state) | Post-Fix F2: `snapshotSummary` and `snapshotSummaryLoading` explicitly reset before new load | PASS (was FAIL before fix) |

---

## Gate D — applicationId Flow: ID flows correctly from applicant list to snapshot API

**Verdict: PASS**

Full chain verified:

1. **DB query** (`jobApplicants` in `job.service.js`): `SELECT j.job_application_id, ...` — the raw column is `job_application_id`
2. **Mapper** (`mappedBasicApplicantDetails`): `applicationId: raw.job_application_id` — aliased to `applicationId` (camelCase)
3. **NgRx store**: facade dispatches `getApplicants(jobId)`; the mapped object is stored with `applicationId` key
4. **`applicants$` observable**: spreads the mapped object; `applicationId` field is preserved (no re-mapping in the pipe)
5. **Table row**: emits the row object via `viewMenu(event)`; `event.applicationId` is populated
6. **Modal dialog opened**: `data: { job_id: this.jobId, ...event }` — `applicationId` is at `data.applicationId`
7. **Modal closes**: `dialogRef.close({ data: this.data, profile: true })` — `this.data` = `{ job_id, applicationId, ... }`
8. **afterClosed subscriber**: `result.data.data.applicationId` = `result.data` (`{ data: this.data, profile: true }`) → `.data` (`this.data` = `{ job_id, applicationId }`) → `.applicationId` — **correct**
9. **`loadSnapshotSummary(appId)`**: `appId` is the raw application UUID string
10. **FE service**: `getApplicantSnapshotSummary(applicationId)` → `?applicationId=<encoded-uuid>`
11. **BE**: `req.query.applicationId` → parameterized query → ownership check → snapshot lookup

No transformation, re-encoding, or format change occurs at any step. The chain is intact.

---

## Gate E — Must-Not-Break: Existing application submit and applicant list still work

**Verdict: PASS**

| Existing function | Change made | Risk |
|---|---|---|
| `POST /api/application/apply` (submitApplication) | No change to route or controller | NONE |
| `GET /api/job/applicants?id=` (jobApplicants / getJobApplicantsByJobId) | No change | NONE |
| `mappedBasicApplicantDetails` | No change | NONE |
| `verifyAuth` middleware | No change | NONE |
| `applicationRoute.js` existing routes | New routes appended; no existing route altered | NONE |
| `applicationController.js` submitApplication | submitApplication function untouched; two new functions added at end of file | NONE |
| NgRx store / JobFacade | No new actions dispatched; `getApplicants` / `getApplicantsDetails` unchanged | NONE |
| `applicants$` observable pipe | Not modified; `snapshotSummary` is a separate component field | NONE |

The snapshot endpoints are additive. Both the applicant list and the application submit flow are independent of the snapshot service (`createApplicationSnapshots` is called fire-and-forget after the application insert; its failure never propagates to the submit response).

---

## Release gate summary

| Gate | Verdict | Notes |
|---|---|---|
| A — Contract Compatibility | PASS | Both FE paths match BE routes exactly; env api_url confirmed |
| B — Auth/Authorization Safety | PASS | verifyAuth on both; BOLA checks correct; cross-company guard correct |
| C — Null Safety | PASS | All null/error/loading states handled; Fix F2 closes stale-state gap |
| D — applicationId Flow | PASS | Full 11-step chain verified end-to-end; no transformation breaks |
| E — Must-Not-Break | PASS | All new code is purely additive; zero existing routes or functions modified |

**Overall: ALL GATES PASS.** Deployment is safe to keep in production with Fixes F1/F2/F3 applied.
