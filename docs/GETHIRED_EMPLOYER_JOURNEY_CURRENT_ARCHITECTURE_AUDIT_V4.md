# GetHired Employer Journey — Current Architecture Audit V4

**Date:** 2026-06-24
**Scope:** Full audit of the employer (recruiter/role:2) journey across the Angular 13 frontend (`get-hired-FE`) and Node.js backend (`get-hired-BE`).
**Purpose:** Ground-truth baseline for all V4 employer operating system documents. Every claim references actual code behavior.

---

## Table of Contents

1. Phase 0 Discovery Summary
2. Full Route Map
3. Component Tree — Employer Panel
4. Backend API Endpoints Used by Employer
5. Database Table Dependencies
6. Guard and Role Behavior
7. localStorage Dependencies
8. Key Missing Features
9. Known Bugs
10. Loading, Empty, and Error States per Major Area

---

## 1. Phase 0 Discovery Summary

The GetHired employer panel is a lazy-loaded Angular module (`EmployerPanelModule`) mounted at `/recruiter`. It provides a command-center dashboard, job post lifecycle management (create/edit/publish/expire/archive), an applicant review system with match signals, and inline per-applicant messaging. The subscription system gates job creation and surfacing. Interview scheduling is a stub (under construction). Company profile and settings are present but the company-not-setup redirect flow contains a broken navigation call.

The panel is desktop-first: the sidebar is hidden on mobile (`d-none d-md-block`) with no replacement mobile navigation. The global messages section does not exist as a standalone route; messages are only accessible from within an individual applicant's detail view.

Authentication is token-based using localStorage. The employer role is `'2'`. The routing guard (`AuthGuard`) checks `localStorage['state'] === 'true'` and compares the stored role to the required route role.

---

## 2. Full Route Map

### 2.1 Public Routes

| Path | Component | Guard | Notes |
|------|-----------|-------|-------|
| `/` | Redirects to `/home` | None | Default redirect |
| `/home` | `MainPortalComponent` | None | Public landing page |
| `/employers` | `EmployerPortalComponent` | None | Employer marketing page |
| `/job-seekers` | (JobSeekerPortalComponent) | None | Applicant marketing page |
| `/jobs` | `PublicListComponent` | None | Public job listing |
| `/jobs/details/:id` | `PublicDetailsComponent` | None | Public job detail |
| `/jobs/search/:keyword` | `PublicSearchComponent` | None | Keyword search results |
| `/companies` | (CompaniesComponent) | None | Public company directory |
| `**` | `ErrorPageComponent` | None | 404 catch-all |

### 2.2 Auth Routes

| Path | Component | Guard | Notes |
|------|-----------|-------|-------|
| `/signup` | SignupComponent | `UnauthGuard` | `?role=2` pre-selects employer role |
| `/signin` | SigninComponent | `UnauthGuard` | Redirects to panel on auth |
| `/reset-password` | ResetPasswordComponent | None | |
| `/change-password` | ChangePasswordComponent | None | |
| `/verify` | VerifyComponent | None | Email verification |

### 2.3 Employer Panel Routes (under `/recruiter`, guarded by `AuthGuard` with role `'2'`)

| Path | Component | Notes |
|------|-----------|-------|
| `/recruiter/dashboard` | `EmployerDashboardComponent` -> `<app-company-dashboard>` | Command-center hero |
| `/recruiter/jobs/list` | `JobListComponent` | Active/draft jobs table |
| `/recruiter/jobs/expired` | (ExpiredJobsComponent) | Expired jobs list |
| `/recruiter/jobs/create` | `JobCreateComponent` | 4-step stepper |
| `/recruiter/jobs/edit?id=` | (JobEditComponent) | Query-param job ID |
| `/recruiter/jobs/applicants?id=` | `JobApplicantsComponent` | Query-param job ID |
| `/recruiter/jobs/view?id=` | (JobViewComponent) | Query-param job ID |
| `/recruiter/contacts/list` | (ContactListComponent) | |
| `/recruiter/contacts/candidates` | (CandidatesComponent) | |
| `/recruiter/contacts/candidate-list/:id` | (CandidateListComponent) | Route param |
| `/recruiter/contacts/groups` | (ContactGroupsComponent) | |
| `/recruiter/contacts/group-list/:id` | (GroupListComponent) | Route param |
| `/recruiter/interview` | `EmployerInterviewComponent` -> `<app-under-construction>` | Stub page |
| `/recruiter/subscription` | (SubscriptionComponent) | Subscription management |
| `/recruiter/company/details` | `employer-company.component` -> `<app-company-details>` | Company profile |
| `/recruiter/company/settings` | (CompanySettingsComponent) | Company settings |

