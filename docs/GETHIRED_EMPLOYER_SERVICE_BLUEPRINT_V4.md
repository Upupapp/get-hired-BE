# GetHired Employer Journey — Service Blueprint V4

**Date:** 2026-06-24
**Format:** NN/g Service Blueprint — five swim lanes: User Actions / Frontstage / Backstage / Support Processes / Data
**Scope:** 8 phases covering the complete employer journey from awareness to ongoing management.

---

## How to Read This Blueprint

Each phase is presented as a section with the five swim lanes in a table. Below the table, success states and failure states for that phase are documented.

**Swim lanes:**
- **User Action:** What the employer does
- **Frontstage (Frontend):** What the employer sees and interacts with; Angular component and route
- **Backstage (Backend):** API calls, server-side processing; invisible to the employer
- **Support Processes:** Guards, services, and infrastructure that enable the interaction
- **Data:** Database tables and localStorage keys involved

---

## Phase 1: Awareness

The employer discovers GetHired through organic search, referral, or direct navigation. They have no account.

| Swim Lane | Details |
|-----------|---------|
| **User Action** | Visits gethired.com. Reads landing page. Clicks "For Employers." Browses public job listings to evaluate platform quality. |
| **Frontstage** | `/home` (`MainPortalComponent`). `/employers` (`EmployerPortalComponent`). `/jobs` (`PublicListComponent`). `/jobs/details/:id` (`PublicDetailsComponent`). No login required. |
| **Backstage** | `GET /job/published` — serves public job listing. `GET /job/details` — serves individual job detail. `GET /job/sharelink` — generates shareable job URL. |
| **Support Processes** | No guards active. SEO-relevant metadata should be served from `PublicDetailsComponent`. JSON-LD schema.org JobPosting injection (currently not confirmed in frontend code — see benchmark doc). |
| **Data** | `jobs` table (status=2 Published), `companies` table (public company info). No localStorage read. |

**Success State:** Employer understands the product, sees real job posts from other employers, and clicks the employer signup CTA.

**Failure State:** Employer sees empty job list (no published jobs on platform) — this presents the platform as unused. No confirmed empty state component for `/jobs`. Risk: employer leaves without converting.

---

## Phase 2: Signup and Onboarding

The employer creates an account with the employer role and verifies their email.

| Swim Lane | Details |
|-----------|---------|
| **User Action** | Clicks employer signup CTA. Fills in name, email, password. Selects employer role (pre-selected if arrived via `?role=2`). Submits form. Opens verification email. Clicks verification link. |
| **Frontstage** | `/signup` (`SignupComponent`, guarded by `UnauthGuard`). `?role=2` query param pre-selects employer role tab. `/verify` (`VerifyComponent`) — email verification landing page. |
| **Backstage** | User creation API (endpoint not confirmed in provided data, likely `POST /auth/signup` or similar). Email verification token generation. Email delivery. Token validation on `/verify` page load. |
| **Support Processes** | `UnauthGuard` prevents already-authed users from reaching `/signup` and `/signin`. If an authenticated employer navigates to `/signup`, they are redirected to `/recruiter`. |
| **Data** | `users` table (new row: name, email, hashed password, role=2, verified=false -> true after email click). |

**Success State:** Employer is verified and directed to sign in. localStorage is not yet populated — it is set on first signin.

**Failure State (duplicate email):** No confirmed error state documented. Standard behavior: API returns 409 or similar and signup form shows error.

**Failure State (verification not clicked):** Employer attempts to sign in but account is unverified — behavior depends on backend verification gate (not confirmed in frontend code).

---

## Phase 3: First Login and Dashboard

The employer signs in for the first time. localStorage is populated. Dashboard loads. If no company exists, a blocker dialog appears.

