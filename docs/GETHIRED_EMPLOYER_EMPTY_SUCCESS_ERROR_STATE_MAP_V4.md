# GetHired Employer Journey — Empty, Success, Error, and Loading State Map V4

**Date:** 2026-06-24
**Scope:** Every major employer area documented with: current empty state, target empty state + next-action CTA, success state, error state, and loading state. Based on confirmed codebase behavior; inferred behavior is marked.

---

## How to Read This Document

Each area is documented with four state types:

- **Empty State:** What currently shows when there is no data (and what should show with a clear next-action CTA).
- **Success State:** What appears after a successful action (save, publish, message, update).
- **Error State:** What appears on failure, and how the employer recovers.
- **Loading State:** Skeleton, spinner, or absence of indicator.

"Current" = confirmed from codebase facts. "Target" = recommended V4 behavior. "Not confirmed" = codebase facts do not document this state; standard Angular behavior is assumed.

---

## 1. Dashboard — Hero and KPI Cards

### Empty State

| | Detail |
|---|---|
| **Current** | KPI card values are not confirmed to show zero-state indicators. If no company exists, `CompanyNotSetupComponent` dialog appears. If company exists but no jobs/applicants, KPI cards presumably show 0 values (based on API response having 0 in those fields). No confirmed empty-state component replaces KPI cards when values are zero. |
| **Target** | When `activeJobs === 0`: KPI card for "Active Jobs" shows a "Post your first job" link beneath the count. When `needsReview === 0`: action center shows "No applicants needing review" with a "Create or share your job post" CTA. All zero-value KPI cards should show `0` (real data), not blank/dash, per the no-fake-data rule. |
| **Next-Action CTA** | "Post your first job" -> `/recruiter/jobs/create` |

### Success State

| | Detail |
|---|---|
| **Current** | KPI cards populated from `GET /company/dashboard` response. All four cards show real values: `activeJobs`, `applicants/month`, `interviews/month`, `needsReview`. |
| **Target** | Same. No change needed when data is present. Consider: a subtle "Last updated" timestamp for employer confidence. |

### Error State

| | Detail |
|---|---|
| **Current** | KPI cards: no confirmed error state. If `GET /company/dashboard` fails, cards may remain empty or show 0 without explanation. |
| **Target** | KPI section shows: "Unable to load dashboard data. [Retry]" with `pipelineError`-style retry pattern. Error must not show fake/zero values. |

### Loading State

| | Detail |
|---|---|
| **Current** | `emp-dash-hero-skeleton` CSS skeleton loader — confirmed. |
| **Target** | Preserve. Add `aria-busy="true"` on skeleton container. Add visually hidden text: "Loading dashboard summary." |

---

## 2. Dashboard — Action Center

### Empty State

| | Detail |
|---|---|
| **Current** | Action center conditionally renders CTAs: "Review Applicants" only if `needsReviewCount > 0`; "Manage Jobs" always; "Complete Company Profile" only if `companyProfileMissingFields()` returns true. If all conditions are false (no applicants to review, profile complete), only "Manage Jobs" appears. |
| **Target** | When only "Manage Jobs" is shown (no urgent items): add a positive reinforcement message: "All caught up. Keep growing your team." Subtle copy beneath "Manage Jobs" CTA. This avoids an empty-feeling action center. |
| **Next-Action CTA** | "Manage Jobs" always present -> `/recruiter/jobs/list` |

### Success State

| | Detail |
|---|---|
| **Current** | After company profile is completed, "Complete Company Profile" card disappears from action center on next dashboard load. After all applicants are reviewed, "Review Applicants" card disappears. |
| **Target** | Same — conditional rendering is correct. |

### Error State

| | Detail |
|---|---|
| **Current** | No confirmed error state for the action center section specifically. Action center depends on `GET /company/dashboard` data — if that fails, the action center may not render. |
| **Target** | If dashboard data fails, show: "Action center unavailable. [Retry]" |

### Loading State

| | Detail |
|---|---|
| **Current** | `emp-dash-action-skeleton` CSS skeleton loader — confirmed. |
| **Target** | Preserve. Add `aria-busy="true"`. |

---

## 3. Dashboard — Hiring Pipeline Chart

### Empty State

