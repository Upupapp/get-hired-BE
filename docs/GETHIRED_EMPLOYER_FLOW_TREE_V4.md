# GetHired Employer Journey — Flow Tree V4

**Date:** 2026-06-24
**Format:** Hierarchical flow tree to 5-8 levels. Each flow documents: Flow ID, Name, Starting State, Goal, Trigger, step-by-step levels (L1-L8), Frontend Route/Component, Backend/API, Tables, Guard/Scope, States, Motion/Effect, CTA Behavior, Success/Fallback, Dead-end Risk, Safe Fix.

---

## Flow Index

| Flow ID | Name |
|---------|------|
| EF-01 | Guest Discovers Platform |
| EF-02 | Employer Signup |
| EF-03 | Email Verification |
| EF-04 | First Login |
| EF-05 | Company Not Setup (Blocker Resolution) |
| EF-06 | Company Profile Setup |
| EF-07 | Dashboard Return Visit |
| EF-08 | Create Job — Draft |
| EF-09 | Create Job — Publish |
| EF-10 | Edit Existing Job |
| EF-11 | Archive Job |
| EF-12 | View Expired Jobs |
| EF-13 | Navigate to Applicant List |
| EF-14 | Review Applicant Detail |
| EF-15 | Message Applicant |
| EF-16 | Invite Applicant (Currently Broken) |
| EF-17 | View Video Response |
| EF-18 | Dashboard Pipeline Drill-Down (Currently Broken) |
| EF-19 | Subscription Gate on Job Create |
| EF-20 | Subscription Management |

---

## EF-01: Guest Discovers Platform

**Starting State:** Anonymous visitor, no account, no localStorage session.
**Goal:** Employer understands the platform and navigates toward signup.
**Trigger:** Direct URL, search engine result, referral link.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Visit site root | `/` | None | AppModule redirects to `/home` |
| L2 | View public landing | `/home` `MainPortalComponent` | None | No guard |
| L3 | Click "For Employers" | `/employers` `EmployerPortalComponent` | None | No guard |
| L3a | Browse jobs (alternative path) | `/jobs` `PublicListComponent` | `GET /job/published` | Optional evaluation step |
| L4a | View job detail | `/jobs/details/:id` `PublicDetailsComponent` | `GET /job/details` | No guard; JSON-LD not confirmed |
| L4b | Search jobs | `/jobs/search/:keyword` `PublicSearchComponent` | (search API) | No guard |
| L5 | Click employer signup CTA | -> `/signup?role=2` | None | UnauthGuard on destination |

**Guard/Scope:** None on public routes. `UnauthGuard` on `/signup` prevents already-authed users.

**States:**
- Loading: none (SSR or fast static content assumed)
- Empty: no confirmed empty state on `/jobs` when zero published jobs exist
- Error: 404 -> `/error-page` (catch-all route `**`)

**Motion/Effect:** None documented for public pages.

**CTA Behavior:** Employer signup CTA on `/employers` leads to `/signup?role=2`.

**Success:** Employer clicks signup CTA and enters Phase 2.

**Fallback:** If employer is already authenticated and visits `/signup`, `UnauthGuard` redirects to `/recruiter`.

**Dead-end Risk:** Empty job list on `/jobs` (no published jobs on platform) gives the impression of an unused platform. No empty state CTA exists to convert browsing employers to sign up.

**Safe Fix:** Add a "Post a job today" CTA to the `/jobs` empty state.

---

## EF-02: Employer Signup

**Starting State:** Unauthenticated. Arrived at `/signup`.
**Goal:** Create an employer account.
**Trigger:** Click on signup CTA from `/employers` or direct navigation to `/signup?role=2`.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Arrive at signup page | `/signup` `SignupComponent` (`UnauthGuard`) | None | |
| L2 | Role pre-selected | `?role=2` sets employer tab | None | Without `?role=2`, employer must manually select role |
| L3 | Fill in name, email, password | Form fields | None | Client-side validation |
| L4 | Submit form | (POST signup API) | (signup endpoint) | Creates user with role=2, verified=false |
| L5 (success) | Navigate to verification step | `/verify` or success message | None | Email sent to provided address |
| L5 (failure — duplicate) | Show error on form | None | Form error state | No confirmed error component |

