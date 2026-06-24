# GetHired Employer Journey — Operating System V4

**Date:** 2026-06-24
**Scope:** Executive summary, north star, full employer journey, first-value moment definition, secondary value moments, and architecture decisions for the GetHired V4 employer operating system.

---

## Table of Contents

1. Executive Summary
2. North Star Statement
3. Full Employer Journey
4. Primary First-Value Moment
5. Secondary Value Moments
6. Architecture Decisions

---

## 1. Executive Summary

The GetHired employer operating system V4 defines how employers move from awareness through active hiring using the GetHired platform. It covers the complete journey across the Angular 13 frontend (`get-hired-FE`) and the Node.js backend (`get-hired-BE`), from the first public page visit to ongoing pipeline management and return sessions.

The V4 system is built on a real command-center dashboard (`company-dashboard.component`) that surfaces live KPI data, pipeline stages, and action-center priorities on every return visit. Job creation follows a 4-step stepper with a required interview question gate. Applicant review is structured around match signals and an inline messaging thread. Subscription gates control job post volume.

V4 identifies and documents five blocking issues that must be resolved before the employer journey is fully functional:
1. `CompanyNotSetupComponent` redirect is broken (navigation commented out).
2. `inviteApplicant()` is an empty TODO method.
3. The publish-blocked snackbar uses the wrong CSS class (success color on error state).
4. No global messages route exists for cross-job inbox.
5. The sidebar has no mobile navigation fallback.

V4 also documents the interview module as a stub (`<app-under-construction>`) and flags the missing pipeline drill-down (dashboard bar chart -> job-specific stage view) as a high-priority UX gap.

---

## 2. North Star Statement

**GetHired's employer north star:** An employer should be able to post a job, review matched applicants, move the best candidates forward, and communicate with them — all from a single session, without confusion about what to do next, regardless of their hiring experience level.

Every design decision in V4 is evaluated against this statement. Features that add steps without adding clarity violate the north star. Features that surface the right signal at the right moment advance it.

---

## 3. Full Employer Journey

The journey below maps every step from an anonymous website visit to a returning employer managing an active hiring pipeline. Each step references the actual route, component, and API call involved.

---

### Phase 1: Awareness (Guest, Unauthenticated)

**Step 1.1 — Public Portal**

The employer arrives at `/home` (`MainPortalComponent`). This is the default route (AppModule redirects `/` -> `/home`). The page is public with no guard. The employer sees a product overview and marketing content.

**Step 1.2 — Employer Marketing Page**

The employer navigates to `/employers` (`EmployerPortalComponent`). This page is designed to convert employers to the signup funnel. It is public, unguarded, and accessible without any account.

**Step 1.3 — Optional: Browse Public Jobs**

The employer may browse `/jobs` (`PublicListComponent`), `/jobs/details/:id` (`PublicDetailsComponent`), or search via `/jobs/search/:keyword` (`PublicSearchComponent`) to understand the product before signing up. These are fully public with no guard.

---

### Phase 2: Signup and Onboarding

**Step 2.1 — Employer Signup**

The employer navigates to `/signup?role=2`. The `?role=2` query parameter pre-selects the employer role in `SignupComponent`. The `UnauthGuard` prevents already-authenticated users from reaching this page — they are redirected to their panel.

Fields collected: name, email, password, and role (pre-set to `'2'`).

**Step 2.2 — Email Verification**

After signup, the employer is directed to `/verify` (`VerifyComponent`). Email verification is required before the account becomes active. This is a public route with no guard.

**Step 2.3 — First Login**

The employer navigates to `/signin` (`SigninComponent`, guarded by `UnauthGuard`). On successful signin, the following are written to localStorage:
- `state`: `'true'`
- `role`: `'2'`
- `user`: JSON object with `_id`, `companyId`, `firstName`, `lastName`, `companyName`
- `withActiveSubscription`: subscription status flag

`AuthGuard` reads these values on all subsequent `/recruiter/**` route navigations. After signin, the employer is redirected to `/recruiter/dashboard`.

---

### Phase 3: First Dashboard Visit (No Company Set Up)

**Step 3.1 — Dashboard Load**

The employer lands on `/recruiter/dashboard`. `EmployerDashboardComponent` renders `<app-company-dashboard>` (`company-dashboard.component`).

The dashboard calls:
- `GET /company/usercompany` — to determine if the employer's company exists.
- `GET /company/dashboard` — for KPI data.
- `GET /company/dashboard/pipeline-overview` — for pipeline chart.

