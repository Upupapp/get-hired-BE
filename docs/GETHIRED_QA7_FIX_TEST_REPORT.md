# GetHired QA7 Fix Sprint — TEST Report
Generated: 2026-06-25
Scope: BE (jobsController.js, companiesController.js, applicantsController.js, contactsController.js, cvController.js) + FE (employer-panel.component.scss, job.reducer.ts, job-create.component.ts)

---

## 1. Build Verification

**Result: PASS**

Command: `npx ng build --configuration production`
Exit: 0 — no TypeScript errors, no new errors vs prior baseline.

Warnings present (all pre-existing, none introduced by QA7 sprint):
- `add-contact-group.component.scss` autoprefixer warnings: `start` → `flex-start` (lines 344–345). Pre-existing CSS warning, no functional impact.
- `xlsx` CommonJS/AMD dependency optimization bailout warning. Pre-existing, unrelated to QA7 changes.
- CSS selector parse warning: `legend+* -> Cannot read property 'type' of undefined`. Pre-existing.

No new warnings introduced by the QA7 changes.

Bundle sizes are within expected range; lazy chunk for `employer-panel` is largest at 555 kB raw, consistent with prior builds.

---

## 2. BE Logic — `updateStatusOfJob`

**File:** `controllers/jobsController.js` lines 355–385

### Job ID parameter name
The handler reads `const jobId = req.body.jobId` (line 356) and `const statusId = req.body.status` (line 357). Both come from `req.body`, not `req.params`.

### Is `getUserCompany` imported/available?
Yes. Line 27: `import { getUserCompany } from "./companiesController"`. The import is present and exports from `companiesController.js` line 725 confirm it is exported. No import gap.

### Does the ownership check run synchronously before the update?
Yes. The sequence is:
1. `await getUserCompany(req.user.uid)` — awaited, returns before continuing.
2. Array/null/companyId guard — returns 403 if any condition fails.
3. `await dbQuery.query(SELECT ... WHERE job_id=$1 AND company_id=$2)` — awaited, returns before continuing.
4. `ownerCheck.rows.length === 0` guard — returns 403 if no row.
5. Only then: `await updateJobStatus(statusId, jobId)` executes.

The ownership check is fully synchronous (in the async-await sense) relative to the update. There is no race condition in the handler itself.

### What if `getUserCompany` throws?
`getUserCompany` (`companiesController.js` lines 186–212) does NOT catch internally — it rethrows (`throw error` at line 209). If the DB is down or the query fails, the error propagates to `updateStatusOfJob`'s outer `catch` block (lines 382–384), which logs and returns HTTP 500 via `status.error`. Safe — no unhandled promise rejection, no partial state written.

### HTTP status on successful status change
`updateStatusOfJob` returns via:
```js
successMessage.data = updateJob;
return res.status(status.success).send(successMessage);
```
`status.success` is the standard HTTP 200 defined in `helpers/status`. The successful update is preserved and returned correctly. No regression on the success path.

---

## 3. BE Logic — Array.isArray Guard (Fix 3)

The guard pattern used across `updateJob`, `deleteJob`, and `updateStatusOfJob` is:

```js
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "..." });
}
```

### Mental-model test for each scenario:

| Scenario | Array.isArray | !callerCompany | !callerCompany.companyId | Guard fires? | Correct? |
|---|---|---|---|---|---|
| `getUserCompany` returns `null` | false | true | (short-circuits) | YES — 403 | PASS |
| `getUserCompany` returns `[]` (empty array — actual no-company return) | true | (short-circuits) | (short-circuits) | YES — 403 | PASS |
| `getUserCompany` returns `{ companyId: 'abc' }` | false | false | false | NO — proceeds | PASS |
| `getUserCompany` returns `{ companyId: null }` | false | false | true | YES — 403 | PASS |

All four scenarios are handled correctly.

**Note:** `getUserCompany` (`companiesController.js` line 199) returns `[]` (empty array, not `null`) when no company row is found. The `Array.isArray` check is specifically designed to handle this quirk of the original implementation. Without it, `!callerCompany` would be falsy (an empty array is truthy in JS), and `!callerCompany.companyId` would attempt `[].companyId` which is `undefined` — truthy for `!undefined` — so the guard would still fire. But the explicit `Array.isArray` check is cleaner and eliminates any ambiguity. Guard is robust.

---

## 4. BE Logic — Fix 4 Applicant Profile BOLA