| | Detail |
|---|---|
| **Current** | Pipeline chart loads from `GET /company/dashboard/pipeline-overview`. If no applicants are in any stage, the chart presumably shows all stages with 0 counts (no bars with height). No confirmed empty-state message. |
| **Target** | When all stage counts are 0: replace bar chart with a message: "No applicants in your pipeline yet. Publish a job to attract candidates." CTA: "Create Job" -> `/recruiter/jobs/create`. |
| **Next-Action CTA** | "Create Job" -> `/recruiter/jobs/create` |

### Success State

| | Detail |
|---|---|
| **Current** | Bar chart rendered with real stage counts from `/company/dashboard/pipeline-overview`. Each bar is clickable (currently calls `goToJobsList()` — wrong destination, documented bug). |
| **Target** | Same data. Fix click target: navigate to stage-filtered applicant view, not generic job list. |

### Error State

| | Detail |
|---|---|
| **Current** | `pipelineError` flag is set when `GET /company/dashboard/pipeline-overview` fails. A retry mechanism is shown — confirmed. |
| **Target** | Preserve current behavior. Ensure retry button has `aria-label="Retry loading pipeline data"`. |

### Loading State

| | Detail |
|---|---|
| **Current** | `emp-dash-pipeline-skeleton` CSS skeleton loader — confirmed. `pipelineLoading` flag controls this. |
| **Target** | Preserve. Add `aria-busy="true"` on pipeline section container. |

---

## 4. Dashboard — Needs-Review Applicants List

### Empty State

| | Detail |
|---|---|
| **Current** | Section does not render when `needsReviewCount === 0`. No placeholder shown. |
| **Target** | When `needsReviewCount === 0` and at least one job is published: show a collapsed/minimal state in this section saying: "No applicants need review right now." This confirms the section is active but currently clear. |

### Success State

| | Detail |
|---|---|
| **Current** | List of applicants whose status indicates they need employer review. Each item is a list row with applicant info. |
| **Target** | Each row should have a "Review" CTA that navigates directly to that applicant's detail within the correct job applicants page. Currently unclear if this direct navigation is implemented. |

### Error State

| | Detail |
|---|---|
| **Current** | Not confirmed. Depends on dashboard API response including needs-review data. |
| **Target** | Same error handling as KPI cards: "Unable to load applicant review list. [Retry]" |

### Loading State

| | Detail |
|---|---|
| **Current** | Included in `emp-dash-hero-skeleton` or `emp-dash-action-skeleton` (inferred — distinct skeleton for this section not confirmed separately). |
| **Target** | Skeleton list rows while loading. |

---

## 5. Jobs List

### Empty State

| | Detail |
|---|---|
| **Current** | Table renders with no rows. No confirmed empty-state component. No CTA to create a job. |
| **Target** | Show: an illustration or icon, headline "No job posts yet", body "Create your first job post to start hiring.", CTA "Create Job" -> `/recruiter/jobs/create`. Use brand SVG (e.g., `/assets/brand/gethired-wow/hiring-pipeline-lines.svg`). |
| **Next-Action CTA** | "Create Job" -> `/recruiter/jobs/create` |

### Success State

| | Detail |
|---|---|
| **Current** | Table with job rows. Each row: job title, status badge (Draft/Published), date posted, action trigger (table control modal). Status filter (All / Draft / Published) above table. |
| **Target** | Same. Add: total count above table ("Showing 3 job posts"). |

### Error State

| | Detail |
|---|---|
| **Current** | Not confirmed for `GET /job/basiclist` failure. |
| **Target** | "Unable to load your job posts. [Retry]" inline with the table area. |

### Loading State

| | Detail |
|---|---|
| **Current** | Not confirmed. |
| **Target** | Skeleton table rows (3-5 rows of shimmer) while `GET /job/basiclist` is in flight. |

---

## 6. Job Create — Step 1: Job Details

### Empty State

| | Detail |
|---|---|
| **Current** | All form fields blank. Required field indicators exist (HTML5 `required` assumed, exact implementation not confirmed). |
| **Target** | Required fields labeled with asterisk or "(required)". `jobBanner` file upload shows placeholder: "Upload a banner image for your job post." |

### Success State

| | Detail |
|---|---|
| **Current** | All fields filled. "Next" button advances to step 2. |
| **Target** | Same. No inline success confirmation needed per step (stepper handles progress). |

### Error State