**No `/recruiter/messages` route exists.** Messages are only accessible inline within `/recruiter/jobs/applicants?id=`.

### 2.4 Other Panel Routes (non-employer)

| Path | Role | Notes |
|------|------|-------|
| `/user` | `'3'` (applicant) | Applicant panel |
| `/admin` | `'1'` (admin) | Admin panel |

---

## 3. Component Tree — Employer Panel

```
AppComponent
└── RouterOutlet
    └── [lazy] EmployerPanelModule  (route: /recruiter)
        └── EmployerPanelComponent  (employer-panel.component.html)
            ├── EmployerSidebarComponent  (d-none d-md-block — hidden on mobile)
            │   ├── SidebarItem: Dashboard            -> /recruiter/dashboard
            │   ├── SidebarItem: Jobs (expandable)
            │   │   ├── Sub: Job Posts               -> /recruiter/jobs/list
            │   │   └── Sub: Expired Jobs            -> /recruiter/jobs/expired
            │   ├── SidebarItem: Contacts (expandable)
            │   │   ├── Sub: Contact List            -> /recruiter/contacts/list
            │   │   ├── Sub: Contact Group           -> /recruiter/contacts/groups
            │   │   └── Sub: Candidates              -> /recruiter/contacts/candidates
            │   ├── SidebarItem: Interviews          -> /recruiter/interview
            │   ├── SidebarItem: Subscription        -> /recruiter/subscription
            │   └── SidebarItem: Employer Branding   -> /recruiter/company/details
            ├── EmployerHeaderComponent
            └── RouterOutlet (employer panel child routes)
                ├── /recruiter/dashboard
                │   └── EmployerDashboardComponent
                │       └── CompanyDashboardComponent (app-company-dashboard)
                │           ├── Hero section (gradient mesh, KPI cards)
                │           ├── Action center (conditional CTAs)
                │           ├── Hiring pipeline bar chart
                │           └── Needs-review applicants list
                ├── /recruiter/jobs/list
                │   └── JobListComponent
                │       └── TableControlModalComponent (dialog on row action)
                ├── /recruiter/jobs/create
                │   └── JobCreateComponent (4-step stepper)
                │       ├── Step 1: Job Details
                │       ├── Step 2: Rates and Roles
                │       ├── Step 3: Create Interview (interview questions)
                │       └── Step 4: Preview Job Post
                ├── /recruiter/jobs/applicants?id=
                │   └── JobApplicantsComponent
                │       ├── Applicants table (with matchSignalLabel column)
                │       └── Applicant detail panel (showProfile=true)
                │           ├── Applicant avatar + application snapshot card
                │           ├── ApplicationPreviewComponent (app-application-preview)
                │           └── MessageThreadComponent (app-message-thread, polls 8s)
                ├── /recruiter/interview
                │   └── EmployerInterviewComponent
                │       └── UnderConstructionComponent (app-under-construction)
                ├── /recruiter/company/details
                │   └── EmployerCompanyComponent (employer-company.component.html)
                │       └── CompanyDetailsComponent (app-company-details)
                └── CompanyNotSetupComponent (dialog, not a route)
                    └── "Setup Company" button -> redirectToSetup() [router.navigate commented out]
```

---

## 4. Backend API Endpoints Used by Employer

### Company

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/company/createinitial` | Create initial company record on first setup |
| POST | `/company/createcompany` | Create company (full) |
| PUT | `/company/update` | Update company details |
| GET | `/company/usercompany` | Fetch authenticated user's company |
| GET | `/company/dashboard` | Dashboard KPI data (activeJobs, applicants/month, interviews/month, needsReview) |
| GET | `/company/dashboard/pipeline-overview` | Pipeline stage breakdown for bar chart |

### Jobs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/job/basiclist` | Job list for employer (active/draft) |
| GET | `/job/expiredlist` | Expired jobs list |
| GET | `/job/create` | (Likely: lookup data — job types, levels, etc.) |
| POST | `/job/create` | Create new job post |
| PUT | `/job/updatejobs` | Update existing job post |
| PUT | `/job/changestatus` | Change job status (1=Draft, 2=Published, 3=Expired, 4=Archived) |

### Applicants

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/job/applicants` | Applicant list for a job (requires auth + company ownership) |
| GET | `/job/applicants/signals` | Match signals per applicant (best-effort, separate call) |
| GET | `/job/applicantdetails` | Applicant detail data |
| GET | `/job/applicant/snapshot-summary?applicationId=` | Application completeness % and match level |

### Messages

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/messages/thread` | Open/create message thread with applicant |
| GET | `/messages/thread/messages` | Fetch messages in thread |
| POST | `/messages/thread/send` | Send a message |