**Files:** `controllers/applicantsController.js`, `services/applicant.service.js`

### `updateBasicProfileInfo` (controller, line 173–186)
```js
const profile = await updateProfileBasicInfo({ ...req.body, userId: req.user.uid });
```
The spread puts `userId: req.user.uid` **after** `...req.body`. In JavaScript object spread, later properties override earlier ones. If a caller supplies `userId` in the request body, the JWT-derived `req.user.uid` overwrites it. This is correct.

### `updateProfile` (controller, line 188–201)
```js
const profile = await updateApplicationProfile({ ...req.body, userId: req.user.uid });
```
Same pattern. JWT uid overwrites any caller-supplied `userId`. Correct.

### Service function signature and how `userId` is used

**`updateProfileBasicInfo` (service, line 272–360):**
- Accepts a single `applicant` object parameter.
- Destructures `userId` from it at line 278.
- Uses `userId` in the UPDATE WHERE clause: `WHERE user_id=$13` (line 313), with `userId` as the 13th param (line 329).
- Also passes `userId` to `updateUserProfile` call (line 344).
- The write **does** land with the JWT uid. Fix is effective.

**`updateApplicationProfile` (service, line 362–end):**
- Same pattern — destructures `userId`, uses in `WHERE user_id=$14` (line 422), param at line 438.
- The write **does** land with the JWT uid. Fix is effective.

### Admin-side profile edits
There is no separate admin controller for applicant profiles in the codebase. A search for `admin` in `applicantsController.js` returns no matches. The admin panel module (`main-admin-panel-admin-panel-module` in the FE build) is a separate lazy chunk (25 kB), but its BE surface has not been identified as going through `applicantsController.updateProfile`. If an admin route for editing applicant profiles exists, it would need its own review; however, this is out of scope for QA7 and no such route was found in `routes/applicationRoute.js`.

---

## 5. BE Logic — Fix 5 Contacts Ownership

**File:** `controllers/contactsController.js`

### Table and schema for contacts
The ownership checks use `${dbSchema}.contact` (singular, no trailing `s`) — consistent with the `deleteContact` query at line 72 (`DELETE FROM ${dbSchema}.contact WHERE contact_id=$1`). The schema prefix comes from `env.schema` which points to the `gethired` schema in production.

### Primary key column
`contact_id` (verified: line 87 `SELECT contact_id FROM ${dbSchema}.contact WHERE contact_id = $1 AND company_id = $2`).

### `company_id` on the contacts table
Yes — `company_id` is queried directly on the `contact` table in both `deleteContact` and `updateContact`. The column is used as a WHERE constraint without a JOIN, so it must be a direct column on the table.

### Groups table
The ownership checks use `${dbSchema}."group"` (quoted reserved word) — consistent with the DELETE query at line 317. Primary key is `group_id`. Company ownership checked via `company_id` directly on the `"group"` table (lines 241, 332).

### Correctness of column names
Column names used: `contact_id`, `company_id` in `contact` table; `group_id`, `company_id` in `"group"` table. These are consistent with the existing `checkContactIfExist` and `checkGroupIfExist` service calls (which query the same tables) and with the pre-existing delete queries. No column name mismatch found.

---

## 6. BE Logic — Fix 6 CV Ownership

**File:** `controllers/cvController.js`

### Table and column names
- Table: `${dbSchema}.cv` (singular) — used in `createCV`, `updateCV`, `deleteCV`, `getUserCVlist`, `getCvById`. Consistent.
- Primary key column: `cv_id` (line 91, 142).
- User/owner column: `user_id` (line 91 `WHERE cv_id = $1 AND user_id = $2`; line 143 same pattern).

Both `updateCV` and `deleteCV` ownership checks correctly reference `cv_id` and `user_id`. Column names match the INSERT at line 23 (`user_id, name, title, ...`).

### `updateCV` — JWT uid sourcing
Line 87: `const userId = req.user.uid;` — explicitly sourced from the JWT, not from `req.body`. The caller-supplied `userId` in the body is never read. Correct.

### `deleteCV` — what gets deleted
`deleteCV` issues exactly one DELETE:
```sql
DELETE FROM ${dbSchema}.cv WHERE cv_id=$1
```
It deletes only the `cv` row. There is no cascade to linked files in Firebase Storage (the CV files are uploaded via `uploadInStorage` during `createCV`/`updateCV` but there is no cleanup call on delete). This is a **pre-existing limitation**, not introduced by QA7 — the STITCH-era comment on line 136 notes it was already parameterized. No linked-file cleanup side effect was missed by QA7; it was already absent before the fix. No orphaned-file cleanup mechanism exists anywhere in cvController for delete.

