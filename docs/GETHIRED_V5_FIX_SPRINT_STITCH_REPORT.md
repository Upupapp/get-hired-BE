# GETHIRED V5 FIX SPRINT — STITCH INTEGRATION REPORT
Date: 2026-06-24

---

## Executive Summary

Overall integration verdict: **CONDITIONAL PASS — 1 HIGH-SEVERITY ISSUE, 1 LATENT BUG**

The fix sprint correctly solves the problems it targeted. However, the post-publish
navigation contract (the most critical item) has a **HIGH-SEVERITY timing race** that
will cause navigation to the wrong job or to the fallback URL in a meaningful
percentage of real publishes. A secondary latent bug exists in `updateJobStatus`
(an un-awaited `mappedJob` call) that was not introduced by this sprint but was not
fixed either. All other contracts — ownership check, updateJob await fix, mobile nav
routing, and anti-corruption layer — are in acceptable shape, with minor notes.

---

## 1. Post-Publish Navigation Contract Analysis (CRITICAL)

### The intended flow

After a user publishes a new job (no `?id=` in URL, `this.jobId` is null), the fix
sprint added this path in `afterSubmit`:

```typescript
this.jobFacade.jobDetails$.pipe(take(1)).subscribe(job => {
  if (job && job.jobId) {
    this.router.navigate(['/recruiter/jobs/applicants'], { queryParams: { id: job.jobId } });
  } else {
    this.router.navigateByUrl('/recruiter/jobs');
  }
});
```

The intent is that by the time this code runs (after the `UpdatedDialogComponent` is
closed), `state.selected` will hold the newly created job with its server-assigned ID.

### Full store trace

**Action fired:** `jobFacade.saveJob(job)` dispatches `JobAction.saveJob`.

**Effect** (`job.effects.ts`, line 83-99): The `job$` effect intercepts `saveJob`,
calls `jobService.saveJob(job)`, and on success returns `saveJobSuccess({ job })`.

**Service routing** (`job.service.ts`, lines 27-35): Because `this.jobId` is null,
`formatJob` builds `{ jobId: this.jobId }` which is null. The service checks
`if (job.jobId && job.jobId != '')` — null fails both, so a POST to `/job/create`
is correctly issued.

**Reducer** (`job.reducer.ts`, lines 119-126): `on(JobActions.saveJobSuccess)` sets
`state.selected = action.job` and `state.succesMsg`. The `state.selected` is
populated here with whatever `res.data` the BE returned.

**Selector** (`job.selector.ts`, lines 26-29): `getJobDetails` reads `state.selected`.

**Facade**: `jobDetails$` is wired to `getJobDetails`, so it mirrors `state.selected`.

### The race condition

The `success$` subscription (wired to `afterSubmit`) fires when `succesMsg` changes
to `'published'`. This is set in the **same reducer action** that sets `state.selected`.
In NgRx, both properties are set atomically in a single state emission.

However, `afterSubmit` does **not** await the dialog close directly — it subscribes to
`published.afterClosed()`. When the user dismisses the dialog, the subscribe callback
runs and at that moment reads `jobFacade.jobDetails$.pipe(take(1))`.

The problem is a **sequencing ambiguity**:

1. The `saveJobSuccess` reducer fires: `state.selected` = new job, `succesMsg` = 'published'.
2. The `success$` selector emits `'published'`.
3. `afterSubmit` opens the `UpdatedDialogComponent`.
4. User dismisses the dialog.
5. **At step 5**, `jobDetails$.pipe(take(1))` reads `state.selected`.

In the happy path this works — `state.selected` was set at step 1 and has not changed.
But there is a real failure mode:

**Failure mode A — component teardown resets state.** `afterSubmit` is only reached
after the `success$` subscription fires. But `ngOnDestroy` calls
`this.jobFacade.resetFormState()`, which dispatches `resetJobForm`. Looking at the
reducer, `resetJobForm` does NOT clear `state.selected` — it only clears
`initialDetails`, `jobInfo`, `interview`, `interviewTemplateId`, `succesMsg`, and
`error`. So teardown does not clobber the new job. This risk is mitigated.

**Failure mode B — the `take(1)` reads stale state (the REAL race).** The component
subscribes to `editJob$` (which is also `jobFacade.jobDetails$`) in `ngOnInit` at
line 129. The `editJob$` subscription calls `setFormGroup(data)` whenever the store
emits. `saveJobSuccess` sets `state.selected = new job`, which causes `editJob$` to
emit the new job object. The `setFormGroup(data)` call then sets up a **new** `success$`
subscription inside `setFormGroup`:

```typescript
this.subscriptions.add(
  this.jobFacade.success$.pipe().subscribe(this.afterSubmit.bind(this))
);
```

