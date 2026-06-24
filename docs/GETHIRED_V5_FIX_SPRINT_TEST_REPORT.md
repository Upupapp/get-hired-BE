# GetHired V5 Fix Sprint — Test Report
**Date:** 2026-06-24
**Scope:** 13 changed files across FE (11) and BE (2)
**Auditor:** Claude Code TEST agent

---

## 1. Build Result

**PASS — 0 errors, 3 warnings (all pre-existing)**

Build completed in 26.5 s. Hash: c1f01d87491474a2.

Warnings present:
1. `add-contact-group.component.scss` line 344–345 — autoprefixer: `start` value, use `flex-start` instead. **Pre-existing.**
2. `excel-downloader.service.ts` — CommonJS/AMD `xlsx` optimization bailout. **Pre-existing.**
3. CSS selector warning: `legend+*` / `Cannot read property 'type' of undefined` (PostCSS). **Pre-existing.**

No new errors or warnings were introduced by the fix sprint. The baseline of 0 errors / 2–3 pre-existing warnings is maintained.

---

## 2. TypeScript Correctness

### job-create.component.ts

**`take` import** — PASS. Line 6 imports `take` directly from `'rxjs'` (not from `'rxjs/operators'`). Valid for RxJS 7+ (Angular 13 ships RxJS 7).

**`jobFacade.jobDetails$` existence** — PASS. `jobFacade.jobDetails$` is declared at line 12 of `job.facade.ts` as `this.store.pipe(select(fromfeature.getJobDetails))`. The selector (`job.selector.ts` line 27) returns `state.selected`, which is typed `Model.Job | null` in the reducer.

**Subscribe callback typing** — PASS. The callback receives `job` typed as `Model.Job | null`. The guard `if (job && job.jobId)` is present and correct before navigation. The `else` fallback navigates to `/recruiter/jobs` safely.

**Null-safe publish gate** — PASS. `job.jobCity != null && job.jobCity !== ''` is correct double-guard pattern. All other fields use truthiness checks. `!!(...)` wrapping correctly coerces to boolean for `this.isReadyToPublish: boolean`.

**companyId in isReadyToPublish** — PASS. `job.companyId` is included in the guard (line 357). `companyId` is populated via `this.companyId` set in `ngOnInit` from localStorage, then assigned in `formatJob()` at line 415.

**console.logs removed** — CONFIRMED. No `console.log` calls remain in `job-create.component.ts`. (BE `jobsController.js` retains `console.error` calls for server-side diagnostics — this is appropriate.)

**One correctness gap found — `state.selected` vs `job` naming:**
The subscribe callback in `afterSubmit` (line 463) uses:
```typescript
this.jobFacade.jobDetails$.pipe(take(1)).subscribe(job => {
```
The variable is named `job`, not `state.selected` — this matches the selector output correctly (the selector returns `state.selected` but the emitted value is the job object itself). No issue.

**One timing risk — NEW JOB navigation:**
When a new job is published, `saveJobSuccess` fires and updates `state.selected` to the newly created job. The `afterSubmit` callback subscribes inside `dialogRef.afterClosed()`. The dialog closes after the user clicks OK. By that time, the NgRx store `state.selected` will already hold the new job (the action succeeded before the dialog opened). `take(1)` will receive it immediately. This is safe in the happy path.

However: `afterSubmit` is triggered by `success$` which emits `state.succesMsg`. The component also resets form state in `ngOnDestroy()` via `jobFacade.resetFormState()`. If `resetJobForm` action fires before `afterClosed()` resolves, `state.selected` would be cleared to `null`. Looking at the code: `resetFormState()` is only called in `ngOnDestroy()` and `cancel()`, not in `afterSubmit`. The dialog is modal (`disableClose: true`), so the component is not destroyed until after the dialog closes and navigation starts. **This timing is safe.**

---

### company-dashboard.component.ts

**`byStage` null guard** — PASS. `byStage` is initialized as `PipelineStage[] = []` (line 70). In `loadPipelineOverview()`, it is assigned `res?.data?.byStage || []` (line 101) — the `|| []` ensures it is never null/undefined. The `.reduce()` in `onboardingSteps()` at line 210 therefore always runs on an array. Empty array edge case: `[].reduce((sum, s) => sum + s.count, 0)` returns `0` (the initial value), which is correct.