**Guard/Scope:** `UnauthGuard` — if already authenticated, redirected to `/recruiter`.

**States:**
- Loading: form submit spinner (assumed standard Angular behavior)
- Error: duplicate email, weak password (API-dependent error messages)
- Success: navigation to `/verify` or confirmation screen

**Motion/Effect:** Not documented for auth pages.

**CTA Behavior:** "Sign Up" submit button. If role not pre-selected: tab/radio to select Employer vs. Applicant vs. Admin.

**Success:** Account created, verification email sent, employer navigates to `/verify`.

**Fallback:** If signup API fails, form shows error. Employer retries or navigates to `/signin` if account already exists.

**Dead-end Risk:** Employer arrives at `/signup` without `?role=2` and selects the wrong role. No in-form confirmation of selected role after submission.

**Safe Fix:** Add a "Signing up as an Employer" confirmation label in the form when role=2 is active. Make this visible regardless of query param.

---

## EF-03: Email Verification

**Starting State:** Account created, verification email sent, user not yet verified.
**Goal:** Verify employer email address to activate account.
**Trigger:** Click verification link in email.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Receive verification email | Email client | None | Email delivery depends on backend email service |
| L2 | Click link | `/verify` `VerifyComponent` | (verify token API) | Token in URL query param |
| L3 (success) | Account verified | `/verify` success state | None | Employer can now sign in |
| L3 (failure — expired token) | Show expired token error | `/verify` error state | None | No confirmed resend option in documented routes |

**Guard/Scope:** None (public route).

**States:** Token valid -> success. Token invalid/expired -> error. No confirmed loading skeleton.

**Dead-end Risk:** Expired verification token with no resend option visible in the employer flow.

**Safe Fix:** Add a "Resend verification email" CTA on the token-error state of `/verify`.

---

## EF-04: First Login

**Starting State:** Verified employer account exists. Not logged in.
**Goal:** Authenticate and reach the employer dashboard.
**Trigger:** Employer navigates to `/signin`.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Navigate to signin | `/signin` `SigninComponent` (`UnauthGuard`) | None | |
| L2 | Enter email and password | Form fields | None | Client-side validation |
| L3 | Submit | (POST auth API) | (auth/login endpoint) | Returns token + user data |
| L4 | Write localStorage | None | None | `state:'true'`, `role:'2'`, `user:{...}`, `withActiveSubscription` |
| L5 | Navigate to dashboard | `/recruiter/dashboard` | None | `AuthGuard` reads localStorage on arrival |
| L6 | Dashboard init | `company-dashboard.component` | `GET /company/usercompany` `GET /company/dashboard` `GET /company/dashboard/pipeline-overview` | Skeleton loaders shown during API calls |
| L7a (company exists) | KPI cards + pipeline load | `company-dashboard.component` | Responses populate template | Action center renders |
| L7b (no company) | Company-not-setup dialog | `CompanyNotSetupComponent` | None | See EF-05 |

**Guard/Scope:** `UnauthGuard` on `/signin`. `AuthGuard` on `/recruiter/dashboard`.

**States:**
- Loading: skeleton loaders (`emp-dash-hero-skeleton`, `emp-dash-action-skeleton`, `emp-dash-pipeline-skeleton`)
- Error (login): form error (wrong credentials)
- Error (dashboard APIs): `pipelineError` flag + retry for pipeline; KPI error state not confirmed
- Success (company exists): full dashboard renders
- Success (no company): dialog blocker appears

**Motion/Effect:** `@animate` trigger (fade+scale, 600ms) on dashboard content entry. Skeleton loaders transition to content.

**CTA Behavior:** "Sign In" submit button on `/signin`. On success: programmatic navigation to `/recruiter`.

**Success:** Employer sees dashboard with live data.

**Fallback:** Login API failure -> form shows error.

