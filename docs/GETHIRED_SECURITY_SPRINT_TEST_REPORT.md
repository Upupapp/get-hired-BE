# GetHired Security + UX Sprint — Test Report

**Date:** 2026-06-25
**Scope:** 21 files (BE ×14, FE ×7) changed in the security + UX fix sprint
**Build status:** PASS

---

## 1. Build Verification

**Result: PASS — 0 errors**

```
Build at: 2026-06-24T16:39:49.570Z - Hash: ae414135af4e385f - Time: 23111ms
```

**Errors vs baseline:** 0 (baseline 0). No new errors introduced.

**Warnings vs baseline:** 2 — both pre-existing, not introduced by the sprint:
- autoprefixer: `start` value has mixed support (add-contact-group.component.scss)
- CommonJS dependency: `xlsx` (excel-downloader.service.ts)

No new warnings attributable to the 21 changed files.

---

## 2. TypeScript Correctness

### 2a. job-create.component.ts — success$ subscription

**Verdict: CORRECT**

- `success$` is defined in `JobFacade` as `this.store.pipe(select(fromfeature.success))` — an `Observable<string | null>` derived from `state.succesMsg`.
- In `ngOnInit` (lines 127–130), subscribed exactly once:
  ```ts
  this.subscriptions.add(
    this.jobFacade.success$
      .pipe().subscribe(this.afterSubmit.bind(this))
  );
  ```
- `subscriptions` is declared as `subscriptions = new Subscription()` (line 34) — a concrete `Subscription` instance, not an array.
- `ngOnDestroy` (lines 538–541) calls `this.subscriptions.unsubscribe()` — subscription is cleaned up.
- FIX-02 comment is accurate: this was previously placed inside `setFormGroup`, which is called on every `editJob$` emission, causing multiple subscribers and therefore multiple dialogs per save event. Moving it to `ngOnInit` (called once) is the correct fix.
- No TypeScript type errors. `afterSubmit(event)` receives `string | null`; the `if (event == 'asDraft')` guard handles null safely (null never matches either branch).

**One note (not a bug, minor style gap):** `.pipe()` with no operators is a no-op. Harmless — does not affect runtime behavior or types.

### 2b. job.actions.ts — getJobSuccess / getJobFail type strings

**Verdict: CORRECT**

- `GetJobSuccess = '[job] -Get Job Success'` (line 63) — note the missing space after `-`. This is **pre-existing**, not introduced by the sprint.
- `GetJobFail = '[job] - Get Job Fail'` (line 64) — standard format.
- Both values are unique within the enum — no collisions with any other action string.
- The reducer (job.reducer.ts) uses `on(JobActions.getJobSuccess, ...)` at line 433 — it references the action creator object, not the string value. The string is transparent.
- The effects (job.effects.ts) use `ofType(JobActions.getJob)` — same pattern, transparent.
- No type errors introduced.

---

## 3. BE Logic Correctness — Ownership Checks

### 3a. getUserCompany — return value analysis

`getUserCompany(id)` is defined in `companiesController.js` (lines 186–212):

```js
const getUserCompany = async (id) => {
  // queries company_employees JOIN companies WHERE employee_uuid = $1
  if (!rows || rows.length == 0) {
    return [];          // <-- returns EMPTY ARRAY, not null/undefined
  }
  const dbResponse = {
    ...mappedCompany(rows[0]),  // includes companyId (string like "COM-xxxxxx")
    employeedCompanyId: rows[0].employee_id,
  };
  return dbResponse;   // <-- returns plain object with .companyId
};
```

`mappedCompany` (lines 416–441) returns an object where `companyId: raw.company_id`.

**Critical: When the user has no company, `getUserCompany` returns `[]` (an empty array), not `null` or `undefined`.**

### 3b. updateJob — ownership check analysis

```js
const callerCompany = await getUserCompany(req.user.uid);
const ownerCheck = await dbQuery.query(
  `SELECT job_id FROM ${dbSchema}.jobs WHERE job_id = $1 AND company_id = $2`,
  [jobId, callerCompany && callerCompany.companyId]
);
if (!callerCompany || ownerCheck.rows.length === 0) {
  return res.status(403).json({ ... });
}
```

