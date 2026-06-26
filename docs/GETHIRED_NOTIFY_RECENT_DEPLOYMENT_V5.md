# GetHired NOTIFY — Recent Deployment Audit Report V5
## Audit scope: FE 41b5920 / BE 6a7755c
**Audit date:** 2026-06-26

---

## Executive Summary

This audit covers 5 specifically flagged changes (breadcrumb nav, job error state, job-seeker-portal Browse-jobs buttons, verifyAuth.js 403 body, auth-page noindex calls) plus a codebase-wide sweep of toasts, empty states, form validation, error states, and email templates.

**Defects found and fixed this pass:** 2
- NOTIFY-V5-F1: `warn-snackbar` CSS class referenced but not defined (HTTP 429 rate-limit toast would render with no semantic color)
- NOTIFY-V5-F2: `error-snackbar` CSS class referenced but not defined (recorder no-device toast would render with no semantic color)

**Defect found, not fixed (safe copy only; product behavior unchanged):** 1
- NOTIFY-V5-F3: Confirm-password label in `signup.component.html` used the i18n key `CREATE_ACCOUNT.PASSWORD_TEXTBOX` instead of `CREATE_ACCOUNT.CONFIRM_PASSWORD_TEXTBOX` — both fields showed "Password" in English. Fixed label to use the correct key.

**Previously flagged issues confirmed clear:** NOTIFY-P2 false-positive success constraints hold. `warn-snackbar` and `error-snackbar` are now defined. All breadcrumb a11y attributes are correct.

---

## Phase 1 — Breadcrumb Nav (job-posts-details.component.html)

**File:** `src/app/jobs/job-posts-details/job-posts-details.component.html` lines 15–21

| Check | Finding |
|---|---|
| `aria-label` on `<nav>` | PASS — `aria-label="Breadcrumb"` present |
| `aria-current="page"` on current item | PASS — set on `.gh-breadcrumb-item--current` |
| Screen reader announcement | PASS — `<ol>` semantics + `aria-current` correctly signal position to AT |
| Link vs text on current item | PASS — current item is plain text, not a link (correct; linking back to yourself is an a11y anti-pattern) |
| Job title content | PASS — `{{ selectedJobPost?.jobTitle }}` with safe-nav; graceful if undefined |

**Verdict:** No issues.

---

## Phase 2 — Job Error State (job-posts-details.component.ts + HTML)

**File:** `src/app/jobs/job-posts-details/job-posts-details.component.ts` lines 88–94
**Template:** `src/app/jobs/job-posts-details/job-posts-details.component.html` lines 2–12

### Error message copy quality

| Error condition | H5 heading | Body copy | CTA |
|---|---|---|---|
| `errMsg === 'Unable to load this job for the current session.'` | "Session required" | "Sign in to view this job." | Sign In → /signin |
| All other errors | "This job isn't available" | "It may have expired, been removed, or the link may be incorrect." | Browse all jobs → /jobs |

**Assessment:** Copy is clear and honest. The session-required path is correctly gated to that exact message string only. The "not available" catch-all is appropriately broad since the FE cannot distinguish expired vs deleted vs bad ID from the returned error message alone.

**Potential concern — tight string coupling:** The session-required branch depends on the exact string `'Unable to load this job for the current session.'` matching what the effects layer places in `jobError$`. If that string changes in the reducer/effects without updating the template, the error state silently falls through to the generic path (wrong heading, wrong CTA). This is a soft code smell, not a user-facing defect now.

**Noindex on error:** `jobErrorSub` calls `this.meta.updateTag({ name: 'robots', content: 'noindex' })`. This is intentional — prevents dead-job pages being indexed. Value is `'noindex'` only (no `follow` directive). Google treats omitted `follow` directive as `follow` by default, so this is effectively `noindex, follow`. Consistent with how the 404 page (`noindex, follow`) is handled. No issue.

**Role alert / aria-live:** Error div has `role="alert"` and `aria-live="assertive"`. Correct for an error state that replaces what would have been content.