**Dead-end Risk:** If backend token has expired but localStorage still has `state:'true'`, `AuthGuard` passes but all API calls return 401. No confirmed 401 interceptor in frontend. Employer sees API error states with no "re-login" prompt.

**Safe Fix:** Add an HTTP interceptor that clears localStorage and redirects to `/signin` on 401 responses from any employer API call.

---

## EF-05: Company Not Setup (Blocker Resolution)

**Starting State:** Authenticated employer. No company record. `CompanyNotSetupComponent` dialog shown.
**Goal:** Navigate to company setup.
**Trigger:** Dashboard detects no company (`GET /company/usercompany` returns empty).

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Dialog appears | `CompanyNotSetupComponent` | None | Shown as Angular Material dialog |
| L2 | Employer reads dialog | Dialog content | None | Explains company setup is required |
| L3 | Clicks "Setup Company" | `redirectToSetup()` in component | None | |
| L4 (BROKEN) | Dialog closes | `dialogRef.close()` | None | `router.navigate` to `/recruiter/company/details` IS COMMENTED OUT |
| L4 (TARGET) | Navigate to company details | `/recruiter/company/details` | None | Required fix |

**Guard/Scope:** Dialog shown from within `company-dashboard.component`. No separate guard.

**States:**
- Current: dialog closes, employer is left on `/recruiter/dashboard` with no path forward.
- Target: dialog closes AND employer navigates to `/recruiter/company/details`.

**Motion/Effect:** Angular Material dialog close animation.

**CTA Behavior:** "Setup Company" button — currently non-functional (closes dialog only).

**Success (after fix):** Employer lands on `/recruiter/company/details` and can complete company setup.

**Fallback (current):** No fallback. Dead end. Employer must manually navigate to the company details page via sidebar "Employer Branding" item.

**Dead-end Risk:** HIGH. An employer with no company record has no automatic path forward. The sidebar "Employer Branding" label (which leads to company details) is the only way out, but it requires the employer to know this is the correct label.

**Safe Fix:** Uncomment `router.navigate(['/recruiter/company/details'])` in `redirectToSetup()` in `company-not-setup.component.ts`. Also rename sidebar item from "Employer Branding" to "Company Profile" so the destination is findable.

---

## EF-06: Company Profile Setup

**Starting State:** Authenticated employer. Arrived at `/recruiter/company/details`.
**Goal:** Complete company profile (logo, description, city) to enable job posting and satisfy dashboard action center.
**Trigger:** Navigation from company-not-setup dialog (after fix), or direct sidebar navigation, or dashboard action center CTA.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Arrive at company details | `/recruiter/company/details` `employer-company.component.html` -> `app-company-details` | `GET /company/usercompany` | Load existing company data |
| L2 | Upload company logo | File input -> `companyLogoUrl` | (file upload API, assumed) | Required for `companyProfileMissingFields()` to clear |
| L3 | Write company description | Text area -> `companyDetails` | None (form state) | Required field |
| L4 | Enter company city | Text field -> `companyCity` | None (form state) | Required field |
| L5 | Fill optional fields | Additional company metadata fields | None | Company address, website, etc. |
| L6 | Save | "Save" CTA | `POST /company/createinitial` (first time) or `PUT /company/update` (existing) | |
| L7 (success) | Confirmation + dashboard CTA clears | Success state (not confirmed — assumed snackbar or form state) | None | `companyProfileMissingFields()` returns false on next dashboard load |
| L7 (error) | Save error | Error state (not confirmed) | API error | |
| L8 | Navigate to company settings (optional) | `/recruiter/company/settings` | None | Via sidebar Settings item |

**Guard/Scope:** `AuthGuard` (role `'2'`).

**States:**
- Loading: existing company data loads on init
- Success: save confirmation, dashboard action CTA clears
- Error: API save failure (no confirmed error component)
- Empty: first-time user, all fields blank

**Motion/Effect:** Not specifically documented for company details page.

**CTA Behavior:** "Save" / "Update" button triggers API call. "Cancel" or back navigation returns to previous route.

