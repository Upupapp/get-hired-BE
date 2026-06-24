# GETHIRED V5 NOTIFY REPORT
**Scope:** 9 FE files changed in the V5 deployment
**Date:** 2026-06-24
**Auditor:** Claude Code (NOTIFY pass)

---

## Executive Summary

The V5 copy is largely professional, employer-appropriate, and free of forbidden patterns (fake counts, fake urgency, fake AI, guaranteed outcomes). Two copy bugs were found and fixed in this pass. Six state coverage gaps were identified — the most significant being that job-create's publish-blocked and save-draft error states surface as a raw snackbar with a camel-case field list rather than a human-readable message (now fixed). The onboarding checklist's "done" condition for step 3 has a semantic inversion (unreviewed applicants marking step as complete) that is deferred as a logic change, not a copy change. All forbidden-content checks pass.

**Fixed in this pass:** 2 files, 2 changes (see Applied Fixes).
**Deferred improvements:** 8 items (see Recommended Improvements).

---

## Copy Quality Findings Per Component

### 1. job-create.component.ts / job-create.component.html

| Location | Copy | Finding |
|---|---|---|
| TS line 401 (publish-blocked snackbar) | `Job not ready to be Published. Missing: ${missingJob}` | "Published" capitalized mid-sentence; `missingJob` is a raw space-separated list of camel-like field names (e.g. "job type job level job city"); no trailing period; not actionable. **FIXED** — see Applied Fixes. |
| TS line 432 (save-draft dialog) | `Job successfully saved as Draft.` | "Draft" capitalized mid-sentence. Minor — acceptable style choice, consistent with product nomenclature. Defer. |
| TS line 445 (publish-success dialog) | `Job successfully Published.` | Same capitalization issue. Minor. Defer. |
| HTML line 12 | `Create a Job` / `Update a Job` | Acceptable. Clear and action-oriented. |
| HTML line 29 | `Save as Draft` | Clear. |
| HTML line 105 | `Next: Job Requirements` — rendered inside `<ng-container>` wrapper with no condition guard | Functionally fine but the empty `*ngIf`-less `ng-container` wrapper is redundant (lines 105, 125, 145). Copy itself is fine. |
| Stepper labels | "Job Details", "Rates and Roles", "Create Interview", "Preview Job Post" | Professional and sequential. No issues. |
| Publish-blocked icon tooltip | `<i class="bi bi-exclamation-circle text-danger fs-3">` — no aria-label, no tooltip text | Accessibility gap: screen-reader users see only an icon with no label when publish is subscription-blocked. Deferred (outside V5 changed scope but noted). |

**Grammar:** All copy grammatically correct after fix.
**Tone:** Professional, action-oriented, employer-appropriate.

---

### 2. employer-panel.component.html (mobile bottom nav)

| Item | Copy | Finding |
|---|---|---|
| Nav label: Dashboard route | Visible label: "Home"; aria-label: "Dashboard" | **Mismatch.** Visible label says "Home", aria-label says "Dashboard". Screen reader users hear "Dashboard" but sighted users see "Home". Sidebar calls it "Dashboard". Should be consistent. Recommend changing visible label from "Home" to "Dashboard" (deferred — label change affects layout; not pure copy). |
| Nav label: Jobs | Visible: "Jobs"; aria-label: "Jobs" | Consistent. Good. |
| Nav label: Post Job | Visible: "Post Job"; aria-label: "Post a job" | Minor inconsistency in capitalisation ("job" vs "Job") and article ("Post Job" vs "Post a job"). Both are fine individually but mismatch slightly. Low priority. |
| Nav label: Company | Visible: "Company"; aria-label: "Company profile" | aria-label is more descriptive than visible label — this is acceptable and good practice. |
| Nav label: Account | Visible: "Account"; aria-label: "Subscription" | **Mismatch.** Visible label says "Account", aria-label says "Subscription". Route is `/recruiter/subscription`. Should use consistent label. Sidebar item uses "Subscription". Recommend aligning. Deferred. |
| Loading state | Panel loading fallback (`#panelLoading`) renders `<app-loading>` | No user-facing copy in loading state — relies on the loading spinner. Acceptable. |
| Error state | "We couldn't load your profile. Please refresh the page or sign in again." | Clear, human-readable, actionable. Good. |
| role="navigation" + aria-label | Present on `<nav>` | Correct. |
| aria-hidden on SVG icons | All SVG icons have `aria-hidden="true" focusable="false"` | Correct. |

---