| Swim Lane | Details |
|-----------|---------|
| **User Action** | Navigates to `/signin`. Enters email and password. Submits. Lands on `/recruiter/dashboard`. Sees skeleton loaders, then KPI cards and empty pipeline. |
| **Frontstage** | `/signin` (`SigninComponent`, `UnauthGuard`). On success -> redirect to `/recruiter/dashboard`. `EmployerDashboardComponent` renders `<app-company-dashboard>`. Skeleton loaders: `emp-dash-hero-skeleton`, `emp-dash-action-skeleton`, `emp-dash-pipeline-skeleton`. If no company: `CompanyNotSetupComponent` dialog. |
| **Backstage** | Auth token issuance (signin API). `GET /company/usercompany` — fetch employer's company. `GET /company/dashboard` — KPI data. `GET /company/dashboard/pipeline-overview` — pipeline stages. All three called on dashboard init. |
| **Support Processes** | `AuthGuard` (on all `/recruiter/**` routes): reads `localStorage['state'] === 'true'` and `localStorage['role'] === '2'`. If either fails, redirects to `/signin`. Signin writes: `state: 'true'`, `role: '2'`, `user: {_id, companyId, firstName, lastName, companyName}`, `withActiveSubscription`. |
| **Data** | `users` table (auth), `companies` table (usercompany lookup), `jobs` table (activeJobs KPI), `applications` table (applicants KPI, needsReview), `interview_questions` or `interviews` table (interviews KPI). `localStorage`: `state`, `role`, `user`, `withActiveSubscription`. |

**Success State (company exists):** KPI cards load with real data. Pipeline chart loads. Action center shows contextual items. If company profile is incomplete, "Complete Company Profile" CTA appears.

**Success State (no company):** `CompanyNotSetupComponent` dialog appears.

**Failure State — Company Setup Dialog Bug:** "Setup Company" button calls `redirectToSetup()` which closes the dialog but does NOT navigate. `router.navigate` to `/recruiter/company/details` is commented out. **This is a blocking bug. The employer is stranded on the dashboard with no path forward.**

**Failure State — Dashboard API Error:** If `GET /company/dashboard/pipeline-overview` fails, `pipelineError` flag is set and a retry mechanism is shown. If `GET /company/dashboard` fails, KPI cards have no confirmed error state.

---

## Phase 4: Company Setup

The employer fills in their company profile to unlock full platform functionality.

| Swim Lane | Details |
|-----------|---------|
| **User Action** | (Assuming company-not-setup redirect is fixed) Navigates to `/recruiter/company/details`. Uploads logo, writes company description, adds city. Saves. Returns to dashboard. Sees "Complete Company Profile" action card disappear. |
| **Frontstage** | `/recruiter/company/details`. `employer-company.component.html` wraps `<app-company-details>` (`company-details.component`). Form fields: company logo (file upload -> `companyLogoUrl`), company description (`companyDetails`), company city (`companyCity`), plus other company metadata. Settings at `/recruiter/company/settings`. |
| **Backstage** | `POST /company/createinitial` — if first creation. `POST /company/createcompany` — full company create. `PUT /company/update` — update existing. File upload for logo likely goes to a storage API (not explicitly documented — assumed from `companyLogoUrl` field). |
| **Support Processes** | `AuthGuard` on `/recruiter/company/details` (role `'2'`). Company ID from `localStorage['user'].companyId` used to scope update call. |
| **Data** | `companies` table: `companyLogoUrl`, `companyDetails`, `companyCity`, plus other columns. `company_users` table: links `userId` to `companyId`. |

**Success State:** Company record saved. Dashboard reloads. `companyProfileMissingFields()` returns false. "Complete Company Profile" action card disappears from the action center.

**Failure State:** Company save API error — no specific error UI documented. Generic API error handling assumed.

**Side Route — Settings:** `/recruiter/company/settings` is accessible via the sidebar "Settings" item (not labeled "Settings" in the sidebar — the sidebar item labeled "Employer Branding" goes to `/recruiter/company/details`; the actual settings route is reached via the Settings item lower in the sidebar). The exact label in the sidebar for the settings route is "Settings."

---

## Phase 5: Job Creation

The employer creates a new job post using the 4-step stepper.

