# GETHIRED STITCH — Recent Deployment Integration Report
## Deployment: Applicant Completeness View (FE 76c545e / BE faa2232)
**Date:** 2026-06-24
**Scope:** FE→BE contract for the applicant completeness snapshot feature in `applicant-applications.component`
**STITCH version:** v2 (integration-safety focus, small/safe/additive fixes only)

---

## Summary

6 seams verified. 0 issues found. 0 fixes applied. All 5 gates PASS.

---

## Seam Verification

### Seam 1 — `jobApplicationId` key name (Gate C)

**Question:** Does `getMyApplications()` return `jobApplicationId` so the FE filter `app.jobApplicationId` works?

**Trace:**
- `ApplicantApplicationsService.getMyApplications()` → `GET /api/candidates/appliedjobslist`
- `candidateController.js → getJobAppliedList()` → `listOfAppliedJobsById(uid)`
- `candidate.service.js → listOfAppliedJobsById()` → maps each row through `mappedApplication(row)`
- `mappedApplication()` line 212: `jobApplicationId: raw.job_application_id`

**Result:** PASS. `jobApplicationId` is explicitly set on every returned application object. FE `filter(app => !!app.jobApplicationId)` correctly includes all valid applications.

---

### Seam 2 — URL contract (Gate A)

**Question:** Does `${environment.api_url}/applicant/application/snapshot` match the registered BE route?

**Trace:**
- FE: `environment.api_url` = `https://.../api` (dev, staging, and prod all end in `/api`)
- FE URL: `${environment.api_url}/applicant/application/snapshot?applicationId=...` → resolves to `/api/applicant/application/snapshot?applicationId=...`
- BE: `server.js` line 47: `app.use("/api", applicationRoutes)`
- `applicationRoute.js` line 39: `router.get("/applicant/application/snapshot", verifyAuth, getApplicantApplicationSnapshot)`
- Full resolved BE path: `/api/applicant/application/snapshot` — exact match

**Result:** PASS. URL contract is exact across all three environments.

---

### Seam 3 — `missingRequired[].reason` field shape (Gate B)

**Question:** Does `getCompletenessSnapshot()` return `missing_required` from DB, does the controller alias it as `missingRequired`, and are the items objects with a `reason` field that the FE can read?

**Trace (write path — at application submit time):**
- `scoreApplicationCompleteness()` builds `missingRequired` as an array of objects with shape `{ field, label, reason }` (e.g. `reason: "Helps employers understand your current professional focus"`)
- `persistCompletenessSnapshot()` stores as `JSON.stringify(completenessResult.missing_required)` into DB column `missing_required jsonb NOT NULL DEFAULT '[]'` (confirmed in `application_snapshots_ddl.sql` line 68)

**Trace (read path — at applicant view time):**
- `getCompletenessSnapshot()` → `SELECT * FROM application_completeness_snapshots WHERE application_id = $1`
- `dbQuery` uses `node-postgres` (`pg`). The `pg` library **automatically deserializes `jsonb` columns** into native JS objects/arrays (Postgres type OID 3802 is mapped to JSON.parse by the pg type parser). No manual `JSON.parse()` is needed.
- `comp.missing_required` is therefore already a parsed JS array: `[{ field, label, reason }, ...]`
- Controller line 93: `missingRequired: comp ? comp.missing_required : null`
- FE template: `*ngFor="let tip of snap.missingRequired"` then `{{ tip.reason }}` — correct

**Result:** PASS. The `jsonb` type round-trips correctly through `pg`. The `reason` field is present on every item in the array.

---

### Seam 4 — `disclaimerNote` field name (Gate B)

**Question:** Is the field name exactly `disclaimerNote` in the BE response, matching `snap.disclaimerNote` in the FE template?

**Trace:**
- `applicationController.js` `getApplicantApplicationSnapshot()` lines 86-97 build `successMessage.data` with:
  ```js
  disclaimerNote: "Application completeness measures submitted information, not candidate quality. It is not a hiring score.",
  ```
- FE template line 64: `{{ snap.disclaimerNote }}`
- The value is hardcoded in the controller — no DB round-trip risk for this field.

Note: `scoreApplicationCompleteness()` also writes a `disclaimerNote` key inside the `evidence` JSONB blob stored in DB, but that nested field is never returned to the client directly. The controller's top-level `disclaimerNote` is the only FE-facing source.

**Result:** PASS. Exact field name match, hardcoded string, no aliasing risk.

---

### Seam 5 — `forkJoin` empty array guard (Gate E)

**Question:** If `appsWithIds.length === 0`, is `forkJoin([])` avoided?

**Trace (`applicant-applications.component.ts` lines 43-47):**
```ts
const appsWithIds = this.applications.filter(app => !!app.jobApplicationId);
if (appsWithIds.length === 0) {
  this.snapshotsLoaded = true;
  return;
}
```
`forkJoin(calls)` is only reached when `appsWithIds.length > 0`. The guard sets `snapshotsLoaded = true` and returns early, so the template's skeleton state exits cleanly.

**Result:** PASS. Guard is correct and exits cleanly with `snapshotsLoaded = true`.

---

### Seam 6 — Null safety: failed snapshot fetch → silent render (Gate D)

**Question:** If a snapshot fetch errors, does the application row stay intact and no error state display?

**Trace:**
```ts
catchError(() => of({ id: app.jobApplicationId, data: null }))
```
- On any HTTP error, the stream is replaced with `{ id, data: null }`.
- `results.forEach(({ id, data }) => this.snapshotsMap.set(id, data))` — the map entry is set to `null`.
- `snapshotFor(id)` returns `this.snapshotsMap.get(id) ?? null` → `null`.
- Template: `*ngIf="snapshotFor(app.jobApplicationId) as snap; else snapSilent"` — `null` is falsy, `snap` is not bound, Angular renders `#snapSilent`.
- `#snapSilent` is an empty `<ng-template>` — renders nothing, no error message shown.
- The application row's `app.jobTitle`, `app.companyName`, status badge, and message button are outside `.app-snapshot` and are completely unaffected.

**Result:** PASS. Failed snapshots are genuinely silent. The overall `forkJoin` succeeds even when individual calls fail (each is independently guarded by `catchError`), so `snapshotsLoaded` always becomes `true`.

---

## Identified Issues

None.

---

## Fixes Applied

None. All seams were correct as deployed.

---

## Cross-cutting Observations (non-blocking, informational)

**OBS-1: `privacyNote` sent but not rendered.**
The controller returns `privacyNote` in the response payload but no template element reads it. This is benign (extra field in response is harmless). If displaying the privacy note is desired, `{{ snap.privacyNote }}` would be the minimal addition.

**OBS-2: `missingRecommended` null guard.**
The template checks `snap.missingRecommended?.length > 0` with optional chaining. The controller sets `missingRecommended: comp ? comp.missing_recommended : null`, so when `comp` is null (no completeness row yet), the value is `null`. The `?.` guard handles this correctly.

**OBS-3: NOTIFY pass already improved `reason` copy.**
Per `GETHIRED_NOTIFY_RECENT_DEPLOYMENT_REPORT.md`, the `reason` strings in `scoreApplicationCompleteness()` were previously written from the system's perspective and were updated to second-person applicant-facing copy. The current strings reflect those improvements.

**OBS-4: `retry()` calls `ngOnInit()` directly.**
`retry()` in the component calls `this.ngOnInit()` manually (line 79). This is unusual for an Angular lifecycle hook but is functional since the component is not destroyed/re-created. No integration seam impact.
