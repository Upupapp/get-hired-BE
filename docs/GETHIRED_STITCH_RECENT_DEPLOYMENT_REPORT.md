# GETHIRED STITCH — Recent Deployment: Application Snapshots System

**Date:** 2026-06-24  
**Scope:** Two new BE endpoints + two new FE service methods + employer snapshot card  
**STITCH version:** v2 (integration-safety focus, small/safe/additive fixes only)

---

## 1. API Contract Audit

### Endpoint A: `GET /api/applicant/application/snapshot`

| Dimension | BE | FE | Match? |
|---|---|---|---|
| Mount path | `app.use("/api", applicationRoutes)` + `router.get("/applicant/application/snapshot", ...)` = `/api/applicant/application/snapshot` | `${environment.api_url}/applicant/application/snapshot?applicationId=...` where `api_url` = `.../api` | PASS |
| Method | GET | GET | PASS |
| Auth | `verifyAuth` middleware (Firebase JWT) | `baseService.get<>()` — inherits auth header from `BaseService` | PASS |
| Request param | `applicationId` as query string, read via `req.query.applicationId` | `encodeURIComponent(applicationId)` appended as `?applicationId=` | PASS |
| Case convention | BE reads `req.query.applicationId` (camelCase param name) | FE sends `?applicationId=...` (camelCase) | PASS |
| Response envelope | `{ success, message, data: { applicationId, hasSnapshot, snapshotCreatedAt, completenessScore, completenessLevel, completedSections, missingRequired, missingRecommended, disclaimerNote, privacyNote } }` | `res?.data` unwrapped (application.service's `getApplicationSnapshot` returns the raw observable; caller does `res?.data`) | PASS — FE gets the correct nested `.data` field |
| Field names | camelCase throughout | No binding currently in the UI (this is the applicant-side endpoint; FE service exists but no component calls it yet) | N/A — service method exists but is unattached |
| 400 on missing param | Yes (`status.bad`) | N/A (FE always passes applicationId) | PASS |
| 404 on missing application | Yes (`status.notfound`, body `{ status, error }`) | Not handled (service only) — no UI consumer | No risk today |
| 403 on ownership mismatch | Yes (hard 403 JSON) | Not handled (service only) | No risk today |
| 500 path | Returns `errorMessage.error = "ERROR: " + error` — leaks error text | N/A | See Issue #1 |

**Verdict:** Contract is consistent. The endpoint is deployed and correct; no FE component currently invokes it (the applicant-side snapshot view has not been built yet), so there is no live seam risk.

---

### Endpoint B: `GET /api/job/applicant/snapshot-summary`

| Dimension | BE | FE | Match? |
|---|---|---|---|
| Mount path | `/api/job/applicant/snapshot-summary` | `${environment.api_url}/job/applicant/snapshot-summary?applicationId=...` | PASS |
| Method | GET | GET | PASS |
| Auth | `verifyAuth` | `baseService.get<>()` inherits auth header | PASS |
| Request param | `req.query.applicationId` | `encodeURIComponent(applicationId)` | PASS |
| Response envelope | `successMessage.data = summary` where `summary = { hasSnapshot, snapshotSource, snapshotCreatedAt, completenessScore, completenessLevel, matchScore, matchLevel, hasMatchSnapshot, matchDisclaimer }` | `map((res: any) => res?.data)` → assigned to `this.snapshotSummary` | PASS |
| Field access in template | `snapshotSummary.hasSnapshot`, `.completenessScore`, `.completenessLevel`, `.matchLevel`, `.matchDisclaimer` | All present in BE response | PASS |
| `matchScore` field | Returned by BE | NOT read in template (only `matchLevel` is displayed) | Minor — unused field, not a bug |
| `hasMatchSnapshot` field | Returned by BE | NOT read in template | Minor — unused field, not a bug |
| 400/404/403 | All returned as JSON | FE uses `catchError(() => of(null))` — all errors silently become null | PASS — graceful degradation |

**Verdict:** Contract is consistent and live. The FE correctly consumes all displayed fields.

---

## 2. Seam Inventory

### Seam S1 — applicationId source: applicant list → modal dialog → snapshot call

**Flow:**
1. `job.service.js` `mappedBasicApplicantDetails()` maps `raw.job_application_id` → `applicationId` (camelCase)
2. `jobApplicants()` stores this in the NgRx store via `jobFacade.getApplicants()`
3. `applicants$` observable emits the mapped array; each row carries `applicationId`
4. Table row click → `viewMenu(event)` — `event` is the row object
5. `ApplicantActionModalComponent` receives it as `data` via `MAT_DIALOG_DATA`
6. "Applicant Details" closes with `{ data: this.data, profile: true }`
7. `afterClosed()` subscriber reads `result.data.data.applicationId`

**Risk identified — SEAM S1 ISSUE:** The dialog is opened with:
```ts
this.dialog.open(ApplicantActionModalComponent, {
  data: { job_id: this.jobId, ...event }
})
```
`event` is the spread row object, so `data` in the dialog = `{ job_id, applicationId, userId, ... }`. The modal closes with `{ data: this.data, ... }`. The afterClosed subscriber reads `result.data.data.applicationId`.

This is a **double-nested `.data`** access: `result.data` = `{ data: this.data, profile: true }`, and `result.data.data` = `{ job_id, applicationId, ... }`. So `result.data.data.applicationId` correctly resolves to the row's `applicationId`. The aliasing in `mappedBasicApplicantDetails` (`raw.job_application_id` → `applicationId`) is the correct key that flows through. **This chain is correct.**

**However:** The modal dialog object also spreads `...event` into the top level as `data: { job_id, applicationId, ... }`, so `result.data.data.applicationId` works, but `result.data.applicationId` would also resolve (since `...event` is spread into the dialog data directly). The template accesses via `.data.data.applicationId` which correctly navigates through the nested structure returned by `dialogRef.close({ data: this.data, profile: true })`.

### Seam S2 — getUserCompany() return shape inconsistency

`getUserCompany()` returns `[]` (empty array) when the employer has no company, but returns a plain object `{ companyId, ... }` when they do. The ownership check in `getEmployerApplicantSnapshotSummary` does:
```js
const callerCompany = await getUserCompany(uid);
if (!callerCompany || callerCompany.companyId !== jobRows[0].company_id) {
  return res.status(403).send({ status: "error", error: "Forbidden." });
}
```
When `getUserCompany` returns `[]` (no company), `!callerCompany` is `false` (non-empty array is truthy in JS — but here it's empty `[]` which is also truthy). So `callerCompany.companyId` is `undefined`, which `!== company_id`, so the 403 fires. **The guard works correctly in this edge case**, but only by coincidence — `[]` being truthy means the `!callerCompany` short-circuit does not catch it; the `!== company_id` check catches it instead.

**Issue:** There is no explicit guard for the array case. `getDashboardPipelineOverview` in companiesController.js shows the correct pattern: `if (!userCompany || Array.isArray(userCompany))`. The snapshot endpoint does not follow this pattern — it relies on `undefined !== company_id` being true. This works but is fragile.

### Seam S3 — snapshotSummary loaded for applicant-detail panel only on modal close, not on route navigation

`loadSnapshotSummary(appId)` is only called inside the `viewMenu` → `afterClosed()` callback on the `result.profile === true` branch. If the employer navigates directly to the applicant detail view by some other route (future feature), no snapshot will be loaded. This is a future-proofing concern, not a current bug.

### Seam S4 — `ON CONFLICT DO NOTHING` race with missing unique index

The snapshot insert query uses `ON CONFLICT DO NOTHING` but the table DDL is not in-scope for this review. If the unique constraint on `application_id` does not exist at the DB layer, the `ON CONFLICT` clause is a no-op and duplicate rows can be inserted. The BE service comment asserts a unique index exists; this cannot be verified from code alone.

### Seam S5 — `successMessage` / `errorMessage` are module-level mutable singletons

`applicationController.js` imports `successMessage`, `errorMessage` from `../helpers/status` and mutates them:
```js
successMessage.data = {...}
return res.status(status.success).send(successMessage);
```
This is the existing pattern used across all controllers. Under concurrent requests, one request's `.data` assignment can race with another's `.send()`, causing response data to bleed across requests. This is a pre-existing issue not introduced by this deployment, but the new endpoints inherit it.

---

## 3. Object-Level Auth Seams

### Endpoint A — Applicant ownership check

```js
// BE: applicationController.js lines 70-79
const { rows: appRows } = await dbQuery.query(
  `SELECT candidate_id, job_id FROM ${dbSchema}.job_applicants WHERE job_application_id = $1 LIMIT 1`,
  [applicationId]
);
if (appRows[0].candidate_id !== uid) {
  return res.status(403).send({ status: "error", error: "Forbidden." });
}
```

**Analysis:**
- `applicationId` comes from `req.query.applicationId` — user-controlled. It is passed directly as a parameterized query argument (`$1`), so no SQL injection risk.
- The ownership check compares `candidate_id` (from DB) to `uid` (from Firebase JWT, not from request body). This is correct — the caller cannot spoof their own uid.
- The check is done before any snapshot data is read. Order is correct.
- **Edge case:** If `applicationId` is a valid integer that belongs to another applicant, the 403 fires. The only way to "spoof" access would be to know another applicant's Firebase UID, which is a different attack surface entirely.

**Verdict: PASS** — BOLA protection is correct.

### Endpoint B — Company ownership check (2-hop)

```js
// Step 1: get job_id from application
SELECT job_id, candidate_id FROM job_applicants WHERE job_application_id = $1

// Step 2: get company_id from job
SELECT company_id FROM jobs WHERE job_id = $1

// Step 3: get caller's company
const callerCompany = await getUserCompany(uid); // uid from JWT

// Step 4: compare
callerCompany.companyId !== jobRows[0].company_id → 403
```

**Analysis:**
- All three lookups are parameterized. No injection surface.
- The caller's company is derived from their JWT uid via a DB lookup — they cannot self-assert their company.
- Cross-company leakage: if Employer A queries with Employer B's `applicationId`, Step 2 finds the job owned by Company B; Step 3 finds Company A; the comparison fails and 403 fires. **Cross-company guard is correct.**
- `applicationId` spoofing: a caller with a valid token but no company gets `getUserCompany` returning `[]`; `callerCompany.companyId` is `undefined`; `undefined !== company_id` is true; 403 fires. **No-company edge case is guarded (by coincidence, see Seam S2 above).**
- A caller with a valid token and a company but who does not own the job correctly gets 403.

**Verdict: PASS** — 2-hop ownership chain is correct. The `Array.isArray` pattern inconsistency (Seam S2) is a code-quality issue, not a security hole.

---

## 4. Response Shape vs FE Consumption

### `hasSnapshot: false` handling

Template (line 69):
```html
<div *ngIf="!snapshotSummary.hasSnapshot" class="text-muted small">
  No snapshot available for this application.
</div>
```
**PASS** — graceful message shown when `hasSnapshot` is false.

### `null` completenessScore handling

Template (line 72):
```html
<div *ngIf="snapshotSummary.completenessScore != null">
```
Uses `!= null` (loose equality) which catches both `null` and `undefined`. **PASS.**

### `null` matchLevel handling

Template (line 84):
```html
<div *ngIf="snapshotSummary.matchLevel">
```
Falsy check: hides the match level div if `matchLevel` is `null`, `undefined`, or empty string. **PASS** — the div does not render when there is no match data.

### 403 response handling

`loadSnapshotSummary` uses:
```ts
catchError(() => of(null))
```
Any HTTP error (401, 403, 404, 500) collapses to `null`. Then:
```ts
this.snapshotSummary = data; // null
this.snapshotSummaryLoading = false;
```
Template condition (line 65):
```html
<div class="card card-body mt-3" *ngIf="snapshotSummaryLoading || snapshotSummary" ...>
```
When `snapshotSummary` is `null` and `snapshotSummaryLoading` is `false`, the entire card is hidden. **PASS** — 403 causes the card to disappear cleanly, no error state shown.

### `snapshotSummaryLoading = true` but request never started (applicationId missing)

In `viewMenu()`:
```ts
const appId = result.data.data.applicationId;
if (appId) {
  this.loadSnapshotSummary(appId);
}
```
`snapshotSummaryLoading` is only set to `true` inside `loadSnapshotSummary()`. If `appId` is falsy, `snapshotSummaryLoading` stays `false` and `snapshotSummary` stays `null` (from the `this.snapshotSummary = null` reset at the top of `loadSnapshotSummary`). **PASS** — the card remains hidden.

**Minor issue:** `this.snapshotSummary = null` is set at the top of `loadSnapshotSummary()`, but if `appId` is falsy and `loadSnapshotSummary` is never called, `snapshotSummary` retains the value from the previously viewed applicant. If the employer opens applicant A (loads snapshot), closes, then opens applicant B who has no `applicationId`, applicant A's snapshot data would remain visible until the next profile open. **See Issue #2.**

---

## 5. Integration Contract Issues Found

### Issue #1 — 500 error paths leak raw error text (pre-existing, inherited by new endpoints)
**Severity:** Low (pre-existing pattern)  
**Location:** `applicationController.js` lines 49, 99, 149  
**Detail:** `errorMessage.error = "ERROR: " + error` concatenates the raw JS error object into the response. Under a DB connection failure this could expose internal details (table names, schema). The new endpoints inherit this.  
**Fix:** Safe to harden — replace with a fixed message. See fix log.  
**Action:** Fixed (additive, no behavior change for happy path).

### Issue #2 — Stale snapshot card when applicationId is missing on newly-opened applicant
**Severity:** Low (UX)  
**Location:** `job-applicants.component.ts` `viewMenu()` lines 267-276  
**Detail:** `this.snapshotSummary = null` reset only runs inside `loadSnapshotSummary()`. If `appId` is falsy, the reset never fires and the previous applicant's snapshot card remains visible.  
**Fix:** Move the reset to before the `if (appId)` guard.  
**Action:** Fixed (additive, 1-line change).

### Issue #3 — `getUserCompany` empty-array guard pattern inconsistency (Seam S2)
**Severity:** Info / code-quality  
**Location:** `applicationController.js` line 139  
**Detail:** The check `!callerCompany || callerCompany.companyId !== ...` works correctly because `[].companyId` is `undefined`. However, the consistent pattern used elsewhere (`Array.isArray(userCompany)` guard) is missing. Not a security hole, but a maintenance hazard.  
**Fix:** Additive guard — add `|| Array.isArray(callerCompany)` to the condition.  
**Action:** Fixed (additive, no behavior change for valid callers).

### Issue #4 — `successMessage` / `errorMessage` mutable singleton (pre-existing)
**Severity:** Medium (race condition potential under load)  
**Location:** All controllers  
**Detail:** Pre-existing pattern; out of scope for this deployment's STITCH review. Logged for awareness.  
**Action:** Deferred — risky to change globally; needs its own dedicated refactor pass.

### Issue #5 — `matchScore` present in BE response but never displayed in FE
**Severity:** Info  
**Location:** `applicationSnapshotService.js` `getApplicationSnapshotSummaryForEmployer()` returns `matchScore`; template does not render it.  
**Detail:** Not a bug. The card shows `matchLevel` (qualitative) but not `matchScore` (numeric). The numeric score is available if the UI ever needs it. No action needed.

---

## Summary

- Contracts reviewed: 2
- Contract issues found: 3 actionable (Issues #1, #2, #3) + 2 informational (#4, #5)
- All auth ownership checks are structurally correct
- The applicationId flow chain (DB → mapper → store → table row → modal → afterClosed → snapshot call) is correct
- FE null/error handling for the snapshot card is correct