| Swim Lane | Details |
|-----------|---------|
| **User Action** | Navigates to Jobs -> Job Posts. Clicks "Create Job." Optionally sees subscription gate. Fills in 4 stepper steps. Saves as draft or publishes. |
| **Frontstage** | `/recruiter/jobs/list` (`JobListComponent`). Subscription gate: `SubscriptionAlertComponent` dialog if `jobPost === jobPostCount`. `/recruiter/jobs/create` (`JobCreateComponent`). 4-step stepper: Step 1 (Job Details), Step 2 (Rates and Roles), Step 3 (Create Interview), Step 4 (Preview). |
| **Backstage** | Subscription check: `withActiveSubscription` from localStorage + `jobPost` vs `jobPostCount` comparison (data from dashboard or list API). `POST /job/create` — creates job with all fields. File upload for `jobBanner`. |
| **Support Processes** | `AuthGuard` on `/recruiter/jobs/create`. Stepper validation: `publishJobPost()` checks required fields before status=2. |
| **Data** | `jobs` table: all job fields. `job_types`, `job_levels`, `job_categories`, `work_setups`: lookup data for dropdowns. `job_badges`, `job_requirements`, `job_good_to_have`, `job_educational_backgrounds`, `job_certification_requirements`, `job_skills`, `job_tags`: array fields for job metadata. `interview_questions`: from step 3. `interview_templates`: `interviewTemplateId` reference. `subscriptions`, `subscription_plans`: gate check. |

**Success State (Draft):** Dialog confirmation shown. Navigate to `/recruiter/jobs/list`. Job appears in list with Draft status.

**Success State (Published):** Snackbar shown. Navigate to `/recruiter/jobs/list`. Job appears with Published status. Job is now visible at `/jobs` and `/jobs/details/:id` for applicants.

**Failure State (Publish Blocked):** Snackbar "Job not ready to be Published" shown. **Bug: uses `panelClass: ['success-snackbar']` (coral color) instead of error/warning color.** The employer may not realize this is an error message.

**Failure State (Missing Interview Questions):** `interviewQuestions.length === 0` blocks publish. Snackbar shown (same bug). Employer must return to step 3 to add questions. There is no in-stepper indicator that questions are required until this point.

**Failure State (Subscription Gate):** `SubscriptionAlertComponent` shown. Employer directed to `/recruiter/subscription` to upgrade.

---

## Phase 6: Applicant Review

The employer reviews candidates who have applied to their published job post.

| Swim Lane | Details |
|-----------|---------|
| **User Action** | Navigates to Jobs -> Job Posts. Finds published job. Opens action modal. Clicks "Applicants." Sees applicant table with match signal column. Clicks an applicant row. Sees inline detail panel with snapshot, application preview, and message thread. |
| **Frontstage** | `/recruiter/jobs/list` -> `TableControlModalComponent` (dialog) -> navigate to `/recruiter/jobs/applicants?id={jobId}`. `JobApplicantsComponent`: applicant table with `matchSignalLabel` column. When applicant clicked: inline panel (`showProfile=true`) with applicant avatar, `ApplicationSnapshotCard` (completeness%, matchLevel), `<app-application-preview>`, `<app-message-thread>`. |
| **Backstage** | `GET /job/applicants` (auth + company ownership required) — main applicant list. `GET /job/applicants/signals` (best-effort) — match signals per applicant. `GET /job/applicantdetails` — detail data for selected applicant. `GET /job/applicant/snapshot-summary?applicationId=` — completeness% and matchLevel. |
| **Support Processes** | `AuthGuard` on `/recruiter/jobs/applicants`. Company ownership check on backend (`/job/applicants` requires company ownership). Match signals are best-effort: main list loads regardless of signals API success. `hasAnyMatchSignal()` controls disclaimer visibility. |
| **Data** | `applications` (or `job_applicants`) table: applicant list per job. `match_signals` (or embedded): signal data per applicant. `users` table (applicant profiles). `application_snapshots` (or computed): completeness%, matchLevel. |

**Success State:** Applicant list loaded with match signals. Employer clicks applicant and sees full detail panel. Snapshot card shows completeness% and match level.

**Failure State (No Applicants):** No confirmed empty state component for zero-applicant jobs. Employer sees an empty table with no CTA.

**Failure State (Signals API Fails):** Match signal column shows no values. Main list still renders. `hasAnyMatchSignal()` returns false — disclaimer hidden (correct behavior).

**Failure State (inviteApplicant):** `inviteApplicant()` is called from the detail panel. **Current state: empty TODO. No action occurs. This is a blocking bug for the invite/pipeline-advance flow.**

---

## Phase 7: Hiring Pipeline

The employer moves candidates through pipeline stages toward a hiring decision.

