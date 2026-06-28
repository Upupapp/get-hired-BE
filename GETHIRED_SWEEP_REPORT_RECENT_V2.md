# GETHIRED_SWEEP_REPORT_RECENT_V2

Generated: 2026-06-25  
Scope: BE commits 83f0aae..8a2a205 + FE commit a25cb38

---

## Executive Summary

The three BE commits and one FE commit are generally sound. The factory
function refactor is clean across all 15 controllers — no regressions in
response shape. The RecordRTC lazy-load is implemented correctly in the
service layer, not the component, and works with Angular 13's dynamic
import. Three issues were found:

- **P1**: Module-level frozen timestamps in 5 files were NOT fixed — the
  commit claim ("frozen timestamps fix") only covered the 4 controllers
  listed. `applicant.service.js`, `applicant.service.js`,
  `company.service.js`, `interview.service.js`, and `job.service.js` all
  still freeze `new Date()` / `Date.now()` at module load time.
- **P2**: `verifyRoles.js` middleware still imports and mutates the legacy
  `errorMessage` singleton — the one surviving live mutation of a shared
  object post-refactor. Race condition risk under concurrent requests.
- **P2**: `userController.js` declares `const now = Date.now()` at module
  level (line 41) but never uses it — a dead orphan that suggests the
  original frozen-timestamp sweep missed this file.
- **P3**: `listRecruiterThreads` LIMIT 200 has no pagination mechanism.

---

## Findings by Severity

### P1 — Frozen timestamps: service layer not fixed

**Files affected:**
- `services/applicant.service.js` line 10: `const now = new Date();` — used
  as a query param in `createApplicationProfile`, `updateApplicationProfile`,
  `saveApplicantWorkExperience`, `saveApplicantEducationalBackground`,
  `saveCertifications`, `saveApplicantDetailsList`, and
  `updateProfileSaveVideoCV`. Every one of these writes the same frozen
  timestamp for the lifetime of the process.
- `services/company.service.js` line 7: `const now = new Date();` — used in
  company insert/update queries.
- `services/application.service.js` line 16: `const now = new Date();` — same pattern.
- `services/interview.service.js` line 7: `const now = new Date()` — used
  in interview template inserts.
- `services/job.service.js` line 12: `const now = Date.now();` — used in
  job query parameters.

**Impact:** All `created_at`/`updated_at` timestamps written via service
functions will be identical to the server start time, not the actual call
time. This breaks audit trails, subscription expiry calculations, and any
UI sorted by creation date.

**Fix:** Replace every module-level `const now` with an inline `new Date()`
or `Date.now()` at the point of use inside each query call.

---

### P2 — `verifyRoles.js` still mutates legacy singleton

**File:** `middleware/verifyRoles.js`  
**Lines 3, 34–35:**
```js
import { successMessage, errorMessage, status } from "../helpers/status";
// ...
errorMessage.error = 'Authentication Failed. Role not allowed';
return res.status(status.unauthorized).send(errorMessage);
```

The refactor converted all 15 controllers. `verifyRoles.js` was missed. It
mutates the shared `errorMessage` object, which is the race condition the
refactor was designed to eliminate. Under concurrent requests where two
threads both hit a role check failure simultaneously, they can overwrite each
other's `.error` string before sending — one response may carry the other
request's message.

**Fix:** Replace with `errorResponse("Authentication Failed. Role not allowed")`.

---

### P2 — Dead `const now` in `userController.js`

**File:** `controllers/userController.js` line 41: `const now = Date.now();`

This is never used anywhere in the file. It appears to be a leftover from
the original frozen-timestamp commit that was either mis-targeted or the
usage was already removed. Its presence is misleading (suggests something
reads it) and is a lint error waiting to happen.

**Fix:** Remove line 41.

---

### P3 — `listRecruiterThreads` LIMIT 200: no cursor/pagination

**File:** `services/message.service.js` line 218

LIMIT 200 is a reasonable safety cap, but there is no `offset`, `cursor`, or
`after_id` parameter. A company that legitimately accumulates >200 threads
(high-volume recruiter, bulk applicant outreach) silently loses older
threads from the inbox view with no indication that results were truncated
and no way to fetch the remainder.

**Assessment:** 200 is acceptable for current scale. This is not urgent but
should be addressed before messaging becomes a primary workflow tool.

**Suggested fix:** Add `?offset=0` support to the endpoint, or a
`lastThreadId` cursor on `updated_at`.

---

### P3 — `optionsController.js` dead `const now`

**File:** `controllers/optionsController.js` line 6: `const now = Date.now();`

Declared but never referenced in the file. Dead code.

---

## Verified Clean

**Factory function refactor — correctness (checked all 15 controllers):**  
All 15 controllers import `{ successResponse, errorResponse }` and use them
correctly. Response shape is consistently `{ status: "success", data: X }`
and `{ status: "error", error: "msg" }`. FE effects read `.data` off the
response object — confirmed in companies, admin, application, and applicant
effects. No FE consumer reads `.error` or `.status` in a way that would
break.

**No dead imports of `successMessage`/`errorMessage` in controllers:**  
The only non-comment occurrences of `successMessage`/`errorMessage` in active
code are in `verifyRoles.js` (addressed above) and the two comment blocks in
`companiesController.js` and `userController.js` — both are safely commented
out.

**pg pool max: 10 — no serial execution assumptions:**  
No raw `BEGIN`/`COMMIT` transactions were found in any controller or service.
All queries go through `dbQuery.query()`, which uses the pool's implicit
per-query connection acquisition and release. The `query()` wrapper resolves
and rejects cleanly; no connection leak paths were observed.

**listRecruiterThreads LIMIT 200 — query correctness:**  
The LATERAL join for the last message is correct and efficient. Company
scoping via `WHERE mt.company_id = $1` is enforced server-side. The LIMIT is
applied after the ORDER BY, so the 200 returned are always the most recently
active threads.

**RecordRTC lazy load — Angular 13 compatibility:**  
The dynamic import is in `recorder.service.ts` `record()` method (line 98):
```ts
const { default: RecordRTC } = await import('recordrtc');
```
This is inside an `async` private method called from a Promise chain —
Angular 13's webpack configuration supports dynamic `import()` for
code-splitting at this level. The `record-interview.component.ts` no longer
has a static RecordRTC import; it delegates entirely to `RecordService`. No
TypeScript type errors are expected because `RecordRTC` is typed as `any` at
point of use. The only concern is that `this.recorder` is typed as a private
field without annotation — acceptable given the existing `any`-typed service
contract.

**Frozen timestamp fix — the 4 listed controllers:**  
`subscriptionController.js`, `companiesController.js`, `employerController.js`,
and `jobsController.js` all correctly use inline `new Date()` at the point
of query parameter binding. The commit claim is accurate for these four files.

**addCompanyUserByEmail error masking:**  
The sanitized catch block (`msg: "Failed to add user"`) is intentional and
correct — internal Firebase/DB errors should not be surfaced to the caller.
The three distinct pre-throw cases (email already a user, Firebase/DB
registration failure, assignment failure) each return their own distinct
`msg`+`status` pair before reaching the catch, so the caller CAN distinguish
the common cases. The catch only fires for unexpected errors.