**Success:** Company record saved. Dashboard no longer shows "Complete Company Profile" action item. Employer can now create jobs.

**Dead-end Risk:** If `companyCity` was filled but `companyLogoUrl` was not (or vice versa), `companyProfileMissingFields()` still returns true and the action center CTA persists — employer may be confused about what is missing.

**Safe Fix:** Show inline field-level validation on the company profile form indicating which of the three required fields (`companyLogoUrl`, `companyDetails`, `companyCity`) are still empty, matching the exact fields checked by `companyProfileMissingFields()`.

---

## EF-07: Dashboard Return Visit

**Starting State:** Authenticated employer with company and at least one job.
**Goal:** Employer gets a current picture of hiring status and takes the next highest-priority action.
**Trigger:** Return signin, or navigation to `/recruiter/dashboard` from sidebar.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Navigate to dashboard | `/recruiter/dashboard` | None | `AuthGuard` checks localStorage |
| L2 | Skeleton loaders appear | `emp-dash-hero-skeleton` etc. | None | Before APIs resolve |
| L3 | API calls fire | `company-dashboard.component` | `GET /company/dashboard` `GET /company/dashboard/pipeline-overview` | Parallel |
| L4 | KPI cards populate | Template binding | Dashboard response | `activeJobs`, `applicants/month`, `interviews/month`, `needsReview` |
| L5 | Pipeline chart populates | Bar chart | Pipeline response | Stages with counts |
| L6 | Action center renders | Conditional CTAs | Dashboard response | Review applicants (if `needsReviewCount > 0`), manage jobs (always), company profile (if missing fields) |
| L7 | Needs-review list renders | Applicant list section | Dashboard response | List of applicants requiring review |
| L8a | Employer clicks "Review Applicants" action | -> `/recruiter/jobs/applicants?id=` (for specific job) | None | If needsReviewCount > 0 |
| L8b | Employer clicks pipeline bar | -> `goToJobsList()` -> `/recruiter/jobs/list` (WRONG — see EF-18) | None | Bug: should go to stage-filtered view |
| L8c | Employer clicks needs-review list item | -> applicant detail (or job applicants route) | None | Expected behavior; actual implementation not confirmed |

**Guard/Scope:** `AuthGuard` (role `'2'`).

**States:**
- Loading: skeleton loaders for all three sections
- Error (pipeline): `pipelineError` flag + retry CTA
- Empty (no jobs): no confirmed empty state for zero activeJobs
- Empty (no applicants): `needsReview: 0` -> action center shows no "Review" CTA
- Success: all sections populated with real data

**Motion/Effect:** `@animate` (fade+scale, 600ms) on content sections. Staggered skeleton-to-content transitions.

**CTA Behavior:**
- "Review X Applicants" -> navigate to applicant list (confirmed).
- "Manage Jobs" -> `/recruiter/jobs/list` (always visible).
- "Complete Company Profile" -> `/recruiter/company/details` (conditional).
- Pipeline bar click -> `goToJobsList()` (bug — goes to generic list).

**Success:** Employer has clear next action and navigates to highest-priority item.

**Dead-end Risk:** Pipeline chart is decorative if bars are not clickable to the correct filtered view.

**Safe Fix:** Replace `goToJobsList()` with a parameterized navigation: `/recruiter/jobs/applicants?id={jobId}&stage={stageId}` or equivalent.

---

## EF-08: Create Job — Draft