### Public (used in portal but referenced by employers previewing)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/job/published` | Public published job list |
| GET | `/job/details` | Public job detail |
| GET | `/job/sharelink` | Shareable job link |

---

## 5. Database Table Dependencies

| Feature Area | Tables (inferred from API surface) |
|---|---|
| Company | `companies`, `company_users` |
| Jobs | `jobs` (columns: jobTitle, jobTypeId, jobLevelId, jobAddress, jobCity, jobCountry, jobDescription, jobDuties, jobCategoryId, workSetupId, jobBanner, jobStatusId, rate, salaryMinimum, salaryMaximum, salaryCurrency) |
| Job metadata | `job_types`, `job_levels`, `job_categories`, `work_setups` |
| Job arrays | `job_badges`, `job_requirements`, `job_good_to_have`, `job_educational_backgrounds`, `job_certification_requirements`, `job_skills`, `job_tags` |
| Applications | `applications` (or `job_applicants` — confirmed partially missing in schema audit) |
| Match signals | `match_signals` or embedded in applications |
| Messages | `message_threads`, `messages` |
| Interview | `interview_questions`, `interview_templates` |
| Subscriptions | `subscriptions`, `subscription_plans` (referenced by `jobPost` vs `jobPostCount` gate) |

Note: The schema audit from the prior SWEEP session confirmed that `job_applicants` and `job_applicant_status` tables may be missing from the sqlite test schema. Verify against production Supabase before migration work.

---

## 6. Guard and Role Behavior

### AuthGuard

- Reads `localStorage['state']` — must equal `'true'`
- Reads `localStorage['role']` — must match the route's required role
- If unauthenticated: redirects to `/signin`
- If wrong role: redirects the user to their own panel (role `'1'` -> `/admin`, `'2'` -> `/recruiter`, `'3'` -> `/user`)
- Applied to: all `/recruiter/**` routes

### UnauthGuard

- Prevents already-authenticated users from accessing `/signin` and `/signup`
- If authenticated: redirects to the user's panel based on stored role

### EmployerGuard

- Declared in the codebase but NOT applied to any active routes
- Contains `router.resetConfig()` logic for dynamically swapping route configuration
- Effectively dead code in the current routing setup

### Role Constants

| Value | Role |
|-------|------|
| `'1'` | Admin |
| `'2'` | Employer / Recruiter |
| `'3'` | Applicant / Job Seeker |

---

## 7. localStorage Dependencies

All employer session state is stored in localStorage. There is no server-side session check beyond the auth token on API calls.

| Key | Type | Purpose | Set by |
|-----|------|---------|--------|
| `state` | `'true'` / `'false'` | AuthGuard passes/fails on this string | Signin flow |
| `role` | `'1'` / `'2'` / `'3'` | Role-based routing | Signin flow |
| `user` | JSON string | Contains `_id`, `companyId`, `firstName`, `lastName`, `companyName` | Signin flow |
| `withActiveSubscription` | (boolean string) | Subscription gate check | Signin/subscription flow |

**Risks:**
- Clearing localStorage logs the user out but there is no token invalidation on the server visible from the FE code.
- `companyId` from the `user` object is used to scope employer data; if missing or stale, company-dependent API calls may fail silently.
- `withActiveSubscription` controls the subscription gate on job creation; if this key is stale (e.g., subscription expired after login), the gate may not fire correctly until next login.

---

## 8. Key Missing Features

### 8.1 Global Messages Page

There is no `/recruiter/messages` route. The `app-message-thread` component is fully implemented and polls every 8 seconds, but it is only accessible by opening a specific applicant's detail view within `/recruiter/jobs/applicants?id=`. An employer cannot see all message threads or be notified of new messages without navigating to specific job applicant pages.

- **Impact:** Employers miss replies. No inbox UX exists.
- **Sidebar:** No "Messages" item in the employer sidebar.

### 8.2 Interviews Page

`/recruiter/interview` renders `EmployerInterviewComponent` which wraps `<app-under-construction>`. Employers who need to schedule or manage interviews have no UI. Interview questions are added in job create step 3 and are required to publish, but post-publish interview management is absent.

### 8.3 Mobile Navigation

The sidebar component (`employer-sidebar.component`) is wrapped in a class of `d-none d-md-block`, which hides it entirely on screens narrower than the Bootstrap `md` breakpoint (~768px). No hamburger menu, bottom nav, drawer, or any other mobile navigation replacement exists. The employer panel is functionally unusable on mobile devices.

### 8.4 Applicants as Top-Level Nav

Applicants are not accessible from the sidebar directly. The only path to the applicant list is: Jobs -> Job Posts -> (find a job row) -> (action modal) -> Applicants, arriving at `/recruiter/jobs/applicants?id=`. There is no top-level Applicants nav item.