| | Detail |
|---|---|
| **Current** | Required field errors not surfaced at step level — only at publish time. |
| **Target** | Add HTML5 validation or Angular form validators that highlight empty required fields when "Next" is clicked (at minimum for `jobTitle`, `jobCity`, `jobCountry`, `jobBanner`). |

### Loading State

| | Detail |
|---|---|
| **Current** | File upload progress for `jobBanner` (assumed standard browser behavior). |
| **Target** | Add upload progress indicator for `jobBanner` file upload. Show file name after upload. |

---

## 7. Job Create — Step 2: Rates and Roles

### Empty State

| | Detail |
|---|---|
| **Current** | `jobTypeId` and `jobLevelId` dropdowns unselected. Salary fields blank. |
| **Target** | Dropdowns show placeholder option: "Select job type" / "Select job level". Salary fields: placeholder "e.g. 50,000". Helper copy: "Salary information is optional but increases applicant confidence." |

### Success State

| | Detail |
|---|---|
| **Current** | Fields filled. "Next" advances to step 3. |
| **Target** | Same. |

### Error State

| | Detail |
|---|---|
| **Current** | `jobTypeId` and `jobLevelId` checked at publish time. No step-level validation. |
| **Target** | If "Next" is clicked without `jobTypeId` or `jobLevelId` selected: inline validation message on the dropdown. These are required to publish, so catching them earlier improves UX. |

### Loading State

| | Detail |
|---|---|
| **Current** | Dropdown options loaded (from lookup API — assumed). |
| **Target** | Dropdowns show "Loading..." while options are being fetched. |

---

## 8. Job Create — Step 3: Create Interview

### Empty State

| | Detail |
|---|---|
| **Current** | Zero interview questions in `interviewQuestions[]`. No indicator that at least 1 is required to publish. Employer can advance to step 4 without adding any questions. |
| **Target** | Show counter: "0 interview questions added. At least 1 is required to publish." Counter updates dynamically as questions are added: "2 interview questions added." When 0 and employer clicks "Next": show inline warning (not a block): "You can proceed and save as draft, but at least 1 interview question is required to publish." Allow employer to continue (draft save is always permitted). |
| **Next-Action CTA** | "Add Interview Question" button (inline within step 3) |

### Success State

| | Detail |
|---|---|
| **Current** | Interview questions added to `interviewQuestions[]`. Visible as a list. |
| **Target** | Same. Show count: "2 interview questions added." When 1+ questions exist: counter turns green (or shows a check indicator). |

### Error State

| | Detail |
|---|---|
| **Current** | `interviewQuestions.length === 0` at publish time shows "Job not ready to be Published" snackbar with wrong CSS class (`success-snackbar`). |
| **Target** | Step-3 inline warning is the primary notice. Step-4 publish-block snackbar is the fallback. Fix snackbar CSS class to `error-snackbar` or `warning-snackbar`. |

### Loading State

| | Detail |
|---|---|
| **Current** | `interviewTemplateId` template list loads (source: assumed API). |
| **Target** | Template selector shows loading state while templates are fetched. |

---

## 9. Job Create — Step 4: Preview and Publish

### Empty State

| | Detail |
|---|---|
| **Current** | N/A — preview shows whatever was entered. Cannot be empty. |
| **Target** | If employer somehow reaches step 4 with all fields blank: show a warning banner: "Some required fields are missing. Fill them in before publishing." |

### Success State (Draft)

| | Detail |
|---|---|
| **Current** | `POST /job/create` with `jobStatusId: 1`. Dialog shown. Navigate to `/recruiter/jobs/list`. Job appears with "Draft" status. |
| **Target** | Same. Dialog copy: "Draft saved. Your job post is ready when you are. Publish it from your job list." |

### Success State (Published)

| | Detail |
|---|---|
| **Current** | `POST /job/create` with `jobStatusId: 2`. Success snackbar. Navigate to `/recruiter/jobs/list`. `HapticFeedbackService.jobPublished()` should fire. |
| **Target** | Same. Snackbar copy: "Job published! Applicants can now find and apply." |

### Error State (Publish Blocked)

| | Detail |
|---|---|
| **Current** | Snackbar "Job not ready to be Published" with `panelClass: ['success-snackbar']` — shows in coral color (same as success). Employer may not realize this is an error. |
| **Target** | Change `panelClass` to `['error-snackbar']` or `['warning-snackbar']`. Error message should be descriptive: "Missing required fields: [list the specific missing fields]." |