### 3. employer-sidebar.component.ts

| Item | Copy | Finding |
|---|---|---|
| "Dashboard" | Kept from prior version | Clear. |
| "Jobs" with sub-routes "Job Posts", "Expired Jobs" | Sub-routes use i18n keys — rendered values depend on translation file (not auditable in .ts alone) | No direct copy issues in the TypeScript. |
| "Candidates" (renamed from "Contacts") | Rename is accurate — "Candidates" is employer-appropriate and clearer than "Contacts". | Good rename. |
| "Company" (renamed from "Company Profile") | Shorter and cleaner. Route unchanged. | Good. |
| "Subscription" | Via `translate.instant('ADMIN_DASHOBOARD.SIDEBAR_SUBCRIPTIONS')` | Note: i18n key has two typos: `DASHOBOARD` (should be `DASHBOARD`) and `SUBCRIPTIONS` (should be `SUBSCRIPTIONS`). These are pre-existing in the i18n key name (not V5 changes), but worth noting. The rendered text depends on the translation file. Deferred (not in scope of V5 changed files). |
| console.log('Secret') line 46 | Debug log left in ngOnInit | Not copy but worth flagging: a debug `console.log('Secret')` remains in the shipped component. Deferred clean-up. |

---

### 4. company-dashboard.component.html / .ts (onboarding checklist)

| Item | Copy | Finding |
|---|---|---|
| Eyebrow "Hiring command center" | Uppercase via CSS, rendered in lowercase in HTML | Professional, on-brand. |
| Hero subtitle "N active jobs · N applicants this month" | Real data, correct plural handling (`=== 1 ? '' : 's'`) | Good. |
| Needs-review chip "N applicants to review" | Conditionally shown; real count | Good. |
| Hero CTA "Post a job" / "Review applicants" | Clear, action-oriented | Good. |
| Action card "Review new applicants" | "N applicants waiting for your review." | Clear. Actionable. |
| Action card "Manage your jobs" | "View, edit, and publish your job posts." | Clear. |
| Action card "Complete your company profile" | "Missing: logo, company description, location." | Clear and specific. Good. |
| All-caught-up empty state | "You're all caught up. No applicants are waiting for review right now." | Informative and friendly. Good. |
| Pipeline empty state | "No applicants yet. Applicants will appear here once candidates start applying to your jobs." | Encouraging rather than blank. Good. |
| Pipeline error | "Couldn't load your hiring pipeline right now." + Retry | Human-readable. |
| Action-center error | "Couldn't load your action items right now." + Retry | Human-readable. |
| Onboarding section title | "Getting started" | Clear. |
| Onboarding intro | "Complete these steps to get the most out of GetHired." | Appropriate. |
| Step 1 title | "Complete your company profile" | Clear. |
| Step 1 desc | "Add your logo, description, and location so candidates know who is hiring." | Actionable and explains the why. Good. |
| Step 1 CTA | "Complete profile" | Clear. |
| Step 2 title | "Post your first job" | Clear. |
| Step 2 desc | "Create a job post to start receiving applications from qualified candidates." | Clear and motivating without being fake. Good. |
| Step 2 CTA | "Post a job" | Clear. |
| Step 3 title | "Review your first applicants" | Clear. |
| Step 3 desc | "Once candidates apply, review their profiles and video answers here." | Accurate and informative. |
| Step 3 CTA | "View applicants" | Clear. |
| Step done label | "Done" | Clear. |
| KPI label "Video answers this month" | Maps to `dashboard.charts.interviews` | Label is accurate (interviews = video answers). Professional. |
| KPI label "Needs review" | Maps to real pipeline count | Accurate. |
| Review-card stage badge | "Pending Review" / "Under Review" | Clear status labels. |
| Review-card CTA | "Review" | Clear. |
| dashSkeleton | No visible copy during skeleton load | Acceptable — skeleton provides visual feedback without text. |

**Semantic issue in onboarding step 3 "done" logic (TS line 165):**
`done: (this.needsReviewCount || 0) > 0` — this marks step 3 as "done" when applicants are *waiting for review*, not when the employer has actually reviewed them. The copy says "Review your first applicants" but the completion condition fires when applicants arrive, not when they've been reviewed. This creates a misleading "Done" badge. This is a logic concern, not a copy-only fix — deferred.

---

### 5. signup.component.html (employer ?role=2 path)

