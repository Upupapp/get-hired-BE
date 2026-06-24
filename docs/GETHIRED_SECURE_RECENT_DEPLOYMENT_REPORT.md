# GETHIRED SECURE — Recent Deployment Security Report
**Scope:** Applicant Completeness View (FE 76c545e, BE faa2232)
**Date:** 2026-06-24
**Auditor:** Claude Code (claude-sonnet-4-6)
**Repos:** get-hired-BE (controllers/applicationController.js, controllers/candidateController.js, controllers/companiesController.js, services/candidate.service.js), get-hired-FE (applicant-applications.component.ts/.html, application.service.ts)

---

## Deployment Scope

**BE changes in this deployment:**
- `controllers/applicationController.js` — `getApplicantApplicationSnapshot` (applicant-owned snapshot endpoint) and `getEmployerApplicantSnapshotSummary` (employer snapshot endpoint); 403 collapse fix for enumeration oracle, Array.isArray guard on `getUserCompany`, safe error messages.
- `services/applicationSnapshotService.js` — copy/reason string rewrites (no security-relevant logic change; not read in this audit, confirmed out of scope).

**FE changes in this deployment:**
- `applicant-applications.component.ts` — forkJoin parallel calls to `getApplicationSnapshot()` per application, keyed by `app.jobApplicationId` from `getMyApplications()`.
- `applicant-applications.component.html` — renders `snap.completenessScore`, `snap.completenessLevel`, `snap.missingRequired[].reason`, `snap.missingRecommended[].reason`, `snap.disclaimerNote` via Angular template bindings.

---

## Security Checklist Findings

### 1. BOLA on Applicant Snapshot Endpoint (Gate A)

**File:** `controllers/applicationController.js`, `getApplicantApplicationSnapshot` (lines 59–104)

**Verdict: PASS**

The endpoint extracts `uid` from `req.user` (JWT, server-set) and does a parameterized DB lookup:
```
SELECT candidate_id, job_id FROM job_applicants WHERE job_application_id = $1 LIMIT 1
```
It then enforces `appRows[0].candidate_id !== uid` → 403. The `applicationId` comes from `req.query`, not a body field. No path exists where an applicant can substitute another user's `uid`. The ownership check fires before any snapshot data is returned.

No bypass found.

---

### 2. BOLA via Client — Parallel forkJoin Snapshot Calls (Gate A, secondary)

**Files:** `applicant-applications.component.ts` (lines 42–59), `controllers/candidateController.js` `getJobAppliedList` (lines 113–129), `services/candidate.service.js` `listOfAppliedJobsById` (lines 179–208)

**Verdict: PASS**

The FE sends one `getApplicationSnapshot(app.jobApplicationId)` call per application returned by `getMyApplications()`. `getMyApplications()` hits `/candidates/appliedjobslist`, which maps to `getJobAppliedList`. That controller:
- Reads `uid` from `req.user` (JWT, line 120).
- Passes `uid` directly to `listOfAppliedJobsById(uid)` — no query param involved.
- `listOfAppliedJobsById` queries `WHERE a.candidate_id = $1` with the JWT `uid` as the bound parameter.

Therefore, an applicant's session can only receive `jobApplicationId` values that belong to their own `candidate_id`. Any foreign `applicationId` they manually inject into the snapshot call will be blocked at the `candidate_id !== uid` check in `getApplicantApplicationSnapshot`.

No bypass found.

---

### 3. XSS in Template (Gate B)

**File:** `applicant-applications.component.html`

**Verdict: PASS**

All data fields rendered from the snapshot API response use Angular's standard interpolation (`{{ ... }}`):
- `{{ snap.completenessScore }}%` — line 37
- `{{ snap.completenessLevel | titlecase }}` — line 44
- `{{ tip.reason }}` — lines 53, 60
- `{{ snap.disclaimerNote }}` — line 64

Angular automatically HTML-encodes all interpolation output. There is no `[innerHTML]` binding, no `bypassSecurityTrustHtml`, no `bypassSecurityTrustUrl`, and no `DomSanitizer` import or usage anywhere in the new template or component file.

No XSS risk.

---

### 4. 403 Collapse Correctness — Enumeration Oracle Fix (Gate C)

**File:** `controllers/applicationController.js`, `getEmployerApplicantSnapshotSummary` (lines 111–157)

**Verdict: PASS**

