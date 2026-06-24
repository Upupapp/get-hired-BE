# GetHired QA Cycle 5 Fix Sprint — SWEEP Audit Report

**Date:** 2026-06-24
**Scope:** 13 changed files (11 FE, 2 BE) as listed in the fix sprint brief
**Auditor:** SWEEP agent (Claude Sonnet 4.6)

---

## Overall Verdict

**CONDITIONAL PASS**

The sprint resolves the highest-priority issues it set out to fix (XSS from `[innerHtml]`, missing `await` on `mappedJob()` in `createJobs`/`updateJob`, and the `deleteAccountById` self-ownership bypass). No regressions are introduced in the changed surfaces. However, three issues require follow-up before this sprint can be fully closed:

1. `updateJobStatus` (a helper called by `updateStatusOfJob`) still has an **unawaited `mappedJob()`** call — the same bug that was fixed in `createJobs` and `updateJob` was missed in this third call site in the same file.
2. The post-publish navigation for **new jobs** reads `jobFacade.jobDetails$` (which maps `state.selected`) inside the `afterClosed()` closure — `take(1)` will fire synchronously with the already-updated store value, so the pattern is safe, but there is a **silent fallback to the jobs list** if the API response is missing `jobId`, with no user feedback.
3. Subscription is now **completely inaccessible on mobile** — there is no deep-link entry point in the mobile nav, and no redirect from anywhere else on mobile. On desktop, it is still reachable from the sidebar.

---

## 1. Route and Navigation Integrity

### 1.1 Post-publish navigation — new job (B05)

**Finding: SAFE with a silent fallback risk.**

Trace:
1. User clicks Publish → `publishJobPost()` → `this.jobFacade.saveJob(job)` dispatched.
2. NgRx effect `job$` calls `jobService.saveJob()` → BE creates the job → returns the new job object → dispatches `saveJobSuccess({ job })`.
3. Reducer `on(saveJobSuccess)` → sets `state.selected = action.job`, `state.succesMsg = 'published'`.
4. `success$` selector reads `state.succesMsg`. Component's `afterSubmit` fires with `'published'`.
5. `published.afterClosed()` fires → the `else` branch calls `this.jobFacade.jobDetails$.pipe(take(1)).subscribe(...)`.
6. `jobDetails$` selector reads `state.selected` — which was just set in step 3. `take(1)` is synchronous over an already-emitted BehaviorSubject/Store observable, so no timing window exists.

**Confirmed safe:** The store is updated before the subscription in step 6 fires. `take(1)` will see the new job's data.

**Residual risk:** If the BE returns a response where `job.jobId` is falsy (e.g., a shape mismatch), the code falls back to `router.navigateByUrl('/recruiter/jobs')` silently — no snackbar, no error indicator. Not a regression (the fallback is new, prior behaviour was no navigation at all), but a P3 gap.

### 1.2 "Create Interview (Optional)" label

**Finding: CORRECT.**

The label appears at `stepperItems[2].title = "Create Interview (Optional)"` (job-create.component.ts line 71). The interview step's `statusChanges` subscription is commented out (lines 229–236), confirming interview validity no longer gates step 4. The stepper item renders correctly from the `stepperItems` array bound in the template. Label is in the right place and consistent with the optional-interview logic.

### 1.3 Candidates mobile nav → `/recruiter/contacts`

**Finding: ROUTE IS REAL AND GUARDED.**

`employer-panel.module.ts` line 36–38 registers `path: 'contacts'` as a lazy-loaded child of the `EmployerPanelComponent` shell. The shell itself sits behind `AuthGuard` at the `recruiter` path in `app.routing.module.ts`. The mobile nav `<a routerLink="/recruiter/contacts">` is correctly prefixed with the full path including the `recruiter` parent segment. The `EmployerContactsModule` is a real module. Route and guard chain: VALID.

### 1.4 Subscription removal from mobile nav

**Finding: MOBILE-ONLY GAP — ACCEPTABLE RISK but not zero.**