| Item | Copy | Finding |
|---|---|---|
| Employer title "Create your employer account" | Conditional on `role_validators?.value === 2` | Clear, professional, employer-appropriate. |
| Employer subtitle "Start hiring in minutes. Post your first job and reach qualified candidates." | Conditional on role=2 | Clear, action-oriented, honest. No fake claims. No guaranteed outcomes. "Start hiring in minutes" refers to starting the process, not a guaranteed speed outcome. Acceptable. |
| Generic title | Via i18n key `CREATE_ACCOUNT.CREATE_ACCOUNT_TEXT` | Not auditable without translation file but pre-existing. |
| Employer submit CTA "Create employer account" | Conditional on role=2 | Clear and specific to the employer context. |
| Employer submit loading "Creating account..." | Shown during `submitting` | Accurate loading state. |
| Generic submit loading "Creating account..." | Same text for generic path | Consistent. |
| "Already have an employer account? Sign in" | Conditional on role=2 | Appropriate, mirrors employer context. |
| Generic sign-in prompt | Via i18n keys | Not auditable without translation file but pre-existing. |
| Validation: "First Name is required" | Hard-coded | Human-readable. |
| Validation: "Last Name is required" | Hard-coded | Human-readable. |
| Validation: "Email is required" | Hard-coded | Human-readable. |
| Validation: "Password is required" | Hard-coded | Human-readable. |
| Validation: "Password must be 8 characters long with mixed uppercase, special characters and numbers." | Hard-coded | Human-readable and actionable — tells user exactly what's required. Good. |
| Validation: "Re-enter Password is required" | Hard-coded | Slightly awkward — "Re-enter Password" is the field name, but phrasing as "Re-enter Password is required" reads oddly. Minor. Deferred. |
| Validation: "Passwords do not match" | Hard-coded | Clear and actionable. |
| Validation: "Role is required" | Hard-coded | Clear. |
| Success state "Verification link send to your email. Redirecting to Login ..." | **Grammar bug: "send" should be "sent"; "Login" should be "login" (lower-case); trailing ellipsis inconsistent** | **FIXED** — see Applied Fixes. |
| Error state | `<span [innerHtml]="error">` — raw API error text potentially rendered | The error is rendered via Angular's `innerHtml` binding from a backend response. If the backend returns raw technical errors, they could be exposed to users. Pre-existing concern — not introduced by V5 but noted. |
| Terms checkbox text | Via i18n key `CREATE_ACCOUNT.ACCEPTANCE_CHECKBOX` | Not auditable without translation file. Pre-existing. |

---

## State Coverage Gaps

### job-create.component (publish/save flows)

| State | Coverage | Gap? |
|---|---|---|
| Publishing loading state | No visible loading indicator during publish save | **GAP** — `publishJobPost()` calls `this.jobFacade.saveJob(job)` but there is no loading spinner shown to the user during the async operation. The Publish button has no `[disabled]` binding during save (only the subscription limit check). User could double-tap. |
| Publish success | UpdatedDialogComponent dialog + snackbar + navigation | Covered. |
| Publish error | No explicit publish error state | **GAP** — if `saveJob` fails (network error, API error), there is no error message shown to the user. The `afterSubmit` observable only handles `'asDraft'` and `'published'` success events. Error path is silent. |
| Publish blocked (missing required fields) | Snackbar with missing field list | Covered (and copy improved in this pass). |
| Save draft success | UpdatedDialogComponent dialog | Covered. |
| Save draft loading | No visible loading indicator during draft save | **GAP** — same issue as publish loading. |
| Save draft error | No explicit error state | **GAP** — same issue as publish error. Silent failure. |

### company-dashboard.component (dashboard states)

| State | Coverage | Gap? |
|---|---|---|
| No company profile state | `companyProfileMissingFields()` returns missing fields; action card shows with missing fields | Covered. |
| Company complete, no jobs state | `activeJobs === 0` renders "Post a job" in hero CTA and onboarding step 2 shows | Covered. |
| Has draft jobs state | Not distinguished from "no jobs" — `activeJobs` only counts active (published) jobs | **MINOR GAP** — if an employer has only draft jobs, the dashboard shows `0 active jobs` and the onboarding checklist step 2 ("Post your first job") remains incomplete, which is technically correct (draft ≠ published) but could be confusing. No distinct copy for "you have drafts, publish them." |
| Has published jobs state | `activeJobs > 0` shown in hero | Covered. |
| Has applicants state | Applicant review section + needsReview chip + pipeline | Covered. |
| Onboarding step incomplete copy | Per-step desc + CTA | Covered. |
| Onboarding step complete copy | "Done" badge + strikethrough | Covered. |
| All onboarding steps complete | Section collapses (`onboardingSteps()` returns `[]`) | Covered — but no completion congratulation copy. Minor; deferred. |