### 8.5 Top-Level Contacts vs. Applicants Distinction

The sidebar has a "Contacts" section (Contact List, Contact Group, Candidates) which is separate from the job-specific applicant list. The relationship between "Candidates" in contacts and "Applicants" in job posts is not surfaced to the employer in navigation.

---

## 9. Known Bugs

| # | Area | Description | File / Method | Severity |
|---|------|-------------|---------------|----------|
| 1 | Job Create | `publishJobPost()` "Job not ready to be Published" snackbar uses `panelClass: ['success-snackbar']` (coral color) instead of a warning/error color | `job-create.component.ts` | Medium |
| 2 | Company Not Setup | `CompanyNotSetupComponent` "Setup Company" button calls `redirectToSetup()` which closes the dialog but does NOT navigate — `router.navigate` is commented out | `company-not-setup.component.ts` | High |
| 3 | Applicant Invite | `inviteApplicant()` method in `JobApplicantsComponent` is an empty TODO body | `job-applicants.component.ts` | High |
| 4 | Sidebar Label Mismatch | Sidebar item labeled "Employer Branding" navigates to `/recruiter/company/details` (company profile page), not a branding-specific page | `employer-sidebar.component` | Low |
| 5 | Match Signals | `hasAnyMatchSignal()` disclaimer copy is shown to employers whenever real signals exist, which may cause confusion about signal reliability | `job-applicants.component` | Low |
| 6 | Subscription Gate | `SubscriptionAlertComponent` is referenced when job count reaches limit, but localization (i18n) strings are not fully confirmed | `job-list.component` | Low |
| 7 | Pipeline Click | Clicking a pipeline stage bar in the dashboard calls `goToJobsList()` which navigates to the generic job list, not to a filtered view for that stage | `company-dashboard.component` | Low |
| 8 | Interview Required | `interviewQuestions.length !== 0` is required to publish. Employers who skip step 3 cannot publish without going back — no clear error state for this in the stepper | `job-create.component` | Medium |

---

## 10. Loading, Empty, and Error States per Major Area

### 10.1 Dashboard

| State type | Current behavior |
|---|---|
| Loading (hero/KPIs) | `emp-dash-hero-skeleton` CSS skeleton loader |
| Loading (action center) | `emp-dash-action-skeleton` CSS skeleton loader |
| Loading (pipeline) | `emp-dash-pipeline-skeleton` CSS skeleton loader; `pipelineLoading` flag |
| Error (pipeline) | `pipelineError` flag shown with a retry mechanism |
| Empty (needsReview) | Applicants-needing-review list does not appear if `needsReviewCount` is 0 |
| Empty (jobs) | No confirmed empty state component for zero active jobs |

### 10.2 Job List

| State type | Current behavior |
|---|---|
| Loading | Standard Angular binding; no confirmed skeleton |
| Empty | Subscription gate shown if at limit; no confirmed dedicated empty-state for zero jobs |
| Error | No confirmed error state for failed job list API call |

### 10.3 Job Create (Stepper)

| State type | Current behavior |
|---|---|
| Validation error | `publishJobPost()` checks required fields and shows snackbar (with wrong panelClass for blocked state) |
| Success (draft) | Dialog shown, then navigate to `/recruiter/jobs/list` |
| Success (published) | Snackbar shown, then navigate to `/recruiter/jobs/list` |
| Step navigation | 4-step stepper; step 3 (interview questions) must have at least one entry to publish |

### 10.4 Applicant List

| State type | Current behavior |
|---|---|
| Loading | Observable subscriptions; no confirmed skeleton |
| Empty | No confirmed empty state for zero applicants |
| Match signals | `matchSignalsByUserId$` is a best-effort separate call; if it fails, main list still loads |
| Error (signals) | Signals failure is best-effort — main list unaffected |

### 10.5 Applicant Detail / Message Thread

| State type | Current behavior |
|---|---|
| Loading (snapshot) | `snapshotSummary` loaded async from `/job/applicant/snapshot-summary?applicationId=` |
| Loading (messages) | Polling every 8s via `app-message-thread` |
| Error (messages) | Errors are preserved in the component; retry behavior exists |
| Send with retry | `messages/thread/send` POST has retry in `app-message-thread` |

### 10.6 Interview Page

| State type | Current behavior |
|---|---|
| All states | Renders `<app-under-construction>` regardless of state |

### 10.7 Company Not Setup

| State type | Current behavior |
|---|---|
| Triggered | Dialog (`CompanyNotSetupComponent`) shown |
| CTA action | "Setup Company" button calls `redirectToSetup()` which closes dialog only — navigation is broken |

---

*End of Document 1*