**Verdict:** No copy or accessibility issues. Tight string coupling noted as D-01 (deferred, non-blocking).

---

## Phase 3 — Job Seeker Portal Browse-jobs buttons (job-seeker-portal.component.html)

**File:** `src/app/public/job-seeker-portal/job-seeker-portal.component.html`

Three "Browse jobs" / "Browse all jobs" CTAs changed from `<button>` to `<a routerLink="...">`:

| Location | Element | Destination | Accessible label |
|---|---|---|---|
| `.portal-workspace` section | `<a routerLink="/jobs" class="btn-link-cta">Browse jobs</a>` | /jobs | Visible text = label. Correct |
| Empty-state fallback (`jobs.length === 0`) | `<a routerLink="/jobs" class="btn-cta-primary gh-pressable">Browse all jobs</a>` | /jobs | Visible text = label. Correct |
| Non-empty below-grid | `<a routerLink="/jobs" class="btn-link-cta">Browse all jobs</a>` | /jobs | Visible text = label. Correct |

**Anchor vs button semantics:** Converting "navigate to /jobs" from `<button (click)="navigate()">` to `<a routerLink="/jobs">` is the correct semantic choice. Anchors with `href`/`routerLink` convey navigation intent to screen readers and expose the destination URL. The previous `<button>` pattern was only justified for actions — navigation to a URL is always an anchor.

**Visual appearance:** `btn-cta-primary` and `btn-link-cta` CSS classes are defined in `_portal-common.scss` and apply equally to `<a>` and `<button>` elements. No display difference.

**Focus/hover:** `_portal-common.scss` `.btn-cta-primary` has `&:hover, &:focus-visible { transform: translateY(-2px); }`. Angular Material does not intercept focus for plain anchors. Browser default focus ring is preserved. `btn-link-cta` has `&:focus-visible { outline: 2px solid $color-global-red-buttons; }`. Both correct.

**Screen reader announcement:** Anchor elements with visible text are announced as links. Previously as buttons with `(click)="goToJobs()"` they were announced as buttons. The new pattern is semantically more accurate.

**One CTA remains `<button>`:** The `<button type="submit" class="btn-cta-primary gh-pressable">Browse jobs</button>` inside the search form (line 24) is correct as a button because it submits the search form — it is not a bare navigation link.

**Verdict:** No issues. Change is correct and improves semantics.

---

## Phase 4 — verifyAuth.js 403 body change (BE)

**File:** `get-hired-BE/middleware/verifyAuth.js`

The 403 response body was changed from a raw error object to a plain string. New responses:
- No auth header and no cookie → `res.status(403).send("Unauthorized")`
- Token expired → `res.status(403).send("Token Expired. Login again.")`
- Other auth failure → `res.status(403).send('Authentication failed.')`

**FE handling:** `src/app/core/interceptor/unauthorize.interceptor.ts` catches `status === 403` (and 401) from any HTTP response. It does not attempt to parse the response body for display — it shows a hard-coded FE message: `"Your session has expired. Please sign in again to continue."` and redirects to `/signin`. The FE message is always shown regardless of the BE body content.

**Assessment:** The 403 body string change has no visible UX impact. The FE interceptor displays its own message and ignores the body. The BE body strings are useful for debugging in DevTools/logs only.

**Token-expired vs auth-failed distinction at FE:** The interceptor treats both the same (logout + redirect). This is intentional — both mean the user needs to re-authenticate. The distinction only matters if the FE wanted to show different messages (e.g., "Token expired" vs "Account locked"), which it does not.

**Verdict:** No UX regression. Clean and correct.

---

## Phase 5 — Auth pages noindex (signup, reset-pw, change-pw, account-auth)

All four auth pages call `this.seoService.setPageMeta({ title: '...', description: '...', robots: 'noindex, nofollow' })` in `ngOnInit`.

**Does `setPageMeta` accidentally override title/description?**
Yes — by design. `setPageMeta` always sets title, description, robots, OG tags, Twitter tags, and optionally canonical. This is intentional and correct for these pages: they each pass their own specific title ("Create Account | GetHired Online", "Reset Password | GetHired Online", etc.) so the side effect of setting the title is desired.