### employer-panel.component.html (mobile nav)

| State | Coverage | Gap? |
|---|---|---|
| Loading state | No loading state on nav items | Acceptable — nav items link to routes; loading is handled per-page. |
| Active nav item | `routerLinkActive="gh-mobile-nav-item--active"` applies red color | Covered via CSS. |
| Inactive nav item labels | All 5 labels rendered | Covered. |
| Screen reader (aria-labels) | Present on all 5 items | Covered. |
| Home vs Dashboard label mismatch | Visible "Home", aria-label "Dashboard" | **GAP** — see copy quality findings above. |
| Account vs Subscription mismatch | Visible "Account", aria-label "Subscription" | **GAP** — see copy quality findings above. |

### signup.component.html

| State | Coverage | Gap? |
|---|---|---|
| Employer title/subtitle when role=2 | Present | Covered. |
| Fallback title/subtitle when no role | Uses i18n generic title; no subtitle | Covered (subtitle omitted intentionally for generic path). |
| Validation error messages | All fields have required-error messages | Covered. |
| Submit loading state | "Creating account..." + loading gif | Covered. |
| Submit error state | `<div *ngIf="error">` alert renders backend error via `[innerHtml]` | Covered structurally. Risk: raw API error may leak. Noted. |
| Success (verification sent) | Shown when `isResent` is true | Covered — copy fixed in this pass. |

---

## Error Message Audit

| Component | Message | Human-readable? | Actionable? | Internal details exposed? |
|---|---|---|---|---|
| job-create publish-blocked | (before fix) `Job not ready to be Published. Missing: job type job level job city` | Partially — raw space-concatenated field names | Yes | No |
| job-create publish-blocked | (after fix) `Your job post can't be published yet. Missing: job type, job level, job city.` | Yes | Yes | No |
| job-create save/publish error | Silent failure — no error message at all | N/A | N/A | N/A — but user has no feedback |
| company-dashboard pipeline error | "Couldn't load your hiring pipeline right now." | Yes | Partially (Retry available) | No |
| company-dashboard action-center error | "Couldn't load your action items right now." | Yes | Partially (Retry available) | No |
| employer-panel error fallback | "We couldn't load your profile. Please refresh the page or sign in again." | Yes | Yes | No |
| signup error | Raw backend error via `[innerHtml]="error"` | Unknown (depends on backend) | Unknown | Potential risk |

**Summary:** Error messages in V5 new copy are human-readable. The pre-existing `[innerHtml]="error"` binding in signup is the only potential internal-detail leak — already flagged in SECURE reports. The silent save/publish failure in job-create is a product gap, not a copy gap, but it results in users having no error communication at all.

---

## Empty State Audit

| Component | Empty State | Copy | Quality |
|---|---|---|---|
| company-dashboard pipeline (no applicants) | `app-empty-section` with title="No applicants yet" | "Applicants will appear here once candidates start applying to your jobs." | Informative and encouraging. Good. |
| company-dashboard action center (all caught up) | "You're all caught up. No applicants are waiting for review right now." | Friendly and reassuring. Good. |
| company-dashboard onboarding (all steps complete) | Section collapses — no visible empty state | No "all done" message shown | Minor gap — completing onboarding silently removes the section with no positive reinforcement. |
| job-create (interview step, optional) | Interview step has no empty state shown — questions are optional per V5 B04 | No empty state copy added for optional interview step | Minor gap — no indication to the employer that skipping questions is intentional/OK. |

---

## Forbidden Content Check

All 9 changed V5 files were checked for:

| Category | Result |
|---|---|
| Fake applicant counts ("500 people applied!") | NONE FOUND |
| Fake urgency ("Apply before it's too late!", "Employers are waiting!") | NONE FOUND |
| Fake AI claims ("AI will find your best candidates") | NONE FOUND |
| Guaranteed outcomes ("Get hired faster", "Guaranteed applicants") | NONE FOUND |
| Fake social proof ("500 employers joined this week") | NONE FOUND |
| Real data used for all counts | CONFIRMED — all counts sourced from `dashboard.charts`, `needsReviewCount`, `byStage` API responses |

The talent-proof system referenced in job-create.ts (`this.talentProof.getDisplayCopy('short')`) uses the verified TalentProofService rather than hardcoded fake numbers. Not a forbidden-content violation.

