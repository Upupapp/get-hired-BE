# GetHired V5 Fix Sprint — NOTIFY / Copy Audit Report
_Date: 2026-06-24 | Scope: 13 changed files from fix sprint only_

---

## Executive Summary

All 13 changed files were read in full. The fix sprint copy is largely clean: no forbidden content was introduced, error messages are appropriately generic and non-leaking, and the mobile nav is functionally correct. Four targeted copy issues were identified — two minor label mismatches, one missing skip-signal on a stepper step, and one 403 message that is functional but below product voice standards. Safe in-file fixes were applied where the change is one line or less; all others are logged as deferred recommendations.

---

## 1. New Copy Review Findings

### 1.1 employer-panel.component.html — Mobile Bottom Nav

**5-item inventory:**

| Position | Visible label | aria-label | Routes to |
|---|---|---|---|
| 1 | Dashboard | "Dashboard" | /recruiter/dashboard |
| 2 | Jobs | "Jobs" | /recruiter/jobs/list |
| 3 | Candidates | "Candidates" | /recruiter/contacts |
| 4 | Post Job | "Post a job" | /recruiter/jobs/create |
| 5 | Company | "Company" | /recruiter/company/details |

**Findings:**

**ISSUE 1 (Minor) — aria-label/visible-text mismatch on item 4.**
Visible label is "Post Job"; aria-label is "Post a job". These should be identical or the aria-label should be a strict superset (e.g. "Post a job — create a new job post"). Having different wording can confuse assistive-technology users who hear one label but see another.
→ See Applied Fixes §4.

**ISSUE 2 (Minor) — "Candidates" vs sidebar label "Candidates".**
The desktop sidebar was renamed from "Contacts" to "Candidates" (confirmed in employer-sidebar.component.ts, line 97). The mobile nav also says "Candidates". These are now consistent. No action needed.

**ISSUE 3 (Minor) — Subscription not in mobile nav.**
The desktop sidebar has 5 items: Dashboard, Jobs, Candidates, Company, Subscription. The mobile nav has 5 items but substitutes "Post Job" CTA for Subscription. This is an intentional product decision (most-used destinations); it is not a copy error. Subscription is accessible via Company settings on mobile.

**Overall:** Mobile nav copy is clear and consistent with the desktop renaming. The "Post Job" CTA visually stands out (red background, larger icon stroke-width) which is appropriate for a primary action.

---

### 1.2 job-create.component.html / job-create.component.ts — Stepper Labels

**Stepper labels (from stepperItems array in .ts):**
1. Job Details
2. Rates and Roles
3. Create Interview (Optional)
4. Preview Job Post

**Findings:**

**ISSUE 4 (Important) — "Create Interview (Optional)" label is in the stepper tab but the Next button says "Next: Create Interview" without the "(Optional)" qualifier.**

In the HTML template (line 125): `Next<ng-container >: Create Interview</ng-container>`

An employer reading the Next button sees "Next: Create Interview" and may think they must create interview questions to proceed. The stepper tab itself says "(Optional)" but the button does not reinforce this. The interview step is confirmed optional by the commented-out `statusChanges` subscription (lines 229–236 in .ts) and the `interviewValid` being set from `jobInfoValid` instead, meaning step 3 is always passable once step 2 is valid.

**ISSUE 5 (Minor) — "Prev: Create Interview" on the step 4 back button (line 157 in HTML) should also carry "(Optional)" for symmetry, though this is lower priority.**

**"Create Interview (Optional)" in the stepper tab itself** reads naturally. Employers understand optional steps. The parenthetical convention is standard in multi-step form UX.

---

### 1.3 company-dashboard.component.html — Avatar Fallback

**The change:** `applicant.candidateName?.charAt(0) || '?'`

**Finding — "?" fallback is acceptable but has room for polish.**
A "?" character in an avatar circle is a common and understood convention (e.g. GitHub, Linear, Slack all use similar fallbacks). It is not jarring in a list of applicant initials. The aria-hidden="true" attribute on the span means screen readers skip it entirely, so there is no accessibility harm.