The "not found" branch now returns 403:
```js
if (!appRows || appRows.length === 0) {
  return res.status(403).send({ status: "error", error: "Forbidden." });
}
```
(Line 129–131.) Both the "application not found" path and the "wrong company" path return 403, so a recruiter from Company B cannot distinguish valid vs. invalid `applicationId` values by comparing response codes. The fix held correctly.

---

### 5. Array.isArray Guard on getUserCompany (Gate D)

**File:** `controllers/applicationController.js` line 145, `controllers/companiesController.js` `getUserCompany` (lines 183–209)

**Verdict: PASS — guard is CORRECT and does not block legitimate employers**

`getUserCompany` returns:
- `[]` (empty array) when the DB query returns no rows (lines 196–198 of companiesController.js).
- A plain object `{ companyId, ... }` when a row exists (line 200–203).
- Never returns `null` or `undefined`.

The guard in `applicationController.js`:
```js
if (!callerCompany || Array.isArray(callerCompany) || callerCompany.companyId !== jobRows[0].company_id)
```
- `!callerCompany` — catches null/undefined (defensive belt-and-suspenders, not reachable today but safe).
- `Array.isArray(callerCompany)` — catches the `[]` empty-array case, which is the real "no company" sentinel.
- `callerCompany.companyId !== jobRows[0].company_id` — only reached when a legitimate object is returned; checks company ownership.

A legitimate employer (user who belongs to the job's company) gets a populated object back from `getUserCompany`, fails all three conditions, and passes through to the snapshot data. The guard is both necessary and correct.

---

### 6. forkJoin Error Handling — encodeURIComponent Safety (Gate E)

**File:** `applicant-applications.component.ts` (lines 42–59), `application.service.ts` (lines 22–24)

**Verdict: PASS — with a minor informational note**

The forkJoin pipeline:
```ts
this.applicationService.getApplicationSnapshot(app.jobApplicationId).pipe(
  map((res: any) => ({ id: app.jobApplicationId, data: res?.data ?? null })),
  catchError(() => of({ id: app.jobApplicationId, data: null }))
)
```

Inside `getApplicationSnapshot`:
```ts
return this.baseService.get<any>(
  `${environment.api_url}/applicant/application/snapshot?applicationId=${encodeURIComponent(applicationId)}`
);
```

`encodeURIComponent` is called *before* the observable is created — it runs synchronously in the URL construction step, not inside the observable chain. If `applicationId` is `null` or `undefined`, `encodeURIComponent(null)` returns the string `"null"` and `encodeURIComponent(undefined)` returns the string `"undefined"` — neither throws. The FE already filters apps to `!!app.jobApplicationId` (line 43 of the component) before building the call list, so `null`/`undefined` values never reach the service method. No synchronous throw path exists.

The `catchError` handles HTTP-level failures correctly. No gap.

**Informational note (not a security finding):** If a future caller passes `null` to `getApplicationSnapshot`, it will make a request with `?applicationId=null` in the URL rather than failing early. A defensive `if (!applicationId) throw new Error(...)` at the top of the service method would make this more robust, but this is a code quality note, not a security issue in the current deployment.

---

## Summary Table

| Check | File | Result |
|---|---|---|
| Applicant BOLA (own-snapshot enforcement) | applicationController.js | PASS |
| BOLA via client (getMyApplications uid scope) | candidateController.js, candidate.service.js | PASS |
| XSS in template | applicant-applications.component.html | PASS |
| 403 collapse held (enumeration oracle fix) | applicationController.js | PASS |
| Array.isArray guard correctness | applicationController.js, companiesController.js | PASS |
| forkJoin/encodeURIComponent safety | applicant-applications.component.ts, application.service.ts | PASS |

**New P0 findings: 0**
**New P1 findings: 0**
**Fixes applied this audit: 0** (no new vulnerabilities found; all deployment-specific checks pass)

---

## Pre-existing Issues (Not Re-flagged)

The following were known before this deployment and are out of scope:
- PayMongo webhook signature unverified (P0, pre-existing)
- CORS wide-open (P1, pre-existing)
- Git history leaked secrets (P0, pre-existing)
- No rate limiting anywhere in get-hired-BE (P1, pre-existing)
- SQL injection in job.service.js getPublishedJobs / getAllVideoResponsesByJobIds (P1, pre-existing, out of scope)