Skeleton loaders (`emp-dash-hero-skeleton`, `emp-dash-action-skeleton`, `emp-dash-pipeline-skeleton`) are displayed during load.

**Step 3.2 — Company Not Set Up (First-Time Blocker)**

If no company is set up (`companyId` missing or company API returns empty), `CompanyNotSetupComponent` is shown as a dialog.

**Current bug:** The "Setup Company" button in this dialog calls `redirectToSetup()`, which closes the dialog but does NOT navigate to the company setup page — `router.navigate` is commented out. The employer is left on the dashboard with no path forward.

**Required fix:** `redirectToSetup()` must navigate to `/recruiter/company/details` after closing the dialog.

**Step 3.3 — Action Center: Complete Company Profile**

Once a company record exists, `companyProfileMissingFields()` checks for `companyLogoUrl`, `companyDetails`, and `companyCity`. If any are missing, the action center shows a "Complete Company Profile" CTA linking to `/recruiter/company/details`.

---

### Phase 4: Company Setup

**Step 4.1 — Company Details**

The employer navigates to `/recruiter/company/details`. The route renders `employer-company.component.html` -> `<app-company-details>` (`company-details.component`). Here the employer adds:
- Company logo (`companyLogoUrl`)
- Company description (`companyDetails`)
- City (`companyCity`)
- Other company metadata

API calls:
- `POST /company/createinitial` — initial company creation
- `POST /company/createcompany` — full company record
- `PUT /company/update` — update existing company

**Step 4.2 — Company Settings**

Additional settings are at `/recruiter/company/settings`. The sidebar "Settings" button navigates here.

---

### Phase 5: Job Creation

**Step 5.1 — Subscription Check**