However, a slightly more intentional fallback letter like "#" (indicating unknown) or keeping "?" but pairing it with a visually distinct color (e.g. a neutral gray instead of the branded color) would be more polished. This is deferred as a design recommendation, not a copy fix.

**Onboarding checklist copy (step 3: "Review your first applicants"):**
- Title: "Review your first applicants" — clear.
- Desc: "Once candidates apply, review their profiles and video answers here." — clear and accurate.
- The done condition is `byStage.reduce((sum, s) => sum + s.count, 0) > 0` — this means any applicant in any stage marks step 3 done.
- **There is no positive reinforcement copy** when step 3 is done. The whole checklist section hides when all steps are complete (`allDone ? [] : steps`). This is intentional and clean — it collapses rather than showing a "You're done!" banner. Acceptable for v5.

---

### 1.4 signup.component.html — Error Rendering

**The change:** `{{ error }}` replaces `[innerHtml]="error"` (the old binding; the new binding is `<span>{{ error }}</span>` inside the alert div).

**Finding — Rendering parity: YES for plain-text errors.**
All error messages in userController.js are plain ASCII strings (e.g. "Email or Password can not be empty", "User is already Registered. Please login instead."). `{{ error }}` and `[innerHtml]` are functionally identical for plain text. The Angular text interpolation `{{ error }}` is actually safer because it auto-escapes any accidental HTML that might appear in an error string, making this a security improvement over `[innerHtml]`.

**Error message clarity check (userController.js messages that reach the FE):**
- "Email or Password can not be empty" — clear and actionable.
- "Please enter a valid Email or Password" — clear.
- "User is already Registered. Please login instead." — clear and actionable (includes a next step).
- "Operation not Successful." — vague. This surfaces from the catch branch if Firebase + DB both succeed but `userData || dbRegister` is falsy. It is an edge-case internal error. Acceptable for the generic case.
- "Invalid role." — this error should never appear in the UI (the role selector only offers valid options 2 and 3), but if it does appear it is somewhat terse. Low risk.

**No errors were introduced. The {{ error }} change is correct and an improvement.**

---

### 1.5 jobsController.js — Generic Error Messages

**Changes:** Three catch blocks in `createJobs`, `deleteJob`, `updateJob` now use:
```
errorMessage.data = "Operation not successful. Please try again."
```

**Finding — PASS with one consistency note.**
The messages are generic, non-leaking, and actionable (the "Please try again" tells the user what to do). They correctly avoid exposing SQL errors, stack traces, or table names.

**Consistency note:** The message uses `errorMessage.data` (not `errorMessage.error`) in these three functions. Other functions in the same file use `errorMessage.error = "ERROR: " + error` — which would leak the raw error. The new pattern is better, but the inconsistency means other endpoints (e.g. `deleteInterviewQuestion`, `getSubscriptionRestrictions`) still leak raw errors via `errorMessage.error`. This is not a regression — it pre-dates the fix sprint — and is logged in Deferred Recommendations.

**ISSUE 6 (Minor) — capitalisation inconsistency.** The message "Operation not successful. Please try again." uses lowercase "not"; `loginUser`'s catch (line 95 in userController.js) has "Operation Not Successful." with title case. These will render differently if shown to the same user. The fix-sprint messages are grammatically better (sentence case). No change needed to the fix-sprint text; note this for future normalisation.

---

### 1.6 userController.js — 403 Forbidden Message

**The change:** `deleteAccountById` (line 535) returns:
```js
return res.status(403).json({ message: 'Forbidden' });
```

There is also a pre-existing `return res.status(403).send("Forbidden")` in `getAllApplicantOfJob` (jobsController.js line 589) and `getJobApplicantFitSignals` (line 618).

**Finding — "Forbidden" is technically correct but below product voice standard.**
HTTP 403 with body "Forbidden" is a safe, non-leaking response. However:

1. From the user's perspective, `deleteAccountById` is a self-service account deletion endpoint. The only caller that gets a 403 is one where `userId !== req.user.uid` — i.e. someone trying to delete *another* user's account. This is almost certainly an attack, not a confused legitimate user. A machine-readable JSON body is appropriate for API consumers; the FE should handle this gracefully with its own UI copy.

2. "Forbidden" as a bare string is acceptable for an API that has separate FE error handling. However, a structured response is more consistent with the rest of the API (`{ message: 'Forbidden' }` via `.json()` vs `.send("Forbidden")` in jobsController.js).

**Recommendation:** Apply a human-friendly message now; see Applied Fixes §4.

---

## 2. State Coverage Check

### 2.1 job-create — Post-publish async navigation

**State: Loading while reading jobId from store after publish (new job)**

In `afterSubmit()` (line 463 in .ts):
```ts
this.jobFacade.jobDetails$.pipe(take(1)).subscribe(job => {
  if (job && job.jobId) {
    this.router.navigate([...], { queryParams: { id: job.jobId } });
  } else {
    this.router.navigateByUrl('/recruiter/jobs');
  }
});
```

**GAP FOUND:** There is no loading indicator between the `published` dialog closing and the `jobFacade.jobDetails$.pipe(take(1))` resolution. In practice:
- `take(1)` fires synchronously if the store already has the value (most cases post-save).
- If the store has not yet updated with the new job (race condition or slow reducer), it fires with the *previous* value and the navigation goes to the wrong job or falls back to `/recruiter/jobs`.

This is a pre-existing state gap, but it was introduced by the B05 navigation logic in the fix sprint. The gap is low severity because the fallback route (`/recruiter/jobs`) is safe and the race window is very small. However, no user feedback (spinner, message) is shown during this brief uncertainty.

**State: Navigation failure if store read returns null**

Handled via the `else` branch: `this.router.navigateByUrl('/recruiter/jobs')`. This is a safe fallback. No blank screen risk.

**No blocking issues. One deferred improvement: show a brief "Redirecting..." message or skeleton during the dialog-to-navigation transition.**

---

### 2.2 company-dashboard — Onboarding step 3 done-state and byStage loading

**Step 3 done-condition:** `byStage.reduce((sum, s) => sum + s.count, 0) > 0`

This is evaluated inside `onboardingSteps()` which is called from `_refreshOnboardingCache()`. `_refreshOnboardingCache()` is called after pipeline data arrives. So during `pipelineLoading = true`, `this.byStage` is `[]` (initial value), meaning `sum = 0`, meaning step 3 is always `done: false` while loading.

**ISSUE 7 (State gap) — Onboarding step 3 will flicker from "not done" to "done" when byStage loads.**
If the pipeline loads after the dashboard, there is a brief moment where the checklist shows "Review your first applicants" as incomplete, then the cache refreshes and it disappears (because all steps are done). The `*ngIf="!pipelineLoading && cachedOnboardingSteps.length > 0"` guard on the section prevents the checklist from rendering at all until pipeline loading completes — which means this flicker **does not occur in practice**. The guard is correct.

**No positive reinforcement for step 3 completion:** When all 3 steps are done, `onboardingSteps()` returns `[]` and the section hides entirely. There is no "You're set up!" message. This is intentional per the code comment. It is a clean UX pattern used by tools like Intercom. No change needed.

**byStage data not loaded yet:** Covered by `pipelineLoading = true` → `dashSkeleton` and action-skeleton rendering. States are covered.

---

## 3. Forbidden Content Check

| Category | Status | Evidence |
|---|---|---|
| Fake counts | PASS | KPI values all sourced from `dashboard.charts` real data |
| Fake urgency | PASS | "N applicants waiting for your review" uses real `needsReviewCount` |
| Fake AI claims | PASS | No AI claims introduced in any of the 13 files |
| Guaranteed outcomes | PASS | "Start hiring in minutes" (signup.html line 78) is an aspiration, not a guarantee. No "you will hire" language. |
| "500K talent pool" claim | PASS | Uses `talentProof.getDisplayCopy('short')` which goes through the talent-proof service — gated by `isVerified()`. Not hardcoded in changed files. |