**Starting State:** Authenticated employer with company set up. Subscription limit not reached.
**Goal:** Save a new job post as a draft for later publishing.
**Trigger:** Click "Create Job" from `/recruiter/jobs/list`.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Navigate to job list | `/recruiter/jobs/list` `JobListComponent` | `GET /job/basiclist` | Existing jobs shown |
| L2 | Click "Create Job" | (CTA in JobListComponent) | None | |
| L3 | Subscription check | `withActiveSubscription` + `jobPost` vs `jobPostCount` | (subscription check) | If limit reached -> EF-19 |
| L4 | Navigate to create | `/recruiter/jobs/create` `JobCreateComponent` | None | 4-step stepper loads |
| L5 | Step 1: Job Details | Stepper step 1 | None | `jobTitle` (required), `jobCity` (required), `jobCountry` (required), `jobBanner` (required), optional arrays |
| L6 | Step 2: Rates and Roles | Stepper step 2 | None | `jobTypeId`, `jobLevelId`, salary fields |
| L7 | Step 3: Create Interview | Stepper step 3 | None | `interviewQuestions[]` (optional for draft) |
| L8 | Step 4: Preview | Stepper step 4 | None | Full preview of all entries |
| L9 | Click "Save as Draft" | `job-create.component.ts` | `POST /job/create` with `jobStatusId: 1` | |
| L10 (success) | Success dialog | `MatDialog` | None | Navigate to `/recruiter/jobs/list` on dialog close |

**Guard/Scope:** `AuthGuard` (role `'2'`).

**States:**
- Loading: form submit loading state (not confirmed)
- Success: dialog shown -> redirect to job list -> job appears with Draft status
- Error: API failure (not confirmed error state)

**Motion/Effect:** Stepper step transitions use `@animate` trigger. `HapticFeedbackService.press()` on "Save as Draft" button click.

**CTA Behavior:** "Save as Draft" button triggers `POST /job/create` with status 1.

**Success:** Draft job in job list. Employer can return to edit and eventually publish.

**Dead-end Risk:** If employer fills step 1-2 only and navigates away, draft may not be saved (no confirmed auto-save). Progress loss risk.

**Safe Fix:** Auto-save on step navigation or add a "Save Progress" CTA on each step.

---

## EF-09: Create Job — Publish

**Starting State:** Employer has completed all 4 stepper steps including at least 1 interview question.
**Goal:** Publish job post so applicants can see and apply.
**Trigger:** Click "Publish" on step 4 preview.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1-L8 | Same as EF-08 steps 1-8 | (same as draft) | None | Must include `interviewQuestions.length > 0` |
| L9 | Click "Publish" | `publishJobPost()` | None | Validation check runs |
| L10a (validation fail) | Snackbar: "Job not ready to be Published" | MatSnackBar with `success-snackbar` panelClass | None | BUG: wrong color class used |
| L10b (validation pass) | POST to create | `POST /job/create` with `jobStatusId: 2` | None | |
| L11 | Success snackbar | MatSnackBar | None | Navigate to `/recruiter/jobs/list` |
| L12 | Job live at `/jobs/details/:id` | `PublicDetailsComponent` | `GET /job/details` | Applicants can now find and apply |

**Guard/Scope:** `AuthGuard` (role `'2'`). `publishJobPost()` validation gate.

**Required publish fields checked by `publishJobPost()`:**
- `jobTypeId`
- `jobLevelId`
- `jobCity`
- `jobCountry`
- `jobDescription`
- `workSetupId`
- `bannerFile` OR `jobBanner`
- `interviewQuestions.length !== 0`

**States:**
- Validation block: snackbar shown (wrong CSS class — bug)
- Success: snackbar + redirect to job list
- API error: not confirmed

**Motion/Effect:** `HapticFeedbackService.jobPublished()` should fire on successful publish. `@animate` on snackbar entry.

**CTA Behavior:** "Publish" -> `publishJobPost()`. If blocked: snackbar (wrong class). If passes: API call + success snackbar + redirect.

**Dead-end Risk:** Employer adds 0 interview questions and clicks Publish. Gets snackbar in coral color which looks like a success message, not an error. Employer may not realize they need to add questions.

**Safe Fix (Bug 1):** Change `panelClass: ['success-snackbar']` to `panelClass: ['error-snackbar']` or `['warning-snackbar']` on the publish-blocked snackbar.

**Safe Fix (Bug 2):** Add a step-3 completion indicator: "0 / 1 interview questions required to publish."

---

## EF-10: Edit Existing Job