### Error State (API Failure)

| | Detail |
|---|---|
| **Current** | Not confirmed. |
| **Target** | Snackbar: "Failed to save job post. Please try again." with `['error-snackbar']`. Do not navigate away on API failure. |

### Loading State

| | Detail |
|---|---|
| **Current** | Not confirmed for publish/save submit. |
| **Target** | "Publish" and "Save as Draft" buttons show loading spinner while API call is in flight. Buttons disabled during loading to prevent double-submission. |

---

## 10. Job Publish (Standalone Summary)

This is a summary of the publish event across the create and edit flows.

| State | Current | Target |
|-------|---------|--------|
| Success | Snackbar + navigate to job list | Snackbar with job title: "'{jobTitle}' is now live." + `HapticFeedbackService.jobPublished()` |
| Blocked (missing fields) | Snackbar with `success-snackbar` class (WRONG) | Snackbar with `error-snackbar` class + specific missing fields listed |
| API error | Not confirmed | Snackbar: "Failed to publish. Try again." Employer stays on current page. |

---

## 11. Applicant List

### Empty State

| | Detail |
|---|---|
| **Current** | Table renders with no rows. No confirmed empty-state component or CTA. |
| **Target** | When `applicants.length === 0`: Show illustration, headline "No applicants yet", body "Share your job post to attract candidates.", CTA "Share Job" (copy link from `GET /job/sharelink`) + secondary CTA "View Job Post" -> `/jobs/details/:id`. Use brand SVG (e.g., `/assets/brand/gethired-wow/application-status-path.svg`). |
| **Next-Action CTA** | "Share Job" (copy sharelink) + "View Job Post" (public view) |

### Success State

| | Detail |
|---|---|
| **Current** | Table with applicant rows. `matchSignalLabel` column. Match signal disclaimer shown when `hasAnyMatchSignal()` returns true: "Match Signals are decision-support indicators..." — must be preserved verbatim. |
| **Target** | Same. Add: total applicant count above table ("12 applicants"). |

### Error State (Main List)

| | Detail |
|---|---|
| **Current** | Not confirmed for `GET /job/applicants` failure. |
| **Target** | "Unable to load applicants. [Retry]" with the same retry mechanism as pipeline error. |

### Error State (Match Signals)

| | Detail |
|---|---|
| **Current** | Best-effort: if `GET /job/applicants/signals` fails, main list still renders. No error shown. `hasAnyMatchSignal()` returns false. Disclaimer hidden. |
| **Target** | Same behavior (correct). No error UI needed for signal failure — it is intentionally best-effort. |

### Loading State

| | Detail |
|---|---|
| **Current** | Not confirmed. |
| **Target** | Skeleton table rows while `GET /job/applicants` is in flight. Signal column shows shimmer separately (best-effort, loads after main list). |

---

## 12. Applicant Detail Panel

### Empty State

| | Detail |
|---|---|
| **Current** | Panel opens when `showProfile = true`. Always shows some content (avatar, snapshot card, preview, message thread). No "empty" state applies here as the panel is only shown when an applicant is selected. |
| **Target** | N/A — panel is by definition non-empty (opened on applicant row click). Handle loading states per sub-section. |

### Success State

| | Detail |
|---|---|
| **Current** | Full panel with: applicant avatar, snapshot card (`completeness%`, `matchLevel`), `<app-application-preview>`, `<app-message-thread>`. |
| **Target** | Same. "Invite" button (EB-033) should become functional (currently empty TODO). |

### Error State

| | Detail |
|---|---|
| **Current** | Message thread errors preserved with retry. Snapshot card load failure not confirmed. Application preview failure not confirmed. |
| **Target** | Each panel section has its own isolated error state: "Unable to load snapshot. [Retry]", "Unable to load application preview. [Retry]", message thread error per current behavior. |

### Loading State

| | Detail |
|---|---|
| **Current** | Snapshot card: async load. Message thread: poll every 8s. |
| **Target** | Snapshot card: show skeleton placeholder while `GET /job/applicant/snapshot-summary` is in flight. Application preview: skeleton or spinner. Message thread: loading indicator on first load before first poll completes. |

---

## 13. Message Thread

### Empty State (No Messages Yet)

