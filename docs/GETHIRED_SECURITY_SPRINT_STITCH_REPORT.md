# GETHIRED Security + UX Sprint — STITCH Integration Audit Report
Generated: 2026-06-25

## Overall Verdict

**MOSTLY SAFE with two real defects and one latent risk that should be fixed before the next release.**

The BOLA ownership checks in `jobsController.js` are correctly wired end-to-end. The NgRx action type strings are unique and reducers use the safe `on()` API. The mobile subscription bar route exists and is guarded.

Two defects found:
1. **DEFECT-01 (Medium):** `getUserCompany()` can return `[]` (empty array, truthy) when no company exists — both `updateJob` and `deleteJob` pass `callerCompany.companyId` which is `undefined` for that case, causing the ownership SQL to compare `company_id = NULL`, which is always false. Net effect: the ownership check still rejects the request, but for the wrong reason (SQL `NULL` comparison), and the error path hits `callerCompany.companyId = undefined` before the `!callerCompany` guard fires. This is a logic hole in the guard order — see Section 1 for fix.
2. **DEFECT-02 (Critical UX, not a regression):** The `signin.component.ts` `showError()` hardcodes a string comparison on the BE error message `"Please Verify Email with the link sent to your registered email address."` to trigger the verify link. This string is preserved unchanged in `userController.js`, so it still works — but it is a fragile coupling that will silently break if the BE message is ever genericized. Flagged as a risk, not a regression.

No FE components parse 403 message bodies for behavior. No NgRx string-match patterns found. The `success$` subscription is correctly placed in `ngOnInit`. The `/recruiter/subscription` route is guarded and exists.

---

## 1. Ownership Check API Contract Analysis

### `getUserCompany(uid)` — Definition

Defined in `companiesController.js` lines 186–212.

- Queries `company_employees` joined to `companies` + `industry` by `employee_uuid = uid`.
- **Return contract:**
  - If no rows: returns `[]` (empty array, **not** `null` or `undefined`)
  - If rows found: returns an object shaped `{ companyId, companyLogoUrl, companyName, ..., employeedCompanyId }`
- The `companyId` field maps to `raw.company_id` via `mappedCompany()`.

### `updateJob` ownership check (lines 275–282)

```js
const callerCompany = await getUserCompany(req.user.uid);
const ownerCheck = await dbQuery.query(
  `SELECT job_id FROM ${dbSchema}.jobs WHERE job_id = $1 AND company_id = $2`,
  [jobId, callerCompany && callerCompany.companyId]
);
if (!callerCompany || ownerCheck.rows.length === 0) {
  return res.status(403).json({ message: "..." });
}
```

**Bug:** When `getUserCompany` returns `[]` (no company for user):
- `callerCompany && callerCompany.companyId` evaluates to `callerCompany.companyId` (because `[]` is truthy), which is `undefined`.
- The SQL runs as `company_id = NULL` — which never matches (SQL NULL comparison).
- `ownerCheck.rows.length === 0` is true, so the 403 fires correctly.
- BUT: the `!callerCompany` guard intended to catch the no-company case never fires because `[]` is truthy.

**Net security impact:** Low — the check still blocks the request. But the SQL is still executed with a `NULL` parameter, and if the DB driver treats this differently, a gap exists. The fix is to add an `Array.isArray(callerCompany)` guard before the SQL call (matching the pattern already used in `getDashboardPipelineOverview`).

**Check order:** The ownership SQL runs BEFORE any DB mutation in both `updateJob` and `deleteJob`. This is correct — the check gates all subsequent operations.

**Column names:** The ownership query uses `job_id` and `company_id`. These match the column names confirmed in `createJobs` INSERT (`job_id, company_id`) and `getBasicJobList` SELECT (`j.job_id, j.company_id`). The schema is consistent.

### `deleteJob` (lines 207–212)
Same bug pattern as `updateJob`. The guard fires via `ownerCheck.rows.length === 0` but for the wrong SQL reason when the user has no company. Safe outcome, wrong mechanism.

### `getAllApplicantOfJob` (lines 621–623)
Uses `callerCompany.companyId !== jobCompanyId` strict equality. Same `[]`-truthy issue but guarded additionally by `!callerCompany` on the same line — however `![]` is false. Same pattern: would produce undefined in the comparison, which would correctly evaluate as `undefined !== someId` and reject. Safe but fragile.

### FE 403 handling in `job-create.component.ts`