**Starting State:** Employer has a draft or published job in the job list.
**Goal:** Update job details.
**Trigger:** "Edit" action from `TableControlModalComponent` on a job row.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Job list | `/recruiter/jobs/list` | `GET /job/basiclist` | |
| L2 | Open action modal | `TableControlModalComponent` dialog | None | Row action click |
| L3 | Click "Edit" | Navigate to edit route | None | |
| L4 | Edit form | `/recruiter/jobs/edit?id={jobId}` (JobEditComponent) | `GET /job/details` or similar | Load existing job data |
| L5 | Update fields | Form | None | Same fields as create |
| L6 | Save | "Update" CTA | `PUT /job/updatejobs` | |
| L7 (success) | Confirmation | Snackbar or dialog (assumed) | None | Return to job list |
| L7 (error) | Error state | (not confirmed) | API error | |

**Guard/Scope:** `AuthGuard`. Company ownership enforced on backend.

**Dead-end Risk:** Published job edits may not re-validate publish requirements (interview questions). If an edit removes the last interview question, the job remains published with no questions. Backend validation should enforce this.

---

## EF-11: Archive Job

**Starting State:** Employer has a job in the job list.
**Goal:** Remove job from active/expired lists without permanently deleting.
**Trigger:** "Delete" action from `TableControlModalComponent`.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Job list | `/recruiter/jobs/list` | None | |
| L2 | Open action modal | `TableControlModalComponent` | None | |
| L3 | Click "Delete" | (action handler) | `PUT /job/changestatus` with `jobStatusId: 4` | "Delete" = Archive (status 4, not hard delete) |
| L4 | Job removed from list | List refreshes | `GET /job/basiclist` | |

**States:** No confirmation dialog confirmed before archiving. Risk of accidental archive.

**Dead-end Risk:** Employer accidentally archives a published job. No "undo" or "restore from archive" flow documented.

**Safe Fix:** Add a confirmation dialog before archiving a published job: "This will remove the job from public listings. Continue?"

---

## EF-12: View Expired Jobs

**Starting State:** Employer has jobs with `jobStatusId: 3`.
**Goal:** Review expired job posts, decide to re-post or archive.
**Trigger:** Click "Expired Jobs" in sidebar sub-nav.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Click "Expired Jobs" | Sidebar sub-item | None | |
| L2 | Navigate | `/recruiter/jobs/expired` (ExpiredJobsComponent) | `GET /job/expiredlist` | |
| L3 | View expired list | Table (assumed similar to job list) | None | |
| L4 (action) | Re-post or archive | (action modal assumed) | `PUT /job/changestatus` | Re-post = status 2; Archive = status 4 |

**Dead-end Risk:** No re-post flow confirmed in frontend docs. Employer may see expired jobs with no action to revive them.

---

## EF-13: Navigate to Applicant List

**Starting State:** Employer has a published job with at least one applicant.
**Goal:** Reach the applicant list for a specific job.
**Trigger:** Job list row action -> "Applicants."

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Navigate to job list | `/recruiter/jobs/list` | `GET /job/basiclist` | |
| L2 | Find target job row | Table row | None | |
| L3 | Open action modal | `TableControlModalComponent` | None | Click row action |
| L4 | Click "Applicants" | Navigate with job ID | None | |
| L5 | Navigate to applicants | `/recruiter/jobs/applicants?id={jobId}` `JobApplicantsComponent` | `GET /job/applicants` `GET /job/applicants/signals` | jobId from query param |
| L6 | Table loads | Applicant rows | API responses | Match signal column populated if signals available |
| L7 | Disclaimer shown | Inline copy | `hasAnyMatchSignal()` | Shown if signals exist |

**Guard/Scope:** `AuthGuard` (role `'2'`). Backend: company ownership check on `GET /job/applicants`.

**States:**
- Loading: table loading (no confirmed skeleton)
- Empty: no applicants (no confirmed empty state)
- Success: table with applicant rows
- Signals available: match signal column populated + disclaimer
- Signals unavailable: match signal column empty, no disclaimer

**Dead-end Risk:** No top-level "Applicants" sidebar link. Path always requires going through job list -> action modal. If employer doesn't know to look in the action modal, they may not find applicants.

---

## EF-14: Review Applicant Detail

