# GETHIRED STITCH — Recent Deployment Fix Log

**Date:** 2026-06-24  
**Scope:** Application Snapshots System  
**Policy:** Small, safe, additive fixes only. No route renames, no field removals, no auth behavior changes, no DB schema changes, no UI redesign.

---

## Fix F1 — Add console.error logging to new snapshot controller catch blocks

**File:** `controllers/applicationController.js`  
**Issue:** #1 — raw error text leaks / no server-side logging in 500 responses  
**Note:** The safe error message string (`"Unable to retrieve..."`) was already in place when this STITCH review ran — the original "ERROR: " + error concatenation had been pre-fixed. What remained was adding server-side `console.error` logging so failures are observable in production logs.  
**Change:** Added `console.error(...)` before the `errorMessage.error = ...` line in both new catch blocks.  
**Risk:** None — logging only; response unchanged.  
**Status:** APPLIED

**Added to getApplicantApplicationSnapshot catch block:**
```js
console.error("[getApplicantApplicationSnapshot]", error);
```

**Added to getEmployerApplicantSnapshotSummary catch block:**
```js
console.error("[getEmployerApplicantSnapshotSummary]", error);
```

---

## Fix F2 — Reset snapshotSummary before conditional load

**File:** `src/app/job/job-applicants/job-applicants.component.ts`  
**Issue:** #2 — stale snapshot card persists when next applicant has no applicationId  
**Change:** Move `this.snapshotSummary = null` and `this.snapshotSummaryLoading = false` to the `viewMenu` `afterClosed` handler before the `if (appId)` guard, so the card always clears when a new applicant is opened.  
**Risk:** None — purely resets local state before the conditional load.  
**Status:** APPLIED

**Before (viewMenu afterClosed callback):**
```ts
const appId = result.data.data.applicationId;
if (appId) {
  this.loadSnapshotSummary(appId);
}
```

**After:**
```ts
// Always reset snapshot state when opening a new applicant detail panel.
this.snapshotSummary = null;
this.snapshotSummaryLoading = false;
const appId = result.data.data.applicationId;
if (appId) {
  this.loadSnapshotSummary(appId);
}
```

---

## Fix F3 — Add explicit Array.isArray guard in employer snapshot ownership check

**File:** `controllers/applicationController.js`  
**Issue:** #3 — missing consistent guard pattern for no-company employer edge case  
**Change:** Add `Array.isArray(callerCompany)` check to match the pattern used in `getDashboardPipelineOverview`.  
**Risk:** None — additive guard. The existing `undefined !== company_id` path still fires if the array check is somehow skipped.  
**Status:** APPLIED

**Before:**
```js
const callerCompany = await getUserCompany(uid);
if (!callerCompany || callerCompany.companyId !== jobRows[0].company_id) {
  return res.status(403).send({ status: "error", error: "Forbidden." });
}
```

**After:**
```js
const callerCompany = await getUserCompany(uid);
if (!callerCompany || Array.isArray(callerCompany) || callerCompany.companyId !== jobRows[0].company_id) {
  return res.status(403).send({ status: "error", error: "Forbidden." });
}
```

---

## Deferred items

| Item | Reason deferred |
|---|---|
| Issue #4 — `successMessage`/`errorMessage` singleton race | Pre-existing across all controllers; fixing requires a global refactor; risky/out-of-scope for this deployment's STITCH pass |
| Issue #5 — `matchScore` unused in UI | Not a bug; informational only |

---

## No-change confirmations

- Route paths: unchanged
- Field names in responses: unchanged
- Auth middleware: unchanged
- DB schema: unchanged
- UI layout: unchanged