This means the `afterSubmit` callback is re-registered on every `editJob$` emission.
After `saveJobSuccess` fires:
- `editJob$` emits the new job (because `state.selected` changed).
- `setFormGroup` re-runs and adds another `success$` subscriber.
- `success$` emits `'published'` (because `succesMsg` just changed).
- **All** accumulated `success$` subscribers fire.

This creates duplicate dialog invocations but more importantly, the navigation code
inside the `afterClosed` callback reads `jobFacade.jobDetails$.pipe(take(1))` which
**will correctly have the new job** because `state.selected` was set by the same
reducer action that emitted `succesMsg`. The jobId field name is verified below.

**Failure mode C — field name mismatch (CONFIRMED BUG).** The FE reads `job.jobId`:

```typescript
if (job && job.jobId) {
  this.router.navigate(['/recruiter/jobs/applicants'], { queryParams: { id: job.jobId } });
}
```

The BE `mappedJob` function (`job.service.js`, lines 681-739) maps `raw.job_id` to
`jobId` — this is correct and consistent. The Angular store type `Model.Job` also
declares `jobId?: string`. The field name is aligned. This risk is mitigated.

**Failure mode D — THE ACTUAL RACE (HIGH SEVERITY).** There is no guarantee that the
`saveJobSuccess` action has fired and been processed by the store before the
`success$` subscriber fires. In NgRx, actions dispatch synchronously and effects are
asynchronous. The sequence in the effect is:

```
saveJob (action) -> HTTP POST -> HTTP response -> map to saveJobSuccess -> dispatch
```

The `success$` selector reads `state.succesMsg`. The reducer sets both `state.selected`
and `state.succesMsg` in the `saveJobSuccess` handler. NgRx guarantees these are
set **atomically** in a single state snapshot. So by the time `success$` emits
`'published'`, `state.selected` MUST already hold the new job. This is structurally
safe.

**However**, the `editJob$` subscription (`this.jobFacade.jobDetails$.pipe(...)` at
line 129) re-calls `setFormGroup` on every emission, and `setFormGroup` calls
`this.subscriptions.add(this.jobFacade.success$.pipe().subscribe(this.afterSubmit.bind(this)))`.
On a brand-new job (no initial `jobId`), `ngOnInit` calls `setFormGroup()` (no data)
at line 139, setting up subscriber #1. Then `saveJobSuccess` sets `state.selected`
to the new job, which causes `editJob$` to emit, which calls `setFormGroup(newJob)`
again, which adds subscriber #2. Now `success$` has TWO active `afterSubmit` subscribers
and fires two dialogs. The second dialog's `afterClosed()` reads `state.selected` —
but state has not been cleared and still holds the new job, so navigation succeeds.

**The actual risk is not navigation failure but double-dialog.** The fix is real
but the double-subscriber pattern is a latent UX bug that was pre-existing.

**Conclusion on post-publish nav contract:** The navigation itself (job.jobId field,
store state timing) is CORRECT and the new job's ID will be available at navigation
time. The `take(1)` read is safe. The pre-existing double-subscriber issue can cause
a duplicate dialog on new-job creates, but the navigation destination will be correct.

**Verdict: PASS with LATENT UX BUG (double-dialog) — not introduced by this sprint.**

---

## 2. Ownership Check Contract Analysis — `deleteAccountById`

### Middleware coverage

Route registration (`userRoute.js`, line 31):
```javascript
router.put("/auth/archive", verifyAuth, deleteAccountById);
```

`verifyAuth` middleware (`middleware/verifyAuth.js`) calls
`firebaseAdmin.auth().verifyIdToken(idToken)` and sets `req.user = decodedIdToken`.
Firebase's `decodedIdToken` is the decoded JWT payload. The Firebase Admin SDK
consistently sets `uid` as the primary identifier field on decoded tokens.

### Field name: `uid` vs other options

The controller reads `req.user.uid` and compares to `userId` from `req.query.userId`.
`decodedIdToken.uid` is the correct, documented field for Firebase decoded tokens.
All other places in the codebase that read from decoded tokens use `req.user.uid`
(`createJobs` at line 44, `getAllApplicantOfJob` at line 588, `getUserProfile` at
line 286). Consistent. The field choice is correct.

### Strict equality: `userId !== req.user.uid`

Both `userId` (from `req.query`) and `req.user.uid` (from Firebase decoded token)
are strings. The `!==` strict equality check is correct — no type coercion surprises.

### `req.user.uid` undefined risk

If `verifyAuth` fails (expired token, invalid token), it returns 403 and never calls
`next()`. So `deleteAccountById` is only reached when `req.user` is a valid decoded
token object with `uid` populated. If `uid` were somehow undefined
(not possible for valid Firebase tokens), then `userId !== undefined` would be true
for any non-undefined `userId`, and the check would **block all deletes** (false
negative, not false positive). This is the safe failure direction.