The desktop sidebar (`employer-sidebar.component.ts` line 116–118) still exposes the Subscription route. The mobile nav does not. There is no link to Subscription from the Dashboard, Action Center, or any other mobile-reachable component. An employer who uses GetHired exclusively on a phone (< 768px viewport) cannot reach the Subscription page.

- If Subscription is intentionally deprioritised on mobile: ACCEPTABLE.
- If subscription upgrade is part of a mobile conversion funnel: P2 gap.

The `restrictJobCreation()` method in job-create.component.ts does still use `router.navigate(['../../subscription'])` which would be reachable from the Create Job flow on mobile, so there is one indirect mobile path to Subscription via the subscription-gate alert dialog.

---

## 2. Security Fix Correctness

### 2.1 `deleteAccountById` — self-ownership check

**Finding: CORRECT.**

`userController.js` lines 531–546:

```js
const deleteAccountById = async (req, res) => {
  const { userId } = req.query;
  if (userId !== req.user.uid) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  ...
```

- `userId` comes from `req.query` (URL query param), not from user-controlled body parsing. It is compared with `req.user.uid` which is set by the Firebase auth middleware from the verified JWT — not from the request body.
- The 403 is returned before any async work, so no TOCTOU risk.
- `req.user.uid` is the correct field: `loginUserInDBAndFirebase` (lines 466–497) confirms the Firebase UID becomes the primary `id`/`uid` throughout the system. The same field is used in `getUserProfile` (line 285) without issue.

**Confirmed correct.**

### 2.2 `await mappedJob()` fix — `createJobs` and `updateJob`

**Finding: CORRECT for the two fixed call sites. A THIRD CALL SITE WAS MISSED.**

`mappedJob` in `job.service.js` is `async` (confirmed: line 681 `const mappedJob = async (raw) => {`). It `await`s internal calls to `getJobBadges` and `getJobArrayDetails`.

Fixed call sites:
- `createJobs`: line 146 → `const dbResponse = await mappedJob(rows[0]);` CORRECT.
- `updateJob`: line 313 → `const dbResponse = await mappedJob(rows[0]);` CORRECT.

**Missed call site:**
- `updateJobStatus`: line 348 → `const dbResponse = mappedJob(rows[0]);` — **NO `await`**. This returns a Promise, not the resolved job object. `updateJobStatus` is called by `updateStatusOfJob` (the status toggle endpoint used when an employer archives or expires a job). The `successMessage.data` field is set to an unresolved Promise, so the API response will be `{ data: {} }` (serialised empty object) rather than the full job.

This is a **P1 bug** — it was the class of error the sprint intended to fix, and it was missed in a third call site in the same file.

### 2.3 `[innerHtml]="error"` → `{{ error }}` — XSS fix in signup

**Finding: CORRECT. No other uses of the `error` variable are affected.**

The template at `signup.component.html` line 86:
```html
<span>{{ error }}</span>
```

Search of the entire signup template confirms this is the only place `error` is rendered. The fix removes the XSS surface. `{{ error }}` is Angular's text interpolation, which HTML-escapes the content. The `error` variable is a string set by the component from an API error message — with this fix, any HTML in the error string is displayed as literal text, not parsed.

No other template binding, `innerHTML`, or `bypassSecurityTrust*` usage was found for this variable.

---

## 3. Logic Correctness

### 3.1 Step 3 done-condition: `byStage.reduce(...) > 0`

**File:** `company-dashboard.component.ts` lines 209–211

```ts
done: (this.byStage.reduce((sum, s) => sum + s.count, 0) || 0) > 0,
```

**Finding: CORRECT. Safe against null/undefined `byStage`.**