The employer navigates to `/recruiter/jobs/list` (`JobListComponent`) and clicks "Create Job." If `jobPost === jobPostCount` (subscription limit reached), `SubscriptionAlertComponent` is shown, directing the employer to `/recruiter/subscription` or `/recruiter/jobs/create` (the latter only if they're under limit).

**Step 5.2 — Job Create Stepper**

The employer navigates to `/recruiter/jobs/create` (`JobCreateComponent`). The 4-step stepper:

**Step 1: Job Details**
- `jobTitle` (required)
- `jobAddress`, `jobCity` (required), `jobCountry` (required)
- `jobDescription`, `jobDuties`
- `jobCategoryId`, `workSetupId`
- `jobBanner` (required — file upload)
- `badges[]`, `requirements[]`, `goodToHave[]`, `educationalBackground[]`, `certificationRequirements[]`, `skills[]`, `tags[]`

**Step 2: Rates and Roles**
- `jobTypeId`, `jobLevelId`
- `rate`, `salaryMinimum`, `salaryMaximum`, `salaryCurrency`

**Step 3: Create Interview**
- `interviewQuestions[]` — REQUIRED to publish (must have at least 1)
- `interviewTemplateId` — template selector (UI reference, template browser not confirmed as a visible route)

**Step 4: Preview Job Post**
- Summary view of all fields
- "Save as Draft" or "Publish" actions

API calls:
- `POST /job/create` — creates job post
- Status `1` = Draft, `2` = Published

**Step 5.3 — Save as Draft**

Success: dialog shown, then navigate to `/recruiter/jobs/list`. Job is saved with `jobStatusId: 1`.

**Step 5.4 — Publish**

`publishJobPost()` checks: `jobTypeId`, `jobLevelId`, `jobCity`, `jobCountry`, `jobDescription`, `workSetupId`, `bannerFile` / `jobBanner`, `interviewQuestions.length !== 0`.

If any check fails: snackbar "Job not ready to be Published" is shown (BUG: uses `panelClass: ['success-snackbar']` — coral color instead of warning color).

If all checks pass: snackbar shown + navigate to `/recruiter/jobs/list`. Job status set to `2` (Published).

---

### Phase 6: Job Management

**Step 6.1 — Job List**

`/recruiter/jobs/list` (`JobListComponent`) shows a table of active and draft jobs with a status filter (All / Draft / Published). Row actions open `TableControlModalComponent` dialog with options including Edit, View, Archive (changes status to 4), and View Applicants.

**Step 6.2 — Edit Job**

Navigate to `/recruiter/jobs/edit?id=` with the job's ID as a query parameter. Edit form mirrors the create stepper.

API: `PUT /job/updatejobs`

**Step 6.3 — Expire / Archive**

"Delete" action sets `jobStatusId: 4` (Archived) via `PUT /job/changestatus`.

Expired jobs (status 3) appear at `/recruiter/jobs/expired`.

---

### Phase 7: Applicant Review

**Step 7.1 — Navigate to Applicants**

From the job list, the employer selects "View Applicants" from the action modal for a job. This navigates to `/recruiter/jobs/applicants?id={jobId}`.

There is no direct sidebar link to applicants. The path is always: Jobs -> Job Posts -> (action modal) -> Applicants.

**Step 7.2 — Applicant List**

`JobApplicantsComponent` loads:
- `GET /job/applicants` — main applicant list (requires auth + company ownership)
- `GET /job/applicants/signals` — match signals (separate, best-effort call)

The applicant table includes a `matchSignalLabel` column. When real signals exist, `hasAnyMatchSignal()` shows a disclaimer: "Match Signals are decision-support indicators..." — this text is preserved by the no-fake-data rule.

**Step 7.3 — Applicant Detail**

Clicking an applicant sets `showProfile=true` and renders the detail panel inline (not a new route):
- Applicant avatar
- Application snapshot card (completeness%, matchLevel) — loaded from `GET /job/applicant/snapshot-summary?applicationId=`
- `<app-application-preview>` — full application preview
- `<app-message-thread>` — message panel (polls every 8s)

**Step 7.4 — Match Signal Review**

Match signal values from `matchSignalsByUserId$` are mapped to `matchSignalLabel` in the applicant table. The disclaimer is shown when `hasAnyMatchSignal()` returns true.

**Step 7.5 — Invite Applicant**

`inviteApplicant()` is called from the applicant detail. **Current state: empty TODO method.** No action occurs. This is a blocking bug for pipeline advancement.

---

### Phase 8: Messaging

**Step 8.1 — Open Thread**

From the applicant detail panel, the employer uses `<app-message-thread>`. The thread is opened via `POST /messages/thread`.

**Step 8.2 — Send Message**

`POST /messages/thread/send` with retry behavior in the component.

**Step 8.3 — Receive Replies**

`GET /messages/thread/messages` is polled every 8 seconds. Errors are preserved. The employer sees new messages without a page reload within the polling interval.

**No global inbox exists.** To see messages from an applicant, the employer must navigate: Jobs -> Job Posts -> (find the job) -> Applicants -> (find the applicant) -> open detail panel. There is no `/recruiter/messages` route and no sidebar "Messages" item.

---

### Phase 9: Return Visit — Dashboard Command Center

**Step 9.1 — Dashboard on Return**

On every return visit, the employer lands on `/recruiter/dashboard`. The command center refreshes:
- KPI cards: current `activeJobs`, `applicants/month`, `interviews/month`, `needsReview`
- Action center: shows "Review X applicants" if `needsReviewCount > 0`; "Manage Jobs" always; "Complete Company Profile" if profile fields are missing
- Pipeline chart: current stage distribution from `/company/dashboard/pipeline-overview`
- Needs-review list: applicants requiring attention

**Step 9.2 — Pipeline Drill-Down (Known Bug)**

Clicking a pipeline stage bar calls `goToJobsList()` which navigates to the generic `/recruiter/jobs/list`. It does not navigate to a stage-filtered applicant view. This is a documented bug.

**Step 9.3 — Subscription Management**

The employer can navigate to `/recruiter/subscription` (Subscription sidebar item) to manage their plan, upgrade, or view job post limits.

---

## 4. Primary First-Value Moment

**Definition:** The primary first-value moment is when an employer sees real applicants on a job they posted for the first time.

**The moment:** Navigating to `/recruiter/jobs/applicants?id={jobId}` and seeing a non-empty applicant list with match signal indicators on a job they created and published.

**Pre-conditions for this moment:**
1. Employer has an account and is verified.
2. Company record exists with required fields (`companyLogoUrl`, `companyDetails`, `companyCity`).
3. At least one job is published (`jobStatusId: 2`).
4. At least one applicant has applied via the public job detail page.

**Time-to-value target:** An employer who starts at `/signup?role=2` should be able to reach their first applicant list within one session, assuming the platform has real applicant data for their job.

**Current blockers to first-value moment:**
- Company-not-setup redirect is broken (Phase 3, Step 3.2).
- Interview questions are required to publish but this is not surfaced until the publish attempt.
- The path to the applicant list requires navigating through the job list and action modal — not from the dashboard or sidebar directly.

---

## 5. Secondary Value Moments

**5.1 — First Published Job**

When `publishJobPost()` succeeds and the employer sees the success snackbar + is returned to the job list with their job in Published status. This is a milestone for new employers.

**Motion/Haptic:** `HapticFeedbackService.jobPublished()` should fire here.

**5.2 — First Match Signal**

When the employer opens the applicant list for the first time and sees a `matchSignalLabel` value other than empty on at least one applicant row. The system has done work on their behalf.

**5.3 — Dashboard Pipeline with Real Data**

When the employer returns to the dashboard and sees a non-empty pipeline chart reflecting real candidate movement across stages. The platform is tracking their hiring progress.

**5.4 — First Successful Message Send**

When the employer sends a message to an applicant via `<app-message-thread>` and receives a reply (visible on the next 8s poll). The platform has enabled a hiring conversation.

**5.5 — Company Profile Complete**

When `companyProfileMissingFields()` returns false and the "Complete Company Profile" action center card disappears. The employer's employer brand is set up.

---

## 6. Architecture Decisions

### 6.1 Lazy Loading

The employer panel is lazy-loaded as `EmployerPanelModule` at `/recruiter`. This is the correct architecture for a role-gated panel — the module only loads for authenticated role-2 users, keeping the initial app bundle small.

**Decision: Preserve.** Do not convert to eager loading.

### 6.2 localStorage-Based Auth

Auth state (`state`, `role`, `user`, `withActiveSubscription`) is stored in localStorage. `AuthGuard` reads these synchronously on every route navigation. There is no reactive auth state service observable; guards read localStorage directly.

**Decision: Preserve for now.** A reactive `AuthService` with an `BehaviorSubject<User>` would be more robust, but migrating auth architecture is out of V4 scope.

### 6.3 Query Params for Job/Applicant IDs

Job-specific routes use query params (`/recruiter/jobs/applicants?id=`), not route params (`/recruiter/jobs/:id/applicants`). This means the applicant list component reads `this.route.snapshot.queryParams['id']` rather than `this.route.snapshot.params['id']`.

**Decision: Preserve.** Changing to route params would require updates to all navigation calls and backend link patterns.

### 6.4 Inline Applicant Detail (showProfile Flag)

Applicant detail is shown inline within the applicant list component via a `showProfile` boolean flag, not as a separate route. This means there is no shareable URL for a specific applicant within a job.

**Decision: Preserve for V4.** A dedicated `/recruiter/jobs/applicants/:jobId/applicant/:applicantId` route would improve shareability and deep-linking but is a significant refactor.

### 6.5 Polling-Based Messaging

`<app-message-thread>` polls `GET /messages/thread/messages` every 8 seconds. There is no WebSocket or Server-Sent Events implementation.

**Decision: Preserve.** The 8s poll interval is acceptable for a hiring context where real-time messaging is not the primary use case. WebSocket migration is post-V4.

### 6.6 Best-Effort Match Signals

Match signals are loaded via a separate API call (`GET /job/applicants/signals`) that does not block the main applicant list render. If the signals call fails, the list still loads. This is an explicit best-effort pattern.

**Decision: Preserve.** This is the correct UX tradeoff — applicant list availability is more important than signal availability.

### 6.7 Status-Based Job Lifecycle

Job status is managed as an integer `jobStatusId`: 1=Draft, 2=Published, 3=Expired, 4=Archived. Status transitions go through `PUT /job/changestatus`. There is no state machine enforcement on the frontend — any status can theoretically be set.

**Decision: Preserve status system.** Consider adding frontend transition guards (e.g., prevent setting Archived directly from Draft without publishing) in a post-V4 iteration.

### 6.8 4-Step Stepper with Required Interview Gate

The job create stepper requires `interviewQuestions.length !== 0` to publish. This gate exists at the `publishJobPost()` method level, not at the stepper step level.

**Decision: Keep the gate.** Improve the UX by surfacing the requirement at step 3 rather than only at the publish action. The gate itself is correct product behavior.

### 6.9 Angular 13 Constraint

The codebase is Angular 13. Angular 13 does not have built-in standalone components, signals (Angular 16+), or the new `@if` / `@for` template syntax. All components use the `NgModule` pattern. All async rendering uses `*ngIf`, `*ngFor`, `async` pipe.

**Decision: Work within Angular 13 constraints.** Do not introduce Angular 16+ APIs. All new components must declare in the appropriate module.

### 6.10 Manrope Typography + Coral Brand

The platform uses Manrope as the primary font and `#FF7062` (coral) as the primary CTA color (`btn-cta-primary`). The dashboard hero uses purple/violet gradients. Brand SVG assets are in `/assets/brand/gethired-wow/`.

**Decision: All V4 employer-facing UI uses this design system.** No new type faces or primary colors are introduced. New components reference existing motion/SCSS patterns from `motion.scss` and the dashboard SCSS.

---

*End of Document 3*
