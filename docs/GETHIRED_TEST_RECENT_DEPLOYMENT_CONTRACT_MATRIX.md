# GETHIRED_TEST_RECENT_DEPLOYMENT_CONTRACT_MATRIX
**Deployment:** Application Snapshots System  
**Date:** 2026-06-24  
**Scope:** FE service methods ↔ BE endpoints for the 2 new snapshot routes

---

## Contract 1: Applicant Snapshot (applicant-facing)

| Field | Value |
|---|---|
| **FE method** | `ApplicationService.getApplicationSnapshot(applicationId: string)` |
| **FE file** | `src/app/application/application.service.ts` |
| **BE endpoint** | `GET /applicant/application/snapshot` |
| **BE file** | `controllers/applicationController.js → getApplicantApplicationSnapshot` |
| **Route file** | `routes/applicationRoute.js` line 39 |
| **Auth** | `verifyAuth` middleware on both ends; uid extracted from `req.user.uid` |
| **Request shape** | Query param: `applicationId` (string, URL-encoded via `encodeURIComponent`) |
| **FE encodes correctly** | Yes: `encodeURIComponent(applicationId)` called |
| **BE reads correctly** | Yes: `req.query.applicationId` |
| **Response shape (success 200)** | `{ success: true, data: { applicationId, hasSnapshot, snapshotCreatedAt, completenessScore, completenessLevel, completedSections, missingRequired, missingRecommended, disclaimerNote, privacyNote } }` |
| **Null handling** | `completenessScore: null` when no completeness snapshot row; `snapshotCreatedAt: null` when no snapshot row; `completedSections: null` when no completeness row |
| **FE null handling** | Not consumed in any deployed FE component (ApplicationService.getApplicationSnapshot is not called in job-applicants.component.ts — only JobService.getApplicantSnapshotSummary is). The method exists in the service but the current FE deployment does not render the applicant-facing snapshot. |
| **Error shapes** | 400 `{ error: "applicationId is required." }` — missing param; 404 `{ error: "Application not found." }` — no row; 403 `{ error: "Forbidden." }` — candidate_id mismatch; 500 `{ error: "ERROR: ..." }` — unexpected error |
| **Ownership enforced** | Yes: `candidate_id !== uid → 403` |
| **Risk** | LOW. The method is deployed but not yet consumed in a rendered FE component. The contract is correct; no FE consumer breakage risk. |

---

## Contract 2: Employer Applicant Snapshot Summary (employer-facing)

| Field | Value |
|---|---|
| **FE method** | `JobService.getApplicantSnapshotSummary(applicationId: string)` |
| **FE file** | `src/app/job/job.service.ts` |
| **Called from** | `job-applicants.component.ts → loadSnapshotSummary(applicationId)` |
| **BE endpoint** | `GET /job/applicant/snapshot-summary` |
| **BE file** | `controllers/applicationController.js → getEmployerApplicantSnapshotSummary` |
| **Route file** | `routes/applicationRoute.js` line 41 |
| **Auth** | `verifyAuth` on both ends; employer uid from `req.user.uid` |
| **Request shape** | Query param: `applicationId` (string, URL-encoded via `encodeURIComponent`) |
| **FE encodes correctly** | Yes: `encodeURIComponent(applicationId)` called |
| **BE reads correctly** | Yes: `req.query.applicationId` |
| **Response shape (success 200)** | `{ success: true, data: { hasSnapshot, snapshotSource, snapshotCreatedAt, completenessScore, completenessLevel, matchScore, matchLevel, hasMatchSnapshot, matchDisclaimer } }` |
| **Null handling** | `completenessScore: null`, `matchScore: null`, `matchLevel: null`, `snapshotCreatedAt: null` when respective rows not found. `hasSnapshot: false` is the primary null signal. |
| **FE null handling** | Correct: `*ngIf="snapshotSummary.completenessScore != null"` guards completeness block; `*ngIf="snapshotSummary.matchLevel"` guards match block; outer card only shown when `snapshotSummaryLoading || snapshotSummary`; catchError returns of(null) so snapshotSummary=null hides card entirely |
| **Error shapes** | 400 — missing applicationId; 404 — application not found; 403 — company does not own the job; 500 — unexpected error. FE catchError(() => of(null)) silently dismisses all errors |
| **Ownership enforced** | Yes: job.company_id must match getUserCompany(uid).companyId → 403 if mismatch. This is a 2-query ownership chain (application → job → company). |
| **DISCLAIMER field** | `matchDisclaimer` in response populated from `DISCLAIMER` constant (employerApplicantSignalsService.js). FE renders it as `{{ snapshotSummary.matchDisclaimer }}` |
| **applicationId source** | FE: `result.data.data.applicationId` read from `ApplicantActionModalComponent` dialog result. BE mapper (`mappedBasicApplicantDetails`): `applicationId: raw.job_application_id` — confirmed present |
| **Risk** | LOW-MEDIUM. Ownership chain requires two DB queries. If `getUserCompany` returns an array (no company row) the comparison `callerCompany.companyId !== jobRows[0].company_id` will compare undefined !== company_id and correctly evaluate to true → 403. However the error path logs "ERROR: ..." not "Forbidden." for this case — cosmetic only. |

---

## Cross-contract Notes

1. **applicationId encoding**: Both FE callers use `encodeURIComponent()`. Both BE handlers read from `req.query` (Express auto-decodes query params). No double-encoding risk.

2. **Route prefix alignment**: FE `ApplicationService.applicationUrl = api_url + '/application'` — the applicant snapshot endpoint is at `api_url + '/applicant/application/snapshot'` (not under /application). FE correctly hardcodes the full path: `environment.api_url + '/applicant/application/snapshot?...'`. No prefix collision.

3. **FE response unwrapping**: Both callers use `map((res: any) => res?.data)` / `map((res: any) => res?.data)` or directly `.data`. The BE wraps in `successMessage.data = ...`. Shape is consistent.

4. **Missing FE consumer for Contract 1**: `ApplicationService.getApplicationSnapshot` is deployed but no component in the current FE deployment calls it. The applicant-facing snapshot view (showing completeness to the applicant themselves) is not yet wired to a rendered page. The service is ready; the component consumer is deferred.
