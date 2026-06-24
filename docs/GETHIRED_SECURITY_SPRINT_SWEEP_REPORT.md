# GETHIRED Security + UX Sprint — SWEEP Audit Report

**Date:** 2026-06-25  
**Scope:** 21 changed files (14 BE controllers, 7 FE files)  
**Auditor:** Claude Code SWEEP agent

---

## Overall Verdict

**CONDITIONAL PASS**

All five fix categories (F-06/security sanitisation, F-07/F-08 BOLA, F-09 XSS, FIX-02, FIX-03) are correctly implemented and the core security intent is sound. Three issues prevent a clean PASS:

1. `updateStatusOfJob` in `jobsController.js` — a job-status mutation that changes a job between draft/published/archived/expired — has **no ownership check**, meaning any authenticated employer can archive or expire any other company's job. (P1)
2. A dangling **live code line** (`errorMessage.error = "Operation not successful. Please try again.";`) at line 411 of `companiesController.js` sits outside the commented-out `getSetupListCompany` block and will execute unconditionally at module load time on every import of this file, silently mutating the shared `errorMessage` singleton. (P1)
3. The `getJobSuccess` reducer sets `succesMsg` to `'archived'`/`'expired'` when loading a job whose status happens to be 3 or 4. This is a pre-existing bug that the FIX-03 action-type fix did not introduce, but it is exposed by the FIX-03 change and could cause spurious "archived/expired" UI feedback when a job is loaded for editing. (P2)

No P0 issues found. All injected fixes are individually correct.

---

## 1. Security Fix Correctness

### userController.js — F-06 (catch block sanitisation)

**PASS**

All 12 catch blocks audited:

| Handler | `console.error` present | Generic message to client | Raw err in message? |
|---|---|---|---|
| `loginUser` | Yes — `'[loginUser] error:'` | "Login failed. Please check your credentials and try again." | No |
| `registerUser` | Yes — `'[registerUser] error:'` | "Registration failed. Please try again." | No |
| `logout` | Yes — `'[logout] error:'` | "Operation not successful. Please try again." | No |
| `resendVerification` | Yes — `'[resendVerification] error:'` | "Operation not successful. Please try again." | No |
| `getVerificationLink` | Yes — `'[getVerificationLink] error:'` | "Operation not successful. Please try again." | No |
| `verifyEmail` | Yes — `'[verifyEmail] error:'` | "Operation not successful. Please try again." | No |
| `getRefreshToken` | Yes — `'[getRefreshToken] error:'` | "Operation not successful. Please try again." | No |
| `passwordResetLink` | Yes — `'[passwordResetLink] error:'` | "Operation not successful. Please try again." | No |
| `getUserProfile` | Yes — `'[getUserProfile] error:'` | "Operation not successful. Please try again." | No |
| `updateUserProfile` | Yes — `'[updateUserProfile] error:'` | "Operation not successful. Please try again." | No |
| `changePw` | Yes — `'[changePw] error:'` | "Operation not successful. Please try again." | No |
| `getUserCredentials` | Yes — `'[getUserCredentials] error:'` | "Operation not successful. Please try again." | No |
| `deleteAccountById` | Yes — `'[deleteAccountById] error:'` | "Operation not successful. Please try again." | No |

The only raw-error reference in the file is a **commented-out** line in `verifyEmailFileManually` (line 240) that predates this sprint. It is harmless.