The `job-create.component.ts` uses NgRx. The effect `job$` in `job.effects.ts` (lines 83–99) handles save failures via:
```js
catchError((err) => {
  const { error } = err.error;
  return of(JobActions.saveJobFail({ payload: error }))
})
```

This catches HTTP 403 responses but extracts `err.error.error`. The BE 403 for ownership uses `res.status(403).json({ message: "..." })` — the body has a `message` key, not `error`. So `error` will be `undefined` and `saveJobFail` will dispatch with `payload: undefined`.

The reducer's `saveJobFail` handler sets `error: action.payload` (undefined) and `succesMsg: null`. The job-create component has no explicit `saveJobFail` subscription and no UI snackbar or dialog for the failure case — the user sees the loading spinner stop with no feedback. This is a **UX gap for the 403 case** but not a crash or security bypass.

**Recommended fix:** In the 403 response, use `res.status(403).json({ error: "You don't have permission to update this job." })` so it aligns with the `err.error.error` extraction in the NgRx effect. Then add a `jobError$` subscription in `job-create.component.ts` to show a snackbar on failure.

---

## 2. Error Message Contract Changes Impact

### Genericized BE error messages

All 14 changed controllers now return `"Operation not successful. Please try again."` in error cases. This is a safe change for the vast majority of consumers.

### Critical FE string dependency found — signin flow

`signin.component.ts` line 127:
```typescript
if (err == 'Please Verify Email with the link sent to your registered email address.') {
  this.verify = true;
}
```

This hardcodes a string match on a specific BE error message to decide whether to show the "resend verification" link. The corresponding BE string in `userController.js` line 66:
```js
errorMessage.error = "Please Verify Email with the link sent to your registered email address.";
```

**These strings still match exactly.** This is NOT a regression from the current sprint. However, this string was NOT genericized in this sprint (verification errors are a distinct flow), so the feature still works.

**Risk:** If this BE message is ever changed to a generic message as part of a future error-message normalization pass, the `verify` branch in `showError()` will never fire, silently removing the "resend verification link" UX from the signin page. This should be documented as a coupling to break in a future sprint.

### Auth flow components (change-pw, reset-password)

Both components use `err.error.error` to display error messages. The BE auth controller error responses use `errorMessage.error = "..."` which serializes to `{ status: "error", error: "..." }`. The extraction `err.error.error` correctly reaches the message string. No behavioral change from genericization.

### No message-parsing for behavior in other critical FE flows

Searched all `.ts` files in `src/app` for `error.error`, `err.error.error`, `message === `, and switch/if on error strings. No other component makes behavioral decisions (routing, UI state changes) based on specific error message text from the 14 changed controllers.

---

## 3. NgRx Action Contract Analysis (FIX-03)

### Action type string uniqueness

Examined `AllFeatureActionTypes` enum in `job.actions.ts`:

| Action | String |
|---|---|
| `GetJob` | `'[job] - Get Job status'` |
| `GetJobSuccess` | `'[job] -Get Job Success'` ← note: missing space after `-` |
| `ChangeJobStatus` | `'[job] - Change Job status'` |
| `ChangeJobStatusSuccess` | `'[job] - Change Job status Success'` |

**All strings are unique.** The typo in `GetJobSuccess` (`'-Get'` vs `'- Get'`) is pre-existing and irrelevant because NgRx `createAction` uses object identity, not string matching, for `ofType()` and `on()`.

### Reducer usage

The reducer in `job.reducer.ts` exclusively uses `on(JobActions.someAction, ...)` — it never uses string matching. This is the safe NgRx v8+ pattern. No string-based `ActionTypes` matching anywhere in the reducer.

### Effects usage

`job.effects.ts` exclusively uses `ofType(JobActions.someAction)` — never `ofType('[job] - ...')` string literals. Safe.

### Potential getJobSuccess reducer side-effect bug (pre-existing)

The `getJobSuccess` reducer case (line 433–439) sets `succesMsg` to `'archived'` or `'expired'` based on `action.job.jobStatusId`:
```js
on(JobActions.getJobSuccess, (state, action): JobState => {
  return {
    ...state,
    job: action.job,
    jobLoading: false,
    succesMsg: action.job.jobStatusId == 4 ? 'archived' : 'expired'
  };
```