**Overall: PASS — no forbidden content introduced by the fix sprint.**

---

## 4. Applied Fixes

### Fix A — employer-panel.component.html: aria-label / visible-text alignment on "Post Job"

**Before (line 55):**
```html
class="gh-mobile-nav-item gh-mobile-nav-item--create" aria-label="Post a job">
```
Visible text (line 63): `Post Job`

**After:** Make aria-label match visible text exactly.
```html
class="gh-mobile-nav-item gh-mobile-nav-item--create" aria-label="Post Job">
```

### Fix B — userController.js: human-friendly 403 body on deleteAccountById

**Before (line 536):**
```js
return res.status(403).json({ message: 'Forbidden' });
```

**After:**
```js
return res.status(403).json({ message: "You don't have permission to do that." });
```

Both fixes have been applied to the source files.

---

## 5. Deferred Recommendations

### D1 — job-create stepper Next button: reinforce that interview step is optional
**File:** `src/app/job/job-create/job-create.component.html` line 125
**Current:** `Next<ng-container >: Create Interview</ng-container>`
**Suggested:** `Next: Interview Questions (Optional)`
**Why deferred:** Requires confirming whether the stepper tab label and button label should use the same phrasing or can differ. Low friction change but needs product sign-off on label convention.

### D2 — Post-publish navigation: brief interstitial copy
**File:** `src/app/job/job-create/job-create.component.ts` `afterSubmit()` method
**Gap:** Between the dialog closing and `jobFacade.jobDetails$.pipe(take(1))` resolving, there is no user feedback. Consider adding a brief snack bar "Taking you to your applicants..." before navigating, so the employer is not staring at a frozen dialog close.

### D3 — jobsController.js: remaining catch blocks still leak raw errors
**Scope:** `getJobApplicantDetails`, `getJobBasicListOfCompany`, `getExpiredJobListOfCompany`, `updateStatusOfJob`, `getIndustryList`, `getBadgeList`, `getJobRoleList`, `getCategoryList`, `getJobDetails`, `getJobShareableLink`, `getAllApplicantOfJob`, `deleteInterviewQuestion`, `getSubscriptionRestrictions` — all use `errorMessage.error = "ERROR: " + error`.
**Recommendation:** In a future SECURE pass, replace with the generic pattern used by the fix sprint: `errorMessage.data = "Operation not successful. Please try again."` + `console.error(...)`.

### D4 — userController.js: remaining 403 in jobsController.js uses bare .send("Forbidden")
**File:** `get-hired-BE/controllers/jobsController.js` lines 589 and 618
**Recommendation:** Align with the human-friendly JSON pattern applied in Fix B above.

### D5 — Avatar fallback color differentiation
**File:** `src/app/company/company-dashboard/company-dashboard.component.html` line 146
**Current:** `{{ applicant.candidateName?.charAt(0) || '?' }}`
**Recommendation:** When the fallback "?" is rendered, apply a neutral gray background class (e.g. `.emp-dash-review-initials--unknown`) instead of the branded color, so it is visually distinct from real initials and feels intentional rather than broken.

### D6 — Subscription absent from mobile nav
**Consideration:** If a subscribed employer's plan expires, the only path to renew on mobile is Settings > Subscription (via the Company item). This is an acceptable UX choice for v5 but should be revisited if subscription-expiry emails prove insufficient to drive mobile renewals.

### D7 — "Lights, Camera, GetHired." tagline on signup carousel
**File:** `src/app/auth/signup/signup.component.html` line 52
**Note:** This pre-existing carousel copy is mildly ambiguous for non-English markets and uses an exclamation that does not match the rest of the product voice. Out of scope for the fix sprint but worth noting for a future brand-copy pass.

---

_End of report — 2 safe fixes applied, 7 deferred recommendations logged._