---

## 7. FE — `job.reducer.ts` (Fix 8)

**File:** `src/app/job/state/job.reducer.ts` lines 433–439

### `getJobSuccess` case
```ts
on(JobActions.getJobSuccess, (state, action): JobState => {
  return {
    ...state,
    job: action.job,
    jobLoading: false,
    succesMsg: null  // QA7 FIX-8
  };
}),
```
- `job` is set to `action.job`. PASS — the job is stored in state correctly (mapped to `state.job`, not `state.selected`; this is consistent with the selector `getJobById` using `state.job`).
- `jobLoading: false` correctly clears the loading flag.

### Is `succesMsg: null` the correct neutral value?
The initial state at line 39 sets `succesMsg: null`. The FE reads `succesMsg` to trigger dialogs/snackbars (e.g., `afterSubmit` in `job-create.component.ts` checks `event == 'asDraft'` or `event == 'published'`). The facade exposes `success$` which maps from the store. When `succesMsg` is `null`, nothing fires. Setting it to `null` in `getJobSuccess` is correct — it prevents a stale `'published'` or `'asDraft'` string from a previous save operation from being re-processed if `getJobSuccess` fires after a save.

### Does setting `succesMsg: null` affect `changeJobStatusSuccess` or other cases?
No. Each `on(...)` case is independently evaluated. `changeJobStatusSuccess` (lines 74–81) still sets `succesMsg` to `'archived'` or `'expired'` based on `action.job.jobStatusId`. The `getJobSuccess` case only affects state when `getJobSuccess` action is dispatched. No cross-case interference.

---

## 8. FE — `job-create.component.ts` (Fix 9)

**File:** `src/app/job/job-create/job-create.component.ts`

### `loading$` tracked in subscriptions bag?
Yes. Lines 131–134:
```ts
this.subscriptions.add(
  this.jobFacade.getJobLoading$.pipe().subscribe(this.onLoad.bind(this))
);
```
`getJobLoading$` is correctly added to the `subscriptions` Subscription bag. Previously this was a class-level property subscription that never got cleaned up. Now tracked.

### `editJob$` tracked in subscriptions bag?
Yes. Lines 139–147:
```ts
this.subscriptions.add(
  this.editJob$.subscribe((data: any) => {
    if (data) {
      this.setFormGroup(data);
      this.status = data.jobStatusId;
    }
  })
);
```
Previously `editJob$` was defined as a class-level pipe (line 83–87) but subscribed inside `setFormGroup` (which was called repeatedly). Now it is subscribed once in `ngOnInit` and added to the bag. Correct.

### Order of subscription setup
In `ngOnInit`, subscriptions are set up in this order:
1. `success$` (line 126–129) — dialog/navigation trigger
2. `getJobLoading$` (line 131–134) — loading spinner
3. `editJob$` (line 139–147) — form population

All three subscriptions are registered before the async `asyncLocalStorage.getItem('user')` resolves (line 117 — async, so returns immediately and runs later in the microtask queue), and before `getJobById()` (line 149–153) is called. This is safe — the subscriptions are wired before any store dispatch can return results.

**One note:** `setFormGroup()` (lines 215–232) internally calls `this.subscriptions.add(...)` for `initialData.statusChanges` and `jobInfo.statusChanges`. These are called from inside `editJob$`'s subscription callback, meaning they fire each time `editJob$` emits a truthy value. If `editJob$` emits multiple times (e.g., store update then another store update), `setFormGroup` is called again and additional form-status subscriptions are added to the bag without unsubscribing the previous ones. This is a **pre-existing issue** not introduced by QA7 (the original code had the same problem). The QA7 fix correctly prevents the `editJob$` subscription itself from leaking, but the inner `setFormGroup` subscriptions could accumulate. Flag for a future cleanup pass.

### `ngOnDestroy` still calls `unsubscribe()`?
Yes. Line 547: `this.subscriptions.unsubscribe()`. All tracked subscriptions (including the new `getJobLoading$` and `editJob$`) are unsubscribed on destroy.

---

## 9. Edge Cases