**Starting State:** Employer is on `/recruiter/jobs/applicants?id=` with applicant list loaded.
**Goal:** Review a specific applicant's profile, application completeness, and match level.
**Trigger:** Click applicant row in table.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Click applicant row | `JobApplicantsComponent` | None | `showProfile = true` |
| L2 | Detail panel appears | Inline panel (same component) | `GET /job/applicantdetails` | No route change |
| L3 | Avatar loads | Applicant avatar binding | From applicant data | |
| L4 | Snapshot card loads | Application snapshot card | `GET /job/applicant/snapshot-summary?applicationId=` | `completeness%`, `matchLevel` |
| L5 | Application preview renders | `<app-application-preview>` | None | Uses applicant detail data |
| L6 | Message thread panel renders | `<app-message-thread>` | `POST /messages/thread` (open thread) `GET /messages/thread/messages` (load) | Polling starts (8s interval) |
| L7 | Employer reads application | Static rendering | None | |
| L8a | Click "Invite" | `inviteApplicant()` | EMPTY TODO — no API call | BUG: no action |
| L8b | Click "View Video" | `viewCv()` -> `VideoPreviewComponent` dialog | None (local video URL assumed) | |

**Guard/Scope:** `AuthGuard`. Company ownership check on backend data calls.

**States:**
- Loading (snapshot): async load from snapshot-summary API
- Loading (messages): poll on 8s interval
- Error (messages): preserved in `app-message-thread`, retry exists
- Empty (no thread): thread opened on view (POST messages/thread)
- Success: full panel with all sections populated

**Motion/Effect:** `@animate` (fade+scale) on detail panel open. `HapticFeedbackService.selection()` on applicant row click.

**Dead-end Risk:** `inviteApplicant()` is empty. Employer clicks "Invite" and nothing happens. No feedback, no navigation, no error.

**Safe Fix:** Implement `inviteApplicant()` with an API call to advance the applicant's pipeline stage, plus a confirmation dialog and success/error feedback.

---

## EF-15: Message Applicant

**Starting State:** Applicant detail panel is open. `<app-message-thread>` is rendered.
**Goal:** Send a message to the applicant and receive a reply.
**Trigger:** Employer types in the message thread input and clicks Send.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Thread opens | `<app-message-thread>` | `POST /messages/thread` | Thread created or existing thread loaded |
| L2 | Existing messages load | Thread messages list | `GET /messages/thread/messages` | On open |
| L3 | Employer types message | Text input | None | |
| L4 | Click Send | Send button | `POST /messages/thread/send` | Includes message content + thread ID |
| L5 (success) | Message appears in thread | Thread list update | None | Optimistic update or next poll |
| L5 (error) | Error state + retry | `app-message-thread` error handling | None | Retry mechanism in component |
| L6 | Applicant replies | (out of band — applicant sends from their panel) | None | |
| L7 | Poll picks up reply | `GET /messages/thread/messages` | Poll every 8s | New message appears |

**Guard/Scope:** `AuthGuard`. Thread must be associated with employer's company.

**States:**
- Loading: initial message load
- Error: send failure -> error state with retry
- Empty: no messages yet (new thread)
- Success: message thread with history

**Motion/Effect:** New message entry animation (not specified, assumed fade-in on new messages).

**Dead-end Risk:** Employer sends a message but there is no global notification or inbox. If the applicant replies, the employer only sees the reply by navigating back to this specific applicant's panel within this specific job. Missed replies are a significant risk.

---

## EF-16: Invite Applicant (Currently Broken)

**Starting State:** Employer is reviewing an applicant in the detail panel.
**Goal:** Advance applicant to next pipeline stage (invite for interview, etc.).
**Trigger:** Click "Invite" button in applicant detail panel.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Click "Invite" | `inviteApplicant()` in `JobApplicantsComponent` | NONE | Method body is empty TODO |
| L2 (current) | Nothing happens | No feedback | None | **BLOCKING BUG** |
| L2 (target) | Confirmation dialog | (to be implemented) | None | Confirm stage advance |
| L3 (target) | API call | (pipeline advancement endpoint — not documented) | None | Update applicant `statusId` |
| L4 (target) | Success feedback | Snackbar + pipeline stage update | None | `HapticFeedbackService.success()` |