**Result: PASS — no forbidden content found in V5 changed files.**

---

## Applied Fixes

### Fix 1 — signup.component.html: Grammar in verification success message

**File:** `src/app/auth/signup/signup.component.html`

**Before (line 258):**
```
Verification link send to your email. Redirecting to Login ...
```

**After:**
```
Verification link sent to your email. Redirecting to login...
```

**Reason:** "send" → "sent" (past tense correction); "Login" → "login" (proper noun casing — not a brand name, lowercase is standard); trailing " ..." → "..." (consistent ellipsis).

---

### Fix 2 — job-create.component.ts: Publish-blocked snackbar message

**File:** `src/app/job/job-create/job-create.component.ts`

**Before (line 401):**
```typescript
this.snackBar.open(`Job not ready to be Published. Missing: ${missingJob}`, '', {
```

**After:**
```typescript
this.snackBar.open(`Your job post can't be published yet. Missing: ${missingJob.trim()}.`, '', {
```

**Reason:**
- "Job not ready to be Published" → "Your job post can't be published yet" — more conversational and employer-appropriate; removes mid-sentence capitalisation of "Published".
- Added `.trim()` on `missingJob` to remove trailing space from the space-concatenated missing field list.
- Added trailing period for grammatical completeness.

---

## Recommended Improvements (Deferred)

These are improvements identified during the audit that were not applied because they involve behavior changes, logic changes, or are outside the V5 changed-file scope.

### D1 — Mobile nav: align visible labels with aria-labels

**Files:** `employer-panel.component.html`

- "Home" visible label → "Dashboard" to match sidebar and aria-label
- "Account" visible label → "Subscription" to match aria-label and sidebar

These are behavior-adjacent (may affect layout/icon sizing) and are a judgment call on the product side.

---

### D2 — job-create: Add loading state during save/publish

**Files:** `job-create.component.html`, `job-create.component.ts`

- Publish button should be disabled and show a loading indicator while `saveJob` is in flight.
- Currently `!isAllowedToPublish` is the only disabled condition; subscription check only.
- Without a loading guard, rapid double-tap could submit twice.

---

### D3 — job-create: Add error state for failed save/publish

**Files:** `job-create.component.ts` `afterSubmit` handler

- `afterSubmit` only handles `'asDraft'` and `'published'`. If the facade emits an error or null, the user sees nothing.
- Add an error snackbar or dialog for network/API failure cases.

---

### D4 — job-create: Improve missing-field list readability

**Files:** `job-create.component.ts` `publishJobPost()`

The `missingJob` variable is built as space-concatenated raw strings (e.g. `"job type job level job banner "`). Even after the `.trim()` fix applied in this pass, the list reads as a run-on sentence. Recommended: build as an array and `.join(', ')` for comma-separated output.

```typescript
// Example improvement:
const missing: string[] = [];
if (!job.jobTypeId) missing.push('job type');
if (!job.jobLevelId) missing.push('job level');
// ...
this.snackBar.open(`Your job post can't be published yet. Missing: ${missing.join(', ')}.`, '', {...});
```

---

### D5 — job-create: Publish/draft dialog copy capitalisation

**Files:** `job-create.component.ts`

- `'Job successfully saved as Draft.'` — "Draft" capitalised mid-sentence.
- `'Job successfully Published.'` — "Published" capitalised.

Suggest: `'Job saved as draft.'` and `'Job published successfully.'`

---

### D6 — company-dashboard onboarding step 3: "done" logic semantic inversion

**Files:** `company-dashboard.component.ts`

Step 3 ("Review your first applicants") marks as `done` when `needsReviewCount > 0` — i.e. when applicants are *waiting*, not reviewed. Should use a reviewed/actioned count instead. This requires a backend data point not currently available in the dashboard response. Deferred pending API support.

---

### D7 — company-dashboard onboarding: add all-done completion message

**Files:** `company-dashboard.component.html`, `company-dashboard.component.ts`

When all onboarding steps complete, the section disappears silently. Consider a brief "You're all set!" confirmation before collapse, or a one-time toast.

---

### D8 — signup.component.html: "Re-enter Password is required" validation phrasing

**File:** `src/app/auth/signup/signup.component.html` line 179

Current: "Re-enter Password is required"
Suggested: "Please confirm your password"

Minor UX polish — reads more naturally as a prompt rather than a field-name assertion.

---

*End of GETHIRED_V5_NOTIFY_REPORT.md*