| | Detail |
|---|---|
| **Current** | Thread is opened via `POST /messages/thread` when the detail panel loads. If no messages exist: thread area shows blank or no messages. |
| **Target** | Show: "No messages yet. Send a message to start the conversation." with focus on the message input. Helper copy: "Applicants are notified when you send a message." |
| **Next-Action CTA** | Message input field (auto-focused when thread is opened for the first time) |

### Success State (Messages Sent/Received)

| | Detail |
|---|---|
| **Current** | Messages appear in a thread list. New messages appear within 8 seconds via polling. Sent messages appear immediately or on next poll. |
| **Target** | Same. Consider: optimistic UI (sent message appears immediately before API confirmation). |

### Error State (Send Failure)

| | Detail |
|---|---|
| **Current** | Send failure shows error state with retry in `app-message-thread` component — confirmed. |
| **Target** | Preserve current retry behavior. Error message copy: "Message failed to send. [Retry]" |

### Error State (Load Failure)

| | Detail |
|---|---|
| **Current** | Thread load errors preserved in component. |
| **Target** | "Unable to load conversation. [Retry]" with retry for `POST /messages/thread` + `GET /messages/thread/messages`. |

### Loading State

| | Detail |
|---|---|
| **Current** | Polling every 8s. Initial load not confirmed to have a loading state. |
| **Target** | Show typing indicator or loading shimmer on initial message load. Poll silently (no visible spinner on subsequent polls). |

---

## 14. Company Profile

### Empty State (First-Time)

| | Detail |
|---|---|
| **Current** | All form fields blank. No fields pre-filled. No helper copy in fields. |
| **Target** | Placeholder text in fields: `companyDetails` textarea: "Describe your company — what you do, your culture, and why people love working here." `companyCity`: "e.g. Manila". Logo upload: "Upload your company logo (PNG or JPG, square recommended)." |
| **Next-Action CTA** | "Save Company Profile" form submit |

### Success State

| | Detail |
|---|---|
| **Current** | Company record saved. Dashboard "Complete Company Profile" action card disappears on next load. Success feedback not confirmed (assumed snackbar). |
| **Target** | Success snackbar: "Company profile saved." `HapticFeedbackService.success()`. Brief visual pulse on the saved section. |

### Error State

| | Detail |
|---|---|
| **Current** | Not confirmed for save API failure. |
| **Target** | Snackbar: "Failed to save company profile. Please try again." Employer stays on form with entered data preserved. |

### Loading State (Existing Data)

| | Detail |
|---|---|
| **Current** | Not confirmed. On return visits, company data loads before form renders (assumed). |
| **Target** | Show skeleton form fields while `GET /company/usercompany` is in flight. Prevents layout shift. |

---

## 15. Company Not Setup Dialog

### Empty State

| | Detail |
|---|---|
| **Current** | Dialog shown with "Setup Company" CTA. CTA closes dialog but does NOT navigate to company setup. Employer is left on dashboard. |
| **Target** | Same dialog, but "Setup Company" CTA navigates to `/recruiter/company/details`. This is the fix for the broken `redirectToSetup()` method. |

### Success State

| | Detail |
|---|---|
| **Current** | None — dialog closes to an empty dashboard state. |
| **Target (after fix)** | Dialog closes AND employer arrives at `/recruiter/company/details` with a blank form and a helpful onboarding copy: "Complete your company profile to start posting jobs." |

### Error State

| | Detail |
|---|---|
| **Current** | None — dialog is a pure UI component with no API calls. |
| **Target** | N/A for the dialog itself. Error states live in the company profile form. |

### Loading State

| | Detail |
|---|---|
| **Current** | Dialog shows immediately. No loading state. |
| **Target** | Same — dialog is instant. |

---

## 16. Interview Page

### Empty State

| | Detail |
|---|---|
| **Current** | `<app-under-construction>` renders regardless of any state. No data is displayed or loaded. |
| **Target** | Replace generic under-construction content with a context-specific stub: "Interview scheduling is coming soon. For now, add interview questions when creating a job post." Include a CTA: "Create a Job with Interview Questions" -> `/recruiter/jobs/create`. |
| **Next-Action CTA** | "Create a Job with Interview Questions" -> `/recruiter/jobs/create` |

### Success State

| | Detail |
|---|---|
| **Current** | N/A — page is a stub. |
| **Target** | N/A until the module is built. |

### Error State

| | Detail |
|---|---|
| **Current** | N/A |
| **Target** | N/A |

### Loading State