**Dead-end Risk:** CONFIRMED BROKEN. Employer has no way to formally advance a candidate in the pipeline through the UI.

**Safe Fix:** Implement `inviteApplicant()` with: a confirmation dialog, API call to update applicant status, success snackbar, and local state update to reflect new pipeline stage.

---

## EF-17: View Video Response

**Starting State:** Employer is in applicant detail panel. Applicant has submitted a video response.
**Goal:** Watch the applicant's video answer.
**Trigger:** Click "View" or play icon on video response in application preview.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Click video action | `viewCv()` method | None | |
| L2 | `VideoPreviewComponent` dialog opens | `MatDialog` | None | Video URL from applicant data |
| L3 | Video plays | HTML5 video element (assumed) | None | |
| L4 | Employer closes dialog | Dialog close | None | Returns to applicant detail panel |

**States:** Loading (video buffering). Error (invalid video URL).

---

## EF-18: Dashboard Pipeline Drill-Down (Currently Broken)

**Starting State:** Employer on dashboard. Pipeline chart shows stage distribution.
**Goal:** Navigate to the applicants at a specific pipeline stage.
**Trigger:** Click a pipeline stage bar on the dashboard.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | View pipeline chart | `company-dashboard.component` | `GET /company/dashboard/pipeline-overview` | Real stage counts |
| L2 | Click stage bar | `goToJobsList()` | None | BUG: wrong navigation |
| L3 (current) | Navigate to job list | `/recruiter/jobs/list` | None | Generic list, no stage filter |
| L3 (target) | Navigate to stage-filtered applicant view | `/recruiter/jobs/applicants?id={jobId}&stage={stageId}` or equivalent | None | Scoped to stage |

**Dead-end Risk:** HIGH. Pipeline chart is a display artifact with no actionable drill-down. Employer cannot act on pipeline data from the dashboard.

**Safe Fix:** Replace `goToJobsList()` with `goToStageApplicants(stageId: string)` that navigates to a filtered applicant view. If cross-job stage view is needed, a new route `/recruiter/applicants/stage/:stageId` may be required.

---

## EF-19: Subscription Gate on Job Create

**Starting State:** Employer at job count limit (`jobPost === jobPostCount`).
**Goal:** Understand the limit and upgrade subscription.
**Trigger:** Attempt to create a new job when at subscription limit.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Click "Create Job" | `JobListComponent` | None | |
| L2 | Gate check | `withActiveSubscription` + count comparison | (subscription data) | |
| L3 | Subscription alert shown | `SubscriptionAlertComponent` | None | Dialog |
| L4 | Employer clicks upgrade | -> `/recruiter/subscription` | None | |
| L5 | Subscription page | `/recruiter/subscription` | (subscription API) | Plan selection, payment |
| L6 (success) | `withActiveSubscription` updated | localStorage update | (payment API) | New job count limit |
| L6 (failure) | Payment error | Subscription component error state | None | |

**Dead-end Risk:** `SubscriptionAlertComponent` localization is not fully confirmed. Non-English employers may see incomplete strings.

---

## EF-20: Subscription Management

**Starting State:** Employer authenticated. Navigates to subscription page directly.
**Goal:** View current plan, upgrade, or review job post limits.
**Trigger:** Sidebar "Subscription" item click.

| Level | Step | Route / Component | API | Notes |
|-------|------|-------------------|-----|-------|
| L1 | Click "Subscription" in sidebar | Sidebar nav | None | |
| L2 | Navigate | `/recruiter/subscription` (SubscriptionComponent) | (subscription API) | |
| L3 | View current plan | Plan details display | None | |
| L4 | Click upgrade (if available) | Upgrade CTA | (payment API) | |

**States:** Loading (plan data), Success (plan shown), Error (API failure). Subscription component internals not fully documented in provided codebase facts.

---

*End of Document 5*