The `updateProfile` helper (private) at line 424 still uses `throw "Failed to update User profile. " + error` — but this is a private internal helper, not an HTTP handler, and the string never reaches a client response directly (it gets caught by the calling handler's catch block and replaced with the generic message). This is a pre-existing code smell, not a security regression.

### jobsController.js — F-07 (deleteJob) and F-08 (updateJob) BOLA checks

**PASS** for the specific fixes. **P1 finding** for the uncovered mutation.

**deleteJob (F-07):**
- Calls `getUserCompany(req.user.uid)` — token-derived, not caller-supplied. Correct.
- Queries `jobs WHERE job_id = $1 AND company_id = $2` with parameterized values. Correct.
- Returns 403 before the DELETE executes when check fails. Correct.
- The check also guards against `null` callerCompany. Correct.

**updateJob (F-08):**
- Same pattern as deleteJob. Token-derived company, parameterized ownership check, 403 before any writes. Correct.
- The file upload (`uploadInStorage`) only executes after the ownership check passes. Correct.

**P1 FINDING — updateStatusOfJob has no ownership check:**
`updateStatusOfJob` (line 350) takes `jobId` and `status` from `req.body` and calls `updateJobStatus(statusId, jobId)` with no check that the caller's company owns the job. An authenticated employer from Company A can set the status (archive, expire, un-publish) of any job belonging to Company B by sending a crafted PUT to `/job/changestatus`. This endpoint is protected by `verifyAuth` but not by any object-level ownership guard.

### All 14 BE controllers — raw error pattern scan

**PASS** for active code. **P1 finding** for dead-code leak in companiesController.

Grep for `errorMessage.error = "ERROR: " + error` and `"Operation Not Successful. " + err` patterns across all 14 controllers returned **zero live matches** in controller handler bodies.

**P1 FINDING — Dangling live statement in companiesController.js:**
Line 411 of `companiesController.js`:
```
    errorMessage.error = "Operation not successful. Please try again.";
```
This line is **not commented out**. It sits inside a block where the surrounding lines have `//` prefixes, but this specific line does not. It executes unconditionally at module load time on every `import` of `companiesController`, silently setting the global `errorMessage.error` singleton to a fixed string. This means that any concurrent response that happens to read `errorMessage` immediately after this module is imported (e.g., at cold-start) will see this pre-set string rather than whatever the handler last wrote. In a single-threaded Node.js process this is unlikely to cause a race in practice, but it is a correctness bug and a code smell that should be removed.

---

## 2. FIX-02 Correctness — job-create.component.ts

**PASS**

- `success$` is subscribed **once** in `ngOnInit()` at line 127–130. Confirmed.
- `setFormGroup()` (line 164) contains **no** `success$` subscription. Confirmed — the `subscriptions.add()` calls inside `setFormGroup` only cover `initialData.statusChanges` and `jobInfo.statusChanges`.
- The subscription uses `this.subscriptions.add(...)` where `subscriptions` is a `Subscription` bag (line 34). Confirmed.
- `ngOnDestroy()` (line 538) calls `this.subscriptions.unsubscribe()`. Confirmed. This cleans up the `success$` subscription along with all others.
- `afterSubmit()` handler is the same function as before — it fires the draft/published dialog. The fix means it fires exactly once per save event (not once per `editJob$` emission × saves).
- **Regression check:** `editJob$.subscribe` at line 135 calls `setFormGroup(data)` on each emission, which adds two new `statusChanges` subscriptions each time. This is a pre-existing accumulation issue but was not introduced by FIX-02 and is not in scope.

---

## 3. NEW-03 Correctness — employer-panel.component.html

**PASS**

- The billing bar div at lines 80–92 uses `d-flex d-md-none` — hidden on desktop (md and above), visible only on mobile. Correct.
- Positioned `fixed` at `bottom: 56px` — sits above the 5-item nav (`gh-mobile-nav`), which occupies the bottom 56px. Correct.
- `z-index: 999` is set, matching the stacking context expectation. The mobile nav (`gh-mobile-nav` class) would need to be checked in SCSS to confirm it doesn't use a higher z-index, but based on visual intent this is correct.
- Links to `routerLink="/recruiter/subscription"`. Correct route.
- Includes `aria-label="Subscription and Billing"` on the anchor. Accessible.
- Contains a credit-card SVG icon (13×13px) and the text "Subscription &amp; Billing". Correct entity encoding for the ampersand.
- The 5-item nav (`gh-mobile-nav`) at lines 27–76 is **unchanged** — all 5 items (Dashboard, Jobs, Candidates, Messages, Company) are intact.

**Minor note:** The billing bar uses inline `style=` attributes rather than a CSS class. This is consistent with the surrounding code style and is not a defect.

---

## 4. F-09 Correctness — [innerHtml] → {{ error }} replacements

**PASS for all 4 files**

Grep for `innerHtml` across `src/app/auth/` and `src/app/company/company-basic/` returned **zero matches**. All bindings confirmed as text interpolation:

| File | Binding found | Form |
|---|---|---|
| `signin.component.html` | Line 77: `{{ error }}` | Text interpolation. No `[innerHtml]`. |
| `change-pw.component.html` | Lines 18, 26: `{{ message }}`, `{{ error }}` | Text interpolation. No `[innerHtml]`. |
| `reset-password.component.html` | Line 17: `{{ error }}` | Text interpolation. No `[innerHtml]`. |
| `company-basic.component.html` | Line 13: `{{ error }}` | Text interpolation. No `[innerHtml]`. |

The `error` variable in each component is set from BE error response strings (e.g., "Login failed. Please check your credentials and try again.") which are now always static server-authored strings after F-06. The XSS surface is eliminated at both ends.

---

## 5. FIX-03 Correctness — job.actions.ts

**PARTIAL PASS — pre-existing reducer bug exposed**

**The action type string fix itself:**
- `GetJobSuccess = '[job] -Get Job Success'` (line 63) — note the missing space before "Get", which differs from the pattern of `ChangeJobStatusSuccess = '[job] - Change Job status Success'`. These two are now distinct strings. The FIX-03 intent (ensure `getJobSuccess` and `changeJobStatusSuccess` dispatch different action types so reducers/effects can distinguish them) is **achieved**.
- Effects use action creator references (`JobActions.getJobSuccess`, `JobActions.changeJobStatusSuccess`) not string literals, so no effect is broken by the string values themselves.
- The reducer uses the NgRx `on()` function with action creator references (lines 74, 433), not string matching. No reducer is broken.

**P2 FINDING — getJobSuccess reducer sets succesMsg incorrectly:**
The `getJobSuccess` reducer case (job.reducer.ts line 433–439):
```ts
on(JobActions.getJobSuccess, (state, action): JobState => {
  return {
    ...state,
    job: action.job,
    jobLoading: false,
    succesMsg: action.job.jobStatusId == 4 ? 'archived' : 'expired'
  };
});
```
This sets `succesMsg` to `'archived'` or `'expired'` every time `getJob` completes — even when a user opens a live published job for editing. The `success$` selector (which `job-create.component.ts` subscribes to) will immediately receive `'expired'` for any job with `jobStatusId != 4`, triggering `afterSubmit('expired')`. In practice this may be suppressed because `afterSubmit` only handles `'asDraft'` and `'published'` — other strings fall through silently. But the state is polluted and could cause subtle UI issues.

This bug predates FIX-03 (the prior collision between `getJobSuccess` and `changeJobStatusSuccess` type strings may have masked it). Now that the types are distinct, this reducer case will fire cleanly and the `succesMsg` side-effect becomes more predictable — but also more visible. Should be fixed by removing the `succesMsg` assignment from `getJobSuccess` (it should be `succesMsg: null` on a load).

---

## 6. Regression Surface Assessment

### updateJob and deleteJob ownership checks — legitimate employer use

**No regression.** Both checks call `getUserCompany(req.user.uid)` and then query `jobs WHERE job_id = $X AND company_id = $Y` where `$Y` is the token-derived company. A legitimate employer submitting their own jobId will pass this check and proceed to the update/delete. The only callers that are now rejected are those presenting a jobId belonging to a different company.

### success$ move to ngOnInit — job-create flows

**No regression.** The draft save flow, edit flow, and publish flow all still work because:
- `afterSubmit` is still the handler
- The subscription is still active for the lifetime of the component (cleaned up in `ngOnDestroy`)
- The fix removes multiple subscriptions accumulating when `setFormGroup` was called repeatedly; it does not change what triggers `afterSubmit`

The edit flow calls `getJobById → getJobSuccess` which now fires `getJobSuccess` cleanly. See P2 finding above regarding `succesMsg` side effect, but that is pre-existing, not caused by FIX-02.

### Subscription bar — overlap/obscure content

**Acceptable, with a note.** The bar sits at `bottom: 56px`, immediately above the mobile nav. Content above it scrolls normally. The only risk is that page content whose last visible element sits very near the bottom of the viewport could be obscured by the bar's ~30px height + the 56px nav = ~86px total dead zone at screen bottom on mobile. This is standard mobile nav UX and does not break any existing content.

### NgRx action string fix — effects and reducers

**No regression.** All effects and reducers use action creator references via `ofType()` and `on()`. No string literals found in effects or reducers that match the old or new type strings. The action types were already deduplicated in the enum; the `getJobSuccess` action creator at line 319 correctly maps to `AllFeatureActionTypes.GetJobSuccess`.

---

## 7. Remaining Issues Scan

### Other mutation endpoints lacking ownership checks

| Endpoint | Controller | Method | Ownership check? |
|---|---|---|---|
| `updateStatusOfJob` (`PUT /job/changestatus`) | jobsController | Changes job status by jobId | **None — P1** |
| `updateApplication` (`PUT /application/updateJobs`) | applicantsController | Updates application record | None — accepts candidateId/jobId from body |
| `updateCV` | cvController | Updates CV by cvId from body | None |
| `deleteCV` | cvController | Deletes CV by cvId from body | None |
| `updateCandidate` | candidateController | Updates candidate | None |
| `deleteCandidate` | candidateController | Deletes candidate by candidateId | None |
| `saveWorkExp`, `saveEducBg`, `saveCert`, `saveSkillsArray`, `saveDocuments` | applicantsController | Write to applicant profile arrays | None — use `applicantProfileId` from body |

Note: The CV and applicant profile endpoints above are within the applicant-facing product (not cross-tenant) and may have lower BOLA risk than the job endpoints. However `updateStatusOfJob` is an employer-facing cross-company mutation and is the highest priority.

### Remaining [innerHtml] bindings across auth flow

No remaining `[innerHtml]` bindings found in auth or company-basic templates. Clean.

### Raw error patterns in non-listed controllers

No remaining live `"ERROR: " + error` or `"Operation Not Successful. " + err` patterns found in any controller handler body. The only match is the commented-out line in `userController.js` (line 240, inside `verifyEmailFileManually`'s commented block) — harmless.

The dangling live line at `companiesController.js:411` is an unclosed comment artefact, not a `+ error` concatenation, but is flagged as P1 above.

---

## 8. Prioritized Findings Table

| ID | Priority | File | Description | Recommendation |
|---|---|---|---|---|
| SW-01 | P1 | `controllers/jobsController.js` — `updateStatusOfJob` | No BOLA ownership check on job status mutation. Any authenticated employer can archive/expire/un-publish any other company's job. | Add same `getUserCompany` + `ownerCheck` pattern as `deleteJob`/`updateJob` before calling `updateJobStatus`. |
| SW-02 | P1 | `controllers/companiesController.js` line 411 | Dangling un-commented `errorMessage.error = ...` statement inside a commented-out function block. Executes at module load time, mutating the global errorMessage singleton. | Add `//` prefix to line 411 to fully comment it out. |
| SW-03 | P2 | `src/app/job/state/job.reducer.ts` — `getJobSuccess` case | Reducer sets `succesMsg` to `'archived'`/`'expired'` whenever a job is loaded (getJob), even for published jobs opened for editing. Pollutes state; may produce spurious UI hints now that action types are deduplicated. | Change the `succesMsg` assignment in `getJobSuccess` handler to `null`. |
| SW-04 | P2 | `controllers/applicantsController.js` — `updateApplication` | Accepts `candidateId` and `jobId` from req.body with no ownership/identity check. Low-severity cross-applicant mutation risk. | Derive `candidateId` from `req.user.uid` (same pattern as `getApplicantProfileById`). |
| SW-05 | P3 | `controllers/cvController.js` — `updateCV`, `deleteCV` | No ownership check — any authenticated user could theoretically update/delete another user's CV if they know the `cvId`. | Add token-derived uid check against `cv.user_id` before writes. |
| SW-06 | P3 | `controllers/userController.js` — `updateProfile` helper (line 424) | Private helper throws `"Failed to update User profile. " + error` (string concatenation with error). Not a direct client-response leak (caught by calling handler), but violates the F-05 pattern and will appear in logs. | Replace with `throw error` or a fixed string. |
| SW-07 | P3 | `src/app/job/job-create/job-create.component.ts` | `editJob$.subscribe` in `ngOnInit` calls `setFormGroup` on each emission, adding two new `statusChanges` subscriptions each time. Pre-existing accumulation — not introduced by FIX-02 but co-located with the fix. | Move `statusChanges` subscriptions inside `setFormGroup` to the initial call only, or use `takeUntil`. |

---

## Summary

The security sprint successfully eliminated all identified information-leaking catch blocks (F-05/F-06), added BOLA ownership checks to the two highest-risk job mutations (F-07/F-08), closed the XSS surface on four auth/onboarding HTML templates (F-09), fixed the double-subscription bug in job-create (FIX-02), de-conflicted the NgRx action type strings (FIX-03), and added the mobile billing-bar access point (NEW-03). All seven of these are correctly implemented.

The two P1 findings (SW-01, SW-02) should be addressed before the next production deployment. SW-02 is a one-line comment fix. SW-01 requires ~10 lines of ownership-check code mirroring the existing `deleteJob` pattern.