**BUG (LOW SEVERITY): When `getUserCompany` returns `[]`, `callerCompany` is a truthy empty array. `callerCompany && callerCompany.companyId` evaluates to `undefined`. The ownership query runs `WHERE company_id = undefined` (passed as `$2 = undefined` to the pg driver, which serializes it as SQL `NULL`). The query returns 0 rows. The `ownerCheck.rows.length === 0` branch then correctly returns 403.**

Net result: a user with no company gets 403, which is the correct behavior. The path to 403 is indirect (via the ownerCheck returning empty), not via `!callerCompany`. This is a latent correctness issue (the `!callerCompany` guard never fires for the no-company case), but it does not produce an incorrect HTTP response. No security gap.

**TOCTOU race condition:** There is a gap between the ownership check SELECT and the UPDATE/DELETE execution. In theory, job ownership could transfer between those two queries. In practice, company ownership of a job does not change during normal operation (jobs are not transferred between companies). This is an acceptable trade-off. For a future hardening pass, wrapping both queries in a single transaction with a `FOR UPDATE` lock on the ownership row would close it completely.

**What if the ownership query itself throws?** The outer `try/catch` in `updateJob` catches it and returns 500 with `"Operation not successful. Please try again."` — safe.

### 3c. deleteJob — ownership check analysis

Identical pattern to `updateJob`. Same findings apply:
- `getUserCompany` returns `[]` for no-company users; check path reaches 403 via `ownerCheck.rows.length === 0`.
- TOCTOU gap between check and DELETE is acceptable for this workload.
- Outer catch handles ownership query throws safely with 500.

### 3d. Status codes preserved

Across all 14 controllers, 200 (success) responses use `res.status(status.success).send(successMessage)` unchanged. The sprint only touched catch blocks. Status code mapping:

| Controller | Catch block status | Status preserved? |
|---|---|---|
| userController.js | `status.error` (500) | Yes |
| jobsController.js | `status.error` (500) | Yes |
| applicantsController.js | `status.error` (500) | Yes |
| candidateController.js | `status.error` (500) | Yes |
| companiesController.js | `status.error` (500) | Yes |
| contactsController.js | `status.error` (500) | Yes |
| cvController.js | `status.error` (500) | Yes |
| employerController.js | `status.error` (500) | Yes |
| adminController.js | `status.error` (500) | Yes |
| interviewController.js | `status.error` (500) | Yes |
| messageController.js | `status.error` (500) + known-error routing | Yes |
| optionsController.js | `status.error` (500) | Yes |
| paymentController.js | `status.error` (500) | Yes |
| subscriptionController.js | `status.error` (500) | Yes |

All catch blocks now use `console.error('[controllerName] error:', error)` — no stack traces or internal details in the response. The error response body uses safe generic messages. **Verified.**

**One inconsistency (pre-existing, not introduced):** Some controllers set `errorMessage.error = ...`, others set `errorMessage.data = ...`. For example, `createJobs` uses `.data`, while `getIndustryList` uses `.error`. This was pre-existing and is not introduced by the sprint, but it means the FE error shape is inconsistent. Out of scope to fix here.

---

## 4. Template Correctness — F-09 Fixes

### 4a. signin.component.html

```html
<div class="alert alert-danger alert-dismissible fade show error-message mt-2"
  [@animate]="..." *ngIf="error" role="alert">
  <button ... aria-label="Close" (click)="onAlertClose()"></button>
  <span *ngIf="!verify">{{ error }}</span>
  ...
</div>
```

**Verdict: CORRECT**
- `{{ error }}` renders correctly inside the `*ngIf="error"` block — if `error` is null/undefined/empty, the div is hidden.
- `role="alert"` is present on the container div — screen readers will announce the error when it appears.
- No `aria-live` attribute, but `role="alert"` implies `aria-live="assertive"` per ARIA spec — equivalent and correct.

### 4b. change-pw.component.html

```html
<div class="alert alert-danger alert-dismissible fade show error-message"
  [@animate]="..." *ngIf="error" role="alert">
  <button ... aria-label="Close" (click)="onAlertClose()"></button>
  <span>{{ error }}</span>
</div>
```

**Verdict: CORRECT**
- `role="alert"` present. `{{ error }}` inside the guarded block.
- Screen reader will announce on show.

### 4c. reset-password.component.html

```html
<div class="alert alert-danger alert-dismissible fade show error-message"
  [@animate]="..." *ngIf="error" role="alert">
  <button ... aria-label="Close" (click)="onAlertClose()"></button>
  <span>{{ error }}</span>
</div>
```