- `byStage` is typed as `PipelineStage[]` and initialised to `[]` at line 70.
- It is only ever assigned from `res?.data?.byStage || []` (line 101) — the `|| []` fallback guarantees it is always an array even on API failure.
- `[].reduce((sum, s) => sum + s.count, 0)` returns `0` (initial value), which is correct — no applicants → step is not done.
- The outer `|| 0` is redundant (reduce with an initial value never returns undefined) but harmless.
- The `|| 0` guard before `> 0` has no effect since the reduce always returns a number, but it does not introduce any bug.

**Confirmed correct. The redundant `|| 0` is a cosmetic noise issue, P3.**

---

## 4. CSS/SCSS Correctness

### 4.1 `colors.scss` — new variables

**Finding: CORRECT.**

```scss
$color-pipeline-accent: #7c83fd;
$color-teal-accent: #2dd4bf;
```

Both are syntactically valid SCSS variable declarations. `company-dashboard.component.scss` imports `src/assets/styles/colors` at line 1, so both variables are in scope. They are used at:
- Line 400: `background: linear-gradient(135deg, $color-pipeline-accent, $color-teal-accent)` — the avatar initials gradient.
- Line 430: `background: rgba($color-pipeline-accent, 0.12)` — the stage badge background.
- Line 432: `color: $color-pipeline-accent` — the stage badge text.

No other SCSS file references the old hex literals `#7c83fd` or `#2dd4bf` — the tokenisation is complete within the component. No cross-file scope issue.

### 4.2 `.btn-submit` merge in `signup.component.scss`

**Finding: CORRECT. Merge is behaviorally equivalent.**

The merged block at lines 328–351 contains all the properties from both original blocks (base style + hover). The removal of `!important` from the transition is correct — `!important` on a `transition` property is a browser quirk that can block other transitions from applying; the removal allows `gh-pressable`'s micro-scale transform to coexist.

No duplicate `.btn-submit` block remains in the file. The `@media (prefers-reduced-motion: reduce)` inner block is preserved. **No visual regression expected.**

### 4.3 `overflow-y: none → overflow-y: hidden`

**Finding: CORRECT.**

`none` is not a valid value for `overflow-y` — browsers treat it as `visible` (the spec default). The fix to `hidden` is the intended value for the panel layout (`#sub-company-component` and `#body-row`), which needs to clip horizontal overflow without adding a scroll bar. No scrollable content is hidden by this — the layout is not a scroll container; child routes use their own scroll context. **No regression.**

---

## 5. Regression Surface Assessment

### 5.1 `companyId` added to `isReadyToPublish` gate

**Finding: LOW RISK.**

`companyId` is set from `localStorage.getItem('user') → JSON.parse(user).companyId` in `ngOnInit`. Any authenticated employer who has completed company registration will have `companyId` in their local storage. The `publishJobPost()` method is only reachable from step 4 of the job-create stepper, which is only accessible to logged-in employers.

The only scenario where this gate would block a legitimate publish is if `companyId` is missing from localStorage — which would indicate a corrupted session. In that case, the gate correctly prevents publishing to an orphaned job record. **Not a false-positive regression.**

### 5.2 Subscription removed from mobile nav

See section 1.4 above.

### 5.3 `console.log` removal

**Finding: NO ACTIONABLE DEBUGGING LOST.**

All 7 removed `console.log` calls in `job-create.component.ts` were development-time logs, not error-boundary logs. Errors in this component are handled via store state (`error$`, `success$`). No user-visible log or error reporting path was removed. **No regression.**

### 5.4 Generic error messages in `jobsController.js`

**Finding: MINOR OBSERVABILITY LOSS — ACCEPTABLE.**

The raw `error` object is now replaced with `"Operation not successful. Please try again."` in the three changed catch blocks (`createJobs`, `updateJob`, `deleteJob`). The `console.error('[fn] error:', error)` call before each generic response still logs the real error server-side. Production debugging capability is preserved via server logs. Client no longer receives stack traces or DB error details. This is a security improvement.

**Note:** `updateStatusOfJob`, `getJobApplicantDetails`, `getBasicJobList`, and other functions in the same file still use `errorMessage.error = "ERROR: " + error`, leaking exception details to the client. These are pre-existing issues, not regressions.