| | Detail |
|---|---|
| **Current** | None — `<app-under-construction>` renders instantly. |
| **Target** | None needed for stub. |

---

## 17. Subscription Page

### Empty State (No Active Subscription)

| | Detail |
|---|---|
| **Current** | Plan selection UI (assumed — not fully documented). |
| **Target** | Show available plans with feature comparison. CTA: "Choose a Plan" -> payment flow. |

### Success State (Active Subscription)

| | Detail |
|---|---|
| **Current** | Current plan details shown. Job post limit visible. Upgrade option available. |
| **Target** | Same. Add: "X of Y job posts used" progress indicator. Renewal date. |

### Error State (Payment Failure)

| | Detail |
|---|---|
| **Current** | Not confirmed. |
| **Target** | "Payment failed. Please try again or use a different card." |

### Loading State

| | Detail |
|---|---|
| **Current** | Not confirmed. |
| **Target** | Skeleton plan cards while subscription data loads. |

---

## 18. Expired Jobs List

### Empty State

| | Detail |
|---|---|
| **Current** | Table renders with no rows. No confirmed empty state. |
| **Target** | "No expired jobs. Your active jobs will appear here when they expire." |

### Success State

| | Detail |
|---|---|
| **Current** | Table with expired job rows. Row actions (re-post, archive — assumed). |
| **Target** | Same. Show expiry date per row. |

### Error State

| | Detail |
|---|---|
| **Current** | Not confirmed for `GET /job/expiredlist` failure. |
| **Target** | "Unable to load expired jobs. [Retry]" |

### Loading State

| | Detail |
|---|---|
| **Current** | Not confirmed. |
| **Target** | Skeleton table rows. |

---

## State Coverage Summary

| Area | Empty State | Success State | Error State | Loading State | V4 Fix Needed? |
|------|------------|---------------|-------------|---------------|---------------|
| Dashboard Hero/KPIs | Not confirmed | Confirmed (real data) | Not confirmed for KPIs; pipeline: confirmed | Confirmed (skeleton) | YES — empty state + error state + aria-busy |
| Dashboard Action Center | Correct (conditional) | Correct | Not confirmed | Confirmed (skeleton) | YES — aria-busy + "all caught up" copy |
| Dashboard Pipeline | Not confirmed | Confirmed (real data) | Confirmed (pipelineError + retry) | Confirmed (skeleton) | YES — empty state + aria-labels on bars |
| Dashboard Needs-Review | Not shown (correct) | Confirmed | Not confirmed | Partially confirmed | YES — zero-state copy |
| Jobs List | NOT confirmed | Confirmed | Not confirmed | Not confirmed | YES — empty state + loading skeleton |
| Job Create Step 1 | Blank form | Correct | At publish only | File upload only | YES — per-step validation |
| Job Create Step 2 | Dropdown placeholders | Correct | At publish only | Dropdown load not confirmed | YES — per-step validation |
| Job Create Step 3 | No requirement indicator | Correct | Wrong snackbar class | Template load not confirmed | YES — question count indicator + snackbar fix |
| Job Create Step 4 | N/A | Draft: dialog. Publish: snackbar | Wrong snackbar class on block | Submit loading not confirmed | YES — fix panelClass + submit loading state |
| Job Publish | N/A | Snackbar + navigate | Wrong panelClass (BUG) | Not confirmed | YES — fix panelClass |
| Applicant List | Not confirmed | Confirmed | Signals: best-effort. Main: not confirmed | Not confirmed | YES — empty state + loading skeleton |
| Applicant Detail | N/A (always has applicant) | Confirmed | Per-section: partial | Per-section: partial | YES — per-section loading + error |
| Message Thread | Not confirmed | Confirmed | Confirmed (retry) | Not confirmed (initial) | YES — empty state + initial loading |
| Company Profile | Blank form | Not confirmed | Not confirmed | Not confirmed | YES — success snackbar + loading skeleton |
| Company Not Setup | Dialog (broken CTA) | Broken | N/A | Instant | YES (CRITICAL) — fix redirect |
| Interview Page | Under-construction stub | N/A | N/A | None | YES — contextualized stub content |
| Subscription | Assumed plan select | Assumed plan display | Not confirmed | Not confirmed | YES — document and verify |
| Expired Jobs | Not confirmed | Table (assumed) | Not confirmed | Not confirmed | YES — empty state |

---

*End of Document 11*