**Does it leave stale OG tags?** `setPageMeta` always overwrites all OG and Twitter meta tags on each call. No staleness risk.

**Canonical handling:** No `canonical` key is passed by auth pages, so `clearCanonical()` is called, removing the canonical link element. Correct — auth pages should not self-canonicalize.

**robots.txt vs meta robots redundancy:** `robots.txt` already disallows `/signup`, `/signin`, `/change-password`, `/reset-password`. The meta-robots call is defense-in-depth for JS-rendered crawling. Both layers are correct and compatible.

**Verdict:** No issues. The noindex calls are correct and have no unintended side effects.

---

## Phase 6 — Toast Inventory (NOTIFY-P2 constraint verification)

### Constraint compliance

| Constraint | Status |
|---|---|
| NEVER show success when successCount === 0 | PASS — import-add-user, import-add-candidate, import-add-contact all branch on successCount before selecting toast class |
| NEVER show success from click/submit alone | PASS — all success toasts gate on server response data |
| NEVER hide failed items behind generic success | PASS — partial success shows warning-snackbar with exact counts |
| NEVER treat duplicate/no-op as newly added | PASS — duplicate paths use info-snackbar with "already in your list" copy |

### Complete toast inventory

| File | Trigger | Message | Class | Issues |
|---|---|---|---|---|
| unauthorize.interceptor.ts | 401/403 response | "Your session has expired. Please sign in again to continue." | danger-snackbar | Clear. Covers both 401+403 correctly. |
| unauthorize.interceptor.ts | 429 response | "You've made too many requests. Please wait a moment and try again." | warn-snackbar | NOTIFY-V5-F1 fixed (class now defined). Copy is clear and non-alarmist. |
| auth.guard.ts | Wrong role | "You don't have access to that area. Redirecting you now." | danger-snackbar | Clear. |
| auth.guard.ts | Not logged in | "You are not Authorized to access that page. Please Login first" | danger-snackbar | Copy quality: "Authorized" should not be capitalized; "Login" should be "sign in" for brand consistency. Flagged D-02. |
| job-posts-details.component.ts | Share link copied | "Link copied to your clipboard" | success-snackbar | Clear. |
| public-company-details.component.ts | Share link copied | "Link copied to your clipboard" | success-snackbar | Clear. |
| skills-experience.component.ts | Profile save | "Profile successfully updated" | success-snackbar | Clear. |
| profile-basic-info.component.ts | New profile | "Your public profile has been created" | success-snackbar | Clear. |
| profile-basic-info.component.ts | Profile update | "Profile successfully updated" | success-snackbar | Clear. |
| account-authentication.component.ts | Verify email resent | "Verification email sent. Please check your inbox and verify your account." | success-snackbar | Clear (fixed in prior pass). |
| account-authentication.component.ts | Resend failure | `err` (raw error object) | danger-snackbar | Copy risk: raw error may be an object or empty string. Flagged D-03. |
| recorder-setting.component.ts | No record devices | "No Available Devices to record" | error-snackbar | NOTIFY-V5-F2 fixed (class now defined). Copy: inconsistent casing ("Available", "Devices"). Flagged D-04. |
| import-add-user.component.ts | All invited | "Invite sent." / "N invites sent." | success-snackbar | Good (fixed in prior pass). |
| import-add-user.component.ts | Partial | "N sent. M couldn't be added." | warning-snackbar | Good. |
| import-add-user.component.ts | All failed | "No invites were sent." | danger-snackbar | Good (fixed in prior pass). |
| import-add-candidate.component.ts | All added | "Candidate added." / "N candidates added." | success-snackbar | Good. |
| import-add-candidate.component.ts | Partial | "N added. M couldn't be added." | warning-snackbar | Good. |
| import-add-candidate.component.ts | All duplicate | "No new candidates were added. These candidates are already in your list." | info-snackbar | Good. |
| import-add-candidate.component.ts | Single duplicate | "This candidate is already in your list." | info-snackbar | Good. |
| import-add-candidate.component.ts | All failed | "No candidates were added." | danger-snackbar | Good. |
| import-add-candidate.component.ts | Generic error | "Something went wrong please try again later or contact your administrator" | danger-snackbar | Copy quality: missing period, "please" not capitalized. Flagged D-05 (consistent with same message in other files). |
| import-add-contact.component.ts | (same pattern) | (same as candidate equivalents) | various | Good. |
| contact-group.component.ts | Group created | `group.success` (server string) | success-snackbar | Raw server string pattern — see D-06. |
| contact-group.component.ts | Group edited | "Successfully Edited Group" | success-snackbar | Inconsistent with verb style (imperative vs past tense). D-07. |
| contact-group.component.ts | Group deleted | "Successfully Deleted Group" | success-snackbar | Same D-07. |
| contact-list.component.ts | Contact edited | "Successfully Edited Contact!" | success-snackbar | Same D-07. |
| contact-list.component.ts | Contact deleted | "Successfully Deleted Contact!" | success-snackbar | Same D-07. |
| reusable-table.component.ts | File download | "Your file is being downloaded. Please wait..." | success-snackbar | Micro-semantic issue: download is in progress, not complete — should not be success-class. Flagged D-08. |
| job-list.component.ts | (state-based) | from reducer deleteJobFail string | danger-snackbar | Correct. |