---

## 6. Known Open Issues — Status

| Issue | Status |
|---|---|
| Other BE controllers still use raw exception pattern (`"ERROR: " + error`) | STILL OPEN — not touched by this sprint. See `userController.js` line 96, `companiesController.js`, `subscriptionController.js`, etc. |
| `deleteJob` has no caller-owns-job check | STILL OPEN — any authenticated employer can delete any job by ID. Confirmed at `jobsController.js` line 196–211. |
| No unit specs for changed FE components | STILL OPEN — no spec files were added or modified in this sprint. |
| `updateStatusOfJob` unawaited `mappedJob` | NEW FINDING — was not in scope of this sprint but is the same class of bug as what the sprint fixed. |

---

## 7. New Issues Discovered

### N1 — `updateJobStatus`: missing `await` on `mappedJob()` (P1)

**File:** `get-hired-BE/controllers/jobsController.js` line 348

```js
const dbResponse = mappedJob(rows[0]);   // BUG: returns Promise, not resolved value
return dbResponse;
```

Should be:
```js
const dbResponse = await mappedJob(rows[0]);
return dbResponse;
```

**Impact:** Every call to the "archive job" and "expire job" status-change endpoints returns `{ data: {} }` instead of the full mapped job. The FE stores this as the updated job, potentially causing blank/stale data in the job list after a status change.

### N2 — Post-publish silent fallback (P3)

If the API returns a new job without `job.jobId`, the navigation falls back to `/recruiter/jobs` with no user feedback. A snackbar explaining "Could not navigate to your new job — redirecting to jobs list" would improve the UX.

### N3 — Subscription unreachable on mobile (P2)

An employer on mobile has no direct navigation to the Subscription page. The only indirect path is through the job-creation subscription gate dialog. If a subscription expires and the employer wants to renew directly (not through a blocking gate), there is no mobile path.

### N4 — `byStage.reduce(... || 0)` redundant guard (P3)

`Array.prototype.reduce` with an explicit initial value (`0`) never returns `undefined`. The outer `|| 0` guard adds noise. No functional impact.

---

## 8. Prioritised Findings Table

| Priority | ID | Finding | File | Action |
|---|---|---|---|---|
| P1 | B-MAP-01 | `updateJobStatus` missing `await mappedJob()` — returns Promise object to client | `controllers/jobsController.js:348` | Add `await` |
| P2 | B-DEL-01 | `deleteJob` has no caller-owns-job auth check | `controllers/jobsController.js:196-211` | Add company ownership guard (pre-existing, not regressed) |
| P2 | FE-SUB-01 | Subscription page unreachable on mobile | `employer-panel.component.html` | Add mobile route entry or deep-link |
| P2 | B-RAW-01 | Raw exception leaks in other controller functions (pre-existing) | Multiple controllers | Follow-up error-handling pass |
| P3 | FE-NAV-01 | Post-publish fallback to `/recruiter/jobs` is silent (no user feedback) | `job-create.component.ts:467` | Add snackbar on fallback |
| P3 | FE-RED-01 | Redundant `|| 0` in `byStage.reduce()` done-condition | `company-dashboard.component.ts:211` | Clean up (cosmetic) |
| P3 | OPEN-01 | No unit specs for any changed component | FE test suite | Add specs in follow-up |

---

## Summary

The fix sprint achieves its stated goals. The XSS fix, the two `await mappedJob()` fixes, and the `deleteAccountById` self-ownership guard are all correctly implemented. CSS/SCSS tokenisation, the `.btn-submit` merge, `overflow-y` fix, and optional-interview label are all correct and carry no regressions.

The single blocking issue for full sprint closure is **B-MAP-01**: the `updateJobStatus` helper in the same file as the other two await fixes still has an unawaited `mappedJob()` call. This should be patched in the same PR or an immediate follow-on commit before the sprint is marked complete.