This means loading any job (even a live published job with statusId = 2) sets `succesMsg` to `'expired'`. In `job-create.component.ts`, `success$` fires `afterSubmit()` which checks for `'asDraft'` and `'published'` — neither `'archived'` nor `'expired'` matches, so `afterSubmit()` is a no-op when triggered by `getJobSuccess`. However, `success$` is initialized before `editJob$.subscribe()` and `getJobById()`, and `succesMsg` starts as `null` and resets to `null` on `getJob` dispatch. The false `'expired'` value emits, the component's `afterSubmit` guard (`if (event == 'asDraft')` / `else if (event == 'published')`) ignores it, and no dialog fires. **Net: no user-visible defect**, but the `succesMsg` state is semantically wrong for this action and could cause issues if any other consumer subscribes to `success$` and checks for `'expired'`.

This is a pre-existing issue, not introduced by this sprint.

---

## 4. success$ Subscription Contract (FIX-02)

### Subscription placement — CORRECT

In `job-create.component.ts` (lines 127–130):
```typescript
this.subscriptions.add(
  this.jobFacade.success$
    .pipe().subscribe(this.afterSubmit.bind(this))
);
```

This is subscribed **once** in `ngOnInit`, added to the `Subscription` aggregate. This is the correct fix — previously it was apparently subscribed inside `setFormGroup()`, which could be called multiple times (once by `editJob$.subscribe` and once by `getJobById`) causing multiple dialog opens on a single save event.

### Timing analysis — SAFE

`success$` is `store.pipe(select(fromfeature.success))` which is a BehaviorSubject-like selector that always emits the current store value on subscription. At subscription time in `ngOnInit`, `succesMsg` is `null` (initial state or reset by `resetJobForm()`), so `afterSubmit(null)` fires immediately. `afterSubmit` checks `if (event == 'asDraft')` / `else if (event == 'published')` — `null` matches neither, so it's a no-op. Safe.

### Early navigation cleanup — SAFE

`ngOnDestroy` calls `this.subscriptions.unsubscribe()`. The `Subscription` aggregate includes the `success$` sub. Angular's router destroys the component after navigation, triggering `ngOnDestroy` and unsubscribing. No memory leak or phantom dialog risk.

### Residual issue: success$ emits non-null values from unrelated actions

When the job is loaded via `getJobById()`, `getJobSuccess` reducer sets `succesMsg = 'expired'` (or `'archived'`). This propagates to `success$` which triggers `afterSubmit('expired')`. Because `afterSubmit` only handles `'asDraft'` and `'published'`, this is a no-op. Safe but semantically messy.

---

## 5. Mobile Subscription Bar Contract (NEW-03)

### Route existence — CONFIRMED

In `employer-panel.module.ts` (line 46–48):
```typescript
{
  path: 'subscription',
  loadChildren: () => import('./employer-subscription/employer-subscription.module').then(m => m.EmployerSubscriptionModule)
}
```

`EmployerSubscriptionModule` resolves to `EmployerSubscriptionComponent` at path `''` (root of module). Route is `/recruiter/subscription` — matches the bar's `routerLink="/recruiter/subscription"` exactly.

### Guard status — CORRECT

`/recruiter` is protected by `AuthGuard` with `data: { role: '2' }` in `app.routing.module.ts` (lines 36–44). The subscription route is a child of `/recruiter` and inherits this guard. An unauthenticated user or non-employer cannot reach it.

### No-company scenario

`EmployerSubscriptionComponent` loads the subscription module which renders the subscriptions list. The subscription list is a read-only view — it does not require a company to be set up to display (it will just show an empty/unsubscribed state). No crash scenario identified for a user who has logged in as an employer but has not yet set up a company.

### Bar layout — CORRECT

The subscription bar is positioned `bottom: 56px` (above the 56px-tall mobile nav). Z-index 999 matches the nav. `d-flex d-md-none` correctly hides it on desktop. The credit-card SVG icon is accessible (`aria-hidden="true" focusable="false"`). The `<a>` has `aria-label="Subscription and Billing"`. No layout conflicts identified.

---

## 6. Anti-Corruption Layer Assessment

### 200 response shape preservation

All 14 changed controllers preserve the `successMessage.data = ...` + `res.status(status.success).send(successMessage)` pattern for successful operations. No 200 response shape changes found.

### errorMessage mutation (shared object) — Pre-existing risk