**Verdict: CORRECT** — same pattern, role="alert" present, error is interpolated safely.

### 4d. company-basic.component.html

```html
<div class="alert alert-danger alert-dismissible fade show error-message"
  [@animate]="..." *ngIf="error" role="alert">
  <button ... aria-label="Close" (click)="onAlertClose()"></button>
  <span>{{ error }}</span>
</div>
```

**Verdict: CORRECT** — same pattern.

### 4e. employer-panel.component.html

The F-09 fix here was adding a `panelError` fallback state (lines 98–110):

```html
<ng-template #panelError>
  <div class="gh-fallback-page" role="alert" style="...">
    <p>We couldn't load your profile. Please refresh...</p>
  </div>
</ng-template>
```

**Verdict: CORRECT** — `role="alert"` present on the fallback container. The fallback is shown when `loading$` has emitted false but `employee$` never emitted (profile load failed). Screen readers will announce the message.

**One UX note (minor):** The billing bar (lines 80–92) links to `/recruiter/subscription` with no guard. If the employer has no company (edge case: token valid but company_employees row missing), the subscription page may fail to load data. This is a pre-existing architectural gap (not introduced by this sprint) — the subscription route depends on company context.

### 4f. Summary on aria-live / role="alert"

All five HTML files use `role="alert"` on the error container. Per WAI-ARIA 1.1, `role="alert"` has an implicit `aria-live="assertive"` and `aria-atomic="true"`. JAWS, NVDA, VoiceOver and TalkBack all announce `role="alert"` regions when they appear. The implementation is correct and sufficient for screen reader announcement.

**One gap to note:** The dismiss button inside the alert (`btn-close`) removes the Bootstrap class `show` (via `data-bs-dismiss="alert"`) but `onAlertClose()` on the Angular side sets `this.error = null`. This collapses the `*ngIf`, which removes the DOM node entirely — no stale `role="alert"` ghost left in the DOM. Correct.

---

## 5. Edge Case Analysis

### 5a. updateJob — ownership query throws

If `dbQuery.query(SELECT ... WHERE job_id = $1 AND company_id = $2)` itself throws (DB down, connection timeout), the outer `try/catch` in `updateJob` catches it and returns 500. Safe.

### 5b. getUserCompany returns [] for updateJob/deleteJob

As analyzed in Section 3b: `[]` is truthy, so `!callerCompany` is false. `callerCompany.companyId` is `undefined`. The ownership SELECT runs with `company_id = NULL`, returns 0 rows, and the `ownerCheck.rows.length === 0` branch fires — 403 returned. **The caller is correctly blocked.** No security gap, but the code path is unintuitive. Recommend a dedicated null-company guard:

```js
if (!callerCompany || Array.isArray(callerCompany) || !callerCompany.companyId) {
  return res.status(403).json({ message: "..." });
}
```

### 5c. success$ fires in ngOnInit before component is fully initialized

`success$` is an NgRx selector backed by the store. On subscribe, it immediately emits the current state value (stores are BehaviorSubject-like). The first emission will be `null` (initial `succesMsg: null` in the reducer). `afterSubmit(null)` is called — neither `if (event == 'asDraft')` nor `else if (event == 'published')` match, so nothing happens. **Safe** — no premature dialog.

On subsequent `saveJob` dispatches, the reducer sets `succesMsg: null` first (on `saveJob` action), then `succesMsg: 'asDraft'` or `'published'` on success. The subscription fires for both emissions. The `null` emission from `saveJob` is a no-op in `afterSubmit`. Only the `'asDraft'` or `'published'` emission triggers the dialog. **Correct.**

### 5d. Subscription & Billing bar — employer with no company

The billing bar link (`/recruiter/subscription`) is visible to all authenticated employers on mobile, including the (rare) edge case where the employer's Firebase token is valid but they have no row in `company_employees`. In that case:

- `getEmployerCompany` returns `[]` (from `getUserCompany`)
- `createPaymentIntent` calls `getUserCompany`, gets `[]`, evaluates `companyId = undefined`, throws `"User not registered in any Company"`, and returns 500

The user sees an error page on the subscription route, not a crash. The billing bar should ideally be hidden when no company exists. This is a pre-existing gap not introduced by the sprint — the billing bar was added as NEW-03 in the same sprint but does not check company existence before rendering.