| Swim Lane | Details |
|-----------|---------|
| **User Action** | Reviews pipeline chart on dashboard. Clicks a stage bar (currently: goes to generic job list — bug). Intends to view applicants at a specific stage. Intends to advance a candidate using "Invite" (currently non-functional). |
| **Frontstage** | `/recruiter/dashboard` -> pipeline bar chart (`company-dashboard.component`). Bar click calls `goToJobsList()` -> `/recruiter/jobs/list` (generic — should be stage-filtered applicant view). Applicant detail panel: `inviteApplicant()` button (empty TODO). `VideoPreviewComponent` dialog: video response viewing via `viewCv()` method. |
| **Backstage** | `GET /company/dashboard/pipeline-overview` — stage counts. `PUT /job/changestatus` — used for job status; applicant status advancement endpoint not confirmed in frontend-facing API list (likely a separate endpoint not yet wired). |
| **Support Processes** | `AuthGuard` on dashboard. Company ownership scoping. |
| **Data** | `applications` table: `statusId` per applicant. Pipeline stage counts derived from `statusId` distribution. |

**Success State (Target):** Employer clicks pipeline bar -> sees applicants at that stage for a specific job. Clicks "Invite" -> applicant advances to next stage.

**Current State:** Both of these flows are broken or non-functional. The pipeline chart is display-only. Stage advancement has no working employer UI.

**Failure State — Pipeline Drill-Down Bug:** Clicking a pipeline stage bar calls `goToJobsList()` which navigates to `/recruiter/jobs/list`. The employer sees all their jobs, not the applicants at the clicked stage. **Required fix: replace `goToJobsList()` with a navigation to a stage-filtered view.**

**Failure State — Empty inviteApplicant:** Button click produces no visible feedback and no system action. **Required fix: implement inviteApplicant() with actual pipeline advancement API call.**

---

## Phase 8: Ongoing Management

The employer returns for regular sessions to review new applicants, respond to messages, manage job posts, and monitor subscription status.

| Swim Lane | Details |
|-----------|---------|
| **User Action** | Returns to platform. Signs in (or is already authenticated via localStorage). Lands on dashboard. Checks action center for "Review X applicants." Navigates to applicant list for a job. Responds to messages in applicant detail panel. Checks expired jobs. Manages subscription. Reviews company profile. |
| **Frontstage** | `/recruiter/dashboard` — command center with refreshed KPIs and action center. `/recruiter/jobs/applicants?id=` — applicant list + inline messaging. `/recruiter/jobs/expired` — expired jobs list. `/recruiter/subscription` — subscription management. `/recruiter/company/details` — company profile review. |
| **Backstage** | All dashboard APIs on each visit: `GET /company/dashboard`, `GET /company/dashboard/pipeline-overview`, `GET /company/usercompany`. Message polling: `GET /messages/thread/messages` every 8s when an applicant detail panel is open. |
| **Support Processes** | `AuthGuard` on all `/recruiter/**` routes. `withActiveSubscription` localStorage key checked on job create. Session persistence via localStorage (no expiry mechanism confirmed in frontend — depends on backend token TTL). |
| **Data** | All employer-related tables on each return. `message_threads`, `messages` for ongoing messaging. `subscriptions` for subscription status. |

**Success State:** Employer sees up-to-date KPIs, responds to new applicants, publishes additional jobs, and has a clear picture of their hiring status from the dashboard.

**Failure State — No Global Inbox:** Employer has active message threads with multiple applicants across multiple jobs. They cannot see any of these messages from the dashboard or sidebar. They must navigate to each job's applicant list individually and click each applicant to see their thread. **This is a significant ongoing management friction point with no current resolution in the codebase.**

**Failure State — Mobile Access:** The employer sidebar is `d-none d-md-block` — hidden on mobile. No mobile navigation replacement exists. On a mobile device, the employer cannot navigate the panel at all. **This is a complete mobile usability failure.**

**Failure State — Session Expiry:** If the backend auth token expires but localStorage still has `state: 'true'`, `AuthGuard` passes the route check but all API calls return 401. There is no confirmed frontend interceptor that catches 401s and clears localStorage/redirects to signin. The employer may see API error states without understanding they need to re-authenticate.

---

*End of Document 4*