`helpers/status.js` exports `successMessage` and `errorMessage` as **singleton mutable objects**. Controllers mutate these objects (e.g., `errorMessage.error = "..."`) before sending. Under concurrent requests, one request's error mutation could overwrite another's. This is a pre-existing architectural issue affecting all 14 controllers, not introduced by this sprint. Under Node.js single-threaded execution, the mutation-then-send is atomic within a tick, making this safe in practice — but it is not safe under async gaps (e.g., if `await` is inserted between mutation and send). The sprint's changes follow the existing pattern consistently.

### console.error format — CONSISTENT

All 14 controllers use `console.error('[controllerName] error:', error)` or `console.error('[functionName] error:', error)`. This is a consistent tagged format that log aggregators (e.g., Datadog, Papertrail) can parse by prefix. No bare `console.error(error)` patterns found in the changed controllers.

### Specific 403 response format inconsistency

The ownership-check 403 responses use `res.status(403).json({ message: "..." })` while the rest of the error infrastructure uses `res.status(status.error).send(errorMessage)` with shape `{ status: "error", error: "..." }`. This means 403 responses have a different body shape. The FE NgRx effect extracts `err.error.error` for the payload — 403s will produce `payload: undefined`. No crash, but the inconsistency means 403 errors are silently swallowed in the UI (no error message displayed). Recommend aligning 403 bodies to `{ error: "..." }` for consistent FE extraction.

---

## Recommended Fixes

### FIX-S1 (High — Logic correctness): Guard against array return from `getUserCompany`

In `jobsController.js` `deleteJob` and `updateJob`, and in `companiesController.js` `removeCompanyUser` and `updateCompany`, replace:

```js
const callerCompany = await getUserCompany(req.user.uid);
// ... SQL with callerCompany.companyId
if (!callerCompany || ...) { return 403 }
```

With:

```js
const callerCompany = await getUserCompany(req.user.uid);
if (!callerCompany || Array.isArray(callerCompany)) {
  return res.status(403).json({ error: "No company account found." });
}
// SQL with callerCompany.companyId guaranteed non-null
```

This mirrors the existing pattern in `getDashboardPipelineOverview` (line 375).

### FIX-S2 (Medium — UX): Align 403 body shape with FE extraction

Change ownership-check 403 responses from `{ message: "..." }` to `{ error: "..." }`:

```js
return res.status(403).json({ error: "You don't have permission to update this job." });
```

And add a `jobError$` subscription in `job-create.component.ts` `ngOnInit` to display a snackbar when `jobFacade.jobError$` emits a non-null value after a save attempt.

### FIX-S3 (Low — Coupling risk): Decouple signin verify-link logic from BE string

In `userController.js`, add a machine-readable field to the email verification error response:

```js
return res.status(status.unauthorized).send({
  ...errorMessage,
  error: "Please Verify Email with the link sent to your registered email address.",
  code: "EMAIL_UNVERIFIED"
});
```

In `signin.component.ts`, switch the guard to check `err.code === 'EMAIL_UNVERIFIED'` instead of string-matching the human-readable message. This decouples the UI state from the English-language copy.

### FIX-S4 (Low — Semantic): Fix `getJobSuccess` reducer setting wrong `succesMsg`

The `getJobSuccess` reducer sets `succesMsg` to `'expired'` for any loaded job. Change to:

```js
on(JobActions.getJobSuccess, (state, action): JobState => {
  return {
    ...state,
    job: action.job,
    jobLoading: false,
    succesMsg: null  // getJob is a read — does not trigger success UI
  };
```

---

## Summary Table

| Area | Status | Severity | Notes |
|---|---|---|---|
| Ownership check API contract | PASS WITH DEFECT | Medium | `[]`-truthy guard order bug; safe outcome, wrong SQL |
| 403 body shape | FAIL | Medium | `{message}` vs `{error}` — 403s silently swallowed in FE |
| Error message contract changes | PASS WITH RISK | Low | signin verify-link coupled to BE string; not a regression |
| NgRx action type uniqueness | PASS | — | All strings unique, no string-match patterns |
| Reducer uses `on()` API | PASS | — | Safe object-identity matching throughout |
| Effects use `ofType(Action)` | PASS | — | No string-literal ofType calls |
| `success$` subscription (FIX-02) | PASS | — | Single subscription in ngOnInit, cleaned up on destroy |
| Mobile subscription bar route | PASS | — | `/recruiter/subscription` exists, guarded by AuthGuard |
| No-company bar navigation | PASS | — | Subscription view is read-only, no company required |
| 200 response shapes preserved | PASS | — | All 14 controllers preserve existing success shapes |
| console.error format | PASS | — | Consistent tagged format across all 14 controllers |
