# GETHIRED STITCH — Recent Deployment Integration Report
## Deployment: Batch Snapshot Endpoint (FE 20a44c5 / BE 422d340)
**Date:** 2026-06-24  
**Scope:** FE→BE contract for `GET /applicant/application/snapshots?applicationIds=<csv>`  
**STITCH version:** v2 (integration-safety focus, small/safe/additive fixes only)

---

## 1. Deployment Summary

Two controllers and two FE files shipped in this deployment:

**BE:**
- `controllers/applicationController.js` — added `getApplicantApplicationSnapshotsBatch`
- `routes/applicationRoute.js` — registered `GET /applicant/application/snapshots`

**FE:**
- `src/app/application/application.service.ts` — added `getApplicationSnapshots(applicationIds)`
- `src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` — calls `loadSnapshots()` after applications load; maps results into `snapshotsMap`

---

## 2. Contract Seams Verified

### Seam 1 — Route Path (Gate A)

**File:** `get-hired-BE/routes/applicationRoute.js` line 42

```js
router.get("/applicant/application/snapshots", verifyAuth, getApplicantApplicationSnapshotsBatch)
```

Path is `GET /applicant/application/snapshots` — singular "applicant", plural "snapshots".

FE call (`application.service.ts` line 30):
```ts
return this.baseService.get<any>(`${environment.api_url}/applicant/application/snapshots?applicationIds=${ids}`);
```

Path segment matches exactly. Auth middleware `verifyAuth` is present. Route is registered before any wildcard/catch-all routes.

**Gate A: PASS**

---

### Seam 2 — Response Shape / BaseService Unwrapping (Gate B)

**Three files form this seam: `status.js`, `base.service.ts`, component.**

**`helpers/status.js`:**
```js
const successMessage = { status: "success" };
```
`successMessage` is a module-level singleton. Controller mutates it in place:
```js
successMessage.data = { snapshots };
return res.status(status.success).send(successMessage);
```
Wire payload is:
```json
{ "status": "success", "data": { "snapshots": { "<id>": { "hasSnapshot": true, "completenessScore": 80, ... } } } }
```

**`base.service.ts`:**
```ts
public get<T>(url: string): Observable<T> {
  return this.http.get<T>(url);
}
```
`BaseService.get<T>()` is a pass-through to Angular `HttpClient.get<T>()`. No interceptor, no `.data` unwrapping, no custom transform exists in BaseService. The Observable emits the raw parsed JSON body.

**Component (`applicant-applications.component.ts` line 56):**
```ts
map((res: any) => res?.data?.snapshots ?? {}),
```
`res` is the raw JSON body `{ status, data: { snapshots } }`. Therefore:
- `res.data` = `{ snapshots: {...} }`
- `res.data.snapshots` = the ID-keyed map

The nesting level is correct. If the response were already unwrapped to `{ snapshots }`, the FE would read `undefined` and fall back to `{}` (silent failure). Confirmed it is NOT unwrapped — reading at the correct level.

**Gate B: PASS**

**Tech debt noted:** `successMessage` is a module-level singleton mutated on every request (pattern repeated 124 times across 15 controllers). Node.js is single-threaded so there is no actual race condition in current code — `successMessage.data = x` and `res.send(successMessage)` execute in the same event loop tick with no `await` between them. The risk is future: any refactor introducing an `await` between mutation and send could silently corrupt concurrent responses. Recommend inline response objects: `res.status(200).send({ status: "success", data: { snapshots } })`. Tracked as tech debt.

---

### Seam 3 — Missing IDs / snapshotFor() (Gate C)

**Flow for an applicationId that does not exist in `job_applicants`:**

1. BE: `SELECT ... FROM job_applicants WHERE job_application_id = ANY($1)` returns no row for the unknown ID.
2. `verifiedIds` excludes it — it never enters the `snapshots` map.
3. Wire: `snapshots` has no key for the unknown ID.
4. FE: `snapshotsMap.get(unknownId)` returns `undefined`.
5. `snapshotFor(unknownId)` returns `undefined ?? null` = `null`.
6. Template: `*ngIf="snapshotFor(app.jobApplicationId)"` is falsy → `#snapSilent` renders.

This is the intended design per the controller comment: *"IDs that don't exist are silently excluded from results (not a 403 — the caller owns the list, they may have IDs from before snapshots existed)."*

**Gate C: PASS**

---

### Seam 4 — 51+ IDs / Max-50 Guard (Gate D)