### `updateStatusOfJob`: job doesn't exist (not just wrong company)
If the job_id doesn't exist in the `jobs` table at all, the ownership check query:
```sql
SELECT job_id FROM ${dbSchema}.jobs WHERE job_id = $1 AND company_id = $2
```
will return 0 rows (job_id not found). The handler returns 403 — same as a wrong-company case. This is acceptable: it doesn't leak whether the job exists at all (no information leak). The fix handles non-existent jobs correctly, even if the HTTP status (403 vs 404) is slightly imprecise. Acceptable security posture — returning 404 for non-existent jobs could be exploited for enumeration.

### `contactsController` TOCTOU on deleted contacts
`deleteContact` calls `checkContactIfExist` before the ownership check, then issues the DELETE. If a contact is deleted between `checkContactIfExist` and the `dbQuery.query(deleteQuery)`, the DELETE simply affects 0 rows and returns no error (no `rowCount` check). The response returns success with "Contact Successfully Deleted" even though nothing was deleted. This is a pre-existing TOCTOU gap, not introduced by QA7. The QA7 ownership check sits between `checkContactIfExist` and the DELETE — its `ownerCheck` SELECT is subject to the same TOCTOU window. Risk is low (attacker would need to race a legitimate delete), but worth noting for a future hardening pass: fold the ownership check into the DELETE WHERE clause (as was done for jobs).

### `cvController.deleteCV`: admin CV deletion via this endpoint
This endpoint is now locked to `req.user.uid` ownership. Any admin route that previously relied on calling this endpoint to delete a user's CV (e.g., "admin deletes a problematic CV") will now receive 403. No admin controller for CV deletion was found in the codebase (`controllers/` has no separate admin CV controller), and the routes file (`routes/cvRoutes.js`) has no admin-specific route variant. The FE admin panel module is 25 kB and was not inspected, but given no admin CV route exists on the BE, the risk of breaking a legitimate admin flow is low. If admin CV deletion is ever needed, a separate admin-authenticated endpoint with role-check bypass would be the correct approach.

---

## Summary Table

| Test | Status | Key Finding |
|---|---|---|
| 1. Production build | PASS | Clean build, no new errors, 3 pre-existing warnings |
| 2. updateStatusOfJob params | PASS | `req.body.jobId`, getUserCompany imported, sync check before update, catch is safe, returns 200 on success |
| 3. Array.isArray guard scenarios | PASS | All 4 scenarios (null, [], object-with-id, object-with-null-id) handled correctly |
| 4. Applicant profile BOLA — spread override | PASS | `userId: req.user.uid` as last spread key correctly overrides caller-supplied userId; service uses userId in WHERE clause |
| 5. Contacts ownership — column names | PASS | `contact.contact_id`, `contact.company_id`, `"group".group_id`, `"group".company_id` all correct |
| 6. CV ownership — column names | PASS | `cv.cv_id`, `cv.user_id` correct; deleteCV deletes row only (no file cleanup — pre-existing gap, not QA7-introduced) |
| 7. job.reducer.ts getJobSuccess | PASS | Job set in state.job, succesMsg: null correct neutral value, no cross-case interference |
| 8. job-create.component.ts subscriptions | PASS | loading$ and editJob$ both tracked; order is safe; ngOnDestroy unsubscribes all |
| 9. Edge cases | FLAGS | TOCTOU on contacts (pre-existing, low risk); inner setFormGroup subscriptions accumulate on multiple editJob$ emissions (pre-existing, not QA7-introduced); admin CV deletion now blocked by ownership check (no admin CV endpoint found, low risk) |

### Issues Requiring Follow-up (non-blocking for QA7 sprint)
1. **TOCTOU in contactsController** — `deleteContact` and `deleteGroup` do existence check + ownership check + delete as three separate queries. Fold ownership into the DELETE WHERE clause to eliminate the race window (mirrors how `deleteJob`/`updateJob` handle it).
2. **setFormGroup subscription accumulation** — `job-create.component.ts` calls `setFormGroup` (and subscribes `initialData.statusChanges` + `jobInfo.statusChanges`) from within the `editJob$` emission callback. Multiple store updates accumulate duplicate subscriptions in the bag. They are all unsubscribed on destroy, so no leak persists across navigations, but it wastes resources during the component's lifetime. Convert form status subscriptions to async pipe in template or guard with `take(1)`.
3. **deleteCV orphaned storage** — No Firebase Storage cleanup on CV delete. Low priority; files accumulate but are not security-sensitive.