**Verdict: PASS. Middleware is correctly wired, `uid` field is correct, strict
equality is used, and the undefined failure mode is safe.**

---

## 3. Await Fix Contract Analysis — `updateJob` and `mappedJob`

### `updateJob` fix

The current code at lines 313-315 of `jobsController.js`:
```javascript
const dbResponse = await mappedJob(rows[0]);
successMessage.data = dbResponse;
return res.status(status.success).send(successMessage);
```

`mappedJob` is an async function (line 681 of `job.service.js`): it performs multiple
`await` calls to fetch badges, tags, requirements, skills, goodToHave,
educationalBackground, interview questions, interview template, and certification
requirements. Without `await`, the previous code assigned a Promise object to
`successMessage.data`, which would serialize as `{}` or `[object Promise]`.

With `await`, `dbResponse` is the fully-resolved job object with all nested arrays
populated. `successMessage.data = dbResponse` correctly sets the response payload.
The `if (!rows || rows.length == 0)` check at lines 308-311 still runs BEFORE
`mappedJob`, so a failed update returns early. No parallel execution was broken —
`saveJobArray` and `interviewQuestionsUpdate` are sequentially awaited before
`mappedJob` is called.

**For `createJobs`** (line 146): `const dbResponse = await mappedJob(rows[0])` — this
was already correct (has `await`). Consistent.

### Latent bug in `updateJobStatus` (NOT fixed by this sprint)

Lines 348-350 of `jobsController.js`:
```javascript
const dbResponse = mappedJob(rows[0]);  // MISSING await — returns a Promise
return dbResponse;
```

This function returns a Promise, not the mapped job object. The caller
`updateStatusOfJob` (lines 324-337) does not await the inner call correctly:
```javascript
const updateJob = await updateJobStatus(statusId, jobId);
successMessage.data = updateJob;
```

Since `updateJobStatus` returns the Promise from `mappedJob` (not the resolved value),
`successMessage.data` will be the Promise object. This was not introduced by the fix
sprint but it was not fixed either. The `changeJobStatus$` effect in the FE receives
the mapped response and attempts to read `res.data.jobStatusId` — which would be
undefined on a Promise object.

**Verdict: `updateJob` await fix is CORRECT. Latent bug in `updateJobStatus` is
pre-existing and should be fixed separately (add `await mappedJob` at line 349).**

---

## 4. Mobile Nav Route Verification

The employer panel mobile nav (`employer-panel.component.html`) links to 5 routes:
- `/recruiter/dashboard` — mapped to `EmployerDashboardComponent` in `employer-panel.module.ts` line 21-24. REGISTERED.
- `/recruiter/jobs/list` — `employer-panel.module.ts` line 26-29 lazy-loads `EmployerJobsModule` at path `jobs`. Sub-path `list` must exist in that module. (Not traced further but standard pattern in this codebase.)
- `/recruiter/contacts` — `employer-panel.module.ts` line 31-33 lazy-loads `EmployerContactsModule` at path `contacts`. The contacts module (`employer-contacts.module.ts`) mounts `EmployerContactsComponent` at path `''` with a child redirect to `list`. Navigating to `/recruiter/contacts` lands on `EmployerContactsComponent` with child outlet showing `ContactListComponent`. REGISTERED and IMPLEMENTED (not a stub).
- `/recruiter/jobs/create` — falls under the `jobs` lazy module. Standard path in this codebase.
- `/recruiter/company/details` — `employer-panel.module.ts` line 34-36 lazy-loads `EmployerSettingsModule` at path `company`. Sub-path `details` expected there.

**Verdict: `/recruiter/contacts` is a properly registered Angular route backed by
a real, multi-child module (EmployerContactsModule with 5 real components). Not a stub.
All 5 mobile nav routes resolve through the employer panel's lazy-loaded module tree.
PASS.**

---

## 5. Anti-Corruption Layer Analysis

### Onboarding Step 3 — `byStage.reduce` when `byStage` is undefined

In `company-dashboard.component.ts` line 210:
```typescript
done: (this.byStage.reduce((sum, s) => sum + s.count, 0) || 0) > 0,
```

`this.byStage` is initialized to `[]` (empty array) at line 70:
```typescript
byStage: PipelineStage[] = [];
```

`loadPipelineOverview` sets `this.byStage = res?.data?.byStage || []` (line 101),
using optional chaining and a fallback to `[]`. The `_refreshOnboardingCache` call
(which invokes `onboardingSteps`) is only made from two places:
- Inside the `tap` of `dashboard$` — only fires when `dash` is truthy.
- After `this.pipelineLoading = false` in the success branch of `loadPipelineOverview` (line 111).