**reduce sum correctness** — PASS. `this.byStage.reduce((sum, s) => sum + s.count, 0)` correctly sums all stage counts. The `|| 0` wrapper after the reduce is redundant (reduce always returns a number given the initializer) but harmless.

**cachedOnboardingSteps update correctness** — PASS. The cache is refreshed in two places:
- Inside `dashboard$`'s `tap()` operator (line 56–62): called whenever the dashboard stream emits.
- At the end of `loadPipelineOverview()` `next` handler (line 110): called after `byStage` and `needsReviewCount` are fully assigned.

This means `_refreshOnboardingCache()` always has current data from both sources. The first call from `dashboard$` may fire before pipeline data arrives (so step 3's `done` condition uses the initialized `byStage = []`, yielding `0 > 0 = false`). The second call after pipeline data arrives corrects this. The template guards on `!pipelineLoading` so the checklist is not shown until both calls have fired. **No stale-cache scenario.**

---

## 3. Template Correctness

### employer-panel.component.html

**5 mobile nav items** — PASS. All 5 items present with valid `routerLink` values:
1. `/recruiter/dashboard` — Dashboard
2. `/recruiter/jobs/list` — Jobs
3. `/recruiter/contacts` — Candidates
4. `/recruiter/jobs/create` — Post a job (with `--create` modifier class)
5. `/recruiter/company/details` — Company

**aria-labels** — PASS. All 5 items have `aria-label` attributes. Values: "Dashboard", "Jobs", "Candidates", "Post a job", "Company". These match the visible `<span class="gh-mobile-nav-label">` text.

**routerLinkActive on Post Job** — PASS. Uses `routerLinkActive="gh-mobile-nav-item--active"`. This is consistent with the other four nav items. The CSS class exists in `employer-panel.component.scss` (implied by the `--active` modifier pattern).

**Nav order** — PASS. Candidates is item 3 (between Jobs and Post Job), which is a logical grouping.

**One gap — routerLinkActive exact matching:**
`/recruiter/jobs/create` is a child path of `/recruiter/jobs/list`'s parent `/recruiter/jobs`. Angular's `routerLinkActive` does prefix matching by default, so visiting `/recruiter/jobs/list` could also activate the Post Job item if both share a common prefix `/recruiter/jobs`. However, the full routerLinks are distinct (`/recruiter/jobs/list` vs `/recruiter/jobs/create`), so Angular's prefix matching would only trigger if one is a literal prefix of the other. `/recruiter/jobs/create` is not a prefix of `/recruiter/jobs/list`, and vice versa — they are sibling routes. **No issue.**

---

### signup.component.html

**`{{ error }}` placement** — PASS. The error display is at lines 82–87:
```html
<div class="alert alert-danger ..." *ngIf="error" role="alert">
  <button type="button" class="btn-close ..." (click)="onAlertClose()"></button>
  <span>{{ error }}</span>
</div>
```
This is in the same location the `[innerHtml]` binding was. The containing `<div>` has `role="alert"`, which is the correct ARIA live region for error announcements.

**XSS risk eliminated** — CONFIRMED. Using `{{ error }}` (text interpolation) vs `[innerHtml]` is strictly safer. Angular's template interpolation escapes HTML entities, so a server-side error message containing `<script>` or other HTML cannot be injected.

**role="alert" present** — PASS. The parent `<div>` at line 83 carries `role="alert"`. Screen readers will announce the error when it appears.

**One gap — error may contain raw API message text:**
`[innerHtml]` was presumably used because error messages from the backend might contain HTML formatting. Switching to `{{ error }}` will now display any HTML tags literally (e.g., `<br>` appears as `&lt;br&gt;`). This is the correct security tradeoff but may affect display if any error strings contain intentional HTML. Recommend reviewing backend error strings for embedded markup.

---

### company-dashboard.component.html

**`applicant.candidateName?.charAt(0) || '?'`** — PASS. Angular 13 supports optional chaining (`?.`) in templates. `String.prototype.charAt(0)` on an empty string `''` returns `''`, which is falsy, so `|| '?'` correctly falls through to `'?'`. On `null` or `undefined`, optional chaining short-circuits to `undefined`, also falsy, yielding `'?'`. **All null/empty cases handled correctly.**

---

## 4. BE Logic Correctness

### jobsController.js — `await mappedJob`

**`createJobs` (line 146):**
```javascript
const dbResponse = await mappedJob(rows[0]);
```
PASS. `mappedJob` in `job.service.js` (line 681) is declared `async` and performs multiple `await` DB calls internally (badges, tags, requirements, skills, etc.). `await mappedJob(rows[0])` correctly awaits the Promise. The result is the fully-hydrated job object including `jobId: raw.job_id`. The FE store's `saveJobSuccess` action receives `action.job` which will have `jobId` populated — the new-job navigation branch (`job.jobId` check) will succeed.

**`updateJob` (line 313):**
```javascript
const dbResponse = await mappedJob(rows[0]);
```
PASS. Same pattern — correctly awaited.

**`updateJobStatus` (line 348 — not in fix sprint scope but relevant):**
```javascript
const dbResponse = mappedJob(rows[0]);  // NOT awaited
return dbResponse;
```
REGRESSION RISK — EXISTING BUG NOT IN SPRINT SCOPE. `updateJobStatus` calls `mappedJob` without `await`. This returns a Promise object, not the resolved job data. This function is called from `updateStatusOfJob` route handler. This bug predates the fix sprint and was not introduced by it, but it means `changeJobStatus` action in the FE receives a Promise (serialized as `{}` by NgRx) instead of the real job object. **Flag for a follow-up fix.**

**Error message changes** — PASS. Both `createJobs` and `updateJob` catch blocks now use `errorMessage.data` (not `errorMessage.error`) with a generic user-safe message. Success path responses are unchanged — they use `successMessage.data = dbResponse` and `res.status(status.success)`.

---

### userController.js — ownership check in `deleteAccountById`

```javascript
const deleteAccountById = async (req, res) => {
  const { userId } = req.query;

  if (userId !== req.user.uid) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  // ...
};
```

**`verifyAuth` middleware present** — PASS. Route at `userRoute.js` line 31: `router.put("/auth/archive", verifyAuth, deleteAccountById)`. The `verifyAuth` middleware runs first, so `req.user` is always populated when `deleteAccountById` executes. If `verifyAuth` fails (invalid/missing token), it returns 401 before the handler runs.

**`userId` undefined case** — GAP. If the caller sends `PUT /auth/archive` with no `userId` query param, `userId` will be `undefined`. The comparison `undefined !== req.user.uid` will be `true` (since `req.user.uid` is a non-undefined Firebase UID string), so the handler returns 403 — a safe denial. **No privilege escalation possible.** However, the 403 message "Forbidden" is slightly misleading (the real problem is a missing parameter). This is acceptable for security (avoids leaking parameter expectations) but consider 400 for missing param before the ownership check in a future iteration.

**Self-delete allowed, cross-user blocked** — PASS. A user may only delete their own account (`userId === req.user.uid`). An authenticated user attempting to delete a different user's account receives 403.

**Type coercion note:** `req.query.userId` is always a string (Express query param). `req.user.uid` from Firebase is also a string. Strict `!==` is correct here — no type coercion risk.

---

## 5. Edge Case Analysis

### What if `jobFacade.jobDetails$` emits null after saveJobSuccess?
`saveJobSuccess` reducer sets `state.selected = action.job` (non-null). The store will emit the job object. However, if a `resetJobForm` action fires in between (e.g., a race condition from a concurrent navigation), `state.selected` would be reset to `null`. In that case `if (job && job.jobId)` is false, and the fallback `this.router.navigateByUrl('/recruiter/jobs')` fires. **Graceful degradation confirmed.**

### What if `byStage` is `[]`?
`[].reduce((sum, s) => sum + s.count, 0)` returns `0` (initial accumulator value). `0 > 0` is `false`. The "Review your first applicants" step is correctly marked as not done. **Correct.**

### What if `candidateName` is `''` (empty string)?
`''.charAt(0)` returns `''`. `'' || '?'` evaluates to `'?'`. The avatar shows `?`. **Intended behavior confirmed.**

### What if `candidateName` is `null` or `undefined`?
`null?.charAt(0)` — optional chaining short-circuits, returns `undefined`. `undefined || '?'` evaluates to `'?'`. **Correct fallback.**

### What if `bannerFile` is an empty array `[]`?
In the publish gate: `job.bannerFile[0]` is `undefined` (falsy). Then `job.jobBanner != ""` is checked. If `jobBanner` is also `""` or `null`, the gate fails and the missing field message includes `job banner`. **Correctly blocks publish without a banner.**

### `companyId` null in isReadyToPublish?
`this.companyId` is loaded from localStorage in `ngOnInit`. If `localStorage.getItem('user')` returns null or `JSON.parse` fails, the `then` callback silently fails and `this.companyId` remains `undefined`. Then `!job.companyId` is truthy, the publish gate fails, and the error snackbar shows "Missing: company". **Safe — does not crash, but the UX is slightly cryptic if localStorage is missing.** Pre-existing risk, not introduced by this sprint.

---

## 6. Remaining Gaps

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| G1 | Medium | `jobsController.js` line 348 | `updateJobStatus` calls `mappedJob` without `await` — returns unresolved Promise into store. Pre-existing, not in sprint scope. |
| G2 | Low | `userController.js` `deleteAccountById` | Missing `userId` param returns 403 (safe, but semantically should be 400). |
| G3 | Low | `signup.component.html` | Switching from `[innerHtml]` to `{{ error }}` will display HTML tags literally if any backend error strings contain HTML markup. Review BE error messages for embedded HTML. |
| G4 | Low | `employer-panel.component.scss` | `overflow-y: hidden` on both `#sub-company-component` and `#body-row` — the fix claim was "overflow-y fixed" but the current file sets `overflow-y: hidden` on both elements. If the intent was `overflow-y: auto` for scrollable content, this is not achieved. The mobile nav may clip content if page height exceeds viewport. |
| G5 | Info | `job-create.component.ts` | `companyId` is loaded from localStorage asynchronously. If the async getItem resolves after `publishJobPost()` is called (extremely unlikely, but possible on first render), `this.companyId` could be undefined when `formatJob()` runs. Not introduced by sprint, pre-existing. |

---

## 7. Recommended Fixes

**Fix G1 (Medium — recommended before next deploy):**
In `jobsController.js`, `updateJobStatus` function (line 348):
```javascript
// Before (broken):
const dbResponse = mappedJob(rows[0]);
// After:
const dbResponse = await mappedJob(rows[0]);
```
This is a pre-existing bug that causes the `changeJobStatus` FE action to receive a Promise object. Fix is one character addition.

**Fix G4 (Low — verify intent):**
If `overflow-y: hidden` on `#sub-company-component` was intentional (parent scroll container handles scrolling), document why. If scrollable content inside is being clipped on mobile, change to `overflow-y: auto`.

**Note on G3:** If backend error strings are known to be plain text, no fix needed. If any contain HTML, strip tags server-side before sending.

---

## Summary

| Check | Result |
|-------|--------|
| Production build | PASS (0 errors, 3 pre-existing warnings) |
| `take` import | PASS |
| `jobDetails$` facade property | PASS |
| Null-safe publish gate | PASS |
| `companyId` in publish gate | PASS |
| New-job post-publish navigation | PASS (safe timing) |
| `byStage` null guard | PASS |
| `cachedOnboardingSteps` cache refresh | PASS |
| `candidateName?.charAt(0) \|\| '?'` | PASS |
| Mobile nav — 5 items with valid routerLinks | PASS |
| Mobile nav — aria-labels | PASS |
| `{{ error }}` vs `[innerHtml]` | PASS (XSS risk removed) |
| Error element role="alert" | PASS |
| `await mappedJob` in createJobs | PASS |
| `await mappedJob` in updateJob | PASS |
| `deleteAccountById` ownership check | PASS |
| `verifyAuth` before deleteAccountById | PASS |
| `deleteAccountById` missing-param safety | PASS (safe 403) |
| `updateJobStatus` await gap | PRE-EXISTING BUG (G1) |
| `overflow-y` fix intent | VERIFY (G4) |