**Recommendation:** Gate the billing bar on `employee$ | async` having a `companyId` property, or suppress it behind the same `*ngIf="employee$"` that wraps the rest of the panel (it is currently outside that ngIf — lines 80–92 are inside the `<section>` which is guarded by `*ngIf="employee$ | async as employee"`, so this is actually already gated. Re-verified: lines 80–92 are children of the `<section id="body-main-container" *ngIf="employee$ | async as employee">` element. If `employee$` has not emitted, the billing bar is not rendered. Correct.**

### 5e. editJob$ subscription in ngOnInit — not added to subscriptions

```ts
this.editJob$.subscribe((data: any) => {
  if (data) { this.setFormGroup(data); ... }
});
```

This subscription (lines 135–140) is **not added to `this.subscriptions`** and uses no `takeUntil`. If `jobDetails$` emits after the component is destroyed (e.g., navigate away then back quickly), this will call `setFormGroup` on a destroyed component. This is a pre-existing memory-leak risk, not introduced by the sprint. It is unlikely to cause visible bugs but will generate "ExpressionChangedAfterItHasBeenChecked" or no-op updates.

### 5f. loading$ subscription at class field level

```ts
loading$ = this.jobFacade.getJobLoading$
  .pipe()
  .subscribe(this.onLoad.bind(this));
```

This subscribes at class field initialization time (before the constructor completes), which is a pre-existing pattern. The subscription result is stored as `loading$` (not added to `subscriptions`). It is therefore not unsubscribed in `ngOnDestroy`. This is a pre-existing leak. The same pattern existed before the sprint changes.

---

## 6. Remaining Gaps

| # | Severity | File | Description |
|---|---|---|---|
| G-01 | LOW | jobsController.js | `getUserCompany` returns `[]` (not `null`) when user has no company. The `!callerCompany` guard in `updateJob`/`deleteJob` never fires; 403 is reached via the ownership SELECT returning empty instead. Functionally correct but fragile. Add an explicit `Array.isArray(callerCompany)` guard. |
| G-02 | LOW | jobsController.js | TOCTOU gap between ownership SELECT and UPDATE/DELETE. Acceptable risk for current scale. Future: wrap in a single transaction with `FOR UPDATE`. |
| G-03 | LOW | job-create.component.ts (line 135) | `editJob$.subscribe(...)` not tracked in `this.subscriptions`. Memory leak risk if user navigates away before the store emits. Add `takeUntil(this.unsubscribe$)` or add to subscriptions. |
| G-04 | LOW | job-create.component.ts (class field) | `loading$` field subscribes at field-init time and is never unsubscribed. Pre-existing. |
| G-05 | INFO | Multiple BE controllers | `errorMessage.data` vs `errorMessage.error` inconsistency across catch blocks. Pre-existing pattern, creates inconsistent FE error shape. |
| G-06 | INFO | job.actions.ts | `GetJobSuccess = '[job] -Get Job Success'` has a typo (missing space after `-`). Pre-existing, transparent to NgRx runtime. |
| G-07 | INFO | employer-panel.component.html | Billing bar depends on subscription route succeeding. If company row is missing, user sees a 500 error page on that route. Pre-existing; the bar itself is gated behind `employee$` so it is not rendered without a valid company. |

---

## Summary

| Area | Result |
|---|---|
| Build | PASS — 0 errors, 2 pre-existing warnings |
| TypeScript: job-create.component.ts | PASS — subscription correct, lifecycle correct |
| TypeScript: job.actions.ts | PASS — enum values unique, transparent to reducer/effects |
| BE: getUserCompany return value | Object (has `.companyId`) or `[]` (no company). Not `null`. |
| BE: updateJob/deleteJob ownership | Functionally 403s correctly even for no-company path, via ownerCheck returning empty. Not a security gap. Guard logic is fragile. |
| BE: 200 success responses | Unchanged across all 14 controllers |
| BE: catch blocks | All updated to `console.error` + safe message; HTTP status codes preserved |
| Templates: {{ error }} rendering | Correct in all 5 HTML files |
| Templates: role="alert" / aria-live | `role="alert"` present on all error containers; correct for screen readers |
| Edge cases | success$ initial null emit is safe; billing bar is gated by employee$; editJob$ subscription is an untracked pre-existing leak |