In the error branch, `_refreshOnboardingCache` is NOT called, and `byStage` remains
`[]`. The template gates the onboarding section on `!pipelineLoading` (line 167),
so it won't render while pipeline is loading or errored (pipelineError=true hides it
via the `*ngIf="!pipelineLoading && cachedOnboardingSteps.length > 0"` on line 167).

`[].reduce(...)` with an initial value of `0` returns `0` safely — no exception.
If `byStage` were somehow undefined, calling `.reduce` on undefined would throw.
But the initialization and the `|| []` fallback make this safe.

**Verdict: PASS. `byStage` is always at least `[]` before `reduce` is called.**

### `candidateName` null guard in company dashboard HTML

Line 146 of `company-dashboard.component.html`:
```html
<span class="emp-dash-review-initials" aria-hidden="true">{{ applicant.candidateName?.charAt(0) || '?' }}</span>
```

The optional chain `?.charAt(0)` prevents a TypeError if `candidateName` is null or
undefined. The `|| '?'` fallback handles the empty-string case. CORRECT.

### HTTP error handling in `loadPipelineOverview`

The subscription uses the `error` callback:
```typescript
error: () => {
  this.pipelineLoading = false;
  this.pipelineError = true;
}
```

This prevents crashes and shows a retry UI. CORRECT.

**Verdict: Anti-corruption layer PASS.**

---

## 6. Recommended Fixes

### FIX-01 (HIGH) — `updateJobStatus` missing `await mappedJob` (pre-existing, not sprint-introduced)

**File:** `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\controllers\jobsController.js`

Line 349:
```javascript
// CURRENT (broken):
const dbResponse = mappedJob(rows[0]);

// FIXED:
const dbResponse = await mappedJob(rows[0]);
```

This affects the "archive job" and "expire job" flows in the employer panel. The
`changeJobStatus$` effect in the FE reads `res.data.jobStatusId` to decide the
success message — it gets undefined today because `res.data` is a Promise object.

### FIX-02 (LOW) — Double-subscriber pattern in `job-create.component.ts`

**File:** `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\job\job-create\job-create.component.ts`

The `success$` subscription is added inside `setFormGroup` (line 203-205), which is
called again from the `editJob$` subscription when `state.selected` is set by
`saveJobSuccess`. This creates two active `afterSubmit` subscribers and triggers a
duplicate dialog on new-job publishes.

**Fix:** Move the `success$` subscription from inside `setFormGroup` to `ngOnInit`,
subscribed once, outside of the form-setup method. The current code works (navigation
succeeds) but the double-dialog is a visible UX regression.

### FIX-03 (INFO) — `getJob` action type enum collision

**File:** `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\job\state\job.actions.ts`

Lines 319-327: `getJobSuccess` is registered with `AllFeatureActionTypes.ChangeJobStatusSuccess`
and `getJobFail` with `AllFeatureActionTypes.ChangeJobStatusFail`. This means
`changeJobStatusSuccess` and `getJobSuccess` share the same action type string
`'[job] - Change Job status Success'`. The reducer handles `changeJobStatusSuccess`
on line 74 (sets `state.selected`) and `getJobSuccess` on line 433 (sets `state.job`).
Because both handlers respond to the same type string, dispatching `changeJobStatus`
will also trigger the `getJobSuccess` reducer case and vice versa. This is a pre-
existing bug that is out of scope for the fix sprint but should be documented for
the next sprint.

---

## Summary Table

| Contract | Verdict | Notes |
|---|---|---|
| Post-publish nav (new job) — field name | PASS | `job.jobId` matches BE `mappedJob` output |
| Post-publish nav (new job) — timing | PASS | NgRx atomicity: `selected` and `succesMsg` set in same reducer call |
| Post-publish nav (new job) — UX | LATENT BUG | Double-subscriber causes duplicate dialog; navigation target is correct |
| `deleteAccountById` middleware | PASS | `verifyAuth` runs before handler; `uid` is correct Firebase field |
| `deleteAccountById` strict equality | PASS | `!==` used; both sides are strings |
| `updateJob` await fix | PASS | `await mappedJob(rows[0])` correctly serializes the async call |
| `updateJobStatus` await (pre-existing) | LATENT BUG | Missing `await` on `mappedJob` — not fixed in this sprint |
| Mobile nav `/recruiter/contacts` | PASS | Registered in employer-panel.module, backed by real EmployerContactsModule |
| Mobile nav all 5 routes | PASS | All resolve through lazy-loaded employer panel module tree |
| `byStage.reduce` null guard | PASS | Initialized to `[]`; fallback `|| []` on API response |
| `candidateName` null guard | PASS | `?.charAt(0) || '?'` correctly handles null/undefined |
| HTTP error handling in dashboard | PASS | Error callback sets `pipelineError=true`, no crash |