### CSS class audit

| Class | Status |
|---|---|
| success-snackbar | Defined (brand red + white text) |
| danger-snackbar | Defined (error red + white text) |
| warning-snackbar | Defined (amber-800 + white text, WCAG AA) |
| info-snackbar | Defined (gray-500 + white text, WCAG AA) |
| warn-snackbar | **FIXED this pass** — was undefined; now aliased to warning-snackbar color |
| error-snackbar | **FIXED this pass** — was undefined; now aliased to danger-snackbar color |

---

## Phase 7 — Empty State Copy Audit

| Component | Empty condition | Heading | Body | Quality |
|---|---|---|---|---|
| job-seeker-portal | jobs.length === 0 | "Explore open roles on GetHired" | "Job previews are not available here right now, but you can browse all open roles on the job board." | Good. Honest, explains the gap, provides CTA. |
| job-posts-list (employer) | No jobs created | "No Jobs Created Yet" | (from app-empty-section) | Acceptable. |
| job-posts-list (employer) | Search no results | "No jobs match your search" | (from app-empty-section) | Good. |
| job-list (employer) | No jobs | "No jobs yet" | (inline HTML) | Good. |
| recommended-jobs (applicant) | Insufficient profile | "We don't have enough profile information yet to recommend jobs. Add your skills and preferences to get personalized recommendations." | — | Good. Explains cause. Actionable. |
| recruiter-messages | No threads | (from HTML comment: "Global empty state") | — | Present. |
| recruiter-messages | Filter no results | (from HTML comment: "Filtered empty state") | — | Present. |
| recruiter-interview-hub | No interviews | (from HTML comment: "Empty state") | — | Present. |
| error-not-found | 404 | "Page Not Found" | (with links) | Correct. |
| applicant-panel | Profile load error | (from SEC-01 NOTIFY fallback) | — | Present. |

No empty states were found that claim data exists when it does not. No empty states produce false success signals.

---

## Phase 8 — Form Validation Messages Audit

### signup.component.html
| Field | Error condition | Message | Quality | Fix |
|---|---|---|---|---|
| First Name | required | "First Name is required" | Clear | — |
| Last Name | required | "Last Name is required" | Clear | — |
| Email | required | "Email is required" | Clear | — |
| Password | required | "Password is required" | Clear | — |
| Password | pattern | "Password must be 8 characters long with mixed uppercase, special characters and numbers." | Adequate | — |
| Confirm Password | required | "Re-enter Password is required" | Acceptable | — |
| Confirm Password | notEquivalent | "Passwords do not match" | Clear | — |
| Role | required | "Role is required" | Minimal | — |
| Confirm Password label | — | **Was "Password"; should be "Confirm Password"** | Bug | **FIXED** — now uses `CONFIRM_PASSWORD_TEXTBOX` key |