**BE guard (`applicationController.js` line 175):**
```js
if (applicationIds.length === 0 || applicationIds.length > 50) {
  errorMessage.error = "applicationIds must be a non-empty comma-separated list of up to 50 IDs.";
  return res.status(status.bad).send(errorMessage);  // HTTP 400
}
```

**FE — no pre-send guard.** `loadSnapshots()` sends all IDs from `this.applications` without checking count.

**FE error handling:**
```ts
catchError(() => of({})),
```
Angular treats HTTP 400 as an error. `catchError` intercepts it, returns `of({})`. The `map` operator before `catchError` is bypassed (error path skips `map`). The subscriber receives `{}`. `Object.entries({})` iterates nothing. `snapshotsLoaded = true`. All rows render `#snapSilent`.

**Failure mode documentation:**
- An applicant with 51+ applications loses all completeness badge data silently.
- The page renders without error. No user-facing message appears.
- Developer console shows an `HttpErrorResponse` (if DevTools open), but production users see nothing.

**Known gap, not fixed this pass** (fix would require FE batching logic — outside small/safe scope). Tracked in Fix Log as DEFERRED.

**Gate D: PARTIAL PASS** — graceful degradation confirmed; silent failure for 51+ applications documented.

---

### Seam 5 — encodeURIComponent / Double-Encoding (Gate E)

**FE (`application.service.ts` line 29):**
```ts
const ids = applicationIds.map(id => encodeURIComponent(id)).join(',');
```

UUIDs contain only hex digits (`0-9`, `a-f`) and hyphens (`-`). These are RFC 3986 unreserved characters — `encodeURIComponent` does not percent-encode them. The call is a functional no-op on valid UUIDs.

**BE (`applicationController.js` line 174):**
```js
const applicationIds = String(raw).split(",").map(s => s.trim()).filter(Boolean);
```
Express automatically URL-decodes `req.query` values before the handler runs. No manual decode in the controller. The split delimiter is literal `,` — not `%2C`. If a comma were ever percent-encoded, Express would decode it first and the split would handle it correctly.

**Upstream encoding check:** `applicationIds` originates from `this.applications.map(app => app.jobApplicationId)` — raw UUID strings from the API response JSON. No prior encoding in the data path was found.

**Gate E: PASS**

---

## 3. Cross-Cutting Observations

### Auth coverage
All three snapshot routes are protected:
- `GET /applicant/application/snapshot` — `verifyAuth` ✓
- `GET /applicant/application/snapshots` — `verifyAuth` ✓
- `GET /job/applicant/snapshot-summary` — `verifyAuth` ✓

### Ownership enforcement
The batch endpoint enforces ownership before returning data:
```js
const verifiedIds = appRows
  .filter(row => row.candidate_id === uid)
  .map(row => row.job_application_id);
```
IDs from other applicants are silently excluded rather than 403'd. This is correct — 403ing would allow enumeration: a caller could detect whether an ID is valid by comparing 403 vs absence.

### N+1 elimination confirmed
Previous single-snapshot endpoint (`/snapshot`) made 2 DB calls per ID. The new batch endpoint makes 3 DB calls total regardless of input list size (`job_applicants` ownership check + `application_snapshots` + `application_completeness_snapshots`). For 50 applications: 100 queries → 3 queries.

---

## 4. Gates Summary

| Gate | Description | Result |
|------|-------------|--------|
| A | `GET /applicant/application/snapshots` registered with `verifyAuth` | PASS |
| B | FE reads `res?.data?.snapshots` — correct nesting for raw `HttpClient` response | PASS |
| C | Non-existent IDs absent from map → `snapshotFor()` returns `null` → `#snapSilent` | PASS |
| D | 51+ IDs → HTTP 400 caught by `catchError(() => of({}))` → graceful degradation | PARTIAL |
| E | `encodeURIComponent` is no-op on UUIDs; no double-encoding; Express auto-decodes | PASS |

**Overall: 4 PASS / 1 PARTIAL — safe to ship, Gate D documented as known gap**

---

## 5. Files Inspected

| File | Purpose |
|------|---------|
| `get-hired-BE/controllers/applicationController.js` | Controller logic, ownership check, batch query, response shape |
| `get-hired-BE/routes/applicationRoute.js` | Route registration, auth middleware |
| `get-hired-BE/helpers/status.js` | `successMessage` singleton structure |
| `get-hired-FE/src/app/application/application.service.ts` | FE API call construction |
| `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` | `loadSnapshots()`, `snapshotFor()`, error handling |
| `get-hired-FE/src/app/core/services/base.service.ts` | BaseService — confirms no response unwrapping |