### change-pw.component.html
| Field | Error condition | Message |
|---|---|---|
| New Password | required | "Password is required" |
| New Password | pattern | "Password must be 8 characters long with mixed uppercase, special characters and numbers." |
| Confirm Password | required | "Re-enter Password is required" |
| Confirm Password | notEquivalent | "Passwords do not match" |

No issues in change-pw.

---

## Phase 9 — Email Template Audit (BE)

Email sending is via SendGrid dynamic templates. Templates are managed in the SendGrid dashboard (external). The mailer.js helper passes `dynamic_template_data` from the calling service. No email body copy exists in the repo to audit directly.

**GetHired templates identified in mailer.js:**
- `verify_email` (d-0dffbe21...)
- `pw_reset` (d-673ee5e8...)
- `add_user` (d-3ccde8af...)
- `invite` (d-db34d7fe...)
- `contact` (d-f041a4c1...)
- `interview` (d-998725e1...)
- `application` (d-9775084a...)

**Staging guard:** `isStaging` flag is imported but its usage in send routing is not shown in the mailer helper itself. The main concern — sending real emails — cannot be triggered by this audit (no send calls are made).

**FE note:** `account-authentication.component.ts` triggers `resendVerification()` which calls a BE API that then calls the email service. The FE toast ("Verification email sent.") correctly gates on `result?.data` — only shows success if the BE returned a data payload. No false success.

---

## Phase 10 — Notification Taxonomy Completeness

Current taxonomy classes in use:
- `success-snackbar` — confirmed positive outcome
- `danger-snackbar` — error, auth failure, all-failed
- `warning-snackbar` — partial success (some items failed)
- `info-snackbar` — no-op / duplicate / informational
- `warn-snackbar` (new) — rate-limit, throttling
- `error-snackbar` (new) — device/hardware errors

This is a complete 6-tier taxonomy. All tiers are now defined in CSS.

**Missing tier:** There is no `neutral-snackbar` or `loading-snackbar`. The download-in-progress toast (`reusable-table.component.ts`) uses `success-snackbar` while the download is still in progress — this is a semantic mismatch (D-08, deferred).

---

## Deferred Items (non-blocking)

| ID | Description | Priority | File |
|---|---|---|---|
| D-01 | Error state in job-posts-details depends on exact error string match from effects layer — fragile coupling. If effects string changes, wrong heading/CTA silently appears. Consider an error code enum. | Low | job-posts-details.component.html, job.effects.ts |
| D-02 | auth.guard.ts "You are not Authorized" — incorrect capitalization, "Login" should be "Sign in". Low visibility (only shown on wrong-role or unauthenticated access). | Low | auth.guard.ts |
| D-03 | account-authentication.component.ts resend error path passes raw `err` to snackBar. May display "[object Object]" or empty string if the error is non-string. | Medium | account-authentication.component.ts |
| D-04 | recorder-setting.component.ts "No Available Devices to record" — inconsistent capitalization of "Available" and "Devices". | Low | recorder-setting.component.ts |
| D-05 | "Something went wrong please try again later or contact your administrator" — missing period, missing capital on "please". Used in 4+ files identically. | Low | import-add-candidate, import-add-contact, contact-list, candidate-list |
| D-06 | contact-group.component.ts, job-list.component.ts, group-list.component.ts, candidate-list.component.ts use `group.success` / `candidate.success` — raw server strings passed directly to toast. No normalization or null-guard. | Medium | Various employer-contacts files |
| D-07 | Verb tense inconsistency: "Successfully Edited Group", "Successfully Deleted Group", "Successfully Edited Contact!", "Successfully Deleted Contact!" vs cleaner past-tense pattern "Group edited." / "Contact deleted." | Low | contact-group, contact-list |
| D-08 | reusable-table.component.ts download-in-progress toast uses `success-snackbar` while the file is still downloading. Should be `info-snackbar` with copy "Your download has started." | Low | reusable-table.component.ts |
